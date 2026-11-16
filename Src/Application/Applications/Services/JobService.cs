using System.Globalization;
using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using FluentValidation;

namespace Applications.Services;

public sealed class JobService(
    IJobRepository jobRepository,
    IValidator<JobWriteRequest> jobValidator,
    ICurrentUserService currentUserService) : IJobService
{
    public async Task<PagedResult<JobResponse>> GetPageAsync(
        string? search,
        long? companyId,
        JobStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (jobs, totalCount) = await jobRepository.GetPageAsync(
            search?.Trim(),
            companyId,
            status,
            IsAdmin,
            IsAdmin ? null : currentUserService.UserId,
            page,
            pageSize,
            cancellationToken);

        return new PagedResult<JobResponse>(
            jobs.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount);
    }

    public async Task<JobResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var job = await jobRepository.GetByIdAsync(
            id,
            IsAdmin,
            IsAdmin ? null : currentUserService.UserId,
            cancellationToken);
        return job is null ? null : ToResponse(job);
    }

    public async Task<JobResponse> CreateAsync(
        JobWriteRequest request,
        CancellationToken cancellationToken = default)
    {
        await jobValidator.ValidateAndThrowAsync(request, cancellationToken);
        var company = await jobRepository.GetActiveCompanyAsync(request.CompanyId, cancellationToken)
            ?? throw new CompanyNotFoundException();
        var year = DateTime.UtcNow.Year;
        var nextNumber = await jobRepository.GetNextJobNumberAsync(year, cancellationToken);
        var job = new Job
        {
            JobCode = $"JOB-{year}-{nextNumber.ToString("D4", CultureInfo.InvariantCulture)}",
            Company = company,
            CompanyId = company.Id,
            Status = JobStatus.Draft
        };
        ApplyRequest(job, request, await LoadSkillsAsync(request, new HashSet<long>(), cancellationToken));
        await jobRepository.AddAsync(job, cancellationToken);
        await jobRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(job);
    }

    public async Task<JobResponse?> UpdateAsync(
        long id,
        JobWriteRequest request,
        CancellationToken cancellationToken = default)
    {
        await jobValidator.ValidateAndThrowAsync(request, cancellationToken);
        var company = await jobRepository.GetActiveCompanyAsync(request.CompanyId, cancellationToken)
            ?? throw new CompanyNotFoundException();
        var job = await jobRepository.GetByIdAsync(id, isAdmin: true, recruiterUserId: null, cancellationToken);
        if (job is null)
        {
            return null;
        }

        var skills = await LoadSkillsAsync(
            request,
            job.Skills.Select(jobSkill => jobSkill.SkillId).ToHashSet(),
            cancellationToken);
        job.Company = company;
        job.CompanyId = company.Id;
        job.Skills.Clear();
        ApplyRequest(job, request, skills);
        await jobRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(job);
    }

    public async Task<JobResponse?> UpdateStatusAsync(
        long id,
        JobStatus status,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(status))
        {
            throw new ValidationException("The selected job status is invalid.");
        }

        var job = await jobRepository.GetByIdAsync(id, isAdmin: true, recruiterUserId: null, cancellationToken);
        if (job is null)
        {
            return null;
        }

        job.Status = status;
        await jobRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(job);
    }

    public async Task<bool> AssignRecruiterAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default)
    {
        var job = await jobRepository.GetByIdAsync(jobId, isAdmin: true, recruiterUserId: null, cancellationToken);
        if (job is null)
        {
            return false;
        }

        if (!await jobRepository.RecruiterExistsAsync(recruiterUserId, cancellationToken))
        {
            throw new RecruiterNotFoundException();
        }

        if (await jobRepository.ActiveAssignmentExistsAsync(jobId, recruiterUserId, cancellationToken))
        {
            throw new JobAssignmentExistsException();
        }

        var assignedBy = currentUserService.UserId
            ?? throw new InvalidOperationException("The current user id is unavailable.");
        await jobRepository.AddAssignmentAsync(new JobAssignment
        {
            JobId = jobId,
            RecruiterUserId = recruiterUserId,
            AssignedAt = DateTimeOffset.UtcNow,
            AssignedBy = assignedBy
        }, cancellationToken);
        await jobRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RemoveRecruiterAsync(
        long jobId,
        long recruiterUserId,
        CancellationToken cancellationToken = default)
    {
        var assignment = await jobRepository.GetAssignmentAsync(jobId, recruiterUserId, cancellationToken);
        if (assignment is null)
        {
            return false;
        }

        assignment.IsActive = false;
        await jobRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private bool IsAdmin => currentUserService.Roles.Contains(
        RoleNames.Admin,
        StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Resolves requested skill ids against the library. Inactive skills are only allowed
    /// when the job already uses them, so deactivating a skill never breaks editing a job.
    /// </summary>
    private async Task<IReadOnlyDictionary<long, Skill>> LoadSkillsAsync(
        JobWriteRequest request,
        IReadOnlySet<long> existing,
        CancellationToken cancellationToken)
    {
        var ids = request.Skills.Select(skill => skill.SkillId).Distinct().ToArray();
        var skills = await jobRepository.GetSkillsAsync(ids, cancellationToken);
        var invalid = ids.Where(id => !skills.TryGetValue(id, out var skill) || (!skill.IsActive && !existing.Contains(id)));
        if (invalid.Any())
        {
            throw new ValidationException("One or more selected skills do not exist or are inactive.");
        }

        return skills;
    }

    private static void ApplyRequest(Job job, JobWriteRequest request, IReadOnlyDictionary<long, Skill> skills)
    {
        job.Title = request.Title.Trim();
        job.Description = request.Description?.Trim();
        job.MinExperienceYears = request.MinExperienceYears;
        job.MaxExperienceYears = request.MaxExperienceYears;
        job.Openings = request.Openings;
        job.Location = request.Location?.Trim();
        job.EmploymentType = request.EmploymentType;
        job.WorkMode = request.WorkMode;
        job.CommunicationRequirement = request.CommunicationRequirement?.Trim();
        foreach (var skill in request.Skills)
        {
            job.Skills.Add(new JobSkill
            {
                SkillId = skill.SkillId,
                Skill = skills[skill.SkillId],
                SkillType = skill.SkillType,
                MinYears = skill.MinYears
            });
        }
    }

    private static JobResponse ToResponse(Job job)
    {
        return new JobResponse(
            job.Id,
            job.JobCode,
            job.CompanyId,
            job.Company.Name,
            job.Title,
            job.Description,
            job.MinExperienceYears,
            job.MaxExperienceYears,
            job.Openings,
            job.Location,
            job.EmploymentType,
            job.WorkMode,
            job.CommunicationRequirement,
            job.Status,
            job.Skills.Select(skill => new JobSkillResponse(
                skill.Id,
                skill.SkillId,
                skill.Skill.Name,
                skill.Skill.Category,
                skill.SkillType,
                skill.MinYears)).ToArray(),
            job.Assignments
                .Where(assignment => assignment.IsActive)
                .Select(assignment => new JobAssignmentResponse(
                    assignment.RecruiterUserId,
                    assignment.Recruiter.FullName,
                    assignment.AssignedAt,
                    assignment.IsActive)).ToArray(),
            job.CreatedAt);
    }
}
