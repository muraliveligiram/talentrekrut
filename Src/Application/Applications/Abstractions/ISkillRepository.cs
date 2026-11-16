using Applications.Contracts;
using Domain.Entities;

namespace Applications.Abstractions;

public interface ISkillRepository
{
    Task<(IReadOnlyList<SkillResponse> Items, int TotalCount)> GetPageAsync(
        string? search,
        SkillCategory? category,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkillOption>> GetActiveOptionsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Skill>> FindByNormalizedNamesAsync(
        IReadOnlyCollection<string> normalizedNames,
        CancellationToken cancellationToken = default);
    Task<Skill?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(string normalizedName, long excludeId, CancellationToken cancellationToken = default);
    Task<int> CountJobsAsync(long skillId, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<Skill> skills, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface ISkillService
{
    Task<PagedResult<SkillResponse>> GetPageAsync(
        string? search,
        SkillCategory? category,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkillOption>> GetActiveOptionsAsync(CancellationToken cancellationToken = default);
    Task<CreateSkillsResponse> CreateAsync(CreateSkillsRequest request, CancellationToken cancellationToken = default);
    Task<SkillResponse?> UpdateAsync(long id, UpdateSkillRequest request, CancellationToken cancellationToken = default);
}
