using Applications.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Repository;

public sealed class RekrutDbContextFactory : IDesignTimeDbContextFactory<RekrutDbContext>
{
    public RekrutDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Data Source=.;Initial Catalog=TalRekrut;Integrated Security=True;Trust Server Certificate=True";

        var options = new DbContextOptionsBuilder<RekrutDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new RekrutDbContext(options, new DesignTimeCurrentUserService());
    }

    private sealed class DesignTimeCurrentUserService : ICurrentUserService
    {
        public long? UserId => null;
        public IReadOnlyCollection<string> Roles => Array.Empty<string>();
    }
}
