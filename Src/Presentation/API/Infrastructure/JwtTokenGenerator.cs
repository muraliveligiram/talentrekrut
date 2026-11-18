using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace API.Infrastructure;

public sealed class JwtTokenGenerator(IOptions<JwtOptions> options) : IJwtTokenGenerator
{
    public AuthToken Generate(User user, IReadOnlyCollection<string> roles)
    {
        var settings = options.Value;
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(60);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email)
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        if (user.CompanyId is { } companyId)
        {
            claims.Add(new Claim(AppClaimTypes.CompanyId, companyId.ToString(System.Globalization.CultureInfo.InvariantCulture)));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            settings.Issuer,
            settings.Audience,
            claims,
            now.UtcDateTime,
            expiresAt.UtcDateTime,
            credentials);

        return new AuthToken(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
