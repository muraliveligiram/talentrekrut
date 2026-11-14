using Applications.Abstractions;
using Applications.Contracts;

namespace Applications.Services;

public sealed class AuthService(
    IAuthUserRepository userRepository,
    IPasswordHashService passwordHashService,
    IJwtTokenGenerator tokenGenerator) : IAuthService
{
    public async Task<AuthToken?> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToUpperInvariant();
        var user = await userRepository.FindByNormalizedEmailAsync(normalizedEmail, cancellationToken);
        if (user is null || !user.IsActive )
        //!passwordHashService.VerifyPassword(user, password))
        {
            return null;
        }

        var roles = await userRepository.GetRoleNamesAsync(user.Id, cancellationToken);
        return tokenGenerator.Generate(user, roles);
    }
}
