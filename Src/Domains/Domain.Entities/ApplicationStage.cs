namespace Domain.Entities;

/// <summary>
/// Hiring workflow for one candidate on one job:
/// Screening → Shortlisted | NotShortlisted;
/// Shortlisted → InterviewScheduled (can be rescheduled) → Selected | Rejected.
/// </summary>
public enum ApplicationStage
{
    Screening,
    Shortlisted,
    NotShortlisted,
    InterviewScheduled,
    Selected,
    Rejected
}
