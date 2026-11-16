using Applications.Contracts;
using Domain.Entities;

namespace Applications.Abstractions;

public interface ICandidateService
{
    Task<PagedResult<CandidateSummaryResponse>> GetPageAsync(
        string? search,
        CandidateLevel? level,
        ApplicationStage? stage,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<CandidateResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CandidateResponse> CreateAsync(CreateCandidateRequest request, CancellationToken cancellationToken = default);
    Task<CandidateResponse?> UpdateAsync(long id, CandidateWriteRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<ApplicationResponse?> SubmitToJobAsync(long candidateId, SubmitToJobRequest request, CancellationToken cancellationToken = default);
}

public interface IApplicationService
{
    Task<IReadOnlyList<ApplicationResponse>?> GetForJobAsync(long jobId, CancellationToken cancellationToken = default);
    Task<ApplicationResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ApplicationResponse?> ScreenAsync(long id, ScreeningDecisionRequest request, CancellationToken cancellationToken = default);
    Task<ApplicationResponse?> ScheduleInterviewAsync(long id, ScheduleInterviewRequest request, CancellationToken cancellationToken = default);
    Task<ApplicationResponse?> RecordOutcomeAsync(long id, InterviewOutcomeRequest request, CancellationToken cancellationToken = default);
    Task<JobCandidateExport?> GetJobExportAsync(long jobId, CancellationToken cancellationToken = default);
    Task<PipelineStatsResponse> GetStatsAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);
}
