using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Applications.Contracts;
using Domain.Entities;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class JobTests
{
    [Fact]
    public async Task Admin_creates_and_assigns_jobs_while_recruiters_only_see_assigned_jobs()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);
        await factory.SeedUserAsync("recruiter@example.test", "Test Recruiter", RoleNames.Recruiter);
        var adminToken = await factory.LoginAsync(client, "admin@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var companyResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Northwind",
            IsActive = true
        });
        Assert.Equal(HttpStatusCode.Created, companyResponse.StatusCode);
        var company = await companyResponse.Content.ReadFromJsonAsync<CompanyResponse>();
        Assert.NotNull(company);

        var firstJob = await CreateJobAsync(client, company.Id, "Platform Engineer");
        var secondJob = await CreateJobAsync(client, company.Id, "QA Engineer");
        Assert.StartsWith($"JOB-{DateTime.UtcNow.Year}-", firstJob.JobCode);
        Assert.Equal("JOB-" + DateTime.UtcNow.Year + "-0002", secondJob.JobCode);

        var recruiterResponse = await client.GetAsync("/api/users?role=Recruiter");
        Assert.Equal(HttpStatusCode.OK, recruiterResponse.StatusCode);
        using var recruiterJson = JsonDocument.Parse(await recruiterResponse.Content.ReadAsStringAsync());
        var recruiterId = recruiterJson.RootElement[0].GetProperty("id").GetInt64();

        var assignment = await client.PostAsJsonAsync(
            $"/api/jobs/{firstJob.Id}/assignments",
            new { RecruiterUserId = recruiterId });
        Assert.Equal(HttpStatusCode.NoContent, assignment.StatusCode);

        var recruiterToken = await factory.LoginAsync(client, "recruiter@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", recruiterToken);
        using var recruiterJobs = await client.GetAsync("/api/jobs");
        Assert.Equal(HttpStatusCode.OK, recruiterJobs.StatusCode);
        using var jobsJson = JsonDocument.Parse(await recruiterJobs.Content.ReadAsStringAsync());
        Assert.Equal(1, jobsJson.RootElement.GetProperty("totalCount").GetInt32());
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync($"/api/jobs/{firstJob.Id}")).StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/jobs/{secondJob.Id}")).StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var statusResponse = await client.PatchAsJsonAsync(
            $"/api/jobs/{firstJob.Id}/status",
            new { Status = "Open" });
        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        Assert.Equal(
            HttpStatusCode.Conflict,
            (await client.DeleteAsync($"/api/companies/{company.Id}")).StatusCode);

        Assert.Equal(
            HttpStatusCode.Conflict,
            (await client.PostAsJsonAsync(
                $"/api/jobs/{firstJob.Id}/assignments",
                new { RecruiterUserId = recruiterId })).StatusCode);
    }

    [Fact]
    public async Task Job_requires_at_least_one_primary_skill()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);
        var token = await factory.LoginAsync(client, "admin@example.test");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var companyResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Contoso",
            IsActive = true
        });
        var company = await companyResponse.Content.ReadFromJsonAsync<CompanyResponse>();
        Assert.NotNull(company);

        var response = await client.PostAsJsonAsync("/api/jobs", new
        {
            CompanyId = company.Id,
            Title = "Developer",
            MinExperienceYears = 1,
            MaxExperienceYears = 5,
            Openings = 1,
            EmploymentType = "FullTime",
            WorkMode = "Remote",
            Skills = new[] { new { SkillName = "C#", SkillType = "Secondary", MinYears = 1 } }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static async Task<(long Id, string JobCode)> CreateJobAsync(
        HttpClient client,
        long companyId,
        string title)
    {
        var response = await client.PostAsJsonAsync("/api/jobs", new
        {
            CompanyId = companyId,
            Title = title,
            Description = "Build and maintain software.",
            MinExperienceYears = 2,
            MaxExperienceYears = 8,
            Openings = 2,
            Location = "Remote",
            EmploymentType = "FullTime",
            WorkMode = "Remote",
            CommunicationRequirement = "Clear written communication",
            Skills = new[]
            {
                new { SkillName = "C#", SkillType = "Primary", MinYears = 2 },
                new { SkillName = "SQL", SkillType = "Secondary", MinYears = 1 }
            }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return (
            json.RootElement.GetProperty("id").GetInt64(),
            json.RootElement.GetProperty("jobCode").GetString()!);
    }
}
