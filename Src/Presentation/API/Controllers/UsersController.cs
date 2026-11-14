using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Admin)]
[Route("api/users")]
public sealed class UsersController(IJobService jobService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RecruiterOption>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<RecruiterOption>>> GetByRole(
        [FromQuery] string role,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(role, RoleNames.Recruiter, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest();
        }

        return Ok(await jobService.GetRecruitersAsync(cancellationToken));
    }
}
