using Applications.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Repository;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured. "
                + "Set it with 'dotnet user-secrets' or the ConnectionStrings__DefaultConnection environment variable.");
        }

        services.AddDbContext<RekrutDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IAuthUserRepository, AuthUserRepository>();
        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<IJobRepository, JobRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICandidateRepository, CandidateRepository>();
        services.AddScoped<ISkillRepository, SkillRepository>();

        return services;
    }
}
