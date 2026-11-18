using Applications.Abstractions;
using Domain.Entities;

namespace Applications.Services;

internal static class CurrentUserExtensions
{
    public static AccessScope Scope(this ICurrentUserService currentUser)
    {
        var isAdmin = currentUser.Roles.Contains(RoleNames.Admin, StringComparer.OrdinalIgnoreCase);
        var isVendor = !isAdmin && currentUser.Roles.Contains(RoleNames.Vendor, StringComparer.OrdinalIgnoreCase);
        // A vendor token without a company must see nothing, so fall back to an id that never exists.
        return new AccessScope(isAdmin, currentUser.UserId, isVendor ? currentUser.CompanyId ?? -1 : null);
    }

    public static long RequireUserId(this ICurrentUserService currentUser) =>
        currentUser.UserId ?? throw new InvalidOperationException("The current user id is unavailable.");
}
