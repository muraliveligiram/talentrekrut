using Applications.Abstractions;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API.Infrastructure;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        var adminEmail = configuration["SeedAdmin:Email"]?.Trim();
        var adminPassword = configuration["SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "SeedAdmin:Email and SeedAdmin:Password must be configured before starting the API.");
        }

        if (adminPassword.Length < 5)
        {
            throw new InvalidOperationException("The seed administrator password must be at least 12 characters.");
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<RekrutDbContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);

        var roleByName = new Dictionary<string, Role>(StringComparer.OrdinalIgnoreCase);
        foreach (var roleName in new[] { RoleNames.Admin, RoleNames.Recruiter })
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
            admin = new User
            {
                Email = adminEmail,
                NormalizedEmail = normalizedEmail,
                FullName = "Administrator",
                IsActive = true
            };
            var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
            admin.PasswordHash = passwordHashService.HashPassword(admin, adminPassword);
            admin.UserRoles.Add(new UserRole { Role = roleByName[RoleNames.Admin] });
            dbContext.Users.Add(admin);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
