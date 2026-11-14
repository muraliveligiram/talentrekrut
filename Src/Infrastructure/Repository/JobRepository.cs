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
        bool isAdmin,
        long? recruiterUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = context.Jobs.AsNoTracking();
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

        if (!isAdmin)
        {
            if (recruiterUserId is null)
            {
                query = query.Where(_ => false);
            }
            else
            {
                var userId = recruiterUserId.Value;
                query = query.Where(job => job.Assignments.Any(assignment =>
                    assignment.IsActive && assignment.RecruiterUserId == userId));
            }
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var jobs = await query
            .OrderByDescending(job => job.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(job => job.Company)
            .Include(job => job.Skills)
            .Include(job => job.Assignments.Where(assignment => assignment.IsActive))
                .ThenInclude(assignment => assignment.Recruiter)
            .ToListAsync(cancellationToken);
        return (jobs, totalCount);
    }

    public async Task<Job?> GetByIdAsync(
        long id,
        bool isAdmin,
        long? recruiterUserId,
        CancellationToken cancellationToken = default)
    {
        var query = context.Jobs
            .Include(job => job.Company)
            .Include(job => job.Skills)
            .Include(job => job.Assignments.Where(assignment => assignment.IsActive))
                .ThenInclude(assignment => assignment.Recruiter)
            .AsQueryable();

        if (!isAdmin)
        {
            if (recruiterUserId is null)
            {
                return null;
            }

            var userId = recruiterUserId.Value;
            query = query.Where(job => job.Assignments.Any(assignment =>
                assignment.IsActive && assignment.RecruiterUserId == userId));
        }

        return await query.SingleOrDefaultAsync(job => job.Id == id, cancellationToken);
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

    public async Task<IReadOnlyList<RecruiterOption>> GetRecruitersAsync(
        CancellationToken cancellationToken = default)
    {
        return await context.Users
            .Where(user => user.IsActive
                && user.UserRoles.Any(userRole => userRole.Role.Name == RoleNames.Recruiter))
            .OrderBy(user => user.FullName)
            .Select(user => new RecruiterOption(user.Id, user.FullName, user.Email))
            .ToListAsync(cancellationToken);
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
