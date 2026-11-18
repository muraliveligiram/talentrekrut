using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class SwaggerTests
{
    [Fact]
    public async Task Swagger_ui_and_document_are_served_with_bearer_auth_and_descriptions()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var ui = await client.GetAsync("/swagger/index.html");
        Assert.Equal(HttpStatusCode.OK, ui.StatusCode);
        Assert.Contains("swagger-ui", await ui.Content.ReadAsStringAsync());

        var spec = await client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, spec.StatusCode);
        using var json = JsonDocument.Parse(await spec.Content.ReadAsStringAsync());
        var root = json.RootElement;

        Assert.Equal("Talent Pool API", root.GetProperty("info").GetProperty("title").GetString());
        Assert.Equal("bearer", root.GetProperty("components").GetProperty("securitySchemes")
            .GetProperty("Bearer").GetProperty("scheme").GetString());

        var paths = root.GetProperty("paths");
        foreach (var path in new[] { "/api/auth/login", "/api/jobs", "/api/candidates", "/api/jobs/{jobId}/applications/export", "/api/skills" })
        {
            Assert.True(paths.TryGetProperty(path, out _), $"Swagger is missing {path}");
        }

        // XML doc comments become operation descriptions.
        var export = paths.GetProperty("/api/jobs/{jobId}/applications/export").GetProperty("get");
        Assert.Contains("Excel", export.GetProperty("summary").GetString());
    }

    [Fact]
    public async Task Root_serves_the_deployment_check_page()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("Talent Pool API", html);
        Assert.Contains("fetch('/health'", html);
        Assert.Contains("href=\"/swagger\"", html);

        // The page's health probe and the API itself are unaffected.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/jobs")).StatusCode);
    }

    [Fact]
    public async Task Swagger_can_be_switched_off_by_configuration()
    {
        using var factory = new TestApiFactory().WithWebHostBuilder(builder =>
            builder.UseSetting("Swagger:Enabled", "false"));
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/swagger/v1/swagger.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/swagger/index.html")).StatusCode);
    }
}
