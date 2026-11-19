using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Applications.Contracts;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Domain.Entities;
using Xunit;

namespace IntegrationTests;

[Collection(ApiIntegrationTestCollection.Name)]
public sealed class CandidateTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task Recruiter_moves_candidate_from_submission_to_selection()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("Backend Engineer", assignRecruiter: true);

        var candidate = await env.CreateCandidateAsync(env.Recruiter, "Priya Sharma", "priya@mail.test", "+91 98765 43210", jobId);
        var application = Assert.Single(candidate.Applications);
        Assert.Equal(ApplicationStage.Screening, application.Stage);
        Assert.Equal(jobId, application.JobId);
        Assert.Equal("Recruiter Rao", candidate.SourcedByName);

        var shortlisted = await env.PostAsync<ApplicationResponse>(env.Recruiter,
            $"/api/applications/{application.Id}/screening", new { Shortlisted = true, Notes = "Strong .NET background" });
        Assert.Equal(ApplicationStage.Shortlisted, shortlisted.Stage);

        var firstSlot = DateTimeOffset.UtcNow.AddDays(2);
        await env.PostAsync<ApplicationResponse>(env.Recruiter,
            $"/api/applications/{application.Id}/interview", new { ScheduledAt = firstSlot });
        var secondSlot = DateTimeOffset.UtcNow.AddDays(3);
        var rescheduled = await env.PostAsync<ApplicationResponse>(env.Recruiter,
            $"/api/applications/{application.Id}/interview", new { ScheduledAt = secondSlot, Notes = "Panel moved" });
        Assert.Equal(ApplicationStage.InterviewScheduled, rescheduled.Stage);
        Assert.Equal(secondSlot.ToUnixTimeSeconds(), rescheduled.InterviewScheduledAt!.Value.ToUnixTimeSeconds());

        var selected = await env.PostAsync<ApplicationResponse>(env.Recruiter,
            $"/api/applications/{application.Id}/outcome", new { Passed = true });
        Assert.Equal(ApplicationStage.Selected, selected.Stage);
        Assert.Equal(
            [ApplicationStage.Screening, ApplicationStage.Shortlisted, ApplicationStage.InterviewScheduled,
             ApplicationStage.InterviewScheduled, ApplicationStage.Selected],
            selected.History.Select(change => change.ToStage));
        Assert.Equal("Strong .NET background", selected.History[1].Notes);

        var tooLate = await env.Send(env.Recruiter, HttpMethod.Post,
            $"/api/applications/{application.Id}/interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(5) });
        Assert.Equal(HttpStatusCode.Conflict, tooLate.StatusCode);

        var pipeline = await env.GetAsync<ApplicationResponse[]>(env.Admin, $"/api/jobs/{jobId}/applications");
        Assert.Equal(ApplicationStage.Selected, Assert.Single(pipeline).Stage);
    }

    [Fact]
    public async Task Rejections_require_reasons_after_interview()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("QA Engineer");
        var screenedOut = await env.CreateCandidateAsync(env.Admin, "Arun", "arun@mail.test", "9000000001", jobId);
        var interviewed = await env.CreateCandidateAsync(env.Admin, "Bala", "bala@mail.test", "9000000002", jobId);

        var notShortlisted = await env.PostAsync<ApplicationResponse>(env.Admin,
            $"/api/applications/{screenedOut.Applications[0].Id}/screening", new { Shortlisted = false });
        Assert.Equal(ApplicationStage.NotShortlisted, notShortlisted.Stage);

        var id = interviewed.Applications[0].Id;
        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Admin, HttpMethod.Post,
            $"/api/applications/{id}/outcome", new { Passed = true })).StatusCode);
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{id}/screening", new { Shortlisted = true });
        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post,
            $"/api/applications/{id}/interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddHours(-1) })).StatusCode);
        await env.PostAsync<ApplicationResponse>(env.Admin,
            $"/api/applications/{id}/interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(1) });

        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post,
            $"/api/applications/{id}/outcome", new { Passed = false })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post,
            $"/api/applications/{id}/outcome", new { Passed = false, RejectionReasons = new[] { "Other" } })).StatusCode);

        var rejected = await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{id}/outcome", new
        {
            Passed = false,
            RejectionReasons = new[] { "SkillMismatch", "CtcExpectationTooHigh" },
            Notes = "Weak on system design"
        });
        Assert.Equal(ApplicationStage.Rejected, rejected.Stage);
        Assert.Equal([RejectionReason.SkillMismatch, RejectionReason.CtcExpectationTooHigh], rejected.RejectionReasons);
        Assert.Equal("Weak on system design", rejected.RejectionNotes);
    }

    [Fact]
    public async Task Candidate_profile_is_validated_and_duplicates_are_detected()
    {
        await using var env = await Env.CreateAsync();
        var existing = await env.CreateCandidateAsync(env.Admin, "Chitra", "chitra@mail.test", "+91 90000 00003", jobId: null);

        var minor = await env.Send(env.Admin, HttpMethod.Post, "/api/candidates",
            Env.CandidatePayload("Kid", "kid@mail.test", "9000000004", dateOfBirth: DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-10))));
        Assert.Equal(HttpStatusCode.BadRequest, minor.StatusCode);

        var badLinkedIn = await env.Send(env.Admin, HttpMethod.Post, "/api/candidates",
            Env.CandidatePayload("Dev", "dev@mail.test", "9000000005", linkedIn: "https://example.com/dev"));
        Assert.Equal(HttpStatusCode.BadRequest, badLinkedIn.StatusCode);

        var variableWithoutFlag = await env.Send(env.Admin, HttpMethod.Post, "/api/candidates",
            Env.CandidatePayload("Var", "var@mail.test", "9000000006", includesVariable: false, variablePay: 2));
        Assert.Equal(HttpStatusCode.BadRequest, variableWithoutFlag.StatusCode);

        var duplicatePhone = await env.Send(env.Admin, HttpMethod.Post, "/api/candidates",
            Env.CandidatePayload("Other Person", "other@mail.test", "919000000003"));
        Assert.Equal(HttpStatusCode.Conflict, duplicatePhone.StatusCode);
        var problem = await duplicatePhone.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(existing.Id, problem.GetProperty("existingCandidateId").GetInt64());
        Assert.Contains("phone", problem.GetProperty("title").GetString());

        var duplicateEmail = await env.Send(env.Admin, HttpMethod.Post, "/api/candidates",
            Env.CandidatePayload("Again", " CHITRA@mail.test ", "9000000007"));
        Assert.Equal(HttpStatusCode.Conflict, duplicateEmail.StatusCode);

        var update = await env.Send(env.Admin, HttpMethod.Put, $"/api/candidates/{existing.Id}",
            Env.CandidatePayload("Chitra K", "chitra@mail.test", "+91 90000 00003", includesVariable: true, variablePay: 3));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = (await update.Content.ReadFromJsonAsync<CandidateResponse>(Json))!;
        Assert.Equal("Chitra K", updated.FullName);
        Assert.Equal(3, updated.VariablePayLpa);
    }

    [Fact]
    public async Task Submissions_require_an_open_visible_job_and_are_unique()
    {
        await using var env = await Env.CreateAsync();
        var openJob = await env.CreateOpenJobAsync("Open role", assignRecruiter: true);
        var unassignedJob = await env.CreateOpenJobAsync("Unassigned role");
        var draftJob = await env.CreateJobAsync("Draft role");
        var candidate = await env.CreateCandidateAsync(env.Recruiter, "Deepa", "deepa@mail.test", "9000000008", jobId: null);

        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Admin, HttpMethod.Post,
            $"/api/candidates/{candidate.Id}/applications", new { JobId = draftJob })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Recruiter, HttpMethod.Post,
            $"/api/candidates/{candidate.Id}/applications", new { JobId = unassignedJob })).StatusCode);

        var submitted = await env.Send(env.Recruiter, HttpMethod.Post,
            $"/api/candidates/{candidate.Id}/applications", new { JobId = openJob, Notes = "Referred by team lead" });
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        var application = (await submitted.Content.ReadFromJsonAsync<ApplicationResponse>(Json))!;
        Assert.Equal("Referred by team lead", Assert.Single(application.History).Notes);

        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Recruiter, HttpMethod.Post,
            $"/api/candidates/{candidate.Id}/applications", new { JobId = openJob })).StatusCode);
    }

    [Fact]
    public async Task Recruiters_only_see_their_own_candidates_and_jobs()
    {
        await using var env = await Env.CreateAsync();
        var assignedJob = await env.CreateOpenJobAsync("Assigned", assignRecruiter: true);
        var otherJob = await env.CreateOpenJobAsync("Other");
        var mine = await env.CreateCandidateAsync(env.Recruiter, "Mine", "mine@mail.test", "9000000010", assignedJob);
        var adminsOnOtherJob = await env.CreateCandidateAsync(env.Admin, "Hidden", "hidden@mail.test", "9000000011", otherJob);
        var adminsOnMyJob = await env.CreateCandidateAsync(env.Admin, "Shared", "shared@mail.test", "9000000012", assignedJob);
        await env.Send(env.Admin, HttpMethod.Post, $"/api/candidates/{adminsOnMyJob.Id}/applications", new { JobId = otherJob });

        var page = await env.GetAsync<PagedResult<CandidateSummaryResponse>>(env.Recruiter, "/api/candidates");
        Assert.Equal([adminsOnMyJob.Id, mine.Id], page.Items.Select(item => item.Id).Order().ToArray().Reverse());

        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Recruiter, HttpMethod.Get,
            $"/api/candidates/{adminsOnOtherJob.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Recruiter, HttpMethod.Get,
            $"/api/jobs/{otherJob}/applications")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Recruiter, HttpMethod.Post,
            $"/api/applications/{adminsOnOtherJob.Applications[0].Id}/screening", new { Shortlisted = true })).StatusCode);

        var shared = await env.GetAsync<CandidateResponse>(env.Recruiter, $"/api/candidates/{adminsOnMyJob.Id}");
        Assert.Equal(assignedJob, Assert.Single(shared.Applications).JobId);

        Assert.Equal(HttpStatusCode.Forbidden, (await env.Send(env.Recruiter, HttpMethod.Delete,
            $"/api/candidates/{mine.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await env.Send(env.Admin, HttpMethod.Delete,
            $"/api/candidates/{mine.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Admin, HttpMethod.Get,
            $"/api/candidates/{mine.Id}")).StatusCode);
    }

    [Fact]
    public async Task Stats_count_active_candidates_and_interviews_in_range()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("Stats role");
        var a = await env.CreateCandidateAsync(env.Admin, "A", "a@mail.test", "9000000020", jobId);
        var b = await env.CreateCandidateAsync(env.Admin, "B", "b@mail.test", "9000000021", jobId);
        await env.CreateCandidateAsync(env.Admin, "C", "c@mail.test", "9000000022", jobId);
        var interviewAt = DateTimeOffset.UtcNow.AddDays(1);
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{a.Applications[0].Id}/screening", new { Shortlisted = true });
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{a.Applications[0].Id}/interview", new { ScheduledAt = interviewAt });
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{b.Applications[0].Id}/screening", new { Shortlisted = false });

        var from = Uri.EscapeDataString(DateTimeOffset.UtcNow.ToString("O"));
        var to = Uri.EscapeDataString(DateTimeOffset.UtcNow.AddDays(7).ToString("O"));
        var stats = await env.GetAsync<PipelineStatsResponse>(env.Admin, $"/api/applications/stats?from={from}&to={to}");

        Assert.Equal(2, stats.ActiveCandidates);
        Assert.Equal(1, stats.InterviewsInRange);
    }

    [Fact]
    public async Task Exports_every_candidate_on_a_job_to_excel()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("Data Engineer", assignRecruiter: true);
        var otherJob = await env.CreateOpenJobAsync("Unassigned role");
        var screening = await env.CreateCandidateAsync(env.Recruiter, "Zara", "zara@mail.test", "+91 90000 00030", jobId);
        var rejected = await env.CreateCandidateAsync(env.Recruiter, "Arjun", "arjun@mail.test", "9000000031", jobId);
        var interviewing = await env.CreateCandidateAsync(env.Admin, "Meera", "meera@mail.test", "9000000032", jobId);
        await env.CreateCandidateAsync(env.Admin, "Elsewhere", "else@mail.test", "9000000033", otherJob);

        var tricky = Env.CandidatePayload("Zara", "zara@mail.test", "+91 90000 00030");
        tricky["notes"] = "=HYPERLINK(\"http://evil.test\",\"click\")";
        Assert.Equal(HttpStatusCode.OK, (await env.Send(env.Recruiter, HttpMethod.Put, $"/api/candidates/{screening.Id}", tricky)).StatusCode);

        foreach (var (id, shortlisted) in new[] { (rejected.Applications[0].Id, true), (interviewing.Applications[0].Id, true) })
        {
            await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{id}/screening", new { Shortlisted = shortlisted });
        }

        var interviewAt = new DateTimeOffset(DateTime.UtcNow.Date.AddDays(3).AddHours(5).AddMinutes(30), TimeSpan.Zero);
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{interviewing.Applications[0].Id}/interview", new { ScheduledAt = interviewAt });
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{rejected.Applications[0].Id}/interview", new { ScheduledAt = interviewAt });
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{rejected.Applications[0].Id}/outcome", new
        {
            Passed = false,
            RejectionReasons = new[] { "SkillMismatch", "NoticePeriodTooLong" }
        });

        var response = await env.Send(env.Recruiter, HttpMethod.Get, $"/api/jobs/{jobId}/applications/export?timeZone=Asia/Kolkata");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.Content.Headers.ContentType?.MediaType);
        Assert.Matches(@"^JOB-\d{4}-\d{4}-candidates-\d{4}-\d{2}-\d{2}\.xlsx$", response.Content.Headers.ContentDisposition?.FileNameStar);

        using var workbook = new XLWorkbook(await response.Content.ReadAsStreamAsync());
        var sheet = workbook.Worksheet("Candidates");
        var headers = sheet.Row(1).CellsUsed().Select(cell => cell.GetString()).ToList();
        string Cell(int row, string header) => sheet.Cell(row, headers.IndexOf(header) + 1).GetFormattedString();
        int RowOf(string name) => Enumerable.Range(2, 3).Single(row => Cell(row, "Candidate") == name);

        Assert.Equal(4, sheet.LastRowUsed()!.RowNumber());
        Assert.Equal(["Zara", "Meera", "Arjun"], Enumerable.Range(2, 3).Select(row => Cell(row, "Candidate")));
        Assert.Equal("Screening", Cell(RowOf("Zara"), "Stage"));
        Assert.Equal("+91 90000 00030", Cell(RowOf("Zara"), "Phone"));
        var notes = sheet.Cell(RowOf("Zara"), headers.IndexOf("Candidate notes") + 1);
        Assert.False(notes.HasFormula);
        Assert.StartsWith("=HYPERLINK", notes.GetString());

        Assert.Equal("Interview scheduled", Cell(RowOf("Meera"), "Stage"));
        var interviewCell = sheet.Cell(RowOf("Meera"), headers.IndexOf("Interview at") + 1).GetDateTime();
        Assert.Equal(interviewAt.UtcDateTime.AddHours(5.5), interviewCell);

        Assert.Equal("Rejected", Cell(RowOf("Arjun"), "Stage"));
        Assert.Equal("Skill mismatch, Notice period too long", Cell(RowOf("Arjun"), "Rejection reasons"));
        Assert.Equal(18.5, sheet.Cell(RowOf("Arjun"), headers.IndexOf("Current CTC (LPA)") + 1).GetDouble());
        Assert.Equal("Senior", Cell(RowOf("Arjun"), "Level"));
        Assert.Single(sheet.Tables);

        var summary = workbook.Worksheet("Summary");
        var stageCounts = summary.RowsUsed()
            .Where(row => row.Cell(1).GetString() is "Screening" or "Interview scheduled" or "Rejected" or "Selected")
            .ToDictionary(row => row.Cell(1).GetString(), row => row.Cell(2).GetValue<int>());
        Assert.Equal(new Dictionary<string, int> { ["Screening"] = 1, ["Interview scheduled"] = 1, ["Rejected"] = 1, ["Selected"] = 0 }, stageCounts);
        Assert.Contains(summary.RowsUsed(), row => row.Cell(1).GetString() == "Time zone" && row.Cell(2).GetString() == "Asia/Kolkata");

        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Recruiter, HttpMethod.Get, $"/api/jobs/{otherJob}/applications/export")).StatusCode);

        var emptyJob = await env.CreateOpenJobAsync("Empty role");
        var empty = await env.Send(env.Admin, HttpMethod.Get, $"/api/jobs/{emptyJob}/applications/export?timeZone=Not/AZone");
        Assert.Equal(HttpStatusCode.OK, empty.StatusCode);
        using var emptyWorkbook = new XLWorkbook(await empty.Content.ReadAsStreamAsync());
        Assert.Contains("No candidates", emptyWorkbook.Worksheet("Candidates").Cell(2, 1).GetString());
    }

    [Fact]
    public async Task Insights_report_selections_outcomes_and_recruiter_activity_for_the_window()
    {
        await using var env = await Env.CreateAsync();
        var myJob = await env.CreateOpenJobAsync("Assigned", assignRecruiter: true);
        var adminJob = await env.CreateOpenJobAsync("Admin only");

        // Recruiter submits three; admin submits one to the recruiter's job and one to their own job.
        var r1 = await env.CreateCandidateAsync(env.Recruiter, "R1", "r1@mail.test", "9000000041", myJob);
        var r2 = await env.CreateCandidateAsync(env.Recruiter, "R2", "r2@mail.test", "9000000042", myJob);
        await env.CreateCandidateAsync(env.Recruiter, "R3", "r3@mail.test", "9000000043", myJob);
        var a1 = await env.CreateCandidateAsync(env.Admin, "A1", "a1@mail.test", "9000000044", myJob);
        var a2 = await env.CreateCandidateAsync(env.Admin, "A2", "a2@mail.test", "9000000045", adminJob);

        async Task Step(HttpClient client, long applicationId, string path, object body) =>
            await env.PostAsync<ApplicationResponse>(client, $"/api/applications/{applicationId}/{path}", body);
        var soon = DateTimeOffset.UtcNow.AddDays(1);

        // R1: recruiter shortlists, schedules; admin selects.
        await Step(env.Recruiter, r1.Applications[0].Id, "screening", new { Shortlisted = true });
        await Step(env.Recruiter, r1.Applications[0].Id, "interview", new { ScheduledAt = soon });
        await Step(env.Admin, r1.Applications[0].Id, "outcome", new { Passed = true });
        // R2: recruiter marks not shortlisted.
        await Step(env.Recruiter, r2.Applications[0].Id, "screening", new { Shortlisted = false });
        // A1: admin shortlists, interviews, rejects.
        await Step(env.Admin, a1.Applications[0].Id, "screening", new { Shortlisted = true });
        await Step(env.Admin, a1.Applications[0].Id, "interview", new { ScheduledAt = soon });
        await Step(env.Admin, a1.Applications[0].Id, "outcome", new { Passed = false, RejectionReasons = new[] { "CulturalFit" } });
        // A2 (admin-only job): selected, but submitted and decided 90 days ago - outside the window.
        await Step(env.Admin, a2.Applications[0].Id, "screening", new { Shortlisted = true });
        await Step(env.Admin, a2.Applications[0].Id, "interview", new { ScheduledAt = soon });
        await Step(env.Admin, a2.Applications[0].Id, "outcome", new { Passed = true });
        await env.BackdateApplicationAsync(a2.Applications[0].Id, days: 90);

        var admin = await env.GetAsync<PipelineInsightsResponse>(env.Admin, "/api/applications/insights?days=60");
        Assert.Equal(60, admin.Days);
        Assert.Equal(1, admin.SelectedCount);
        Assert.Equal(new SubmissionOutcomes(Submitted: 4, InProgress: 1, NotShortlisted: 1, Selected: 1, Rejected: 1, Joined: 0, NotJoined: 0), admin.Outcomes);

        var recruiterRow = admin.Recruiters.Single(row => row.Name == "Recruiter Rao");
        Assert.Equal(new RecruiterActivity(recruiterRow.UserId, "Recruiter Rao",
            Processed: 3, Submitted: 3, Shortlisted: 1, NotShortlisted: 1, Selected: 0, Rejected: 0), recruiterRow);
        var adminRow = admin.Recruiters.Single(row => row.Name == "Admin Anand");
        Assert.Equal((2, 1, 1, 0, 1, 1), (adminRow.Processed, adminRow.Submitted, adminRow.Shortlisted,
            adminRow.NotShortlisted, adminRow.Selected, adminRow.Rejected));
        Assert.Equal("Recruiter Rao", admin.Recruiters[0].Name);

        var wider = await env.GetAsync<PipelineInsightsResponse>(env.Admin, "/api/applications/insights?days=120");
        Assert.Equal(2, wider.SelectedCount);
        Assert.Equal(5, wider.Outcomes.Submitted);

        // Recruiters only see activity on jobs assigned to them; the admin-only job is excluded.
        var recruiter = await env.GetAsync<PipelineInsightsResponse>(env.Recruiter, "/api/applications/insights?days=120");
        Assert.Equal(1, recruiter.SelectedCount);
        Assert.Equal(4, recruiter.Outcomes.Submitted);

        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Get, "/api/applications/insights?days=0")).StatusCode);
    }

    [Fact]
    public async Task Admins_can_remove_a_candidate_from_one_job_only()
    {
        await using var env = await Env.CreateAsync();
        var jobA = await env.CreateOpenJobAsync("Job A", assignRecruiter: true);
        var jobB = await env.CreateOpenJobAsync("Job B");
        var candidate = await env.CreateCandidateAsync(env.Admin, "Kiran", "kiran@mail.test", "9000000061", jobA);
        var appA = candidate.Applications[0].Id;
        await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{appA}/screening", new { Shortlisted = true });
        await env.Send(env.Admin, HttpMethod.Post, $"/api/candidates/{candidate.Id}/applications", new { JobId = jobB });

        Assert.Equal(HttpStatusCode.Forbidden, (await env.Send(env.Recruiter, HttpMethod.Delete, $"/api/applications/{appA}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Admin, HttpMethod.Delete, "/api/applications/999999")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await env.Send(env.Admin, HttpMethod.Delete, $"/api/applications/{appA}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Admin, HttpMethod.Delete, $"/api/applications/{appA}")).StatusCode);

        Assert.Empty(await env.GetAsync<ApplicationResponse[]>(env.Admin, $"/api/jobs/{jobA}/applications"));
        Assert.Equal(HttpStatusCode.NotFound, (await env.Send(env.Admin, HttpMethod.Get, $"/api/applications/{appA}")).StatusCode);

        // The candidate and their other application are untouched.
        var after = await env.GetAsync<CandidateResponse>(env.Admin, $"/api/candidates/{candidate.Id}");
        Assert.Equal(jobB, Assert.Single(after.Applications).JobId);

        // Removed activity no longer counts in insights, and the candidate can be submitted to the job again.
        var insights = await env.GetAsync<PipelineInsightsResponse>(env.Admin, "/api/applications/insights?days=60");
        Assert.DoesNotContain(insights.Recruiters, row => row.Shortlisted > 0);
        var resubmit = await env.Send(env.Admin, HttpMethod.Post, $"/api/candidates/{candidate.Id}/applications", new { JobId = jobA });
        Assert.Equal(HttpStatusCode.Created, resubmit.StatusCode);
        var fresh = (await resubmit.Content.ReadFromJsonAsync<ApplicationResponse>(Json))!;
        Assert.Equal(ApplicationStage.Screening, fresh.Stage);
        Assert.Single(fresh.History);
    }

    [Fact]
    public async Task Candidates_progress_through_each_interview_round_then_join()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("Platform Engineer", rounds: ["Coding test", "Face to face", "HR discussion"]);
        var candidate = await env.CreateCandidateAsync(env.Admin, "Nisha", "nisha@mail.test", "9000000071", jobId);
        var id = candidate.Applications[0].Id;
        Assert.Equal(["Coding test", "Face to face", "HR discussion"], candidate.Applications[0].Rounds.Select(round => round.Name));
        Assert.All(candidate.Applications[0].Rounds, round => Assert.Equal(RoundStatus.Upcoming, round.Status));

        string Url(string action) => $"/api/applications/{id}/{action}";
        await env.PostAsync<ApplicationResponse>(env.Admin, Url("screening"), new { Shortlisted = true });

        // Round 1: schedule, reschedule, clear.
        var round1 = await env.PostAsync<ApplicationResponse>(env.Admin, Url("interview"), new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(1) });
        Assert.Equal(ApplicationStage.InterviewScheduled, round1.Stage);
        Assert.Equal(RoundStatus.Scheduled, round1.Rounds[0].Status);
        await env.PostAsync<ApplicationResponse>(env.Admin, Url("interview"), new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(2) });
        var cleared1 = await env.PostAsync<ApplicationResponse>(env.Admin, Url("outcome"), new { Passed = true, Notes = "Solid coding" });
        Assert.Equal(ApplicationStage.RoundCleared, cleared1.Stage);
        Assert.Equal([RoundStatus.Cleared, RoundStatus.Upcoming, RoundStatus.Upcoming], cleared1.Rounds.Select(round => round.Status));
        Assert.Null(cleared1.InterviewScheduledAt);

        // Joining actions are not available before selection.
        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Admin, HttpMethod.Post, Url("joining-date"),
            new { JoiningDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)).ToString("yyyy-MM-dd") })).StatusCode);

        // Rounds 2 and 3.
        await env.PostAsync<ApplicationResponse>(env.Admin, Url("interview"), new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(3) });
        Assert.Equal(ApplicationStage.RoundCleared, (await env.PostAsync<ApplicationResponse>(env.Admin, Url("outcome"), new { Passed = true })).Stage);
        await env.PostAsync<ApplicationResponse>(env.Admin, Url("interview"), new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(4) });
        var selected = await env.PostAsync<ApplicationResponse>(env.Admin, Url("outcome"), new { Passed = true });
        Assert.Equal(ApplicationStage.Selected, selected.Stage);
        Assert.All(selected.Rounds, round => Assert.Equal(RoundStatus.Cleared, round.Status));
        Assert.Contains(selected.History, change => change.RoundName == "Round 2 · Face to face" && change.ToStage == ApplicationStage.InterviewScheduled);
        Assert.Contains(selected.History, change => change.RoundName == "Round 1 · Coding test" && change.ToStage == ApplicationStage.RoundCleared);

        // No more rounds to schedule once selected.
        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Admin, HttpMethod.Post, Url("interview"),
            new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(5) })).StatusCode);

        // Joining: a date is required first; then joined.
        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Admin, HttpMethod.Post, Url("joining"), new { Joined = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post, Url("joining-date"),
            new { JoiningDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)).ToString("yyyy-MM-dd") })).StatusCode);
        var joiningDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));
        var dated = await env.PostAsync<ApplicationResponse>(env.Admin, Url("joining-date"), new { JoiningDate = joiningDate.ToString("yyyy-MM-dd") });
        Assert.Equal(ApplicationStage.Selected, dated.Stage);
        Assert.Equal(joiningDate, dated.JoiningDate);
        var joined = await env.PostAsync<ApplicationResponse>(env.Admin, Url("joining"), new { Joined = true });
        Assert.Equal(ApplicationStage.Joined, joined.Stage);
        Assert.Empty(joined.NotJoiningReasons);
    }

    [Fact]
    public async Task Failing_a_round_rejects_and_not_joining_requires_reasons()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("Data Engineer", rounds: ["Coding test", "Face to face", "HR discussion"]);
        var failing = await env.CreateCandidateAsync(env.Admin, "Om", "om@mail.test", "9000000081", jobId);
        var backing = await env.CreateCandidateAsync(env.Admin, "Lata", "lata@mail.test", "9000000082", jobId);

        async Task<ApplicationResponse> Do(long id, string action, object body) =>
            await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{id}/{action}", body);
        async Task ClearAllRounds(long id)
        {
            await Do(id, "screening", new { Shortlisted = true });
            for (var round = 0; round < 3; round++)
            {
                await Do(id, "interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(round + 1) });
                await Do(id, "outcome", new { Passed = true });
            }
        }

        // Fails round 2: rejected, round 2 not cleared, round 3 never reached.
        var failId = failing.Applications[0].Id;
        await Do(failId, "screening", new { Shortlisted = true });
        await Do(failId, "interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(1) });
        await Do(failId, "outcome", new { Passed = true });
        await Do(failId, "interview", new { ScheduledAt = DateTimeOffset.UtcNow.AddDays(2) });
        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post, $"/api/applications/{failId}/outcome", new { Passed = false })).StatusCode);
        var rejected = await Do(failId, "outcome", new { Passed = false, RejectionReasons = new[] { "SkillMismatch" } });
        Assert.Equal(ApplicationStage.Rejected, rejected.Stage);
        Assert.Equal([RoundStatus.Cleared, RoundStatus.NotCleared, RoundStatus.Upcoming], rejected.Rounds.Select(round => round.Status));

        // Selected, but did not join.
        var backId = backing.Applications[0].Id;
        await ClearAllRounds(backId);
        await Do(backId, "joining-date", new { JoiningDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(15)).ToString("yyyy-MM-dd") });
        var url = $"/api/applications/{backId}/joining";
        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post, url, new { Joined = false })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await env.Send(env.Admin, HttpMethod.Post, url, new { Joined = false, NotJoiningReasons = new[] { "Other" } })).StatusCode);
        var notJoined = await Do(backId, "joining", new
        {
            Joined = false,
            NotJoiningReasons = new[] { "AcceptedAnotherOffer", "CounterOfferFromCurrentEmployer" },
            Notes = "Took a 40% counter-offer"
        });
        Assert.Equal(ApplicationStage.NotJoined, notJoined.Stage);
        Assert.Equal([NotJoiningReason.AcceptedAnotherOffer, NotJoiningReason.CounterOfferFromCurrentEmployer], notJoined.NotJoiningReasons);
        Assert.Equal("Took a 40% counter-offer", notJoined.NotJoiningNotes);
        Assert.Equal(HttpStatusCode.Conflict, (await env.Send(env.Admin, HttpMethod.Post, url, new { Joined = true })).StatusCode);

        // Insights count joining outcomes.
        var insights = await env.GetAsync<PipelineInsightsResponse>(env.Admin, "/api/applications/insights?days=60");
        Assert.Equal(1, insights.Outcomes.NotJoined);
        Assert.Equal(1, insights.Outcomes.Rejected);

        // The export carries rounds and joining details.
        var export = await env.Send(env.Admin, HttpMethod.Get, $"/api/jobs/{jobId}/applications/export");
        using var workbook = new XLWorkbook(await export.Content.ReadAsStreamAsync());
        var sheet = workbook.Worksheet("Candidates");
        var headers = sheet.Row(1).CellsUsed().Select(cell => cell.GetString()).ToList();
        var lataRow = Enumerable.Range(2, 2).Single(row => sheet.Cell(row, 1).GetString() == "Lata");
        Assert.Equal("Did not join", sheet.Cell(lataRow, headers.IndexOf("Stage") + 1).GetString());
        Assert.Contains("3. HR discussion: Cleared", sheet.Cell(lataRow, headers.IndexOf("Interview rounds") + 1).GetString());
        Assert.Equal("Accepted another offer, Counter-offer from current employer",
            sheet.Cell(lataRow, headers.IndexOf("Not joining reasons") + 1).GetString());
    }

    [Fact]
    public async Task Interviews_scheduled_before_round_tracking_continue_as_round_one()
    {
        await using var env = await Env.CreateAsync();
        var jobId = await env.CreateOpenJobAsync("Legacy role", rounds: ["Technical", "HR"]);
        var candidate = await env.CreateCandidateAsync(env.Admin, "Old", "old@mail.test", "9000000091", jobId);
        var id = candidate.Applications[0].Id;
        var at = DateTimeOffset.UtcNow.AddDays(1);
        await env.MakeLegacyInterviewAsync(id, at);

        var cleared = await env.PostAsync<ApplicationResponse>(env.Admin, $"/api/applications/{id}/outcome", new { Passed = true });
        Assert.Equal(ApplicationStage.RoundCleared, cleared.Stage);
        Assert.Equal((1, "Technical", RoundStatus.Cleared), (cleared.Rounds[0].Sequence, cleared.Rounds[0].Name, cleared.Rounds[0].Status));
        Assert.Equal(at.ToUnixTimeSeconds(), cleared.Rounds[0].ScheduledAt!.Value.ToUnixTimeSeconds());
        Assert.Equal(RoundStatus.Upcoming, cleared.Rounds[1].Status);
    }

    [Fact]
    public async Task Jobs_report_submitted_candidates_and_applications_show_the_job_status()
    {
        await using var env = await Env.CreateAsync();
        var busy = await env.CreateOpenJobAsync("Busy role", assignRecruiter: true);
        var empty = await env.CreateOpenJobAsync("Empty role");
        var first = await env.CreateCandidateAsync(env.Admin, "First", "first@mail.test", "9000000101", busy);
        await env.CreateCandidateAsync(env.Admin, "Second", "second@mail.test", "9000000102", busy);
        var removed = await env.CreateCandidateAsync(env.Admin, "Third", "third@mail.test", "9000000103", busy);
        await env.Send(env.Admin, HttpMethod.Delete, $"/api/applications/{removed.Applications[0].Id}");

        var page = await env.GetAsync<PagedResult<JobResponse>>(env.Admin, "/api/jobs");
        Assert.Equal(2, page.Items.Single(job => job.Id == busy).CandidateCount);
        Assert.Equal(0, page.Items.Single(job => job.Id == empty).CandidateCount);
        Assert.Equal(2, (await env.GetAsync<JobResponse>(env.Recruiter, $"/api/jobs/{busy}")).CandidateCount);

        Assert.Equal(JobStatus.Open, first.Applications[0].JobStatus);
        await env.Send(env.Admin, HttpMethod.Patch, $"/api/jobs/{busy}/status", new { Status = "Closed" });
        var afterClose = await env.GetAsync<CandidateResponse>(env.Admin, $"/api/candidates/{first.Id}");
        Assert.Equal(JobStatus.Closed, Assert.Single(afterClose.Applications).JobStatus);
    }

    private sealed class Env : IAsyncDisposable
    {
        private readonly TestApiFactory _factory;
        private long _companyId;
        private long _recruiterId;

        private Env(TestApiFactory factory, HttpClient admin, HttpClient recruiter)
        {
            _factory = factory;
            Admin = admin;
            Recruiter = recruiter;
        }

        public HttpClient Admin { get; }
        public HttpClient Recruiter { get; }

        public static async Task<Env> CreateAsync()
        {
            var factory = new TestApiFactory();
            await factory.SeedUserAsync("admin@example.test", "Admin Anand", RoleNames.Admin);
            await factory.SeedUserAsync("recruiter@example.test", "Recruiter Rao", RoleNames.Recruiter);
            var admin = factory.CreateClient();
            admin.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", await factory.LoginAsync(admin, "admin@example.test"));
            var recruiter = factory.CreateClient();
            recruiter.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", await factory.LoginAsync(recruiter, "recruiter@example.test"));

            var env = new Env(factory, admin, recruiter);
            var company = await env.PostAsync<JsonElement>(admin, "/api/companies", new { Name = "Acme", IsActive = true });
            env._companyId = company.GetProperty("id").GetInt64();
            var recruiters = await env.GetAsync<RecruiterOption[]>(admin, "/api/users/recruiters");
            env._recruiterId = recruiters.Single().Id;
            return env;
        }

        public async Task<long> CreateJobAsync(string title, string[]? rounds = null)
        {
            var skills = await TestApiFactory.CreateSkillsAsync(Admin, "C#");
            var job = await PostAsync<JsonElement>(Admin, "/api/jobs", new
            {
                CompanyId = _companyId,
                Title = title,
                MinExperienceYears = 2,
                MaxExperienceYears = 6,
                Openings = 1,
                EmploymentType = "FullTime",
                WorkMode = "Hybrid",
                InterviewRounds = rounds ?? new[] { "Technical interview" },
                Skills = new[] { new { SkillId = skills["C#"], SkillType = "Primary" } }
            });
            return job.GetProperty("id").GetInt64();
        }

        public async Task<long> CreateOpenJobAsync(string title, bool assignRecruiter = false, string[]? rounds = null)
        {
            var jobId = await CreateJobAsync(title, rounds);
            var status = await Send(Admin, HttpMethod.Patch, $"/api/jobs/{jobId}/status", new { Status = "Open" });
            Assert.Equal(HttpStatusCode.OK, status.StatusCode);
            if (assignRecruiter)
            {
                var assign = await Send(Admin, HttpMethod.Post, $"/api/jobs/{jobId}/assignments",
                    new { RecruiterUserId = _recruiterId });
                Assert.Equal(HttpStatusCode.NoContent, assign.StatusCode);
            }

            return jobId;
        }

        public async Task<CandidateResponse> CreateCandidateAsync(
            HttpClient client, string name, string email, string phone, long? jobId)
        {
            var payload = CandidatePayload(name, email, phone);
            payload["jobId"] = jobId;
            return await PostAsync<CandidateResponse>(client, "/api/candidates", payload);
        }

        public static Dictionary<string, object?> CandidatePayload(
            string name,
            string email,
            string phone,
            DateOnly? dateOfBirth = null,
            string? linkedIn = null,
            bool includesVariable = true,
            decimal? variablePay = null) => new()
        {
            ["fullName"] = name,
            ["currentRole"] = "Software Engineer",
            ["currentCompany"] = "Globex",
            ["level"] = "Senior",
            ["dateOfBirth"] = (dateOfBirth ?? new DateOnly(1994, 5, 17)).ToString("yyyy-MM-dd"),
            ["phone"] = phone,
            ["personalEmail"] = email,
            ["companyEmail"] = "work@globex.test",
            ["currentCtcLpa"] = 18.5m,
            ["currentCtcIncludesVariable"] = includesVariable,
            ["variablePayLpa"] = variablePay,
            ["expectedCtcLpa"] = 25m,
            ["noticePeriodDays"] = 60,
            ["linkedInUrl"] = linkedIn ?? "https://www.linkedin.com/in/someone",
            ["notes"] = "Open to relocation"
        };

        /// <summary>Simulates an interview scheduled before per-round tracking existed (no round records).</summary>
        public async Task MakeLegacyInterviewAsync(long applicationId, DateTimeOffset scheduledAt)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<Repository.RekrutDbContext>();
            var application = await db.JobApplications.SingleAsync(item => item.Id == applicationId);
            application.Stage = ApplicationStage.InterviewScheduled;
            application.InterviewScheduledAt = scheduledAt;
            await db.SaveChangesAsync();
        }

        /// <summary>Moves an application's submission and every workflow step back in time.</summary>
        public async Task BackdateApplicationAsync(long applicationId, int days)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<Repository.RekrutDbContext>();
            var application = await db.JobApplications
                .Include(item => item.History)
                .SingleAsync(item => item.Id == applicationId);
            application.SubmittedAt = application.SubmittedAt.AddDays(-days);
            foreach (var change in application.History)
            {
                change.ChangedAt = change.ChangedAt.AddDays(-days);
            }

            await db.SaveChangesAsync();
        }

        public Task<HttpResponseMessage> Send(HttpClient client, HttpMethod method, string url, object? body = null)
        {
            var request = new HttpRequestMessage(method, url);
            if (body is not null)
            {
                request.Content = JsonContent.Create(body);
            }

            return client.SendAsync(request);
        }

        public async Task<T> PostAsync<T>(HttpClient client, string url, object body)
        {
            var response = await client.PostAsJsonAsync(url, body);
            if (!response.IsSuccessStatusCode)
            {
                Assert.Fail($"POST {url} returned {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            return (await response.Content.ReadFromJsonAsync<T>(Json))!;
        }

        public async Task<T> GetAsync<T>(HttpClient client, string url)
        {
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                Assert.Fail($"GET {url} returned {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            return (await response.Content.ReadFromJsonAsync<T>(Json))!;
        }

        public ValueTask DisposeAsync()
        {
            Admin.Dispose();
            Recruiter.Dispose();
            _factory.Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
