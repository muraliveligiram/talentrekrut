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
                change.Notes))
            .ToArray());

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
            History = response.History.Select(change => change with { Notes = null }).ToArray()
        };
    }

    public static Func<JobApplication, ApplicationResponse> For(Abstractions.AccessScope scope) =>
        scope.IsVendor ? ToVendorResponse : ToResponse;

    public static bool IsActive(ApplicationStage stage) =>
        stage is ApplicationStage.Screening or ApplicationStage.Shortlisted or ApplicationStage.InterviewScheduled;
}
