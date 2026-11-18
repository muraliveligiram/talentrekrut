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
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<JobInterviewRound> JobInterviewRounds => Set<JobInterviewRound>();
    public DbSet<JobAssignment> JobAssignments => Set<JobAssignment>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<ApplicationStageChange> ApplicationStageChanges => Set<ApplicationStageChange>();

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
            entity.HasOne(user => user.Company)
                .WithMany()
                .HasForeignKey(user => user.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);
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
            entity.HasOne(skill => skill.Skill)
                .WithMany()
                .HasForeignKey(skill => skill.SkillId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(skill => skill.Job)
                .WithMany(job => job.Skills)
                .HasForeignKey(skill => skill.JobId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(skill => !skill.IsDeleted);
        });

        modelBuilder.Entity<JobInterviewRound>(entity =>
        {
            entity.Property(round => round.Name).HasMaxLength(100).IsRequired();
            entity.HasIndex(round => new { round.JobId, round.Sequence })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
            entity.HasOne(round => round.Job)
                .WithMany(job => job.InterviewRounds)
                .HasForeignKey(round => round.JobId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(round => !round.IsDeleted);
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.Property(skill => skill.Name).HasMaxLength(100).IsRequired();
            entity.Property(skill => skill.NormalizedName).HasMaxLength(100).IsRequired();
            entity.HasIndex(skill => skill.NormalizedName).IsUnique();
            entity.HasIndex(skill => new { skill.IsActive, skill.Category });
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

        modelBuilder.Entity<Candidate>(entity =>
        {
            entity.Property(candidate => candidate.FullName).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.CurrentRole).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.CurrentCompany).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.Phone).HasMaxLength(30).IsRequired();
            entity.Property(candidate => candidate.NormalizedPhone).HasMaxLength(30).IsRequired();
            entity.Property(candidate => candidate.PersonalEmail).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.NormalizedPersonalEmail).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.CompanyEmail).HasMaxLength(200);
            entity.Property(candidate => candidate.CurrentCtcLpa).HasPrecision(9, 2);
            entity.Property(candidate => candidate.VariablePayLpa).HasPrecision(9, 2);
            entity.Property(candidate => candidate.ExpectedCtcLpa).HasPrecision(9, 2);
            entity.Property(candidate => candidate.LinkedInUrl).HasMaxLength(300);
            entity.Property(candidate => candidate.Notes).HasMaxLength(4000);
            entity.HasIndex(candidate => candidate.NormalizedPersonalEmail);
            entity.HasIndex(candidate => candidate.NormalizedPhone);
            entity.HasOne(candidate => candidate.SourcedBy)
                .WithMany()
                .HasForeignKey(candidate => candidate.SourcedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(candidate => !candidate.IsDeleted);
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasIndex(application => new { application.CandidateId, application.JobId })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
            entity.HasIndex(application => new { application.JobId, application.Stage });
            entity.Property(application => application.RejectionNotes).HasMaxLength(2000);
            entity.PrimitiveCollection(application => application.RejectionReasons);
            entity.HasOne(application => application.Candidate)
                .WithMany(candidate => candidate.Applications)
                .HasForeignKey(application => application.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(application => application.Job)
                .WithMany(job => job.Applications)
                .HasForeignKey(application => application.JobId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(application => application.SubmittedBy)
                .WithMany()
                .HasForeignKey(application => application.SubmittedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(application => !application.IsDeleted);
        });

        modelBuilder.Entity<ApplicationStageChange>(entity =>
        {
            entity.Property(change => change.Notes).HasMaxLength(2000);
            entity.HasOne(change => change.JobApplication)
                .WithMany(application => application.History)
                .HasForeignKey(change => change.JobApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(change => change.ChangedBy)
                .WithMany()
                .HasForeignKey(change => change.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(change => !change.IsDeleted);
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
