using Applications.Abstractions;
using Domain.Entities;

namespace Applications.Services;

internal static class CurrentUserExtensions
{
    public static AccessScope Scope(this ICurrentUserService currentUser) => new(
        currentUser.Roles.Contains(RoleNames.Admin, StringComparer.OrdinalIgnoreCase),
        currentUser.UserId);

    public static long RequireUserId(this ICurrentUserService currentUser) =>
        currentUser.UserId ?? throw new InvalidOperationException("The current user id is unavailable.");
}
