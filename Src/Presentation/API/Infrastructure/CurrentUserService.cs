using System.Security.Claims;
using Applications.Abstractions;

namespace API.Infrastructure;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public IReadOnlyCollection<string> Roles => httpContextAccessor.HttpContext?.User
        .FindAll(ClaimTypes.Role)
        .Select(claim => claim.Value)
        .ToArray() ?? [];

    public long? UserId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User
                .FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(value, out var userId) ? userId : null;
        }
    }
}
