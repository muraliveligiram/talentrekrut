namespace Applications.Contracts;

public sealed record AuthToken(string AccessToken, DateTimeOffset ExpiresAtUtc);
