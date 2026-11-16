using Applications.Abstractions;
using Domain.Entities;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Repository;

namespace IntegrationTests;

public sealed class TestApiFactory : WebApplicationFactory<Program>
{
    public const string TestPassword = "correct-horse-battery-staple";

    private readonly Dictionary<string, string?> _previousSettings;

    public TestApiFactory()
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings__DefaultConnection"] = "Server=unused;Database=unused",
            ["Jwt__Issuer"] = "RekrutMS.Tests",
            ["Jwt__Audience"] = "RekrutMS.Tests",
            ["Jwt__SigningKey"] = "test-signing-key-with-at-least-thirty-two-bytes"
        };
        _previousSettings = settings.ToDictionary(
            setting => setting.Key,
            setting => Environment.GetEnvironmentVariable(setting.Key));

        foreach (var setting in settings)
        {
            Environment.SetEnvironmentVariable(setting.Key, setting.Value);
        }
    }

    public async Task SeedUserAsync(string email, string fullName, string roleName)
    {
        await using var scope = Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<RekrutDbContext>();
        var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
        var role = await dbContext.Roles.SingleOrDefaultAsync(existing => existing.Name == roleName);
        if (role is null)
        {
            role = new Role { Name = roleName };
            dbContext.Roles.Add(role);
            await dbContext.SaveChangesAsync();
        }

        var user = new User
        {
            Email = email,
            NormalizedEmail = email.Trim().ToUpperInvariant(),
            FullName = fullName,
            IsActive = true
        };
        user.PasswordHash = passwordHashService.HashPassword(user, TestPassword);
        user.UserRoles.Add(new UserRole { Role = role });
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
    }

    public async Task<string> LoginAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { Email = email, Password = TestPassword });
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException(
                $"Test login failed with {response.StatusCode}: {responseBody}");
        }

        var result = await response.Content.ReadFromJsonAsync<TokenResponse>();
        return result?.AccessToken
            ?? throw new InvalidOperationException("Test login response did not contain an access token.");
    }

    /// <summary>Adds skills to the library through the API and returns their ids by name.</summary>
    public static async Task<Dictionary<string, long>> CreateSkillsAsync(HttpClient client, params string[] names)
    {
        var response = await client.PostAsJsonAsync("/api/skills", new { Names = names, Category = "Other" });
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Creating skills failed with {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        }

        using var json = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("created").EnumerateArray()
            .Concat(json.RootElement.GetProperty("existing").EnumerateArray())
            .ToDictionary(
                skill => skill.GetProperty("name").GetString()!,
                skill => skill.GetProperty("id").GetInt64());
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<RekrutDbContext>>();
            services.RemoveAll<DbContextOptions<RekrutDbContext>>();
            services.RemoveAll<RekrutDbContext>();
            var databaseName = Guid.NewGuid().ToString();
            services.AddDbContext<RekrutDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            foreach (var setting in _previousSettings)
            {
                Environment.SetEnvironmentVariable(setting.Key, setting.Value);
            }
        }
    }

    private sealed record TokenResponse(string AccessToken);
}
