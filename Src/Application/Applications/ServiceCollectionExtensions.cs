using Applications.Abstractions;
using Applications.Contracts;
using Applications.Services;
using Applications.Validators;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

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
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IValidator<CreateUserRequest>, CreateUserRequestValidator>();
        services.AddScoped<IValidator<UpdateUserRequest>, UpdateUserRequestValidator>();
        services.AddScoped<IValidator<ResetPasswordRequest>, ResetPasswordRequestValidator>();
        services.AddScoped<IValidator<ChangePasswordRequest>, ChangePasswordRequestValidator>();
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<ICandidateService, CandidateService>();
        services.AddScoped<IApplicationService, ApplicationService>();
        services.AddScoped<IValidator<CreateCandidateRequest>, CreateCandidateRequestValidator>();
        services.AddScoped<IValidator<CandidateWriteRequest>, UpdateCandidateRequestValidator>();
        services.AddScoped<IValidator<ScreeningDecisionRequest>, ScreeningDecisionRequestValidator>();
        services.AddScoped<IValidator<ScheduleInterviewRequest>, ScheduleInterviewRequestValidator>();
        services.AddScoped<IValidator<InterviewOutcomeRequest>, InterviewOutcomeRequestValidator>();
        services.AddScoped<ISkillService, SkillService>();
        services.AddScoped<IValidator<CreateSkillsRequest>, CreateSkillsRequestValidator>();
        services.AddScoped<IValidator<UpdateSkillRequest>, UpdateSkillRequestValidator>();
        return services;
    }
}
