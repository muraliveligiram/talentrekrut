using Domain.Entities;

namespace Applications.Contracts;

public sealed record ApplicationResponse(
    long Id,
    long CandidateId,
    string CandidateName,
    string CandidateRole,
    // The candidate's current employer. Null for vendors.
    string? CandidateCompany,
    CandidateLevel CandidateLevel,
    long JobId,
    string JobCode,
    string JobTitle,
    string CompanyName,
    JobStatus JobStatus,
    ApplicationStage Stage,
    DateTimeOffset SubmittedAt,
    string SubmittedByName,
    DateTimeOffset? InterviewScheduledAt,
    IReadOnlyList<RejectionReason> RejectionReasons,
    // Internal free text. Null for vendors.
    string? RejectionNotes,
    IReadOnlyList<StageChangeResponse> History,
    // Every round of the job's interview process, with this candidate's progress in each.
    IReadOnlyList<RoundProgressResponse> Rounds,
    DateOnly? JoiningDate,
    IReadOnlyList<NotJoiningReason> NotJoiningReasons,
    // Internal free text. Null for vendors.
    string? NotJoiningNotes);

/// <summary>Status of one interview round for a candidate. Upcoming rounds have no record yet.</summary>
public sealed record RoundProgressResponse(
    int Sequence,
    string Name,
    RoundStatus Status,
    DateTimeOffset? ScheduledAt,
    DateTimeOffset? DecidedAt);

public enum RoundStatus
{
    Upcoming,
    Scheduled,
    Cleared,
    NotCleared
}

public sealed record StageChangeResponse(
    long Id,
    ApplicationStage? FromStage,
    ApplicationStage ToStage,
    DateTimeOffset ChangedAt,
    string ChangedByName,
    DateTimeOffset? InterviewScheduledAt,
    string? Notes,
    string? RoundName,
    DateOnly? JoiningDate);

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

/// <summary>Result of the current interview round. Clearing the final round selects the candidate.</summary>
public sealed class InterviewOutcomeRequest
{
    public bool Passed { get; set; }
    public List<RejectionReason> RejectionReasons { get; set; } = [];
    public string? Notes { get; set; }
}

public sealed class JoiningDateRequest
{
    public DateOnly JoiningDate { get; set; }
    public string? Notes { get; set; }
}

public sealed class JoiningOutcomeRequest
{
    public bool Joined { get; set; }
    public List<NotJoiningReason> NotJoiningReasons { get; set; } = [];
    public string? Notes { get; set; }
}

public sealed record PipelineStatsResponse(int ActiveCandidates, int InterviewsInRange);

/// <summary>Hiring activity over a trailing window, scoped to what the caller can see.</summary>
public sealed record PipelineInsightsResponse(
    int Days,
    DateTimeOffset From,
    DateTimeOffset To,
    int SelectedCount,
    SubmissionOutcomes Outcomes,
    IReadOnlyList<RecruiterActivity> Recruiters);

/// <summary>Where the applications submitted during the window stand today.</summary>
public sealed record SubmissionOutcomes(
    int Submitted,
    int InProgress,
    int NotShortlisted,
    // Selected and waiting to join.
    int Selected,
    int Rejected,
    int Joined,
    int NotJoined);

/// <summary>Workflow steps a user performed during the window.</summary>
public sealed record RecruiterActivity(
    long UserId,
    string Name,
    int Processed,
    int Submitted,
    int Shortlisted,
    int NotShortlisted,
    int Selected,
    int Rejected);

/// <summary>A workflow step, as read for reporting.</summary>
public sealed record StageEvent(
    long ApplicationId,
    ApplicationStage? FromStage,
    ApplicationStage ToStage,
    long ChangedByUserId,
    string ChangedByName);
