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

        var recruiterResponse = await client.GetAsync("/api/users/recruiters");
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

        var skills = await TestApiFactory.CreateSkillsAsync(client, "C#");
        var response = await client.PostAsJsonAsync("/api/jobs", new
        {
            CompanyId = company.Id,
            Title = "Developer",
            MinExperienceYears = 1,
            MaxExperienceYears = 5,
            Openings = 1,
            EmploymentType = "FullTime",
            WorkMode = "Remote",
            InterviewRounds = new[] { "Technical interview", "HR discussion" },
            Skills = new[] { new { SkillId = skills["C#"], SkillType = "Secondary", MinYears = (decimal?)1 } }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Jobs_define_named_interview_rounds_in_order()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        await factory.SeedUserAsync("admin@example.test", "Test Administrator", RoleNames.Admin);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", await factory.LoginAsync(client, "admin@example.test"));
        var company = await (await client.PostAsJsonAsync("/api/companies", new { Name = "Contoso", IsActive = true }))
            .Content.ReadFromJsonAsync<CompanyResponse>();
        var skills = await TestApiFactory.CreateSkillsAsync(client, "C#");

        object Body(params string[] rounds) => new
        {
            CompanyId = company!.Id,
            Title = "Backend Engineer",
            MinExperienceYears = 2,
            MaxExperienceYears = 6,
            Openings = 1,
            EmploymentType = "FullTime",
            WorkMode = "Hybrid",
            InterviewRounds = rounds,
            Skills = new[] { new { SkillId = skills["C#"], SkillType = "Primary" } }
        };
        static async Task<JsonElement> Json(HttpResponseMessage response) =>
            await response.Content.ReadFromJsonAsync<JsonElement>();
        static (long Id, int Sequence, string Name)[] Rounds(JsonElement job) => job.GetProperty("interviewRounds")
            .EnumerateArray()
            .Select(round => (round.GetProperty("id").GetInt64(), round.GetProperty("sequence").GetInt32(), round.GetProperty("name").GetString()!))
            .ToArray();

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/jobs", Body())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/jobs", Body("Coding", " "))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/jobs", Body("Coding", " coding "))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/jobs",
            Body(Enumerable.Range(1, 11).Select(index => $"Round {index}").ToArray()))).StatusCode);

        var created = await client.PostAsJsonAsync("/api/jobs", Body("Coding test", " Face to face ", "HR discussion"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var job = await Json(created);
        var jobId = job.GetProperty("id").GetInt64();
        var original = Rounds(job);
        Assert.Equal(["Coding test", "Face to face", "HR discussion"], original.Select(round => round.Name));
        Assert.Equal([1, 2, 3], original.Select(round => round.Sequence));

        // Rename round 2 and drop round 3: round ids stay attached to their positions.
        var shorter = Rounds(await Json(await client.PutAsJsonAsync($"/api/jobs/{jobId}", Body("Coding test", "Technical panel"))));
        Assert.Equal([(original[0].Id, 1, "Coding test"), (original[1].Id, 2, "Technical panel")], shorter);

        // Grow to four rounds.
        var longer = Rounds(await Json(await client.PutAsJsonAsync($"/api/jobs/{jobId}",
            Body("Coding test", "Technical panel", "Managerial", "HR discussion"))));
        Assert.Equal(["Coding test", "Technical panel", "Managerial", "HR discussion"], longer.Select(round => round.Name));
        Assert.Equal(original[0].Id, longer[0].Id);

        var fetched = Rounds(await client.GetFromJsonAsync<JsonElement>($"/api/jobs/{jobId}"));
        Assert.Equal(longer, fetched);
    }

    private static async Task<(long Id, string JobCode)> CreateJobAsync(
        HttpClient client,
        long companyId,
        string title)
    {
        var skills = await TestApiFactory.CreateSkillsAsync(client, "C#", "SQL");
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
            InterviewRounds = new[] { "Technical interview", "HR discussion" },
            CommunicationRequirement = "Clear written communication",
            Skills = new[]
            {
                new { SkillId = skills["C#"], SkillType = "Primary", MinYears = 2 },
                new { SkillId = skills["SQL"], SkillType = "Secondary", MinYears = 1 }
            }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return (
            json.RootElement.GetProperty("id").GetInt64(),
            json.RootElement.GetProperty("jobCode").GetString()!);
    }
}
