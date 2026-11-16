using Domain.Entities;

namespace Applications.Contracts;

public class CandidateWriteRequest
{
    public string FullName { get; set; } = string.Empty;
    public string CurrentRole { get; set; } = string.Empty;
    public string CurrentCompany { get; set; } = string.Empty;
    public CandidateLevel Level { get; set; }
    public DateOnly DateOfBirth { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string PersonalEmail { get; set; } = string.Empty;
    public string? CompanyEmail { get; set; }
    public decimal CurrentCtcLpa { get; set; }
    public bool CurrentCtcIncludesVariable { get; set; }
    public decimal? VariablePayLpa { get; set; }
    public decimal ExpectedCtcLpa { get; set; }
    public int NoticePeriodDays { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Notes { get; set; }
}

public sealed class CreateCandidateRequest : CandidateWriteRequest
{
    /// <summary>Optionally submit the new candidate to this job straight away.</summary>
    public long? JobId { get; set; }
}

public sealed record CandidateSummaryResponse(
    long Id,
    string FullName,
    string CurrentRole,
    string CurrentCompany,
    CandidateLevel Level,
    string Phone,
    string PersonalEmail,
    decimal CurrentCtcLpa,
    decimal ExpectedCtcLpa,
    int NoticePeriodDays,
    int ApplicationCount,
    ApplicationStage? LatestStage,
    DateTimeOffset CreatedAt);

public sealed record CandidateResponse(
    long Id,
    string FullName,
    string CurrentRole,
    string CurrentCompany,
    CandidateLevel Level,
    DateOnly DateOfBirth,
    string Phone,
    string PersonalEmail,
    string? CompanyEmail,
    decimal CurrentCtcLpa,
    bool CurrentCtcIncludesVariable,
    decimal? VariablePayLpa,
    decimal ExpectedCtcLpa,
    int NoticePeriodDays,
    string? LinkedInUrl,
    string? Notes,
    long SourcedByUserId,
    string SourcedByName,
    DateTimeOffset CreatedAt,
    IReadOnlyList<ApplicationResponse> Applications);
