namespace Domain.Entities;

public sealed class JobSkill : BaseEntity
{
    public long JobId { get; set; }
    public Job Job { get; set; } = null!;
    public string SkillName { get; set; } = string.Empty;
    public JobSkillType SkillType { get; set; }
    public decimal? MinYears { get; set; }
}
