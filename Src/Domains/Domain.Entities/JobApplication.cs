namespace Domain.Entities;

/// <summary>A candidate submitted to a specific job, and where they are in the hiring workflow.</summary>
public sealed class JobApplication : BaseEntity
{
    public long CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;
    public long JobId { get; set; }
    public Job Job { get; set; } = null!;
    public ApplicationStage Stage { get; set; } = ApplicationStage.Screening;
    public long SubmittedByUserId { get; set; }
    public User SubmittedBy { get; set; } = null!;
    public DateTimeOffset SubmittedAt { get; set; }
    public DateTimeOffset? InterviewScheduledAt { get; set; }
    public List<RejectionReason> RejectionReasons { get; set; } = [];
    public string? RejectionNotes { get; set; }
    public ICollection<ApplicationStageChange> History { get; set; } = new List<ApplicationStageChange>();
}
