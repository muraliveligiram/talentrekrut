namespace Applications.Abstractions;

/// <summary>
/// Who is asking. Admins see everything; vendors see only their company's published jobs
/// (<see cref="VendorCompanyId"/>); everyone else is a recruiter limited to assigned jobs.
/// </summary>
public sealed record AccessScope(bool IsAdmin, long? UserId, long? VendorCompanyId = null)
{
    public bool IsVendor => !IsAdmin && VendorCompanyId.HasValue;

    public static AccessScope Unrestricted { get; } = new(IsAdmin: true, UserId: null);
}
