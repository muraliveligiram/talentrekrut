namespace Domain.Entities;

/// <summary>
/// Hiring workflow for one candidate on one job:
/// Screening → Shortlisted | NotShortlisted;
/// Shortlisted → InterviewScheduled (round 1) → RoundCleared → InterviewScheduled (next round) … ;
/// clearing the final round → Selected; failing any round → Rejected;
/// Selected (with a joining date) → Joined | NotJoined.
/// Values are stored as integers: append new stages, never reorder.
/// </summary>
public enum ApplicationStage
{
    Screening = 0,
    Shortlisted = 1,
    NotShortlisted = 2,
    InterviewScheduled = 3,
    Selected = 4,
    Rejected = 5,
    /// <summary>A round was cleared and the next round still needs scheduling.</summary>
    RoundCleared = 6,
    Joined = 7,
    NotJoined = 8
}
