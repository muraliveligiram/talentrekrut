using Domain.Entities;

namespace Applications.Contracts;

/// <summary>Everything needed to export a job's candidate pipeline, independent of the file format.</summary>
public sealed record JobCandidateExport(
    string JobCode,
    string JobTitle,
    string CompanyName,
    JobStatus JobStatus,
    string? Location,
    int Openings,
    IReadOnlyList<string> InterviewRounds,
    IReadOnlyList<JobCandidateExportRow> Rows);

public sealed record JobCandidateExportRow(
    long CandidateId,
    string FullName,
    string CurrentRole,
    string CurrentCompany,
    CandidateLevel Level,
    DateOnly DateOfBirth,
    string Phone,
    string PersonalEmail,
    string? CompanyEmail,
    string? LinkedInUrl,
    decimal CurrentCtcLpa,
    bool CurrentCtcIncludesVariable,
    decimal? VariablePayLpa,
    decimal ExpectedCtcLpa,
    int NoticePeriodDays,
    ApplicationStage Stage,
    DateTimeOffset SubmittedAt,
    string SubmittedByName,
    DateTimeOffset? InterviewScheduledAt,
    IReadOnlyList<RejectionReason> RejectionReasons,
    string? RejectionNotes,
    DateTimeOffset LastUpdatedAt,
    string? CandidateNotes,
    IReadOnlyList<RoundProgressResponse> Rounds,
    DateOnly? JoiningDate,
    IReadOnlyList<NotJoiningReason> NotJoiningReasons,
    string? NotJoiningNotes);

/// <summary>Human-readable names for enums, shared by exports.</summary>
public static class DisplayNames
{
    public static string Of(ApplicationStage stage) => stage switch
    {
        ApplicationStage.NotShortlisted => "Not shortlisted",
        ApplicationStage.InterviewScheduled => "Interview scheduled",
        ApplicationStage.RoundCleared => "Round cleared",
        ApplicationStage.NotJoined => "Did not join",
        _ => stage.ToString()
    };

    public static string Of(CandidateLevel level) => level switch
    {
        CandidateLevel.Entry => "Entry level",
        CandidateLevel.MidLevel => "Mid-level",
        _ => level.ToString()
    };

    public static string Of(NotJoiningReason reason) => reason switch
    {
        NotJoiningReason.AcceptedAnotherOffer => "Accepted another offer",
        NotJoiningReason.CounterOfferFromCurrentEmployer => "Counter-offer from current employer",
        NotJoiningReason.CompensationMismatch => "Compensation mismatch",
        NotJoiningReason.RelocationIssues => "Relocation issues",
        NotJoiningReason.PersonalReasons => "Personal reasons",
        NotJoiningReason.HealthReasons => "Health reasons",
        NotJoiningReason.NoResponse => "No response / absconded",
        NotJoiningReason.OfferWithdrawn => "Offer withdrawn",
        _ => reason.ToString()
    };

    public static string Of(RoundStatus status) => status switch
    {
        RoundStatus.NotCleared => "Not cleared",
        _ => status.ToString()
    };

    public static string Of(JobStatus status) => status == JobStatus.OnHold ? "On hold" : status.ToString();

    public static string Of(RejectionReason reason) => reason switch
    {
        RejectionReason.SkillMismatch => "Skill mismatch",
        RejectionReason.InsufficientExperience => "Insufficient experience",
        RejectionReason.CommunicationSkills => "Communication skills",
        RejectionReason.CtcExpectationTooHigh => "CTC expectation too high",
        RejectionReason.NoticePeriodTooLong => "Notice period too long",
        RejectionReason.CulturalFit => "Cultural fit",
        RejectionReason.DidNotAttendInterview => "Did not attend interview",
        RejectionReason.PositionFilled => "Position already filled",
        _ => reason.ToString()
    };
}
