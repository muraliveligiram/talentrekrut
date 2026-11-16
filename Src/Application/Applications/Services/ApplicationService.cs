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
    IValidator<InterviewOutcomeRequest> outcomeValidator) : IApplicationService
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
        return applications.Select(ApplicationMapper.ToResponse).ToArray();
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
                application.Candidate.Notes))
            .ToArray();

        return new JobCandidateExport(
            job.JobCode,
            job.Title,
            job.Company.Name,
            job.Status,
            job.Location,
            job.Openings,
            rows);
    }

    public async Task<ApplicationResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var application = await repository.GetApplicationAsync(id, currentUser.Scope(), cancellationToken);
        return application is null ? null : ApplicationMapper.ToResponse(application);
    }

    public async Task<ApplicationResponse?> ScreenAsync(
        long id,
        ScreeningDecisionRequest request,
        CancellationToken cancellationToken = default)
    {
        await screeningValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(id, ApplicationStage.Screening, application =>
        {
            var target = request.Shortlisted ? ApplicationStage.Shortlisted : ApplicationStage.NotShortlisted;
            application.RejectionReasons = request.Shortlisted ? [] : request.RejectionReasons.Distinct().ToList();
            application.RejectionNotes = request.Shortlisted ? null : Blank(request.Notes);
            return (target, null, request.Notes);
        }, cancellationToken);
    }

    public async Task<ApplicationResponse?> ScheduleInterviewAsync(
        long id,
        ScheduleInterviewRequest request,
        CancellationToken cancellationToken = default)
    {
        await scheduleValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(
            id,
            [ApplicationStage.Shortlisted, ApplicationStage.InterviewScheduled],
            application =>
            {
                application.InterviewScheduledAt = request.ScheduledAt;
                return (ApplicationStage.InterviewScheduled, request.ScheduledAt, request.Notes);
            },
            cancellationToken);
    }

    public async Task<ApplicationResponse?> RecordOutcomeAsync(
        long id,
        InterviewOutcomeRequest request,
        CancellationToken cancellationToken = default)
    {
        await outcomeValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await TransitionAsync(id, ApplicationStage.InterviewScheduled, application =>
        {
            var target = request.Selected ? ApplicationStage.Selected : ApplicationStage.Rejected;
            application.RejectionReasons = request.Selected ? [] : request.RejectionReasons.Distinct().ToList();
            application.RejectionNotes = request.Selected ? null : Blank(request.Notes);
            return (target, null, request.Notes);
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
            submissions.Count(stage => stage == ApplicationStage.Rejected));

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

    private Task<ApplicationResponse?> TransitionAsync(
        long id,
        ApplicationStage requiredStage,
        Func<JobApplication, (ApplicationStage Target, DateTimeOffset? InterviewAt, string? Notes)> apply,
        CancellationToken cancellationToken) =>
        TransitionAsync(id, [requiredStage], apply, cancellationToken);

    private async Task<ApplicationResponse?> TransitionAsync(
        long id,
        ApplicationStage[] allowedStages,
        Func<JobApplication, (ApplicationStage Target, DateTimeOffset? InterviewAt, string? Notes)> apply,
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
        var (target, interviewAt, notes) = apply(application);
        application.Stage = target;
        application.History.Add(new ApplicationStageChange
        {
            FromStage = fromStage,
            ToStage = target,
            ChangedAt = timeProvider.GetUtcNow(),
            ChangedByUserId = currentUser.RequireUserId(),
            InterviewScheduledAt = interviewAt,
            Notes = Blank(notes)
        });

        await repository.SaveChangesAsync(cancellationToken);
        var saved = await repository.GetApplicationAsync(id, currentUser.Scope(), cancellationToken);
        return ApplicationMapper.ToResponse(saved!);
    }

    private static string Describe(ApplicationStage stage) => stage switch
    {
        ApplicationStage.NotShortlisted => "not shortlisted",
        ApplicationStage.InterviewScheduled => "interview scheduled",
        _ => stage.ToString().ToLowerInvariant()
    };

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
