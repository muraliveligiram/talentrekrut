using Applications.Abstractions;
using Applications.Exceptions;
using Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Repository;

public sealed class CompanyRepository(RekrutDbContext context) : ICompanyRepository
{
    public async Task<(IReadOnlyList<Company> Items, int TotalCount)> GetPageAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = context.Companies.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToUpperInvariant();
            query = query.Where(company =>
                company.Name.ToUpper().Contains(normalizedSearch)
                || (company.Industry != null && company.Industry.ToUpper().Contains(normalizedSearch)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var companies = await query
            .OrderBy(company => company.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return (companies, totalCount);
    }

    public Task<Company?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        return context.Companies.SingleOrDefaultAsync(company => company.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(
        string normalizedName,
        long? excludeCompanyId = null,
        CancellationToken cancellationToken = default)
    {
        return context.Companies.AnyAsync(
            company => company.Name.ToUpper() == normalizedName
                && (!excludeCompanyId.HasValue || company.Id != excludeCompanyId.Value),
            cancellationToken);
    }

    public Task<bool> HasActiveJobsAsync(
        long companyId,
        CancellationToken cancellationToken = default)
    {
        return context.Jobs.AnyAsync(
            job => job.CompanyId == companyId
                && (job.Status == JobStatus.Open || job.Status == JobStatus.OnHold),
            cancellationToken);
    }

    public async Task AddAsync(Company company, CancellationToken cancellationToken = default)
    {
        await context.Companies.AddAsync(company, cancellationToken);
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
            throw new DuplicateCompanyNameException();
        }
    }
}
