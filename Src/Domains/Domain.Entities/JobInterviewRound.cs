namespace Domain.Entities;

/// <summary>One step of a job's interview process, e.g. "1. Coding test", "2. Face to face", "3. HR discussion".</summary>
public sealed class JobInterviewRound : BaseEntity
{
    public long JobId { get; set; }
    public Job Job { get; set; } = null!;
    /// <summary>1-based position in the interview process.</summary>
    public int Sequence { get; set; }
    public string Name { get; set; } = string.Empty;
}
