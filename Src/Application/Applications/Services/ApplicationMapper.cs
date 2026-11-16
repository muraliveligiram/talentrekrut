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

    public static bool IsActive(ApplicationStage stage) =>
        stage is ApplicationStage.Screening or ApplicationStage.Shortlisted or ApplicationStage.InterviewScheduled;
}
