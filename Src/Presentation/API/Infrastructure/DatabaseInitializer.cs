using Applications.Abstractions;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API.Infrastructure;

public static class DatabaseInitializer
{
    private const int MinimumSeedPasswordLength = 6;

    /// <summary>
    /// Prepares the database at startup, controlled by two settings:
    /// <c>Database:ApplyMigrations</c> (create/update tables) and <c>Database:SeedData</c>
    /// (roles and the first admin). Both default to true; set ApplyMigrations to false when the
    /// schema is applied separately, e.g. by running database-migrations.sql against Azure SQL.
    /// </summary>
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        var applyMigrations = configuration.GetValue("Database:ApplyMigrations", defaultValue: true);
        var seedData = configuration.GetValue("Database:SeedData", defaultValue: true);

        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseInitializer));
        var dbContext = scope.ServiceProvider.GetRequiredService<RekrutDbContext>();

        if (applyMigrations)
        {
            logger.LogInformation("Applying database migrations (Database:ApplyMigrations=true).");
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        else
        {
            logger.LogInformation("Skipping database migrations (Database:ApplyMigrations=false).");
        }

        if (!seedData)
        {
            logger.LogInformation("Skipping seed data (Database:SeedData=false).");
            return;
        }

        await SeedAsync(scope.ServiceProvider, dbContext, configuration, logger, cancellationToken);
    }

    /// <summary>Adds the roles and the first administrator if they are missing. Safe to run on every start.</summary>
    private static async Task SeedAsync(
        IServiceProvider scopedServices,
        RekrutDbContext dbContext,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var adminEmail = configuration["SeedAdmin:Email"]?.Trim();
        var adminPassword = configuration["SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "SeedAdmin:Email and SeedAdmin:Password must be configured, or set Database:SeedData=false.");
        }

        var roleByName = new Dictionary<string, Role>(StringComparer.OrdinalIgnoreCase);
        foreach (var roleName in new[] { RoleNames.Admin, RoleNames.Recruiter, RoleNames.Vendor })
        {
            var role = await dbContext.Roles.SingleOrDefaultAsync(
                existingRole => existingRole.Name == roleName,
                cancellationToken);
            if (role is null)
            {
                role = new Role { Name = roleName };
                dbContext.Roles.Add(role);
            }

            roleByName[roleName] = role;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var normalizedEmail = adminEmail.ToUpperInvariant();
        var admin = await dbContext.Users.SingleOrDefaultAsync(
            user => user.NormalizedEmail == normalizedEmail,
            cancellationToken);
        if (admin is null)
        {
            if (adminPassword.Length < MinimumSeedPasswordLength)
            {
                throw new InvalidOperationException(
                    $"The seed administrator password must be at least {MinimumSeedPasswordLength} characters.");
            }

            admin = new User
            {
                Email = adminEmail,
                NormalizedEmail = normalizedEmail,
                FullName = "Administrator",
                IsActive = true
            };
            var passwordHashService = scopedServices.GetRequiredService<IPasswordHashService>();
            admin.PasswordHash = passwordHashService.HashPassword(admin, adminPassword);
            admin.UserRoles.Add(new UserRole { Role = roleByName[RoleNames.Admin] });
            dbContext.Users.Add(admin);
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Created the seed administrator {Email}.", adminEmail);
        }
    }
}
