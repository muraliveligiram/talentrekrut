using Applications.Contracts;

namespace Applications.Abstractions;

public interface ICompanyService
{
    Task<PagedResult<CompanyResponse>> GetPageAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<CompanyResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<CompanyResponse> CreateAsync(
        CompanyWriteRequest request,
        CancellationToken cancellationToken = default);

    Task<CompanyResponse?> UpdateAsync(
        long id,
        CompanyWriteRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
