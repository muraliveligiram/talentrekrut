using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Applications.Abstractions;
using Applications.Contracts;
using Applications.Services;
using Domain.Entities;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class AuthTests
{
    [Fact]
    public async Task Me_requires_a_valid_bearer_token()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Seeded_admin_can_login_and_access_protected_endpoint()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync(
            "admin@example.test",
            "Test Administrator",
            RoleNames.Admin);

        var token = await factory.LoginAsync(client, "admin@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var meResponse = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
    }

    [Fact]
    public async Task Login_normalizes_email_and_returns_token_for_valid_credentials()
    {
        var user = new User
        {
            Id = 1,
            Email = "admin@example.test",
            NormalizedEmail = "ADMIN@EXAMPLE.TEST",
            FullName = "Admin",
            PasswordHash = "correct",
            IsActive = true
        };
        var repository = new FakeAuthUserRepository(user);
        var service = new AuthService(repository, new FakePasswordHashService(), new FakeTokenGenerator());

        var result = await service.LoginAsync(" Admin@Example.Test ", "correct");

        Assert.NotNull(result);
        Assert.Equal("ADMIN@EXAMPLE.TEST", repository.LastNormalizedEmail);
        Assert.Equal("test-token", result.AccessToken);
    }

    [Fact]
    public async Task Login_rejects_wrong_password()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { Email = "admin@example.test", Password = "not-the-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(true, "wrong")]
    [InlineData(false, "correct")]
    public async Task Login_returns_null_for_wrong_password_or_inactive_user(bool isActive, string password)
    {
        var user = new User
        {
            Id = 1,
            Email = "admin@example.test",
            NormalizedEmail = "ADMIN@EXAMPLE.TEST",
            FullName = "Admin",
            PasswordHash = "correct",
            IsActive = isActive
        };
        var service = new AuthService(
            new FakeAuthUserRepository(user),
            new FakePasswordHashService(),
            new FakeTokenGenerator());

        var result = await service.LoginAsync("admin@example.test", password);

        Assert.Null(result);
    }

    private sealed class FakeAuthUserRepository(User? user) : IAuthUserRepository
    {
        public string? LastNormalizedEmail { get; private set; }

        public Task<User?> FindByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default)
        {
            LastNormalizedEmail = normalizedEmail;
            return Task.FromResult(user);
        }

        public Task<IReadOnlyList<string>> GetRoleNamesAsync(
            long userId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<string>>(["Admin"]);
        }

        public Task RecordLoginAsync(
            User user,
            DateTimeOffset loggedInAt,
            CancellationToken cancellationToken = default)
        {
            user.LastLoginAt = loggedInAt;
            return Task.CompletedTask;
        }
    }

    private sealed class FakePasswordHashService : IPasswordHashService
    {
        public string HashPassword(User user, string password) => password;

        public bool VerifyPassword(User user, string password) => user.PasswordHash == password;
    }

    private sealed class FakeTokenGenerator : IJwtTokenGenerator
    {
        public AuthToken Generate(User user, IReadOnlyCollection<string> roles)
        {
            return new AuthToken("test-token", DateTimeOffset.UtcNow.AddMinutes(60));
        }
    }
}
