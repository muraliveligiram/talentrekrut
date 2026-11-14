namespace Applications.Abstractions;

public interface ICurrentUserService
{
    long? UserId { get; }
    IReadOnlyCollection<string> Roles { get; }
}
