using Domain.Entities;

namespace Applications.Contracts;

public sealed record JobResponse(
    long Id,
    string JobCode,
    long CompanyId,
    string CompanyName,
    string Title,
    string? Description,
    decimal MinExperienceYears,
    decimal MaxExperienceYears,
    int Openings,
    string? Location,
    EmploymentType EmploymentType,
    WorkMode WorkMode,
    string? CommunicationRequirement,
    JobStatus Status,
    IReadOnlyList<JobSkillResponse> Skills,
    IReadOnlyList<InterviewRoundResponse> InterviewRounds,
    IReadOnlyList<JobAssignmentResponse> Assignments,
    DateTimeOffset CreatedAt);

public sealed record InterviewRoundResponse(long Id, int Sequence, string Name);

public sealed record JobSkillResponse(
    long Id,
    long SkillId,
    string SkillName,
    SkillCategory Category,
    JobSkillType SkillType,
    decimal? MinYears);

public sealed record JobAssignmentResponse(
    long RecruiterUserId,
    string RecruiterName,
    DateTimeOffset AssignedAt,
    bool IsActive);

public sealed record RecruiterOption(long Id, string FullName, string Email);

public sealed record JobStatusUpdateRequest(JobStatus Status);
