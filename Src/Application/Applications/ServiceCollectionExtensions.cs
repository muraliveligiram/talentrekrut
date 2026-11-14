using Applications.Abstractions;
using Applications.Contracts;
using Applications.Services;
using Applications.Validators;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Applications;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICompanyService, CompanyService>();
        services.AddScoped<IValidator<CompanyWriteRequest>, CompanyWriteRequestValidator>();
        services.AddScoped<IJobService, JobService>();
        services.AddScoped<IValidator<JobWriteRequest>, JobWriteRequestValidator>();
        return services;
    }
}
