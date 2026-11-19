namespace Domain.Entities;

/// <summary>
/// One interview round for a candidate on a job. The round name is copied from the job's
/// interview process when scheduled, so later edits to the job don't rewrite history.
/// </summary>
public sealed class ApplicationRound : BaseEntity
{
    public long JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;
    /// <summary>The job's round this was based on; null for interviews recorded before rounds existed.</summary>
    public long? JobInterviewRoundId { get; set; }
    public int Sequence { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset? ScheduledAt { get; set; }
    public RoundOutcome Outcome { get; set; } = RoundOutcome.Scheduled;
    public DateTimeOffset? DecidedAt { get; set; }
}
