# Deploying the Talent Pool API to Azure App Service (Linux)

This guide deploys the ASP.NET Core API (`Src/Presentation/API`) to an Azure Web App on Linux, backed by Azure SQL. The React frontend is deployed separately.

## 1. Build the package

From the repository root:

```bash
dotnet publish Src/Presentation/API/API.csproj -c Release -o publish/api
cd publish/api && zip -qr ../api.zip . -x "appsettings.Development.json" "*.pdb" && cd -
```

The result is `publish/api.zip`. The files must sit at the root of the zip, not inside a folder.

## 2. Create the Azure resources (one time)

| Resource | Setting |
|---|---|
| **App Service plan** | Linux, **B1 or higher**. Free (F1) has no Always On and sleeps when idle. |
| **Web App** | Publish: *Code* · Runtime stack: **.NET 10 (LTS)** · OS: **Linux** |
| **Azure SQL Database** | Any tier. Under *Networking*, turn on **Allow Azure services and resources to access this server**. |

The same steps with the Azure CLI (`brew install azure-cli`, then `az login`):

```bash
RG=talentpool-rg; LOC=centralindia; PLAN=talentpool-plan; APP=talentpool-api   # APP must be globally unique

az group create -n $RG -l $LOC
az appservice plan create -g $RG -n $PLAN --is-linux --sku B1
az webapp create -g $RG -p $PLAN -n $APP --runtime "DOTNETCORE:10.0"
az webapp config set -g $RG -n $APP --startup-file "dotnet API.dll" --always-on true --http20-enabled true
az webapp update -g $RG -n $APP --https-only true
az webapp config set -g $RG -n $APP --generic-configurations '{"healthCheckPath":"/health"}'
```

## 3. Configure settings

Set these under **Web App → Settings → Environment variables → App settings**. In the Portal you can type `:` or `__`; on Linux, Azure converts them for you.

| Name | Value |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Jwt__SigningKey` | a **new** random value of at least 32 characters, e.g. `openssl rand -base64 48`. Never reuse the dev key or the one in git history. |
| `SeedAdmin__Email` | the first administrator's email |
| `SeedAdmin__Password` | a strong password of at least 12 characters (used only when that admin doesn't exist yet) |
| `Cors__AllowedOrigins__0` | the frontend's URL, e.g. `https://talentpool.example.com` (add `__1`, `__2` … for more) |

Set this under **Connection strings** (type **SQLAzure**), or as an app setting named `ConnectionStrings__DefaultConnection`:

| Name | Value |
|---|---|
| `DefaultConnection` | `Server=tcp:<server>.database.windows.net,1433;Database=<db>;User ID=<user>;Password=<password>;Encrypt=True;TrustServerCertificate=False;` |

**Recommended:** keep the signing key, the admin password and the database password in **Azure Key Vault**. Turn on the Web App's system-assigned managed identity, then set each app setting to a Key Vault reference: `@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>/)`.

**Alternative: no database password at all.** Use managed identity for Azure SQL. Make the Web App's identity a database user (`CREATE USER [<app-name>] FROM EXTERNAL PROVIDER; ALTER ROLE db_owner ADD MEMBER [<app-name>];`), then use the connection string `Server=tcp:<server>.database.windows.net,1433;Database=<db>;Authentication=Active Directory Managed Identity;Encrypt=True;`.

## 4. Deploy

Use one of these:

- **Azure CLI:** `az webapp deploy -g $RG -n $APP --src-path publish/api.zip --type zip`
- **VS Code:** install the *Azure App Service* extension, right-click the app, choose **Deploy to Web App…**, and pick the `publish/api` folder.
- **Portal (Kudu):** open `https://<app>.scm.azurewebsites.net/ZipDeployUI` and drag `api.zip` onto the page.

## 5. Verify

1. `https://<app>.azurewebsites.net/health` returns `Healthy`, and `https://<app>.azurewebsites.net/swagger` shows the API docs.
2. **Log stream** (Web App → Monitoring) shows the app starting. On first start, the API **applies all EF Core migrations** and seeds the roles and the admin user.
3. Sign in from the frontend with the seed admin, then change that password straight away under **Account**.

If startup fails, the log stream names the missing setting, e.g. *"Connection string 'DefaultConnection' is not configured"* or *"JWT issuer, audience, and a signing key of at least 32 bytes must be configured"*.

## Operational notes

