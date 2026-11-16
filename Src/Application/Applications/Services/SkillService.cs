using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using FluentValidation;

namespace Applications.Services;

public sealed class SkillService(
    ISkillRepository repository,
    IValidator<CreateSkillsRequest> createValidator,
    IValidator<UpdateSkillRequest> updateValidator) : ISkillService
{
    public async Task<PagedResult<SkillResponse>> GetPageAsync(
        string? search,
        SkillCategory? category,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await repository.GetPageAsync(
            search?.Trim(), category, isActive, page, pageSize, cancellationToken);
        return new PagedResult<SkillResponse>(items, page, pageSize, totalCount);
    }

    public Task<IReadOnlyList<SkillOption>> GetActiveOptionsAsync(CancellationToken cancellationToken = default) =>
        repository.GetActiveOptionsAsync(cancellationToken);

    /// <summary>
    /// Adds every name that is not already in the library. Names that already exist are
    /// returned as <c>Existing</c> (and reactivated if they were inactive) instead of failing.
    /// </summary>
    public async Task<CreateSkillsResponse> CreateAsync(
        CreateSkillsRequest request,
        CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var requested = request.Names
            .Select(Clean)
            .Where(name => name.Length > 0)
            .DistinctBy(Normalize)
            .ToArray();

        var existing = await repository.FindByNormalizedNamesAsync(
            requested.Select(Normalize).ToArray(), cancellationToken);
        var existingNames = existing.Select(skill => skill.NormalizedName).ToHashSet();
        foreach (var skill in existing.Where(skill => !skill.IsActive))
        {
            skill.IsActive = true;
        }

        var created = requested
            .Where(name => !existingNames.Contains(Normalize(name)))
            .Select(name => new Skill
            {
                Name = name,
                NormalizedName = Normalize(name),
                Category = request.Category,
                IsActive = true
            })
            .ToArray();

        await repository.AddRangeAsync(created, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return new CreateSkillsResponse(
            created.Select(skill => ToResponse(skill, jobCount: 0)).ToArray(),
            existing.Select(skill => ToResponse(skill, jobCount: 0)).ToArray());
    }

    public async Task<SkillResponse?> UpdateAsync(
        long id,
        UpdateSkillRequest request,
        CancellationToken cancellationToken = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var skill = await repository.GetByIdAsync(id, cancellationToken);
        if (skill is null)
        {
            return null;
        }

        var name = Clean(request.Name);
        var normalized = Normalize(name);
        if (normalized != skill.NormalizedName && await repository.NameExistsAsync(normalized, id, cancellationToken))
        {
            throw new DuplicateSkillException();
        }

        skill.Name = name;
        skill.NormalizedName = normalized;
        skill.Category = request.Category;
        skill.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);
        return ToResponse(skill, await repository.CountJobsAsync(id, cancellationToken));
    }

    /// <summary>Trims and collapses internal whitespace, keeping the user's casing (e.g. "ASP.NET Core").</summary>
    private static string Clean(string? name) =>
        string.Join(' ', (name ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static string Normalize(string name) => Clean(name).ToUpperInvariant();

    private static SkillResponse ToResponse(Skill skill, int jobCount) =>
        new(skill.Id, skill.Name, skill.Category, skill.IsActive, jobCount, skill.CreatedAt);
}
