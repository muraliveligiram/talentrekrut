using Domain.Entities;

namespace Applications.Abstractions;

public interface IAuthUserRepository
{
    Task<User?> FindByNormalizedEmailAsync(
        string normalizedEmail,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetRoleNamesAsync(
        long userId,
        CancellationToken cancellationToken = default);

    Task RecordLoginAsync(User user, DateTimeOffset loggedInAt, CancellationToken cancellationToken = default);
}
