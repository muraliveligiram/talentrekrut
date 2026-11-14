# TalRekrut

TalRekrut is an IT recruitment management system built with ASP.NET Core, EF Core, SQL Server, and a React/TypeScript frontend.

## Local prerequisites

- .NET 10 SDK
- SQL Server available at `Data Source=.`
- Node.js and npm

The Development API connection string is configured in `Src/Presentation/API/appsettings.Development.json` for the `TalRekrut` database. On startup, the API applies EF migrations and seeds the Admin and Recruiter roles plus the configured initial Admin user.

Set the JWT and initial Admin values in the API process environment; do not commit signing keys or passwords:

```powershell
$env:Jwt__Issuer = "TalRekrut"
$env:Jwt__Audience = "TalRekrut.Web"
$env:Jwt__SigningKey = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
$env:SeedAdmin__Email = "admin@example.com"
$env:SeedAdmin__Password = "<choose-a-unique-password-of-at-least-12-characters>"
```

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
