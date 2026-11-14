using System.ComponentModel.DataAnnotations;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Authorize]
[Route("api/jobs")]
public sealed class JobsController(IJobService jobService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<JobResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<JobResponse>>> GetPage(
        [FromQuery, StringLength(200)] string? search,
        [FromQuery] long? companyId,
        [FromQuery] JobStatus? status,
        [FromQuery, Range(1, 1_000_000)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await jobService.GetPageAsync(
            search,
            companyId,
            status,
            page,
            pageSize,
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(JobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var job = await jobService.GetByIdAsync(id, cancellationToken);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(typeof(JobResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<JobResponse>> Create(
        [FromBody] JobWriteRequest request,
        CancellationToken cancellationToken)
    {
        var job = await jobService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = job.Id }, job);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(typeof(JobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobResponse>> Update(
        long id,
        [FromBody] JobWriteRequest request,
        CancellationToken cancellationToken)
    {
        var job = await jobService.UpdateAsync(id, request, cancellationToken);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(typeof(JobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobResponse>> UpdateStatus(
        long id,
        [FromBody] JobStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var job = await jobService.UpdateStatusAsync(id, request.Status, cancellationToken);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPost("{id:long}/assignments")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignRecruiter(
        long id,
        [FromBody] AssignRecruiterRequest request,
        CancellationToken cancellationToken)
    {
        return await jobService.AssignRecruiterAsync(id, request.RecruiterUserId, cancellationToken)
            ? NoContent()
            : NotFound();
    }

    [HttpDelete("{id:long}/assignments/{recruiterUserId:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveRecruiter(
        long id,
        long recruiterUserId,
        CancellationToken cancellationToken)
    {
        return await jobService.RemoveRecruiterAsync(id, recruiterUserId, cancellationToken)
            ? NoContent()
            : NotFound();
    }

    public sealed record AssignRecruiterRequest([Required] long RecruiterUserId);
}
