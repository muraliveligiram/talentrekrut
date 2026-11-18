using System.ComponentModel.DataAnnotations;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Staff)]
[Route("api/candidates")]
public sealed class CandidatesController(ICandidateService candidateService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CandidateSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CandidateSummaryResponse>>> GetPage(
        [FromQuery, StringLength(200)] string? search,
        [FromQuery] CandidateLevel? level,
        [FromQuery] ApplicationStage? stage,
        [FromQuery, Range(1, 1_000_000)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await candidateService.GetPageAsync(search, level, stage, page, pageSize, cancellationToken));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(CandidateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CandidateResponse>> GetById(long id, CancellationToken cancellationToken)
    {
        var candidate = await candidateService.GetByIdAsync(id, cancellationToken);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CandidateResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CandidateResponse>> Create(
        [FromBody] CreateCandidateRequest request,
        CancellationToken cancellationToken)
    {
        var candidate = await candidateService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = candidate.Id }, candidate);
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(CandidateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CandidateResponse>> Update(
        long id,
        [FromBody] CandidateWriteRequest request,
        CancellationToken cancellationToken)
    {
        var candidate = await candidateService.UpdateAsync(id, request, cancellationToken);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        return await candidateService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPost("{id:long}/applications")]
    [ProducesResponseType(typeof(ApplicationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApplicationResponse>> SubmitToJob(
        long id,
        [FromBody] SubmitToJobRequest request,
        CancellationToken cancellationToken)
    {
        var application = await candidateService.SubmitToJobAsync(id, request, cancellationToken);
        return application is null
            ? NotFound()
            : CreatedAtAction(
                nameof(ApplicationsController.GetById),
                "Applications",
                new { id = application.Id },
                application);
    }
}
