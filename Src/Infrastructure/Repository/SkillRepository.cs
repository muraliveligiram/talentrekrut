using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Repository;

public sealed class SkillRepository(RekrutDbContext context) : ISkillRepository
{
    public async Task<(IReadOnlyList<SkillResponse> Items, int TotalCount)> GetPageAsync(
        string? search,
        SkillCategory? category,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = context.Skills.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            query = query.Where(skill => skill.NormalizedName.Contains(term));
        }

        if (category.HasValue)
        {
            query = query.Where(skill => skill.Category == category.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(skill => skill.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(skill => skill.Name)
            .ThenBy(skill => skill.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(skill => new SkillResponse(
                skill.Id,
                skill.Name,
                skill.Category,
                skill.IsActive,
                context.JobSkills.Where(jobSkill => jobSkill.SkillId == skill.Id).Select(jobSkill => jobSkill.JobId).Distinct().Count(),
                skill.CreatedAt))
            .ToListAsync(cancellationToken);
        return (items, totalCount);
    }

    public async Task<IReadOnlyList<SkillOption>> GetActiveOptionsAsync(CancellationToken cancellationToken = default)
    {
        return await context.Skills
            .AsNoTracking()
            .Where(skill => skill.IsActive)
            .OrderBy(skill => skill.Name)
            .Select(skill => new SkillOption(skill.Id, skill.Name, skill.Category))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Skill>> FindByNormalizedNamesAsync(
        IReadOnlyCollection<string> normalizedNames,
        CancellationToken cancellationToken = default)
    {
        return await context.Skills
            .Where(skill => normalizedNames.Contains(skill.NormalizedName))
            .ToListAsync(cancellationToken);
    }

    public Task<Skill?> GetByIdAsync(long id, CancellationToken cancellationToken = default) =>
        context.Skills.SingleOrDefaultAsync(skill => skill.Id == id, cancellationToken);

    public Task<bool> NameExistsAsync(string normalizedName, long excludeId, CancellationToken cancellationToken = default) =>
        context.Skills.IgnoreQueryFilters()
            .AnyAsync(skill => skill.NormalizedName == normalizedName && skill.Id != excludeId, cancellationToken);

    public Task<int> CountJobsAsync(long skillId, CancellationToken cancellationToken = default) =>
        context.JobSkills.Where(jobSkill => jobSkill.SkillId == skillId)
            .Select(jobSkill => jobSkill.JobId).Distinct().CountAsync(cancellationToken);

    public Task AddRangeAsync(IEnumerable<Skill> skills, CancellationToken cancellationToken = default) =>
        context.Skills.AddRangeAsync(skills, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.GetBaseException() is SqlException { Number: 2601 or 2627 } sqlException
                && sqlException.Message.Contains("IX_Skills_NormalizedName", StringComparison.Ordinal))
        {
            throw new DuplicateSkillException();
        }
    }
}
