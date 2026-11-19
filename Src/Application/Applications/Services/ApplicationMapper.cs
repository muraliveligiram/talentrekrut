using Applications.Contracts;
using Domain.Entities;

namespace Applications.Services;

internal static class ApplicationMapper
{
    public static ApplicationResponse ToResponse(JobApplication application) => new(
        application.Id,
        application.CandidateId,
        application.Candidate.FullName,
        application.Candidate.CurrentRole,
        application.Candidate.CurrentCompany,
        application.Candidate.Level,
        application.JobId,
        application.Job.JobCode,
        application.Job.Title,
        application.Job.Company.Name,
        application.Job.Status,
        application.Stage,
        application.SubmittedAt,
        application.SubmittedBy.FullName,
        application.InterviewScheduledAt,
        application.RejectionReasons.ToArray(),
        application.RejectionNotes,
        application.History
            .OrderBy(change => change.ChangedAt)
            .ThenBy(change => change.Id)
            .Select(change => new StageChangeResponse(
                change.Id,
                change.FromStage,
                change.ToStage,
                change.ChangedAt,
                change.ChangedBy.FullName,
                change.InterviewScheduledAt,
                change.Notes,
                change.RoundName,
                change.JoiningDate))
            .ToArray(),
        RoundProgress(application),
        application.JoiningDate,
        application.NotJoiningReasons.ToArray(),
        application.NotJoiningNotes);

    /// <summary>
    /// Merges the job's planned rounds with the rounds recorded for this candidate, so the response
    /// always shows the full interview process: recorded rounds with their status, the rest as upcoming.
    /// </summary>
    public static IReadOnlyList<RoundProgressResponse> RoundProgress(JobApplication application)
    {
        var planned = application.Job.InterviewRounds
            .Where(round => !round.IsDeleted)
            .ToDictionary(round => round.Sequence, round => round.Name);
        var recorded = application.Rounds
            .Where(round => !round.IsDeleted)
            .ToDictionary(round => round.Sequence);

        return planned.Keys.Union(recorded.Keys)
            .Order()
            .Select(sequence => recorded.TryGetValue(sequence, out var round)
                ? new RoundProgressResponse(sequence, round.Name, ToStatus(round.Outcome), round.ScheduledAt, round.DecidedAt)
                : new RoundProgressResponse(sequence, planned[sequence], RoundStatus.Upcoming, null, null))
            .ToArray();
    }

    private static RoundStatus ToStatus(RoundOutcome outcome) => outcome switch
    {
        RoundOutcome.Cleared => RoundStatus.Cleared,
        RoundOutcome.NotCleared => RoundStatus.NotCleared,
        _ => RoundStatus.Scheduled
    };

    /// <summary>
    /// What a vendor may see: the candidate's name, role and level and the workflow itself, but not
    /// their employer or any internal free-text notes (which often hold CTC or contact details).
    /// </summary>
    public static ApplicationResponse ToVendorResponse(JobApplication application)
    {
        var response = ToResponse(application);
        return response with
        {
            CandidateCompany = null,
            RejectionNotes = null,
            NotJoiningNotes = null,
            History = response.History.Select(change => change with { Notes = null }).ToArray()
        };
    }

    public static Func<JobApplication, ApplicationResponse> For(Abstractions.AccessScope scope) =>
        scope.IsVendor ? ToVendorResponse : ToResponse;

    public static bool IsActive(ApplicationStage stage) =>
        stage is ApplicationStage.Screening or ApplicationStage.Shortlisted
            or ApplicationStage.InterviewScheduled or ApplicationStage.RoundCleared;
}
