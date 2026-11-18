using Domain.Entities;

namespace Applications.Contracts;

public sealed class JobWriteRequest
{
    public long CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MinExperienceYears { get; set; }
    public decimal MaxExperienceYears { get; set; }
    public int Openings { get; set; } = 1;
    public string? Location { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public WorkMode WorkMode { get; set; }
    public string? CommunicationRequirement { get; set; }
    public List<JobSkillWriteRequest> Skills { get; set; } = [];
    /// <summary>Interview round names in order, e.g. ["Coding test", "Face to face", "HR discussion"].</summary>
    public List<string> InterviewRounds { get; set; } = [];
}

public sealed class JobSkillWriteRequest
{
    public long SkillId { get; set; }
    public JobSkillType SkillType { get; set; }
    public decimal? MinYears { get; set; }
}
