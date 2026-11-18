namespace Domain.Entities;

public sealed class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }
    /// <summary>The client company a Vendor user belongs to. Required for vendors, empty for staff.</summary>
    public long? CompanyId { get; set; }
    public Company? Company { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
