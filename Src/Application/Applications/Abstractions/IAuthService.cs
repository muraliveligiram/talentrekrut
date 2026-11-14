using Applications.Contracts;

namespace Applications.Abstractions;

public interface IAuthService
{
    Task<AuthToken?> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default);
}
