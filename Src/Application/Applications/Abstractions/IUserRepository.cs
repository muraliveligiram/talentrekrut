using Applications.Contracts;
using Domain.Entities;

namespace Applications.Abstractions;

public interface IUserRepository
{
    Task<(IReadOnlyList<User> Items, int TotalCount)> GetPageAsync(
        string? search,
        string? role,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads a tracked user with all role links, including soft-deleted ones,
    /// so that roles can be restored without violating the unique (UserId, RoleId) index.
    /// </summary>
    Task<User?> GetForUpdateAsync(long id, CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> EmailExistsAsync(
        string normalizedEmail,
        long? excludeUserId,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Role>> GetRolesAsync(
        IEnumerable<string> roleNames,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecruiterOption>> GetRecruiterOptionsAsync(CancellationToken cancellationToken = default);
    Task<Company?> GetCompanyAsync(long companyId, CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
