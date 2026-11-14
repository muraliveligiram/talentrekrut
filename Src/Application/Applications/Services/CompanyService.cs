using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using FluentValidation;

namespace Applications.Services;

public sealed class CompanyService(
    ICompanyRepository companyRepository,
    IValidator<CompanyWriteRequest> companyValidator) : ICompanyService
{
    public async Task<PagedResult<CompanyResponse>> GetPageAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (companies, totalCount) = await companyRepository.GetPageAsync(
            search?.Trim(),
            page,
            pageSize,
            cancellationToken);

        return new PagedResult<CompanyResponse>(
            companies.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount);
    }

    public async Task<CompanyResponse?> GetByIdAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        var company = await companyRepository.GetByIdAsync(id, cancellationToken);
        return company is null ? null : ToResponse(company);
    }

    public async Task<CompanyResponse> CreateAsync(
        CompanyWriteRequest request,
        CancellationToken cancellationToken = default)
    {
        await companyValidator.ValidateAndThrowAsync(request, cancellationToken);
        var normalizedName = NormalizeName(request.Name);
        if (await companyRepository.NameExistsAsync(normalizedName, cancellationToken: cancellationToken))
        {
            throw new DuplicateCompanyNameException();
        }

        var company = new Company();
        ApplyRequest(company, request);
        await companyRepository.AddAsync(company, cancellationToken);
        await companyRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(company);
    }

    public async Task<CompanyResponse?> UpdateAsync(
        long id,
        CompanyWriteRequest request,
        CancellationToken cancellationToken = default)
    {
        await companyValidator.ValidateAndThrowAsync(request, cancellationToken);
        var company = await companyRepository.GetByIdAsync(id, cancellationToken);
        if (company is null)
        {
            return null;
        }

        var normalizedName = NormalizeName(request.Name);
        if (await companyRepository.NameExistsAsync(
            normalizedName,
            id,
            cancellationToken))
        {
            throw new DuplicateCompanyNameException();
        }

        ApplyRequest(company, request);
        await companyRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(company);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var company = await companyRepository.GetByIdAsync(id, cancellationToken);
        if (company is null)
        {
            return false;
        }

        if (await companyRepository.HasActiveJobsAsync(id, cancellationToken))
        {
            throw new CompanyHasActiveJobsException();
        }

        company.IsDeleted = true;
        await companyRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string NormalizeName(string name) => name.Trim().ToUpperInvariant();

    private static void ApplyRequest(Company company, CompanyWriteRequest request)
    {
        company.Name = request.Name.Trim();
        company.Industry = request.Industry?.Trim();
        company.Website = request.Website?.Trim();
        company.About = request.About?.Trim();
        company.Address = request.Address?.Trim();
        company.City = request.City?.Trim();
        company.State = request.State?.Trim();
        company.Country = request.Country?.Trim();
        company.PostalCode = request.PostalCode?.Trim();
        company.ContactPersonName = request.ContactPersonName?.Trim();
        company.ContactEmail = request.ContactEmail?.Trim();
        company.ContactPhone = request.ContactPhone?.Trim();
        company.LogoPath = request.LogoPath?.Trim();
        company.IsActive = request.IsActive;
    }

    private static CompanyResponse ToResponse(Company company)
    {
        return new CompanyResponse(
            company.Id,
            company.Name,
            company.Industry,
            company.Website,
            company.About,
            company.Address,
            company.City,
            company.State,
            company.Country,
            company.PostalCode,
            company.ContactPersonName,
            company.ContactEmail,
            company.ContactPhone,
            company.LogoPath,
            company.IsActive,
            company.CreatedAt);
    }
}
