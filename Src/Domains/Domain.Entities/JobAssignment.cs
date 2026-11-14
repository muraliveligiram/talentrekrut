namespace Domain.Entities;

public sealed class JobAssignment : BaseEntity
{
    public long JobId { get; set; }
    public Job Job { get; set; } = null!;
    public long RecruiterUserId { get; set; }
    public User Recruiter { get; set; } = null!;
    public DateTimeOffset AssignedAt { get; set; }
    public long AssignedBy { get; set; }
    public bool IsActive { get; set; } = true;
}
