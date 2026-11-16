namespace Domain.Entities;

/// <summary>An entry in the shared skill library that jobs (and later candidates) reference.</summary>
public sealed class Skill : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public SkillCategory Category { get; set; } = SkillCategory.Other;
    public bool IsActive { get; set; } = true;
}
