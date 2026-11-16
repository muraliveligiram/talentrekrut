using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Applications.Validators;
using Domain.Entities;
using FluentValidation;

namespace Applications.Services;

public sealed class CandidateService(
    ICandidateRepository repository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider,
    IValidator<CreateCandidateRequest> createValidator,
    IValidator<CandidateWriteRequest> updateValidator) : ICandidateService
{
    public async Task<PagedResult<CandidateSummaryResponse>> GetPageAsync(
        string? search,
        CandidateLevel? level,
        ApplicationStage? stage,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (candidates, totalCount) = await repository.GetPageAsync(
            search?.Trim(), level, stage, currentUser.Scope(), page, pageSize, cancellationToken);

        return new PagedResult<CandidateSummaryResponse>(
            candidates.Select(ToSummary).ToArray(), page, pageSize, totalCount);
    }

    public async Task<CandidateResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var candidate = await repository.GetByIdAsync(id, currentUser.Scope(), cancellationToken);
        return candidate is null ? null : ToResponse(candidate);
    }

    public async Task<CandidateResponse> CreateAsync(
        CreateCandidateRequest request,
        CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var userId = currentUser.RequireUserId();
        var candidate = new Candidate { SourcedByUserId = userId };
        Apply(candidate, request);
        await EnsureNotDuplicateAsync(candidate, excludeId: null, cancellationToken);

        Job? job = null;
        if (request.JobId is { } jobId)
        {
            job = await GetSubmittableJobAsync(jobId, cancellationToken);
        }

        await repository.AddAsync(candidate, cancellationToken);
        if (job is not null)
        {
            candidate.Applications.Add(NewApplication(job, userId, notes: null));
        }

        await repository.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(candidate.Id, cancellationToken))!;
    }

    public async Task<CandidateResponse?> UpdateAsync(
        long id,
        CandidateWriteRequest request,
        CancellationToken cancellationToken = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var candidate = await repository.GetByIdAsync(id, currentUser.Scope(), cancellationToken);
        if (candidate is null)
        {
            return null;
        }

        Apply(candidate, request);
        await EnsureNotDuplicateAsync(candidate, candidate.Id, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return ToResponse(candidate);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var candidate = await repository.GetByIdAsync(id, currentUser.Scope(), cancellationToken);
        if (candidate is null)
        {
            return false;
        }

        candidate.IsDeleted = true;
        foreach (var application in candidate.Applications)
        {
            application.IsDeleted = true;
        }

        await repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ApplicationResponse?> SubmitToJobAsync(
        long candidateId,
        SubmitToJobRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Notes?.Length > 2000)
        {
            throw new ValidationException("Notes must be 2000 characters or fewer.");
        }

        var candidate = await repository.GetByIdAsync(candidateId, currentUser.Scope(), cancellationToken);
        if (candidate is null)
        {
            return null;
        }

        var job = await GetSubmittableJobAsync(request.JobId, cancellationToken);
        if (await repository.ApplicationExistsAsync(candidateId, job.Id, cancellationToken))
        {
            throw new ApplicationExistsException();
        }

        var application = NewApplication(job, currentUser.RequireUserId(), request.Notes);
        application.CandidateId = candidate.Id;
        await repository.AddApplicationAsync(application, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        var saved = await repository.GetApplicationAsync(application.Id, currentUser.Scope(), cancellationToken);
        return ApplicationMapper.ToResponse(saved!);
    }

    private async Task<Job> GetSubmittableJobAsync(long jobId, CancellationToken cancellationToken)
    {
        var job = await repository.GetVisibleJobAsync(jobId, currentUser.Scope(), cancellationToken)
            ?? throw new JobNotFoundException();
        if (job.Status != JobStatus.Open)
        {
            throw new JobNotOpenException();
        }

        return job;
    }

    private JobApplication NewApplication(Job job, long userId, string? notes)
    {
        var now = timeProvider.GetUtcNow();
        var application = new JobApplication
        {
            JobId = job.Id,
            Stage = ApplicationStage.Screening,
            SubmittedByUserId = userId,
            SubmittedAt = now
        };
        application.History.Add(new ApplicationStageChange
        {
            FromStage = null,
            ToStage = ApplicationStage.Screening,
            ChangedAt = now,
            ChangedByUserId = userId,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim()
        });
        return application;
    }

    private async Task EnsureNotDuplicateAsync(Candidate candidate, long? excludeId, CancellationToken cancellationToken)
    {
        var duplicate = await repository.FindDuplicateAsync(
            candidate.NormalizedPersonalEmail, candidate.NormalizedPhone, excludeId, cancellationToken);
        if (duplicate is { } match)
        {
            throw new DuplicateCandidateException(match.Id, match.Field);
        }
    }

    private static void Apply(Candidate candidate, CandidateWriteRequest request)
    {
        candidate.FullName = request.FullName.Trim();
        candidate.CurrentRole = request.CurrentRole.Trim();
        candidate.CurrentCompany = request.CurrentCompany.Trim();
        candidate.Level = request.Level;
        candidate.DateOfBirth = request.DateOfBirth;
        candidate.Phone = request.Phone.Trim();
        candidate.NormalizedPhone = CandidateRules.NormalizePhone(request.Phone);
        candidate.PersonalEmail = request.PersonalEmail.Trim();
        candidate.NormalizedPersonalEmail = CandidateRules.NormalizeEmail(request.PersonalEmail);
        candidate.CompanyEmail = Blank(request.CompanyEmail);
        candidate.CurrentCtcLpa = request.CurrentCtcLpa;
        candidate.CurrentCtcIncludesVariable = request.CurrentCtcIncludesVariable;
        candidate.VariablePayLpa = request.CurrentCtcIncludesVariable ? request.VariablePayLpa : null;
        candidate.ExpectedCtcLpa = request.ExpectedCtcLpa;
        candidate.NoticePeriodDays = request.NoticePeriodDays;
        candidate.LinkedInUrl = Blank(request.LinkedInUrl);
        candidate.Notes = Blank(request.Notes);
    }

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CandidateSummaryResponse ToSummary(Candidate candidate)
    {
        var latest = candidate.Applications
            .OrderByDescending(application => application.SubmittedAt)
            .FirstOrDefault();
        return new CandidateSummaryResponse(
            candidate.Id,
            candidate.FullName,
            candidate.CurrentRole,
            candidate.CurrentCompany,
            candidate.Level,
            candidate.Phone,
            candidate.PersonalEmail,
            candidate.CurrentCtcLpa,
            candidate.ExpectedCtcLpa,
            candidate.NoticePeriodDays,
            candidate.Applications.Count,
            latest?.Stage,
            candidate.CreatedAt);
    }

    private static CandidateResponse ToResponse(Candidate candidate) => new(
        candidate.Id,
        candidate.FullName,
        candidate.CurrentRole,
        candidate.CurrentCompany,
        candidate.Level,
        candidate.DateOfBirth,
        candidate.Phone,
        candidate.PersonalEmail,
        candidate.CompanyEmail,
        candidate.CurrentCtcLpa,
        candidate.CurrentCtcIncludesVariable,
        candidate.VariablePayLpa,
        candidate.ExpectedCtcLpa,
        candidate.NoticePeriodDays,
        candidate.LinkedInUrl,
        candidate.Notes,
        candidate.SourcedByUserId,
        candidate.SourcedBy.FullName,
        candidate.CreatedAt,
        candidate.Applications
            .Where(application => !application.IsDeleted)
            .OrderByDescending(application => application.SubmittedAt)
            .Select(ApplicationMapper.ToResponse)
            .ToArray());
}
