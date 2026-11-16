namespace Domain.Entities;

public sealed class JobSkill : BaseEntity
{
    public long JobId { get; set; }
    public Job Job { get; set; } = null!;
    public long SkillId { get; set; }
    public Skill Skill { get; set; } = null!;
    public JobSkillType SkillType { get; set; }
    public decimal? MinYears { get; set; }
}
