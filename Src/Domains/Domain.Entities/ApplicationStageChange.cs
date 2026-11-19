namespace Domain.Entities;

/// <summary>An immutable timeline entry recording a workflow step on an application.</summary>
public sealed class ApplicationStageChange : BaseEntity
{
    public long JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;
    public ApplicationStage? FromStage { get; set; }
    public ApplicationStage ToStage { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
    public long ChangedByUserId { get; set; }
    public User ChangedBy { get; set; } = null!;
    public DateTimeOffset? InterviewScheduledAt { get; set; }
    /// <summary>The interview round this step relates to, e.g. "Round 2 · Face to face".</summary>
    public string? RoundName { get; set; }
    public DateOnly? JoiningDate { get; set; }
    public string? Notes { get; set; }
}
