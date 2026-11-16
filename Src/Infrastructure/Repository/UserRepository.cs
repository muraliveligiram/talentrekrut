using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Repository;

public sealed class UserRepository(RekrutDbContext context) : IUserRepository
{
    public async Task<(IReadOnlyList<User> Items, int TotalCount)> GetPageAsync(
        string? search,
        string? role,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = context.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToUpperInvariant();
            query = query.Where(user =>
                user.FullName.ToUpper().Contains(normalizedSearch)
                || user.NormalizedEmail.Contains(normalizedSearch));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(user => user.UserRoles.Any(link => link.Role.Name == role));
        }

        if (isActive.HasValue)
        {
            query = query.Where(user => user.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.FullName)
            .ThenBy(user => user.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(user => user.UserRoles)
                .ThenInclude(link => link.Role)
            .ToListAsync(cancellationToken);
        return (users, totalCount);
    }

    public Task<User?> GetForUpdateAsync(long id, CancellationToken cancellationToken = default)
    {
        return context.Users
            .IgnoreQueryFilters()
            .Include(user => user.UserRoles)
                .ThenInclude(link => link.Role)
            .SingleOrDefaultAsync(user => user.Id == id && !user.IsDeleted, cancellationToken);
    }

    public Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        return context.Users
            .AsNoTracking()
            .Include(user => user.UserRoles)
                .ThenInclude(link => link.Role)
            .SingleOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public Task<bool> EmailExistsAsync(
        string normalizedEmail,
        long? excludeUserId,
        CancellationToken cancellationToken = default)
    {
        return context.Users
            .IgnoreQueryFilters()
            .AnyAsync(user => user.NormalizedEmail == normalizedEmail
                && (excludeUserId == null || user.Id != excludeUserId), cancellationToken);
    }

    public async Task<IReadOnlyList<Role>> GetRolesAsync(
        IEnumerable<string> roleNames,
        CancellationToken cancellationToken = default)
    {
        var names = roleNames.Select(name => name.Trim()).ToArray();
        var roles = await context.Roles.ToListAsync(cancellationToken);
        return roles
            .Where(role => names.Contains(role.Name, StringComparer.OrdinalIgnoreCase))
            .ToArray();
    }

    public async Task<IReadOnlyList<RecruiterOption>> GetRecruiterOptionsAsync(
        CancellationToken cancellationToken = default)
    {
        return await context.Users
            .Where(user => user.IsActive
                && user.UserRoles.Any(link => link.Role.Name == RoleNames.Recruiter))
            .OrderBy(user => user.FullName)
            .Select(user => new RecruiterOption(user.Id, user.FullName, user.Email))
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await context.Users.AddAsync(user, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.GetBaseException() is SqlException { Number: 2601 or 2627 } sqlException
                && sqlException.Message.Contains(nameof(User.NormalizedEmail), StringComparison.Ordinal))
        {
            throw new DuplicateEmailException();
        }
    }
}
