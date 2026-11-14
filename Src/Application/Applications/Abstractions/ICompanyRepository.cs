using Domain.Entities;

namespace Applications.Abstractions;

public interface ICompanyRepository
{
    Task<(IReadOnlyList<Company> Items, int TotalCount)> GetPageAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<Company?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<bool> NameExistsAsync(
        string normalizedName,
        long? excludeCompanyId = null,
        CancellationToken cancellationToken = default);

    Task<bool> HasActiveJobsAsync(long companyId, CancellationToken cancellationToken = default);

    Task AddAsync(Company company, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
