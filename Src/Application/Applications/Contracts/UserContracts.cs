namespace Applications.Contracts;

public sealed record UserResponse(
    long Id,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles,
    bool IsActive,
    DateTimeOffset? LastLoginAt,
    DateTimeOffset CreatedAt,
    long? CompanyId,
    string? CompanyName);

public sealed class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = [];
    /// <summary>Required when <see cref="Roles"/> contains Vendor; must be empty otherwise.</summary>
    public long? CompanyId { get; set; }
}

public sealed class UpdateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = [];
    public bool IsActive { get; set; } = true;
    /// <summary>Required when <see cref="Roles"/> contains Vendor; must be empty otherwise.</summary>
    public long? CompanyId { get; set; }
}

public sealed class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
