using Domain.Entities;
using Applications.Contracts;

namespace Applications.Abstractions;

public interface IJobRepository
{
    Task<(IReadOnlyList<Job> Items, int TotalCount)> GetPageAsync(
        string? search,
        long? companyId,
        JobStatus? status,
        AccessScope scope,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<Job?> GetByIdAsync(
        long id,
        AccessScope scope,
        CancellationToken cancellationToken = default);

    Task<Company?> GetActiveCompanyAsync(long companyId, CancellationToken cancellationToken = default);
    Task<bool> RecruiterExistsAsync(long recruiterUserId, CancellationToken cancellationToken = default);
    Task<bool> ActiveAssignmentExistsAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default);
    Task<JobAssignment?> GetAssignmentAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default);
    Task<int> GetNextJobNumberAsync(int year, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<long, Skill>> GetSkillsAsync(
        IReadOnlyCollection<long> skillIds,
        CancellationToken cancellationToken = default);
    Task AddAsync(Job job, CancellationToken cancellationToken = default);
    Task AddAssignmentAsync(JobAssignment assignment, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
