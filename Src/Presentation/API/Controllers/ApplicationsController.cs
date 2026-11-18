using API.Infrastructure.Exports;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.PipelineUsers)]
[Route("api")]
public sealed class ApplicationsController(
    IApplicationService applicationService,
    TimeProvider timeProvider) : ControllerBase
{
    [HttpGet("jobs/{jobId:long}/applications")]
    [ProducesResponseType(typeof(IReadOnlyList<ApplicationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ApplicationResponse>>> GetForJob(
        long jobId,
        CancellationToken cancellationToken)
    {
        var applications = await applicationService.GetForJobAsync(jobId, cancellationToken);
        return applications is null ? NotFound() : Ok(applications);
    }

    /// <summary>
    /// Downloads every candidate submitted to the job as an Excel workbook.
    /// Pass the browser's IANA <paramref name="timeZone"/> (e.g. "Asia/Kolkata") so times match the user's clock.
    /// </summary>
    [HttpGet("jobs/{jobId:long}/applications/export")]
    [Authorize(Roles = RoleNames.Staff)]
    [Produces(CandidateExportWorkbook.ContentType)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExportForJob(
        long jobId,
        [FromQuery] string? timeZone,
        CancellationToken cancellationToken)
    {
        var export = await applicationService.GetJobExportAsync(jobId, cancellationToken);
        if (export is null)
        {
            return NotFound();
        }

        var zone = ResolveTimeZone(timeZone);
        var generatedAt = timeProvider.GetUtcNow();
        var content = CandidateExportWorkbook.Build(export, zone, generatedAt);
        return File(content, CandidateExportWorkbook.ContentType, CandidateExportWorkbook.FileName(export, zone, generatedAt));
    }

    private static TimeZoneInfo ResolveTimeZone(string? timeZone)
    {
        if (!string.IsNullOrWhiteSpace(timeZone) && timeZone.Length <= 64
            && TimeZoneInfo.TryFindSystemTimeZoneById(timeZone, out var zone))
        {
            return zone;
        }

        return TimeZoneInfo.Utc;
    }

    [HttpGet("applications/{id:long}")]
    [ProducesResponseType(typeof(ApplicationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplicationResponse>> GetById(long id, CancellationToken cancellationToken)
    {
        return OkOrNotFound(await applicationService.GetByIdAsync(id, cancellationToken));
    }

    /// <summary>Removes the candidate from this job's pipeline (admins only). The candidate profile is kept.</summary>
    [HttpDelete("applications/{id:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remove(long id, CancellationToken cancellationToken)
    {
        return await applicationService.RemoveAsync(id, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPost("applications/{id:long}/screening")]
    [ProducesResponseType(typeof(ApplicationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApplicationResponse>> Screen(
        long id,
        [FromBody] ScreeningDecisionRequest request,
        CancellationToken cancellationToken)
    {
        return OkOrNotFound(await applicationService.ScreenAsync(id, request, cancellationToken));
    }

    [HttpPost("applications/{id:long}/interview")]
    [ProducesResponseType(typeof(ApplicationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApplicationResponse>> ScheduleInterview(
        long id,
        [FromBody] ScheduleInterviewRequest request,
        CancellationToken cancellationToken)
    {
        return OkOrNotFound(await applicationService.ScheduleInterviewAsync(id, request, cancellationToken));
    }

    [HttpPost("applications/{id:long}/outcome")]
    [ProducesResponseType(typeof(ApplicationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApplicationResponse>> RecordOutcome(
        long id,
        [FromBody] InterviewOutcomeRequest request,
        CancellationToken cancellationToken)
    {
        return OkOrNotFound(await applicationService.RecordOutcomeAsync(id, request, cancellationToken));
    }

    /// <summary>Selections, submission outcomes and per-recruiter activity over the last <paramref name="days"/> days.</summary>
    [HttpGet("applications/insights")]
    [Authorize(Roles = RoleNames.Staff)]
    [ProducesResponseType(typeof(PipelineInsightsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PipelineInsightsResponse>> GetInsights(
        [FromQuery] int days = 60,
        CancellationToken cancellationToken = default)
    {
        return Ok(await applicationService.GetInsightsAsync(days, cancellationToken));
    }

    [HttpGet("applications/stats")]
    [Authorize(Roles = RoleNames.Staff)]
    [ProducesResponseType(typeof(PipelineStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PipelineStatsResponse>> GetStats(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to,
        CancellationToken cancellationToken)
    {
        return Ok(await applicationService.GetStatsAsync(from, to, cancellationToken));
    }

    private ActionResult<ApplicationResponse> OkOrNotFound(ApplicationResponse? application) =>
        application is null ? NotFound() : Ok(application);
}
