using System.Linq.Expressions;
using Applications.Abstractions;
using Applications.Exceptions;
using Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Repository;

public sealed class CandidateRepository(RekrutDbContext context) : ICandidateRepository
{
    private static readonly ApplicationStage[] ActiveStages =
        [ApplicationStage.Screening, ApplicationStage.Shortlisted, ApplicationStage.InterviewScheduled];

    public async Task<(IReadOnlyList<Candidate> Items, int TotalCount)> GetPageAsync(
        string? search,
        CandidateLevel? level,
        ApplicationStage? stage,
        AccessScope scope,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = context.Candidates.AsNoTracking().Where(CandidateVisibleTo(scope));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            var digits = new string(search.Where(char.IsDigit).ToArray());
            query = query.Where(candidate =>
                candidate.FullName.ToUpper().Contains(term)
                || candidate.NormalizedPersonalEmail.Contains(term)
                || candidate.CurrentCompany.ToUpper().Contains(term)
                || candidate.CurrentRole.ToUpper().Contains(term)
                || (digits.Length >= 4 && candidate.NormalizedPhone.Contains(digits)));
        }

        if (level.HasValue)
        {
            query = query.Where(candidate => candidate.Level == level.Value);
        }

        if (stage.HasValue)
        {
            query = query.Where(candidate => candidate.Applications
                .AsQueryable()
                .Where(ApplicationVisibleTo(scope))
                .Any(application => application.Stage == stage.Value));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var candidates = await query
            .OrderByDescending(candidate => candidate.CreatedAt)
            .ThenByDescending(candidate => candidate.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(candidate => candidate.Applications.AsQueryable().Where(ApplicationVisibleTo(scope)))
            .AsSplitQuery()
            .ToListAsync(cancellationToken);
        return (candidates, totalCount);
    }

    public Task<Candidate?> GetByIdAsync(long id, AccessScope scope, CancellationToken cancellationToken = default)
    {
        return context.Candidates
            .Where(CandidateVisibleTo(scope))
            .Include(candidate => candidate.SourcedBy)
            .Include(candidate => candidate.Applications.AsQueryable().Where(ApplicationVisibleTo(scope)))
                .ThenInclude(application => application.Job)
                    .ThenInclude(job => job.Company)
            .Include(candidate => candidate.Applications)
                .ThenInclude(application => application.SubmittedBy)
            .Include(candidate => candidate.Applications)
                .ThenInclude(application => application.History)
                    .ThenInclude(change => change.ChangedBy)
            .AsSplitQuery()
            .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
    }

    public async Task<(long Id, string Field)?> FindDuplicateAsync(
        string normalizedEmail,
        string normalizedPhone,
        long? excludeCandidateId,
        CancellationToken cancellationToken = default)
    {
        var match = await context.Candidates
            .Where(candidate => candidate.Id != excludeCandidateId
                && (candidate.NormalizedPersonalEmail == normalizedEmail || candidate.NormalizedPhone == normalizedPhone))
            .Select(candidate => new { candidate.Id, candidate.NormalizedPersonalEmail })
            .FirstOrDefaultAsync(cancellationToken);
        if (match is null)
        {
            return null;
        }

        return (match.Id, match.NormalizedPersonalEmail == normalizedEmail ? "email address" : "phone number");
    }

    public Task<Job?> GetVisibleJobAsync(long jobId, AccessScope scope, CancellationToken cancellationToken = default)
    {
        return context.Jobs
            .Include(job => job.Company)
            .Where(JobVisibleTo(scope))
            .SingleOrDefaultAsync(job => job.Id == jobId, cancellationToken);
    }

    public Task<bool> ApplicationExistsAsync(long candidateId, long jobId, CancellationToken cancellationToken = default)
    {
        return context.JobApplications.AnyAsync(
            application => application.CandidateId == candidateId && application.JobId == jobId,
            cancellationToken);
    }

    public Task<JobApplication?> GetApplicationAsync(
        long id,
        AccessScope scope,
        CancellationToken cancellationToken = default)
    {
        return IncludeDetails(context.JobApplications)
            .Where(ApplicationVisibleTo(scope))
            .SingleOrDefaultAsync(application => application.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<JobApplication>> GetApplicationsForJobAsync(
        long jobId,
        CancellationToken cancellationToken = default)
    {
        return await IncludeDetails(context.JobApplications.AsNoTracking())
            .Where(application => application.JobId == jobId)
            .OrderByDescending(application => application.SubmittedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<(int ActiveCandidates, int InterviewsInRange)> GetStatsAsync(
        AccessScope scope,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken = default)
    {
        var applications = context.JobApplications.AsNoTracking().Where(ApplicationVisibleTo(scope));
        var activeCandidates = await applications
            .Where(application => ActiveStages.Contains(application.Stage))
            .Select(application => application.CandidateId)
            .Distinct()
            .CountAsync(cancellationToken);
        var interviews = await applications
            .Where(application => application.Stage == ApplicationStage.InterviewScheduled
                && application.InterviewScheduledAt >= from
                && application.InterviewScheduledAt < to)
            .CountAsync(cancellationToken);
        return (activeCandidates, interviews);
    }

    public async Task AddAsync(Candidate candidate, CancellationToken cancellationToken = default)
    {
        await context.Candidates.AddAsync(candidate, cancellationToken);
    }

    public async Task AddApplicationAsync(JobApplication application, CancellationToken cancellationToken = default)
    {
        await context.JobApplications.AddAsync(application, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.GetBaseException() is SqlException { Number: 2601 or 2627 } sqlException
                && sqlException.Message.Contains("JobApplications", StringComparison.Ordinal))
        {
            throw new ApplicationExistsException();
        }
    }

    private static IQueryable<JobApplication> IncludeDetails(IQueryable<JobApplication> query) => query
        .Include(application => application.Candidate)
        .Include(application => application.Job)
            .ThenInclude(job => job.Company)
        .Include(application => application.SubmittedBy)
        .Include(application => application.History)
            .ThenInclude(change => change.ChangedBy)
        .AsSplitQuery();

    private static Expression<Func<Job, bool>> JobVisibleTo(AccessScope scope)
    {
        if (scope.IsAdmin)
        {
            return _ => true;
        }

        var userId = scope.UserId ?? -1;
        return job => job.Assignments.Any(assignment => assignment.IsActive && assignment.RecruiterUserId == userId);
    }

    private static Expression<Func<JobApplication, bool>> ApplicationVisibleTo(AccessScope scope)
    {
        if (scope.IsAdmin)
        {
            return _ => true;
        }

        var userId = scope.UserId ?? -1;
        return application => application.Job.Assignments
            .Any(assignment => assignment.IsActive && assignment.RecruiterUserId == userId);
    }

    private static Expression<Func<Candidate, bool>> CandidateVisibleTo(AccessScope scope)
    {
        if (scope.IsAdmin)
        {
            return _ => true;
        }

        var userId = scope.UserId ?? -1;
        return candidate => candidate.SourcedByUserId == userId
            || candidate.Applications.Any(application => application.Job.Assignments
                .Any(assignment => assignment.IsActive && assignment.RecruiterUserId == userId));
    }
}
