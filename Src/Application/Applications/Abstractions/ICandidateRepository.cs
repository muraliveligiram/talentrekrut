using Applications.Contracts;
using Domain.Entities;

namespace Applications.Abstractions;

/// <summary>
/// Data access for candidates and their job applications. Every read takes the caller's
/// scope: admins see everything; recruiters see candidates they sourced or that are
/// linked to jobs assigned to them, and only applications for their assigned jobs.
/// </summary>
public interface ICandidateRepository
{
    Task<(IReadOnlyList<Candidate> Items, int TotalCount)> GetPageAsync(
        string? search,
        CandidateLevel? level,
        ApplicationStage? stage,
        AccessScope scope,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<Candidate?> GetByIdAsync(long id, AccessScope scope, CancellationToken cancellationToken = default);

    Task<(long Id, string Field)?> FindDuplicateAsync(
        string normalizedEmail,
        string normalizedPhone,
        long? excludeCandidateId,
        CancellationToken cancellationToken = default);

    Task<Job?> GetVisibleJobAsync(long jobId, AccessScope scope, CancellationToken cancellationToken = default);
    Task<bool> ApplicationExistsAsync(long candidateId, long jobId, CancellationToken cancellationToken = default);
    Task<JobApplication?> GetApplicationAsync(long id, AccessScope scope, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JobApplication>> GetApplicationsForJobAsync(long jobId, CancellationToken cancellationToken = default);
    Task<(int ActiveCandidates, int InterviewsInRange)> GetStatsAsync(
        AccessScope scope,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StageEvent>> GetStageEventsAsync(
        AccessScope scope,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ApplicationStage>> GetStagesOfSubmissionsAsync(
        AccessScope scope,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken = default);

    Task AddAsync(Candidate candidate, CancellationToken cancellationToken = default);
    Task AddApplicationAsync(JobApplication application, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
