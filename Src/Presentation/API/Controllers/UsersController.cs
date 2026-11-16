using System.ComponentModel.DataAnnotations;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Admin)]
[Route("api/users")]
public sealed class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<UserResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<UserResponse>>> GetPage(
        [FromQuery, StringLength(200)] string? search,
        [FromQuery, StringLength(50)] string? role,
        [FromQuery] bool? isActive,
        [FromQuery, Range(1, 1_000_000)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await userService.GetPageAsync(search, role, isActive, page, pageSize, cancellationToken));
    }

    [HttpGet("recruiters")]
    [ProducesResponseType(typeof(IReadOnlyList<RecruiterOption>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RecruiterOption>>> GetRecruiters(
        CancellationToken cancellationToken)
    {
        return Ok(await userService.GetRecruiterOptionsAsync(cancellationToken));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> GetById(long id, CancellationToken cancellationToken)
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> Update(
        long id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userService.UpdateAsync(id, request, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost("{id:long}/reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword(
        long id,
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        return await userService.ResetPasswordAsync(id, request, cancellationToken)
            ? NoContent()
            : NotFound();
    }
}
