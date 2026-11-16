namespace Domain.Entities;

public sealed class Candidate : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string CurrentRole { get; set; } = string.Empty;
    public string CurrentCompany { get; set; } = string.Empty;
    public CandidateLevel Level { get; set; }
    public DateOnly DateOfBirth { get; set; }
    public string Phone { get; set; } = string.Empty;
    /// <summary>Digits only, used for duplicate detection.</summary>
    public string NormalizedPhone { get; set; } = string.Empty;
    public string PersonalEmail { get; set; } = string.Empty;
    public string NormalizedPersonalEmail { get; set; } = string.Empty;
    public string? CompanyEmail { get; set; }
    /// <summary>Current annual CTC in lakhs per annum (LPA).</summary>
    public decimal CurrentCtcLpa { get; set; }
    public bool CurrentCtcIncludesVariable { get; set; }
    public decimal? VariablePayLpa { get; set; }
    public decimal ExpectedCtcLpa { get; set; }
    public int NoticePeriodDays { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Notes { get; set; }
    public long SourcedByUserId { get; set; }
    public User SourcedBy { get; set; } = null!;
    public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
}
