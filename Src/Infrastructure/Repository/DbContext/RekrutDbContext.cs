using Microsoft.EntityFrameworkCore;
using Applications.Abstractions;
using Domain.Entities;

namespace Repository;

public sealed class RekrutDbContext : DbContext
{
    private readonly ICurrentUserService _currentUserService;

    public RekrutDbContext(
        DbContextOptions<RekrutDbContext> options,
        ICurrentUserService currentUserService)
        : base(options)
    {
        _currentUserService = currentUserService;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobSkill> JobSkills => Set<JobSkill>();
    public DbSet<JobAssignment> JobAssignments => Set<JobAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
            entity.Property(user => user.Email).HasMaxLength(200).IsRequired();
            entity.Property(user => user.NormalizedEmail).HasMaxLength(200).IsRequired();
            entity.Property(user => user.FullName).HasMaxLength(200).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(500).IsRequired();
            entity.HasQueryFilter(user => !user.IsDeleted);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(role => role.Name).IsUnique();
            entity.Property(role => role.Name).HasMaxLength(50).IsRequired();
            entity.HasQueryFilter(role => !role.IsDeleted);
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasIndex(userRole => new { userRole.UserId, userRole.RoleId }).IsUnique();
            entity.HasOne(userRole => userRole.User)
                .WithMany(user => user.UserRoles)
                .HasForeignKey(userRole => userRole.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(userRole => userRole.Role)
                .WithMany(role => role.UserRoles)
                .HasForeignKey(userRole => userRole.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(userRole => !userRole.IsDeleted);
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasIndex(company => company.Name).IsUnique();
            entity.Property(company => company.Name).HasMaxLength(200).IsRequired();
            entity.Property(company => company.Industry).HasMaxLength(100);
            entity.Property(company => company.Website).HasMaxLength(300);
            entity.Property(company => company.Address).HasMaxLength(300);
            entity.Property(company => company.City).HasMaxLength(100);
            entity.Property(company => company.State).HasMaxLength(100);
            entity.Property(company => company.Country).HasMaxLength(100);
            entity.Property(company => company.PostalCode).HasMaxLength(30);
            entity.Property(company => company.ContactPersonName).HasMaxLength(200);
            entity.Property(company => company.ContactEmail).HasMaxLength(200);
            entity.Property(company => company.ContactPhone).HasMaxLength(30);
            entity.Property(company => company.LogoPath).HasMaxLength(500);
            entity.HasQueryFilter(company => !company.IsDeleted);
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasIndex(job => job.JobCode).IsUnique();
            entity.Property(job => job.JobCode).HasMaxLength(30).IsRequired();
            entity.Property(job => job.Title).HasMaxLength(200).IsRequired();
            entity.Property(job => job.Location).HasMaxLength(200);
            entity.Property(job => job.CommunicationRequirement).HasMaxLength(500);
            entity.HasOne(job => job.Company)
                .WithMany(company => company.Jobs)
                .HasForeignKey(job => job.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(job => !job.IsDeleted);
        });

        modelBuilder.Entity<JobSkill>(entity =>
        {
            entity.Property(skill => skill.SkillName).HasMaxLength(100).IsRequired();
            entity.HasOne(skill => skill.Job)
                .WithMany(job => job.Skills)
                .HasForeignKey(skill => skill.JobId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(skill => !skill.IsDeleted);
        });

        modelBuilder.Entity<JobAssignment>(entity =>
        {
            entity.HasIndex(assignment => new { assignment.JobId, assignment.RecruiterUserId })
                .IsUnique()
                .HasFilter("[IsActive] = 1");
            entity.HasOne(assignment => assignment.Job)
                .WithMany(job => job.Assignments)
                .HasForeignKey(assignment => assignment.JobId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(assignment => assignment.Recruiter)
                .WithMany()
                .HasForeignKey(assignment => assignment.RecruiterUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(assignment => assignment.AssignedAt).IsRequired();
            entity.Property(assignment => assignment.AssignedBy).IsRequired();
            entity.HasQueryFilter(assignment => !assignment.IsDeleted);
        });

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
            .Where(entityType => typeof(BaseEntity).IsAssignableFrom(entityType.ClrType)))
        {
            var entity = modelBuilder.Entity(entityType.ClrType);
            entity.Property(nameof(BaseEntity.CreatedBy)).HasMaxLength(200);
            entity.Property(nameof(BaseEntity.UpdatedBy)).HasMaxLength(200);
        }
    }

    public override int SaveChanges()
    {
        ApplyAuditFields();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyAuditFields();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ApplyAuditFields()
    {
        var now = DateTimeOffset.UtcNow;
        var userId = _currentUserService.UserId;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedBy = userId?.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
            else if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = userId?.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = userId?.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
        }
    }
}
