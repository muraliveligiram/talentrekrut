using System.ComponentModel.DataAnnotations;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>The shared skill library. Admins and recruiters can add skills; only admins edit or deactivate them.</summary>
[ApiController]
[Authorize]
[Route("api/skills")]
public sealed class SkillsController(ISkillService skillService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<SkillResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<SkillResponse>>> GetPage(
        [FromQuery, StringLength(100)] string? search,
        [FromQuery] SkillCategory? category,
        [FromQuery] bool? isActive,
        [FromQuery, Range(1, 1_000_000)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await skillService.GetPageAsync(search, category, isActive, page, pageSize, cancellationToken));
    }

    [HttpGet("options")]
    [ProducesResponseType(typeof(IReadOnlyList<SkillOption>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SkillOption>>> GetOptions(CancellationToken cancellationToken)
    {
        return Ok(await skillService.GetActiveOptionsAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Recruiter}")]
    [ProducesResponseType(typeof(CreateSkillsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateSkillsResponse>> Create(
        [FromBody] CreateSkillsRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await skillService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(typeof(SkillResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SkillResponse>> Update(
        long id,
        [FromBody] UpdateSkillRequest request,
        CancellationToken cancellationToken)
    {
        var skill = await skillService.UpdateAsync(id, request, cancellationToken);
        return skill is null ? NotFound() : Ok(skill);
    }
}
