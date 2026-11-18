namespace Domain.Entities;

public static class RoleNames
{
    public const string Admin = "Admin";
    public const string Recruiter = "Recruiter";

    /// <summary>A client-side user tied to one company who can only view that company's job postings.</summary>
    public const string Vendor = "Vendor";

    /// <summary>Internal staff roles, for <c>[Authorize(Roles = RoleNames.Staff)]</c>.</summary>
    public const string Staff = Admin + "," + Recruiter;

    /// <summary>Everyone who works a job's candidate pipeline: staff, plus vendors on their own company's jobs.</summary>
    public const string PipelineUsers = Staff + "," + Vendor;
}
