using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Applications.Contracts;
using Domain.Entities;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class CompanyTests
{
    [Fact]
    public async Task Admin_can_create_search_and_soft_delete_company()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);
        var token = await factory.LoginAsync(client, "admin@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var createResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Northwind",
            Industry = "Technology",
            ContactEmail = "talent@northwind.example",
            IsActive = true
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CompanyResponse>();
        Assert.NotNull(created);

        var searchResult = await client.GetFromJsonAsync<PagedResult<CompanyResponse>>(
            "/api/companies?search=north&page=1&pageSize=10");
        Assert.NotNull(searchResult);
        Assert.Equal(1, searchResult.TotalCount);
        Assert.Equal("Northwind", Assert.Single(searchResult.Items).Name);

        var duplicateResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "northwind",
            IsActive = true
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var deleteResponse = await client.DeleteAsync($"/api/companies/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/companies/{created.Id}")).StatusCode);

        var afterDelete = await client.GetFromJsonAsync<PagedResult<CompanyResponse>>(
            "/api/companies?search=north&page=1&pageSize=10");
        Assert.NotNull(afterDelete);
        Assert.Empty(afterDelete.Items);
    }

    [Fact]
    public async Task Company_write_requires_admin_role_and_valid_input()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("recruiter@example.test", "Test Recruiter", RoleNames.Recruiter);
        var token = await factory.LoginAsync(client, "recruiter@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var forbiddenResponse = await client.PostAsJsonAsync(
            "/api/companies",
            new { Name = "Contoso", IsActive = true });
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResponse.StatusCode);

        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);
        token = await factory.LoginAsync(client, "admin@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var invalidResponse = await client.PostAsJsonAsync(
            "/api/companies",
            new { Name = "", Website = "not-a-url", IsActive = true });
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
    }
}
