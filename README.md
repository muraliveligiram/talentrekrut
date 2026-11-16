# TalRekrut

See [docs/PROJECT_CHARTER.md](docs/PROJECT_CHARTER.md) for scope, status and roadmap.

TalRekrut is an IT recruitment management system built with ASP.NET Core, EF Core, SQL Server, and a React/TypeScript frontend.

## Local prerequisites

- .NET 10 SDK
- SQL Server available at `Data Source=.`
- Node.js and npm

The Development API connection string is configured in `Src/Presentation/API/appsettings.Development.json` for the `TalRekrut` database. On startup, the API applies EF migrations and seeds the Admin and Recruiter roles plus the configured initial Admin user.

Secrets are never stored in `appsettings*.json`. For local development, use .NET user-secrets (loaded automatically in the Development environment):

```powershell
Set-Location Src\Presentation\API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=TalRekrut;User Id=SA;Password=<sa-password>;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:SigningKey" "<random string of at least 32 bytes>"
dotnet user-secrets set "SeedAdmin:Email" "admin@example.com"
dotnet user-secrets set "SeedAdmin:Password" "<unique password of at least 12 characters>"
```

In other environments, supply the same values as environment variables (`ConnectionStrings__DefaultConnection`, `Jwt__SigningKey`, `SeedAdmin__Email`, `SeedAdmin__Password`).

## Run

Start the API from the repository root:

```powershell
dotnet run --project Src\Presentation\API\API.csproj --launch-profile http
```

Start the React application in a second terminal:

```powershell
Set-Location Src\Presentation\Webapp
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:5101`.

## Database migrations

The repository includes an EF Core 10 local tool manifest. Restore it and generate an idempotent SQL script from the API directory:

```powershell
dotnet tool restore
Set-Location Src\Presentation\API
dotnet ef migrations script --idempotent --project ..\..\Infrastructure\Repository\Repository.csproj --startup-project API.csproj
```

The API applies pending migrations automatically at startup; review migration scripts before applying them to shared or production databases.

## Verify

```powershell
dotnet test tests\IntegrationTests\IntegrationTests.csproj
Set-Location Src\Presentation\Webapp
npm run test
npm run lint
npm run build
```

The integration tests use an isolated EF Core in-memory database and do not modify the configured SQL Server database.
