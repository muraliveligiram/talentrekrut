using System.ComponentModel.DataAnnotations;
using Applications.Abstractions;
using Applications.Contracts;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Staff)]
[Route("api/companies")]
public sealed class CompaniesController(ICompanyService companyService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CompanyResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CompanyResponse>>> GetPage(
        [FromQuery, StringLength(200)] string? search,
        [FromQuery, Range(1, 1_000_000)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await companyService.GetPageAsync(search, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(CompanyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CompanyResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var company = await companyService.GetByIdAsync(id, cancellationToken);
        return company is null ? NotFound() : Ok(company);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(typeof(CompanyResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CompanyResponse>> Create(
        [FromBody] CompanyWriteRequest request,
        CancellationToken cancellationToken)
    {
        var company = await companyService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = company.Id }, company);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(typeof(CompanyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CompanyResponse>> Update(
        long id,
        [FromBody] CompanyWriteRequest request,
        CancellationToken cancellationToken)
    {
        var company = await companyService.UpdateAsync(id, request, cancellationToken);
        return company is null ? NotFound() : Ok(company);
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = RoleNames.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        return await companyService.DeleteAsync(id, cancellationToken)
            ? NoContent()
            : NotFound();
    }
}
