namespace Applications.Abstractions;

public interface ICurrentUserService
{
    long? UserId { get; }
    IReadOnlyCollection<string> Roles { get; }
    /// <summary>The vendor's company, from the access token. Null for staff.</summary>
    long? CompanyId { get; }
}
