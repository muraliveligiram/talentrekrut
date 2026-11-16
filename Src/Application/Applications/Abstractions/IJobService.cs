using Applications.Contracts;
using Domain.Entities;

namespace Applications.Abstractions;

public interface IJobService
{
    Task<PagedResult<JobResponse>> GetPageAsync(
        string? search,
        long? companyId,
        JobStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<JobResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<JobResponse> CreateAsync(JobWriteRequest request, CancellationToken cancellationToken = default);
    Task<JobResponse?> UpdateAsync(long id, JobWriteRequest request, CancellationToken cancellationToken = default);
    Task<JobResponse?> UpdateStatusAsync(
        long id,
        JobStatus status,
        CancellationToken cancellationToken = default);
    Task<bool> AssignRecruiterAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default);
    Task<bool> RemoveRecruiterAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default);
}
