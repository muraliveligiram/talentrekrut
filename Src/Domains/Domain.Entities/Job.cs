namespace Domain.Entities;

public sealed class Job : BaseEntity
{
    public string JobCode { get; set; } = string.Empty;
    public long CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MinExperienceYears { get; set; }
    public decimal MaxExperienceYears { get; set; }
    public int Openings { get; set; }
    public string? Location { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public WorkMode WorkMode { get; set; }
    public string? CommunicationRequirement { get; set; }
    public JobStatus Status { get; set; } = JobStatus.Draft;
    public ICollection<JobSkill> Skills { get; set; } = new List<JobSkill>();
    public ICollection<JobAssignment> Assignments { get; set; } = new List<JobAssignment>();
}
