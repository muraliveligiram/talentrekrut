using API.Infrastructure;
using Applications;
using Domain.Services;
using Repository;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddApplicationServices();
builder.Services.AddDomainServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();
// Integration tests use an in-memory database and seed their own data.
// Elsewhere, Database:ApplyMigrations and Database:SeedData control what runs (both default to true).
if (!app.Environment.IsEnvironment("Testing"))
{
    await app.Services.InitializeDatabaseAsync(builder.Configuration);
}

app.UseApiMiddlewares();
app.MapHealthChecks("/health");
app.Run();

public partial class Program { }
