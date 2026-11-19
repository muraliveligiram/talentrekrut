using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using FluentValidation;

namespace Applications.Services;

/// <summary>
/// Moves a candidate through the hiring workflow for one job. Valid transitions:
/// Screening → Shortlisted | NotShortlisted;
/// Shortlisted → InterviewScheduled; InterviewScheduled → InterviewScheduled (reschedule);
/// InterviewScheduled → Selected | Rejected.
/// </summary>
public sealed class ApplicationService(
    ICandidateRepository repository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider,
    IValidator<ScreeningDecisionRequest> screeningValidator,
    IValidator<ScheduleInterviewRequest> scheduleValidator,
    IValidator<InterviewOutcomeRequest> outcomeValidator,
    IValidator<JoiningDateRequest> joiningDateValidator,
    IValidator<JoiningOutcomeRequest> joiningValidator) : IApplicationService
{
    public async Task<IReadOnlyList<ApplicationResponse>?> GetForJobAsync(
        long jobId,
        CancellationToken cancellationToken = default)
    {
        if (await repository.GetVisibleJobAsync(jobId, currentUser.Scope(), cancellationToken) is null)
        {
            return null;
        }

        var applications = await repository.GetApplicationsForJobAsync(jobId, cancellationToken);
        return applications.Select(ApplicationMapper.For(currentUser.Scope())).ToArray();
    }

    public async Task<bool> RemoveAsync(long id, CancellationToken cancellationToken = default)
    {
        var application = await repository.GetApplicationAsync(id, AccessScope.Unrestricted, cancellationToken);
        if (application is null)
        {
            return false;
        }

        // Soft delete: the unique (candidate, job) index ignores deleted rows, so the candidate can be submitted again.
        application.IsDeleted = true;
        foreach (var change in application.History)
        {
            change.IsDeleted = true;
        }

        await repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<JobCandidateExport?> GetJobExportAsync(long jobId, CancellationToken cancellationToken = default)
    {
        var job = await repository.GetVisibleJobAsync(jobId, currentUser.Scope(), cancellationToken);
        if (job is null)
        {
            return null;
        }

        var applications = await repository.GetApplicationsForJobAsync(jobId, cancellationToken);
        var rows = applications
            .OrderBy(application => application.Stage)
            .ThenBy(application => application.Candidate.FullName, StringComparer.CurrentCultureIgnoreCase)
            .Select(application => new JobCandidateExportRow(
                application.CandidateId,
                application.Candidate.FullName,
                application.Candidate.CurrentRole,
                application.Candidate.CurrentCompany,
                application.Candidate.Level,
                application.Candidate.DateOfBirth,
                application.Candidate.Phone,
                application.Candidate.PersonalEmail,
                application.Candidate.CompanyEmail,
                application.Candidate.LinkedInUrl,
                application.Candidate.CurrentCtcLpa,
                application.Candidate.CurrentCtcIncludesVariable,
                application.Candidate.VariablePayLpa,
                application.Candidate.ExpectedCtcLpa,
                application.Candidate.NoticePeriodDays,
                application.Stage,
                application.SubmittedAt,
                application.SubmittedBy.FullName,
                application.InterviewScheduledAt,
                application.RejectionReasons.ToArray(),
                application.RejectionNotes,
                application.History.Count == 0 ? application.SubmittedAt : application.History.Max(change => change.ChangedAt),
                application.Candidate.Notes,
                ApplicationMapper.RoundProgress(application),
                application.JoiningDate,
                application.NotJoiningReasons.ToArray(),
                application.NotJoiningNotes))
            .ToArray();

        return new JobCandidateExport(
            job.JobCode,
            job.Title,
            job.Company.Name,
            job.Status,
            job.Location,
            job.Openings,
            job.InterviewRounds.OrderBy(round => round.Sequence).Select(round => round.Name).ToArray(),
            rows);
    }

    public async Task<ApplicationResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var application = await repository.GetApplicationAsync(id, currentUser.Scope(), cancellationToken);
        return application is null ? null : ApplicationMapper.For(currentUser.Scope())(application);
    }

    public async Task<ApplicationResponse?> ScreenAsync(
        long id,
        ScreeningDecisionRequest request,
        CancellationToken cancellationToken = default)
    {
        await screeningValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(id, [ApplicationStage.Screening], application =>
        {
            var target = request.Shortlisted ? ApplicationStage.Shortlisted : ApplicationStage.NotShortlisted;
            application.RejectionReasons = request.Shortlisted ? [] : request.RejectionReasons.Distinct().ToList();
            application.RejectionNotes = request.Shortlisted ? null : Blank(request.Notes);
            return new Step(target, request.Notes);
        }, cancellationToken);
    }

    /// <summary>
    /// Schedules the next interview round (from Shortlisted or RoundCleared) or reschedules the
    /// current one (from InterviewScheduled). Rounds follow the job's interview process.
    /// </summary>
    public async Task<ApplicationResponse?> ScheduleInterviewAsync(
        long id,
        ScheduleInterviewRequest request,
        CancellationToken cancellationToken = default)
    {
        await scheduleValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(
            id,
            [ApplicationStage.Shortlisted, ApplicationStage.RoundCleared, ApplicationStage.InterviewScheduled],
            application =>
            {
                var round = application.Stage == ApplicationStage.InterviewScheduled
                    ? CurrentRound(application)
                    : StartNextRound(application);
                round.ScheduledAt = request.ScheduledAt;
                application.InterviewScheduledAt = request.ScheduledAt;
                return new Step(ApplicationStage.InterviewScheduled, request.Notes, request.ScheduledAt, RoundLabel(round));
            },
            cancellationToken);
    }

    /// <summary>Records the current round's result. Clearing the final round selects the candidate.</summary>
    public async Task<ApplicationResponse?> RecordOutcomeAsync(
        long id,
        InterviewOutcomeRequest request,
        CancellationToken cancellationToken = default)
    {
        await outcomeValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(id, [ApplicationStage.InterviewScheduled], application =>
        {
            var round = CurrentRound(application);
            round.Outcome = request.Passed ? RoundOutcome.Cleared : RoundOutcome.NotCleared;
            round.DecidedAt = timeProvider.GetUtcNow();
            application.InterviewScheduledAt = null;

            ApplicationStage target;
            if (!request.Passed)
            {
                target = ApplicationStage.Rejected;
                application.RejectionReasons = request.RejectionReasons.Distinct().ToList();
                application.RejectionNotes = Blank(request.Notes);
            }
            else
            {
                var totalRounds = Math.Max(PlannedRounds(application).Count, round.Sequence);
                target = round.Sequence >= totalRounds ? ApplicationStage.Selected : ApplicationStage.RoundCleared;
            }

            return new Step(target, request.Notes, RoundName: RoundLabel(round));
        }, cancellationToken);
    }

    public async Task<ApplicationResponse?> SetJoiningDateAsync(
        long id,
        JoiningDateRequest request,
        CancellationToken cancellationToken = default)
    {
        await joiningDateValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(id, [ApplicationStage.Selected], application =>
        {
            application.JoiningDate = request.JoiningDate;
            return new Step(ApplicationStage.Selected, request.Notes, JoiningDate: request.JoiningDate);
        }, cancellationToken);
    }

    public async Task<ApplicationResponse?> RecordJoiningAsync(
        long id,
        JoiningOutcomeRequest request,
        CancellationToken cancellationToken = default)
    {
        await joiningValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(id, [ApplicationStage.Selected], application =>
        {
            if (application.JoiningDate is null)
            {
                throw new InvalidStageTransitionException("Set the date of joining before recording whether the candidate joined.");
            }

            application.NotJoiningReasons = request.Joined ? [] : request.NotJoiningReasons.Distinct().ToList();
            application.NotJoiningNotes = request.Joined ? null : Blank(request.Notes);
            var target = request.Joined ? ApplicationStage.Joined : ApplicationStage.NotJoined;
            return new Step(target, request.Notes, JoiningDate: application.JoiningDate);
        }, cancellationToken);
    }

    public async Task<PipelineInsightsResponse> GetInsightsAsync(int days, CancellationToken cancellationToken = default)
    {
        if (days is < 1 or > 366)
        {
            throw new ValidationException("The reporting window must be between 1 and 366 days.");
        }

        var to = timeProvider.GetUtcNow();
        var from = to.AddDays(-days);
        var scope = currentUser.Scope();
        var events = await repository.GetStageEventsAsync(scope, from, to, cancellationToken);
        var submissions = await repository.GetStagesOfSubmissionsAsync(scope, from, to, cancellationToken);

        var selectedCount = events
            .Where(change => change.ToStage == ApplicationStage.Selected)
            .Select(change => change.ApplicationId)
            .Distinct()
            .Count();

        var outcomes = new SubmissionOutcomes(
            submissions.Count,
            submissions.Count(ApplicationMapper.IsActive),
            submissions.Count(stage => stage == ApplicationStage.NotShortlisted),
            submissions.Count(stage => stage == ApplicationStage.Selected),
            submissions.Count(stage => stage == ApplicationStage.Rejected),
            submissions.Count(stage => stage == ApplicationStage.Joined),
            submissions.Count(stage => stage == ApplicationStage.NotJoined));

        int Count(IEnumerable<StageEvent> userEvents, ApplicationStage stage) => userEvents
            .Where(change => change.ToStage == stage && change.FromStage != stage)
            .Select(change => change.ApplicationId)
            .Distinct()
            .Count();

        var recruiters = events
            .GroupBy(change => change.ChangedByUserId)
            .Select(group => new RecruiterActivity(
                group.Key,
                group.First().ChangedByName,
                Processed: group.Select(change => change.ApplicationId).Distinct().Count(),
                Submitted: group.Where(change => change.FromStage is null).Select(change => change.ApplicationId).Distinct().Count(),
                Shortlisted: Count(group, ApplicationStage.Shortlisted),
                NotShortlisted: Count(group, ApplicationStage.NotShortlisted),
                Selected: Count(group, ApplicationStage.Selected),
                Rejected: Count(group, ApplicationStage.Rejected)))
            .OrderByDescending(activity => activity.Processed)
            .ThenBy(activity => activity.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToArray();

        return new PipelineInsightsResponse(days, from, to, selectedCount, outcomes, recruiters);
    }

    public async Task<PipelineStatsResponse> GetStatsAsync(
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken = default)
    {
        if (to <= from || to - from > TimeSpan.FromDays(366))
        {
            throw new ValidationException("The date range must be positive and at most one year.");
        }

        var (active, interviews) = await repository.GetStatsAsync(currentUser.Scope(), from, to, cancellationToken);
        return new PipelineStatsResponse(active, interviews);
    }

    /// <summary>What a workflow step changes, for the stage and the timeline entry.</summary>
    private sealed record Step(
        ApplicationStage Target,
        string? Notes,
        DateTimeOffset? InterviewAt = null,
        string? RoundName = null,
        DateOnly? JoiningDate = null);

    private async Task<ApplicationResponse?> TransitionAsync(
        long id,
        ApplicationStage[] allowedStages,
        Func<JobApplication, Step> apply,
        CancellationToken cancellationToken)
    {
        var application = await repository.GetApplicationAsync(id, currentUser.Scope(), cancellationToken);
        if (application is null)
        {
            return null;
        }

        if (!allowedStages.Contains(application.Stage))
        {
            throw new InvalidStageTransitionException(
                $"This action is not available while the candidate is in the {Describe(application.Stage)} stage.");
        }

        var fromStage = application.Stage;
        var step = apply(application);
        application.Stage = step.Target;
        application.History.Add(new ApplicationStageChange
        {
            FromStage = fromStage,
            ToStage = step.Target,
            ChangedAt = timeProvider.GetUtcNow(),
            ChangedByUserId = currentUser.RequireUserId(),
            InterviewScheduledAt = step.InterviewAt,
            RoundName = step.RoundName,
            JoiningDate = step.JoiningDate,
            Notes = Blank(step.Notes)
        });

        await repository.SaveChangesAsync(cancellationToken);
        var saved = await repository.GetApplicationAsync(id, currentUser.Scope(), cancellationToken);
        return ApplicationMapper.For(currentUser.Scope())(saved!);
    }

    private static List<JobInterviewRound> PlannedRounds(JobApplication application) =>
        application.Job.InterviewRounds.Where(round => !round.IsDeleted).OrderBy(round => round.Sequence).ToList();

    private static List<ApplicationRound> RecordedRounds(JobApplication application) =>
        application.Rounds.Where(round => !round.IsDeleted).OrderBy(round => round.Sequence).ToList();

    /// <summary>Creates the next round from the job's interview process.</summary>
    private static ApplicationRound StartNextRound(JobApplication application)
    {
        var recorded = RecordedRounds(application);
        var sequence = recorded.Count == 0 ? 1 : recorded[^1].Sequence + 1;
        var planned = PlannedRounds(application).FirstOrDefault(round => round.Sequence == sequence);
        if (planned is null && sequence > 1)
        {
            throw new InvalidStageTransitionException("All of this job's interview rounds have already been completed.");
        }

        var round = new ApplicationRound
        {
            Sequence = sequence,
            Name = planned?.Name ?? "Interview",
            JobInterviewRoundId = planned?.Id
        };
        application.Rounds.Add(round);
        return round;
    }

    /// <summary>
    /// The round currently scheduled. Interviews scheduled before rounds existed have no round record,
    /// so one is created for them as the next round in sequence.
    /// </summary>
    private static ApplicationRound CurrentRound(JobApplication application)
    {
        var current = RecordedRounds(application).LastOrDefault(round => round.Outcome == RoundOutcome.Scheduled);
        if (current is not null)
        {
            return current;
        }

        var legacy = StartNextRound(application);
        legacy.ScheduledAt = application.InterviewScheduledAt;
        return legacy;
    }

    private static string RoundLabel(ApplicationRound round) => $"Round {round.Sequence} · {round.Name}";

    private static string Describe(ApplicationStage stage) => stage switch
    {
        ApplicationStage.NotShortlisted => "not shortlisted",
        ApplicationStage.InterviewScheduled => "interview scheduled",
        ApplicationStage.RoundCleared => "round cleared",
        ApplicationStage.NotJoined => "did not join",
        _ => stage.ToString().ToLowerInvariant()
    };

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
