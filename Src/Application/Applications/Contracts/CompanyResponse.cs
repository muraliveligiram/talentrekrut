namespace Applications.Contracts;

public sealed record CompanyResponse(
    long Id,
    string Name,
    string? Industry,
    string? Website,
    string? About,
    string? Address,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    string? ContactPersonName,
    string? ContactEmail,
    string? ContactPhone,
    string? LogoPath,
    bool IsActive,
    DateTimeOffset CreatedAt);
