using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Applications.Abstractions;
using Applications.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, IUserService userService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var token = await authService.LoginAsync(
            request.Email,
            request.Password,
            cancellationToken);

        return token is null
            ? Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid email or password.")
            : Ok(token);
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult Me()
    {
        return Ok(new
        {
            UserId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            Email = User.FindFirstValue(ClaimTypes.Email),
            Roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value)
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        return await userService.ChangeOwnPasswordAsync(request, cancellationToken)
            ? NoContent()
            : Unauthorized();
    }

    public sealed record LoginRequest(
        [Required, EmailAddress] string Email,
        [Required, MinLength(1)] string Password);
}
