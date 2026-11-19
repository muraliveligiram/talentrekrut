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
public sealed class VendorTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task Vendor_users_must_belong_to_one_active_company()
    {
        await using var env = await Env.CreateAsync();
        var acme = await env.CreateCompanyAsync("Acme");
        var dormant = await env.CreateCompanyAsync("Dormant", isActive: false);

        async Task<HttpResponseMessage> Create(string email, string[] roles, long? companyId) =>
            await env.Admin.PostAsJsonAsync("/api/users", new
            {
                Email = email,
                FullName = "Vee Vendor",
                Password = TestApiFactory.TestPassword,
                Roles = roles,
                CompanyId = companyId
            });

        var withoutCompany = await Create("v1@acme.test", [RoleNames.Vendor], null);
        Assert.Equal(HttpStatusCode.BadRequest, withoutCompany.StatusCode);
        Assert.Contains("Select the company", await withoutCompany.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, (await Create("v2@acme.test", [RoleNames.Vendor, RoleNames.Recruiter], acme)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Create("r1@acme.test", [RoleNames.Recruiter], acme)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Create("v3@acme.test", [RoleNames.Vendor], dormant)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Create("v4@acme.test", [RoleNames.Vendor], 999_999)).StatusCode);

        var created = await Create("vendor@acme.test", [RoleNames.Vendor], acme);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var vendor = (await created.Content.ReadFromJsonAsync<UserResponse>(Json))!;
        Assert.Equal([RoleNames.Vendor], vendor.Roles);
        Assert.Equal(acme, vendor.CompanyId);
        Assert.Equal("Acme", vendor.CompanyName);

        var listed = await env.Admin.GetFromJsonAsync<PagedResult<UserResponse>>("/api/users?role=Vendor", Json);
        Assert.Contains(listed!.Items, user => user.Id == vendor.Id && user.CompanyName == "Acme");

        // Turning a vendor into a recruiter clears the company link.
        var promoted = await env.Admin.PutAsJsonAsync($"/api/users/{vendor.Id}", new
        {
            vendor.Email,
            vendor.FullName,
            Roles = new[] { RoleNames.Recruiter },
            IsActive = true
        });
        Assert.Equal(HttpStatusCode.OK, promoted.StatusCode);
        Assert.Null((await promoted.Content.ReadFromJsonAsync<UserResponse>(Json))!.CompanyId);
    }

    [Fact]
    public async Task Vendors_only_see_their_own_company_published_jobs()
    {
        await using var env = await Env.CreateAsync();
        var acme = await env.CreateCompanyAsync("Acme");
        var globex = await env.CreateCompanyAsync("Globex");
        var acmeDraft = await env.CreateJobAsync(acme, "Acme draft", status: null);
        var acmeOpen = await env.CreateJobAsync(acme, "Acme open", "Open");
        var acmeOnHold = await env.CreateJobAsync(acme, "Acme on hold", "OnHold");
        var globexOpen = await env.CreateJobAsync(globex, "Globex open", "Open");
        await env.AssignRecruiterAsync(acmeOpen);

        using var vendor = await env.CreateVendorAsync("vendor@acme.test", acme);

        var page = await vendor.GetFromJsonAsync<PagedResult<JobResponse>>("/api/jobs", Json);
        Assert.Equal(new[] { acmeOpen, acmeOnHold }.Order(), page!.Items.Select(job => job.Id).Order());
        Assert.All(page.Items, job => Assert.Empty(job.Assignments));

        // Even an explicit filter for another company returns nothing.
        var otherCompany = await vendor.GetFromJsonAsync<PagedResult<JobResponse>>($"/api/jobs?companyId={globex}", Json);
        Assert.Empty(otherCompany!.Items);

        var detail = await vendor.GetFromJsonAsync<JobResponse>($"/api/jobs/{acmeOpen}", Json);
        Assert.Equal("Acme open", detail!.Title);
        Assert.Empty(detail.Assignments);
        Assert.Equal(HttpStatusCode.NotFound, (await vendor.GetAsync($"/api/jobs/{globexOpen}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await vendor.GetAsync($"/api/jobs/{acmeDraft}")).StatusCode);

        // Staff still see assignments.
        var staffView = await env.Admin.GetFromJsonAsync<JobResponse>($"/api/jobs/{acmeOpen}", Json);
        Assert.Single(staffView!.Assignments);
    }

    [Fact]
    public async Task Vendors_cannot_reach_candidates_pipelines_or_admin_areas()
    {
        await using var env = await Env.CreateAsync();
        var acme = await env.CreateCompanyAsync("Acme");
        var job = await env.CreateJobAsync(acme, "Acme open", "Open");
        using var vendor = await env.CreateVendorAsync("vendor@acme.test", acme);

        foreach (var url in new[]
        {
            "/api/candidates",
            $"/api/jobs/{job}/applications/export",
            "/api/applications/insights",
            "/api/companies",
            "/api/skills/options",
            "/api/users"
        })
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await vendor.GetAsync(url)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await vendor.PostAsJsonAsync("/api/jobs", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await vendor.PostAsJsonAsync("/api/candidates", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await vendor.PatchAsJsonAsync($"/api/jobs/{job}/status", new { Status = "Closed" })).StatusCode);

        // Vendors can still manage their own password.
        var change = await vendor.PostAsJsonAsync("/api/auth/change-password", new
        {
            CurrentPassword = TestApiFactory.TestPassword,
            NewPassword = "a-vendor-chosen-password"
        });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
    }

    [Fact]
    public async Task Moving_a_vendor_to_another_company_changes_what_they_see_after_signing_in_again()
    {
        await using var env = await Env.CreateAsync();
        var acme = await env.CreateCompanyAsync("Acme");
        var globex = await env.CreateCompanyAsync("Globex");
        var acmeJob = await env.CreateJobAsync(acme, "Acme open", "Open");
        var globexJob = await env.CreateJobAsync(globex, "Globex open", "Open");
        using var vendor = await env.CreateVendorAsync("vendor@acme.test", acme);
        var vendorId = (await env.Admin.GetFromJsonAsync<PagedResult<UserResponse>>("/api/users?role=Vendor&search=vendor@acme", Json))!
            .Items.Single().Id;

        var moved = await env.Admin.PutAsJsonAsync($"/api/users/{vendorId}", new
        {
            Email = "vendor@acme.test",
            FullName = "Vee Vendor",
            Roles = new[] { RoleNames.Vendor },
            IsActive = true,
            CompanyId = globex
        });
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);

        using var relogged = await env.SignInAsync("vendor@acme.test");
        var page = await relogged.GetFromJsonAsync<PagedResult<JobResponse>>("/api/jobs", Json);
        Assert.Equal([globexJob], page!.Items.Select(job => job.Id));
        Assert.Equal(HttpStatusCode.NotFound, (await relogged.GetAsync($"/api/jobs/{acmeJob}")).StatusCode);
    }

    [Fact]
    public async Task Vendors_work_their_own_pipeline_without_seeing_personal_details()
    {
        await using var env = await Env.CreateAsync();
        var acme = await env.CreateCompanyAsync("Acme");
        var globex = await env.CreateCompanyAsync("Globex");
        var acmeJob = await env.CreateJobAsync(acme, "Acme open", "Open");
        var globexJob = await env.CreateJobAsync(globex, "Globex open", "Open");
        var priya = await env.SubmitCandidateAsync(acmeJob, "Priya", "priya@mail.test", "9000000051", "Internal: expects 30 LPA");
        var arun = await env.SubmitCandidateAsync(acmeJob, "Arun", "arun@mail.test", "9000000052", null);
        var other = await env.SubmitCandidateAsync(globexJob, "Other", "other@mail.test", "9000000053", null);
        using var vendor = await env.CreateVendorAsync("vendor@acme.test", acme);

        // The pipeline is visible, but redacted.
        var pipelineResponse = await vendor.GetAsync($"/api/jobs/{acmeJob}/applications");
        Assert.Equal(HttpStatusCode.OK, pipelineResponse.StatusCode);
        var raw = await pipelineResponse.Content.ReadAsStringAsync();
        foreach (var secret in new[] { "priya@mail.test", "9000000051", "30 LPA", "Globex Corp", "1994-05-17" })
        {
            Assert.DoesNotContain(secret, raw);
        }

        var pipeline = JsonSerializer.Deserialize<ApplicationResponse[]>(raw, Json)!;
        Assert.Equal(2, pipeline.Length);
        var priyaApp = pipeline.Single(application => application.CandidateName == "Priya");
        Assert.Equal("Software Engineer", priyaApp.CandidateRole);
        Assert.Equal(CandidateLevel.Senior, priyaApp.CandidateLevel);
        Assert.Null(priyaApp.CandidateCompany);
        Assert.All(priyaApp.History, change => Assert.Null(change.Notes));

        // The vendor shortlists, schedules and selects one candidate, and rejects the other.
        var priyaId = priyaApp.Id;
        var arunId = pipeline.Single(application => application.CandidateName == "Arun").Id;
        await env.PostOk(vendor, $"/api/applications/{priyaId}/screening", new { Shortlisted = true, Notes = "Strong profile" });
        await env.PostOk(vendor, $"/api/applications/{priyaId}/interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(2) });
        var selected = await env.PostOk(vendor, $"/api/applications/{priyaId}/outcome", new { Passed = true });
        Assert.Equal(ApplicationStage.Selected, selected.Stage);
        Assert.All(selected.History, change => Assert.Null(change.Notes));

        // Vendors record joining too, but never see internal not-joining notes.
        await env.PostOk(vendor, $"/api/applications/{priyaId}/joining-date",
            new { JoiningDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(20)).ToString("yyyy-MM-dd") });
        var notJoined = await env.PostOk(vendor, $"/api/applications/{priyaId}/joining",
            new { Joined = false, NotJoiningReasons = new[] { "CompensationMismatch" }, Notes = "Wanted 35 LPA" });
        Assert.Equal(ApplicationStage.NotJoined, notJoined.Stage);
        Assert.Equal([NotJoiningReason.CompensationMismatch], notJoined.NotJoiningReasons);
        Assert.Null(notJoined.NotJoiningNotes);
        var staffJoining = await env.Admin.GetFromJsonAsync<ApplicationResponse>($"/api/applications/{priyaId}", Json);
        Assert.Equal("Wanted 35 LPA", staffJoining!.NotJoiningNotes);
        await env.PostOk(vendor, $"/api/applications/{arunId}/screening", new { Shortlisted = false, RejectionReasons = new[] { "SkillMismatch" } });

        // Staff see the vendor's actions, including the vendor's note and the full profile.
        var staffView = await env.Admin.GetFromJsonAsync<ApplicationResponse>($"/api/applications/{priyaId}", Json);
        Assert.Equal("Globex Corp", staffView!.CandidateCompany);
        Assert.Contains(staffView.History, change => change.Notes == "Strong profile" && change.ChangedByName == "Vee Vendor");

        // Another company's candidates and draft jobs are invisible to the vendor.
        var otherId = (await env.Admin.GetFromJsonAsync<CandidateResponse>($"/api/candidates/{other}", Json))!.Applications[0].Id;
        Assert.Equal(HttpStatusCode.NotFound, (await vendor.GetAsync($"/api/applications/{otherId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await vendor.PostAsJsonAsync($"/api/applications/{otherId}/screening", new { Shortlisted = true })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await vendor.GetAsync($"/api/jobs/{globexJob}/applications")).StatusCode);
        var draft = await env.CreateJobAsync(acme, "Acme draft");
        Assert.Equal(HttpStatusCode.NotFound, (await vendor.GetAsync($"/api/jobs/{draft}/applications")).StatusCode);

        // Candidate profiles stay staff-only.
        Assert.Equal(HttpStatusCode.Forbidden, (await vendor.GetAsync($"/api/candidates/{priya}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await vendor.GetAsync($"/api/candidates/{arun}")).StatusCode);
    }

    private sealed class Env : IAsyncDisposable
    {
        private readonly TestApiFactory _factory;
        private long _recruiterId;

        private Env(TestApiFactory factory, HttpClient admin)
        {
            _factory = factory;
            Admin = admin;
        }

        public HttpClient Admin { get; }

        public static async Task<Env> CreateAsync()
        {
            var factory = new TestApiFactory();
            await factory.SeedUserAsync("admin@example.test", "Admin Anand", RoleNames.Admin);
            await factory.SeedUserAsync("recruiter@example.test", "Recruiter Rao", RoleNames.Recruiter);
            // Ensures the Vendor role exists, as the startup seeder does in production.
            await factory.SeedUserAsync("seed-vendor@example.test", "Seed Vendor", RoleNames.Vendor);
            var env = new Env(factory, await SignIn(factory, "admin@example.test"));
            var recruiters = await env.Admin.GetFromJsonAsync<RecruiterOption[]>("/api/users/recruiters", Json);
            env._recruiterId = recruiters!.Single().Id;
            return env;
        }

        public Task<HttpClient> SignInAsync(string email) => SignIn(_factory, email);

        private static async Task<HttpClient> SignIn(TestApiFactory factory, string email)
        {
            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", await factory.LoginAsync(client, email));
            return client;
        }

        public async Task<long> CreateCompanyAsync(string name, bool isActive = true)
        {
            var response = await Admin.PostAsJsonAsync("/api/companies", new { Name = name, IsActive = isActive });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64();
        }

        public async Task<long> CreateJobAsync(long companyId, string title, string? status)
        {
            var skills = await TestApiFactory.CreateSkillsAsync(Admin, "C#");
            var response = await Admin.PostAsJsonAsync("/api/jobs", new
            {
                CompanyId = companyId,
                Title = title,
                MinExperienceYears = 1,
                MaxExperienceYears = 5,
                Openings = 1,
                EmploymentType = "FullTime",
                WorkMode = "Remote",
                InterviewRounds = new[] { "Technical interview" },
                Skills = new[] { new { SkillId = skills["C#"], SkillType = "Primary" } }
            });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var jobId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64();
            if (status is not null)
            {
                var patch = await Admin.PatchAsJsonAsync($"/api/jobs/{jobId}/status", new { Status = status });
                Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
            }

            return jobId;
        }

        public Task<long> CreateJobAsync(long companyId, string title) => CreateJobAsync(companyId, title, status: null);

        public async Task AssignRecruiterAsync(long jobId)
        {
            var response = await Admin.PostAsJsonAsync($"/api/jobs/{jobId}/assignments", new { RecruiterUserId = _recruiterId });
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        public async Task<HttpClient> CreateVendorAsync(string email, long companyId)
        {
            var response = await Admin.PostAsJsonAsync("/api/users", new
            {
                Email = email,
                FullName = "Vee Vendor",
                Password = TestApiFactory.TestPassword,
                Roles = new[] { RoleNames.Vendor },
                CompanyId = companyId
            });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await SignInAsync(email);
        }

        /// <summary>
        /// Staff adds a candidate and submits them to the job; returns the candidate id.
        /// An internal note goes on both the profile and the submission's timeline entry.
        /// </summary>
        public async Task<long> SubmitCandidateAsync(long jobId, string name, string email, string phone, string? internalNote)
        {
            var response = await Admin.PostAsJsonAsync("/api/candidates", new
            {
                FullName = name,
                CurrentRole = "Software Engineer",
                CurrentCompany = "Globex Corp",
                Level = "Senior",
                DateOfBirth = "1994-05-17",
                Phone = phone,
                PersonalEmail = email,
                CurrentCtcLpa = 18.5m,
                ExpectedCtcLpa = 30m,
                NoticePeriodDays = 30,
                Notes = internalNote
            });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var candidateId = (await response.Content.ReadFromJsonAsync<CandidateResponse>(Json))!.Id;

            var submitted = await Admin.PostAsJsonAsync($"/api/candidates/{candidateId}/applications", new { JobId = jobId, Notes = internalNote });
            Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
            return candidateId;
        }

        public async Task<ApplicationResponse> PostOk(HttpClient client, string url, object body)
        {
            var response = await client.PostAsJsonAsync(url, body);
            if (!response.IsSuccessStatusCode)
            {
                Assert.Fail($"POST {url} returned {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            return (await response.Content.ReadFromJsonAsync<ApplicationResponse>(Json))!;
        }

        public ValueTask DisposeAsync()
        {
            Admin.Dispose();
            _factory.Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