- **Migrations run at startup.** Back up the database before deploying a version that contains new migrations. Keep the app at **1 instance** while migrations run: several instances starting together would race to apply them. Once you scale out, move migrations into the release pipeline (`dotnet ef migrations bundle`) instead.
- **HTTPS:** App Service handles HTTPS for the app, and *HTTPS Only* (set above) redirects plain HTTP. The app's own HTTPS redirect has nothing to do behind App Service.
- **Swagger UI** is at `https://<app>.azurewebsites.net/swagger`. Sign in with `POST /api/auth/login`, click **Authorize** and paste the `accessToken`. To hide the API docs in an environment, set the app setting `Swagger__Enabled=false`.
- **Token lifetime:** sign-in tokens last 60 minutes. Changing `Jwt__SigningKey` signs everyone out.
- **Frontend:** build it with `VITE_API_BASE_URL=https://<app>.azurewebsites.net/api npm run build` in `Src/Presentation/Webapp`, then host `dist/` on Azure Static Web Apps or Storage static website hosting. Add that origin to `Cors__AllowedOrigins__0`.

## Troubleshooting

### "Couldn't detect a version for the platform 'dotnet' in the repo"

App Service's build engine (Oryx) tried to build on the server and found no `.csproj` at the root. This repo keeps the API in `Src/Presentation/API` next to a React app, so Oryx has to be told where it is. Which fix you need depends on how you deploy:

| How you deploy | Fix: add these under **Environment variables → App settings**, then redeploy |
|---|---|
| **Upload the prebuilt `api.zip`** (Kudu ZipDeployUI / QuickDeploy, VS Code, `az webapp deploy`) | The zip now carries a `.deployment` file that switches the build off. If the error still appears, the app's own settings are overriding it, so set `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false` and `ENABLE_ORYX_BUILD` = `false`. The zip is already compiled, so there is nothing to build. Also set the **Startup Command** to `dotnet API.dll`. |
| **Deployment Center → GitHub / Local Git, with "App Service build service"** | `PROJECT` = `Src/Presentation/API/API.csproj` (the repo's `.deployment` file says the same) and `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true` |

For GitHub, the more reliable choice is a **GitHub Actions** pipeline: build and test in CI, then deploy the compiled output. The `global.json` file at the repository root pins the .NET 10 SDK for both local builds and CI.

## Frontend on the same Windows Web App, under `/app`

The React app is hosted as a **virtual application at `/app`** on the same Web App as the API. Because both share one site, the browser calls the API at `/api` on the same origin, so CORS needs no configuration.

| URL | Served by |
|---|---|
| `https://<site>/app/...` | React app (static files plus `web.config`) |
| `https://<site>/api/...`, `/swagger`, `/health`, `/` | ASP.NET Core API |

### Build

```bash
cd Src/Presentation/Webapp
npm ci
npm run build:azure        # reads .env.azure: VITE_BASE_PATH=/app/, VITE_API_BASE_URL=https://<site>/api
cd dist && zip -qr ../../../../publish/webapp.zip . && cd -
```

`build:azure` puts every asset and route under `/app/` and generates `dist/web.config` from `deploy/web.config`. That config:
- rewrites deep links such as `/app/jobs/5` to `/app/index.html`;
- adds MIME types for fonts;
- caches the hashed `assets/` for a year and never caches `index.html`;
- sets basic security headers.

To use a different path, change `VITE_BASE_PATH` in `.env.azure` and rebuild.

### One-time App Service setup (Windows)

1. **Web App → Settings → Configuration → Path mappings → Virtual applications and directories → + New virtual application or directory**:
   - Virtual path: `/app`
   - Physical path: `site\app`
   - **Directory: unchecked**. It must be an *application*, not a directory.

   Keep the physical path **outside `site\wwwroot`**. API zip deployments manage `wwwroot` and could otherwise delete the frontend.
2. Leave the existing `/` → `site\wwwroot` mapping as it is (the API).
3. Click **Save**. The site restarts.

### Deploy the frontend

1. Open Kudu at `https://<site>.scm.azurewebsites.net` and choose **Debug console → CMD**.
2. Go to `site`. If there is no `app` folder, create one (**+ → New folder → `app`**), then open it.
3. Drag **`publish/webapp.zip`** onto the **"Drag here to upload and unzip"** area on the right. Kudu extracts it in place.
4. When you deploy a new version, delete the old contents of `site\app` first, so stale files don't linger. The files under `assets/` have new names on every build.

### Verify

- `https://<site>/app/` shows the login page, and the favicon is the indigo **R**.
- Sign in, then open a deep link such as `https://<site>/app/jobs` and refresh. It should load rather than return a 404.
- In the browser dev tools Network tab, API calls should go to `https://<site>/api/...`.
