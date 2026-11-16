using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Applications.Contracts;
using Domain.Entities;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class SkillTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task Recruiters_add_skills_in_bulk_without_creating_duplicates()
    {
        using var factory = new TestApiFactory();
        using var admin = await SignInAsync(factory, "admin@example.test", RoleNames.Admin);
        using var recruiter = await SignInAsync(factory, "recruiter@example.test", RoleNames.Recruiter);
        await TestApiFactory.CreateSkillsAsync(admin, "React");

        var response = await recruiter.PostAsJsonAsync("/api/skills", new
        {
            Names = new[] { "  Spring   Boot ", "spring boot", "REACT", "Kafka", "" },
            Category = "Framework"
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.Content.ReadFromJsonAsync<CreateSkillsResponse>(Json))!;

        Assert.Equal(["Spring Boot", "Kafka"], result.Created.Select(skill => skill.Name));
        Assert.All(result.Created, skill => Assert.Equal(SkillCategory.Framework, skill.Category));
        Assert.Equal("React", Assert.Single(result.Existing).Name);

        var page = await recruiter.GetFromJsonAsync<PagedResult<SkillResponse>>("/api/skills?search=boot", Json);
        Assert.Equal("Spring Boot", Assert.Single(page!.Items).Name);
        var frameworks = await recruiter.GetFromJsonAsync<PagedResult<SkillResponse>>("/api/skills?category=Framework", Json);
        Assert.Equal(2, frameworks!.TotalCount);

        var empty = await recruiter.PostAsJsonAsync("/api/skills", new { Names = new[] { " " } });
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
    }

    [Fact]
    public async Task Only_admins_edit_skills_and_inactive_skills_stay_on_existing_jobs()
    {
        using var factory = new TestApiFactory();
        using var admin = await SignInAsync(factory, "admin@example.test", RoleNames.Admin);
        using var recruiter = await SignInAsync(factory, "recruiter@example.test", RoleNames.Recruiter);
        var skills = await TestApiFactory.CreateSkillsAsync(admin, "C#", "VB6", "Rust");
        var company = await (await admin.PostAsJsonAsync("/api/companies", new { Name = "Acme", IsActive = true }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var companyId = company.GetProperty("id").GetInt64();

        object JobBody(params (long Id, string Type)[] jobSkills) => new
        {
            CompanyId = companyId,
            Title = "Legacy modernisation",
            MinExperienceYears = 3,
            MaxExperienceYears = 8,
            Openings = 1,
            EmploymentType = "Contract",
            WorkMode = "Remote",
            Skills = jobSkills.Select(skill => new { SkillId = skill.Id, SkillType = skill.Type }).ToArray()
        };

        var created = await admin.PostAsJsonAsync("/api/jobs", JobBody((skills["C#"], "Primary"), (skills["VB6"], "Secondary")));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var jobId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64();

        var update = new { Name = "Visual Basic 6", Category = "ProgrammingLanguage", IsActive = false };
        Assert.Equal(HttpStatusCode.Forbidden, (await recruiter.PutAsJsonAsync($"/api/skills/{skills["VB6"]}", update)).StatusCode);
        var renamed = await admin.PutAsJsonAsync($"/api/skills/{skills["VB6"]}", update);
        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        var renamedSkill = (await renamed.Content.ReadFromJsonAsync<SkillResponse>(Json))!;
        Assert.Equal(1, renamedSkill.JobCount);
        Assert.False(renamedSkill.IsActive);

        var duplicateName = await admin.PutAsJsonAsync($"/api/skills/{skills["Rust"]}",
            new { Name = " c# ", Category = "Other", IsActive = true });
        Assert.Equal(HttpStatusCode.Conflict, duplicateName.StatusCode);

        var options = await recruiter.GetFromJsonAsync<SkillOption[]>("/api/skills/options", Json);
        Assert.DoesNotContain(options!, option => option.Id == skills["VB6"]);

        var job = await admin.GetFromJsonAsync<JobResponse>($"/api/jobs/{jobId}", Json);
        Assert.Contains(job!.Skills, skill => skill.SkillName == "Visual Basic 6" && skill.Category == SkillCategory.ProgrammingLanguage);

        var keepInactive = await admin.PutAsJsonAsync($"/api/jobs/{jobId}",
            JobBody((skills["C#"], "Primary"), (skills["VB6"], "Secondary")));
        Assert.Equal(HttpStatusCode.OK, keepInactive.StatusCode);

        var newJobWithInactive = await admin.PostAsJsonAsync("/api/jobs",
            JobBody((skills["C#"], "Primary"), (skills["VB6"], "Secondary")));
        Assert.Equal(HttpStatusCode.BadRequest, newJobWithInactive.StatusCode);

        var duplicateInJob = await admin.PostAsJsonAsync("/api/jobs",
            JobBody((skills["C#"], "Primary"), (skills["C#"], "Secondary")));
        Assert.Equal(HttpStatusCode.BadRequest, duplicateInJob.StatusCode);

        var unknownSkill = await admin.PostAsJsonAsync("/api/jobs", JobBody((999_999, "Primary")));
        Assert.Equal(HttpStatusCode.BadRequest, unknownSkill.StatusCode);
    }

    private static async Task<HttpClient> SignInAsync(TestApiFactory factory, string email, string role)
    {
        await factory.SeedUserAsync(email, email.Split('@')[0], role);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", await factory.LoginAsync(client, email));
        return client;
    }
}
