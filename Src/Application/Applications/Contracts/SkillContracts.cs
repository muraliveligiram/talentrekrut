using Domain.Entities;

namespace Applications.Contracts;

public sealed record SkillResponse(
    long Id,
    string Name,
    SkillCategory Category,
    bool IsActive,
    int JobCount,
    DateTimeOffset CreatedAt);

public sealed record SkillOption(long Id, string Name, SkillCategory Category);

public sealed class CreateSkillsRequest
{
    /// <summary>One or more skill names to add to the library.</summary>
    public List<string> Names { get; set; } = [];
    public SkillCategory Category { get; set; } = SkillCategory.Other;
}

public sealed record CreateSkillsResponse(IReadOnlyList<SkillResponse> Created, IReadOnlyList<SkillResponse> Existing);

public sealed class UpdateSkillRequest
{
    public string Name { get; set; } = string.Empty;
    public SkillCategory Category { get; set; }
    public bool IsActive { get; set; } = true;
}
