using System.Linq.Expressions;
using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Repository;

public sealed class JobRepository(RekrutDbContext context) : IJobRepository
{
    public async Task<(IReadOnlyList<Job> Items, int TotalCount)> GetPageAsync(
        string? search,
        long? companyId,
        JobStatus? status,
        AccessScope scope,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = context.Jobs.AsNoTracking().Where(JobsVisibleTo(scope));
        if (companyId.HasValue)
        {
            query = query.Where(job => job.CompanyId == companyId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(job => job.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToUpperInvariant();
            query = query.Where(job =>
                job.Title.ToUpper().Contains(normalizedSearch)
                || job.JobCode.ToUpper().Contains(normalizedSearch)
                || (job.Location != null && job.Location.ToUpper().Contains(normalizedSearch)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var jobs = await query
            .OrderByDescending(job => job.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(job => job.Company)
            .Include(job => job.Skills)
                .ThenInclude(jobSkill => jobSkill.Skill)
            .Include(job => job.InterviewRounds)
            .Include(job => job.Assignments.Where(assignment => assignment.IsActive))
                .ThenInclude(assignment => assignment.Recruiter)
            .ToListAsync(cancellationToken);
        return (jobs, totalCount);
    }

    public async Task<Job?> GetByIdAsync(
        long id,
        AccessScope scope,
        CancellationToken cancellationToken = default)
    {
        var query = context.Jobs
            .Where(JobsVisibleTo(scope))
            .Include(job => job.Company)
            .Include(job => job.Skills)
                .ThenInclude(jobSkill => jobSkill.Skill)
            .Include(job => job.InterviewRounds)
            .Include(job => job.Assignments.Where(assignment => assignment.IsActive))
                .ThenInclude(assignment => assignment.Recruiter)
            .AsQueryable();

        return await query.SingleOrDefaultAsync(job => job.Id == id, cancellationToken);
    }

    /// <summary>
    /// Admins see every job; vendors see their own company's jobs once they leave Draft;
    /// recruiters see the jobs actively assigned to them.
    /// </summary>
    private static Expression<Func<Job, bool>> JobsVisibleTo(AccessScope scope)
    {
        if (scope.IsAdmin)
        {
            return _ => true;
        }

        if (scope.IsVendor)
        {
            var companyId = scope.VendorCompanyId!.Value;
            return job => job.CompanyId == companyId && job.Status != JobStatus.Draft;
        }

        var userId = scope.UserId ?? -1;
        return job => job.Assignments.Any(assignment => assignment.IsActive && assignment.RecruiterUserId == userId);
    }

    public Task<Company?> GetActiveCompanyAsync(
        long companyId,
        CancellationToken cancellationToken = default)
    {
        return context.Companies.SingleOrDefaultAsync(
            company => company.Id == companyId && company.IsActive,
            cancellationToken);
    }

    public Task<bool> RecruiterExistsAsync(
        long recruiterUserId,
        CancellationToken cancellationToken = default)
    {
        return context.Users.AnyAsync(user =>
            user.Id == recruiterUserId
            && user.IsActive
            && user.UserRoles.Any(userRole => userRole.Role.Name == RoleNames.Recruiter),
            cancellationToken);
    }

    public Task<bool> ActiveAssignmentExistsAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default)
    {
        return context.JobAssignments.AnyAsync(assignment =>
            assignment.JobId == jobId
            && assignment.RecruiterUserId == recruiterUserId
            && assignment.IsActive,
            cancellationToken);
    }

    public Task<JobAssignment?> GetAssignmentAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default)
    {
        return context.JobAssignments.SingleOrDefaultAsync(
            assignment => assignment.JobId == jobId
                && assignment.RecruiterUserId == recruiterUserId
                && assignment.IsActive,
            cancellationToken);
    }

    public async Task<int> GetNextJobNumberAsync(
        int year,
        CancellationToken cancellationToken = default)
    {
        var prefix = $"JOB-{year}-";
        var jobCodes = await context.Jobs
            .IgnoreQueryFilters()
            .Where(job => job.JobCode.StartsWith(prefix))
            .Select(job => job.JobCode)
            .ToListAsync(cancellationToken);
        var maxNumber = jobCodes
            .Select(code => int.TryParse(code[prefix.Length..], out var number) ? number : 0)
            .DefaultIfEmpty(0)
            .Max();
        return checked(maxNumber + 1);
    }

    public async Task<IReadOnlyDictionary<long, Skill>> GetSkillsAsync(
        IReadOnlyCollection<long> skillIds,
        CancellationToken cancellationToken = default)
    {
        return await context.Skills
            .Where(skill => skillIds.Contains(skill.Id))
            .ToDictionaryAsync(skill => skill.Id, cancellationToken);
    }

    public async Task<IReadOnlyDictionary<long, int>> GetCandidateCountsAsync(
        IReadOnlyCollection<long> jobIds,
        CancellationToken cancellationToken = default)
    {
        return await context.JobApplications
            .AsNoTracking()
            .Where(application => jobIds.Contains(application.JobId))
            .GroupBy(application => application.JobId)
            .Select(group => new { JobId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.JobId, row => row.Count, cancellationToken);
    }

    public async Task AddAsync(Job job, CancellationToken cancellationToken = default)
    {
        await context.Jobs.AddAsync(job, cancellationToken);
    }

    public async Task AddAssignmentAsync(
        JobAssignment assignment,
        CancellationToken cancellationToken = default)
    {
        await context.JobAssignments.AddAsync(assignment, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.GetBaseException() is SqlException { Number: 2601 or 2627 })
        {
            throw new DuplicateJobCodeException();
        }
    }
}
