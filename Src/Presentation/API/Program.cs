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
if (!app.Environment.IsEnvironment("Testing"))
{
    await app.Services.InitializeDatabaseAsync(builder.Configuration);
}

app.UseApiMiddlewares();
app.MapHealthChecks("/health");
app.Run();

public partial class Program { }
