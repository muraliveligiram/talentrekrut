using Applications.Abstractions;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository;

public sealed class AuthUserRepository(RekrutDbContext context) : IAuthUserRepository
{
    public Task<User?> FindByNormalizedEmailAsync(
        string normalizedEmail,
        CancellationToken cancellationToken = default)
    {
        return context.Users
            .SingleOrDefaultAsync(user => user.NormalizedEmail == normalizedEmail, cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetRoleNamesAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await context.UserRoles
            .Where(userRole => userRole.UserId == userId)
            .Select(userRole => userRole.Role.Name)
            .OrderBy(name => name)
            .ToListAsync(cancellationToken);
    }

    public async Task RecordLoginAsync(
        User user,
        DateTimeOffset loggedInAt,
        CancellationToken cancellationToken = default)
    {
        user.LastLoginAt = loggedInAt;
        await context.SaveChangesAsync(cancellationToken);
    }
}
