using Domain.Entities;

namespace Applications.Contracts;

public sealed record ApplicationResponse(
    long Id,
    long CandidateId,
    string CandidateName,
    string CandidateRole,
    string CandidateCompany,
    long JobId,
    string JobCode,
    string JobTitle,
    string CompanyName,
    ApplicationStage Stage,
    DateTimeOffset SubmittedAt,
    string SubmittedByName,
    DateTimeOffset? InterviewScheduledAt,
    IReadOnlyList<RejectionReason> RejectionReasons,
    string? RejectionNotes,
    IReadOnlyList<StageChangeResponse> History);

public sealed record StageChangeResponse(
    long Id,
    ApplicationStage? FromStage,
    ApplicationStage ToStage,
    DateTimeOffset ChangedAt,
    string ChangedByName,
    DateTimeOffset? InterviewScheduledAt,
    string? Notes);

public sealed record SubmitToJobRequest(long JobId, string? Notes);

public sealed class ScreeningDecisionRequest
{
    public bool Shortlisted { get; set; }
    public List<RejectionReason> RejectionReasons { get; set; } = [];
    public string? Notes { get; set; }
}

public sealed class ScheduleInterviewRequest
{
    public DateTimeOffset ScheduledAt { get; set; }
    public string? Notes { get; set; }
}

public sealed class InterviewOutcomeRequest
{
    public bool Selected { get; set; }
    public List<RejectionReason> RejectionReasons { get; set; } = [];
    public string? Notes { get; set; }
}

public sealed record PipelineStatsResponse(int ActiveCandidates, int InterviewsInRange);
