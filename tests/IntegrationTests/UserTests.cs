using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Applications.Contracts;
using Domain.Entities;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class UserTests
{
    private const string NewPassword = "a-brand-new-password-42";

    [Fact]
    public async Task Admin_creates_recruiter_who_can_sign_in_until_deactivated()
    {
        using var factory = new TestApiFactory();
        using var client = await CreateAdminClientAsync(factory);

        var created = await CreateUserAsync(client, "Recruiter@Example.test", "Riya Recruiter", RoleNames.Recruiter);
        Assert.Equal("Recruiter@Example.test", created.Email);
        Assert.Equal([RoleNames.Recruiter], created.Roles);
        Assert.True(created.IsActive);

        var page = await client.GetFromJsonAsync<PagedResult<UserResponse>>(
            "/api/users?role=Recruiter&search=riya");
        Assert.NotNull(page);
        Assert.Equal(created.Id, Assert.Single(page.Items).Id);

        var recruiters = await client.GetFromJsonAsync<RecruiterOption[]>("/api/users/recruiters");
        Assert.Contains(recruiters!, option => option.Id == created.Id);

        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(anonymous, "recruiter@example.test", NewPassword)).StatusCode);
        var afterLogin = await client.GetFromJsonAsync<UserResponse>($"/api/users/{created.Id}");
        Assert.NotNull(afterLogin!.LastLoginAt);

        var deactivate = await client.PutAsJsonAsync($"/api/users/{created.Id}", new
        {
            created.Email,
            created.FullName,
            Roles = new[] { RoleNames.Recruiter },
            IsActive = false
        });
        Assert.Equal(HttpStatusCode.OK, deactivate.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(anonymous, created.Email, NewPassword)).StatusCode);

        var inactiveRecruiters = await client.GetFromJsonAsync<RecruiterOption[]>("/api/users/recruiters");
        Assert.DoesNotContain(inactiveRecruiters!, option => option.Id == created.Id);
    }

    [Fact]
    public async Task Create_rejects_duplicate_email_weak_password_and_unknown_role()
    {
        using var factory = new TestApiFactory();
        using var client = await CreateAdminClientAsync(factory);
        await CreateUserAsync(client, "taken@example.test", "Taken", RoleNames.Recruiter);

        var duplicate = await client.PostAsJsonAsync("/api/users", new
        {
            Email = " TAKEN@example.test ",
            FullName = "Someone Else",
            Password = NewPassword,
            Roles = new[] { RoleNames.Recruiter }
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var weak = await client.PostAsJsonAsync("/api/users", new
        {
            Email = "weak@example.test",
            FullName = "Weak",
            Password = "short",
            Roles = new[] { RoleNames.Recruiter }
        });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
        using var weakBody = JsonDocument.Parse(await weak.Content.ReadAsStringAsync());
        Assert.True(weakBody.RootElement.GetProperty("errors").TryGetProperty("Password", out _));

        var badRole = await client.PostAsJsonAsync("/api/users", new
        {
            Email = "role@example.test",
            FullName = "Role",
            Password = NewPassword,
            Roles = new[] { "Superuser" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, badRole.StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_lock_themselves_out()
    {
        using var factory = new TestApiFactory();
        using var client = await CreateAdminClientAsync(factory);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        var adminId = long.Parse(me.GetProperty("userId").GetString()!);

        var deactivateSelf = await client.PutAsJsonAsync($"/api/users/{adminId}", new
        {
            Email = "admin@example.test",
            FullName = "Test Administrator",
            Roles = new[] { RoleNames.Admin },
            IsActive = false
        });
        var demoteSelf = await client.PutAsJsonAsync($"/api/users/{adminId}", new
        {
            Email = "admin@example.test",
            FullName = "Test Administrator",
            Roles = new[] { RoleNames.Recruiter },
            IsActive = true
        });

        Assert.Equal(HttpStatusCode.Conflict, deactivateSelf.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, demoteSelf.StatusCode);
    }

    [Fact]
    public async Task Roles_can_be_removed_and_restored()
    {
        using var factory = new TestApiFactory();
        using var client = await CreateAdminClientAsync(factory);
        var user = await CreateUserAsync(client, "multi@example.test", "Multi Role", RoleNames.Recruiter);

        async Task<UserResponse> SetRolesAsync(params string[] roles)
        {
            var response = await client.PutAsJsonAsync($"/api/users/{user.Id}", new
            {
                user.Email,
                user.FullName,
                Roles = roles,
                IsActive = true
            });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<UserResponse>())!;
        }

        Assert.Equal([RoleNames.Admin, RoleNames.Recruiter], (await SetRolesAsync(RoleNames.Admin, RoleNames.Recruiter)).Roles);
        Assert.Equal([RoleNames.Admin], (await SetRolesAsync(RoleNames.Admin)).Roles);
        Assert.Equal([RoleNames.Recruiter], (await SetRolesAsync(RoleNames.Recruiter)).Roles);

        var reloaded = await client.GetFromJsonAsync<UserResponse>($"/api/users/{user.Id}");
        Assert.Equal([RoleNames.Recruiter], reloaded!.Roles);
    }

    [Fact]
    public async Task Recruiters_cannot_manage_users()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("recruiter@example.test", "Recruiter", RoleNames.Recruiter);
        var token = await factory.LoginAsync(client, "recruiter@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/users", new { })).StatusCode);
    }

    [Fact]
    public async Task Admin_reset_and_self_service_change_password()
    {
        using var factory = new TestApiFactory();
        using var adminClient = await CreateAdminClientAsync(factory);
        var user = await CreateUserAsync(adminClient, "pw@example.test", "Password User", RoleNames.Recruiter);

        var reset = await adminClient.PostAsJsonAsync(
            $"/api/users/{user.Id}/reset-password",
            new { NewPassword = "reset-by-admin-password" });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        using var userClient = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(userClient, user.Email, NewPassword)).StatusCode);
        var login = await LoginAsync(userClient, user.Email, "reset-by-admin-password");
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var token = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString();
        userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var wrongCurrent = await userClient.PostAsJsonAsync("/api/auth/change-password", new
        {
            CurrentPassword = "not-my-password",
            NewPassword = "my-own-chosen-password"
        });
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);

        var changed = await userClient.PostAsJsonAsync("/api/auth/change-password", new
        {
            CurrentPassword = "reset-by-admin-password",
            NewPassword = "my-own-chosen-password"
        });
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(userClient, user.Email, "my-own-chosen-password")).StatusCode);
    }

    private static async Task<HttpClient> CreateAdminClientAsync(TestApiFactory factory)
    {
        var client = factory.CreateClient();
        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);
        // Ensure the Recruiter role exists, as the production database seeder guarantees.
        await factory.SeedUserAsync("seed-recruiter@example.test", "Seed Recruiter", RoleNames.Recruiter);
        var token = await factory.LoginAsync(client, "admin@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static async Task<UserResponse> CreateUserAsync(
        HttpClient client,
        string email,
        string fullName,
        string role)
    {
        var response = await client.PostAsJsonAsync("/api/users", new
        {
            Email = email,
            FullName = fullName,
            Password = NewPassword,
            Roles = new[] { role }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UserResponse>())!;
    }

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string email, string password)
    {
        return client.PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });
    }
}
