# TalRekrut — Project Charter

_Last updated: 2026-11-15_

## 1. Purpose

TalRekrut is an IT recruitment management system. It lets an agency's **Admins** manage client companies and job requirements and hand jobs to **Recruiters**. Recruiters source candidates against the jobs assigned to them and move those candidates through a hiring pipeline.

## 2. Objectives

1. Keep client companies and their open job requirements in one place.
2. Control who works on what. Admins assign jobs, and a recruiter sees only the jobs assigned to them.
3. Track candidates from sourcing through to hire or rejection, against specific jobs.
4. Give Admins a live overview: open jobs, active candidates and interviews this week.
5. Ship on a codebase that is secure and tested, so new features don't break existing ones.

## 3. Scope

**In scope (MVP):** authentication and roles (Admin, Recruiter, Vendor), user management, companies, jobs (skills, status, recruiter assignment), candidates, the candidate-to-job pipeline, interview scheduling and dashboard metrics.

**Out of scope for now:** candidate self-service portal, job-board integrations, email or calendar sync, resume parsing with AI, multi-tenant (multi-agency) support, billing and invoicing.

## 4. Architecture

| Layer | Project | Notes |
|---|---|---|
| Domain | `Src/Domains/Domain.Entities` | EF entities and enums; `BaseEntity` carries the audit fields and soft delete |
| Application | `Src/Application/Applications` | Services, DTOs, FluentValidation validators, repository interfaces |
| Infrastructure | `Src/Infrastructure/Repository` | EF Core 10 on SQL Server, migrations, repositories |
| API | `Src/Presentation/API` | ASP.NET Core (.NET 10) controllers, JWT bearer auth, ProblemDetails, Swagger |
| Web | `Src/Presentation/Webapp` | React 19, TypeScript, Vite, Tailwind CSS v4, Radix primitives, lucide icons, React Query, react-hook-form with zod |
| Tests | `tests/IntegrationTests` + Vitest | xUnit with WebApplicationFactory and EF in-memory; Vitest with Testing Library |

**Conventions to keep:** UI is built from the in-house kit in `src/components/ui` (shadcn-style, design tokens in `index.css`, light and dark themes), with no other component library; soft delete through the `DbContext` audit hook; a role check on every write endpoint; feature folders on the frontend (`api`, `hooks`, `types`, `pages`); a validator for every write request.

## 5. Current status (baseline as of 2026-11-15)

**Done:**
- JWT login, `/auth/me`, seeding of the Admin and Recruiter roles, frontend `RequireAuth` with role gating.
- Companies: CRUD, search, paging, soft delete, and a block on deleting a company that has active jobs. Admin only.
- Jobs: CRUD, auto-generated `JOB-YYYY-NNNN` codes, skills (Primary, Secondary, GoodToHave), status changes, recruiter assign and unassign, and visibility scoped to the recruiter.
- Build is green: 7 backend integration tests and 8 frontend tests pass; lint and build are clean.

**Not started:** resume upload, multi-round interviews, offer and joining tracking, and reporting beyond the dashboard counts.

## 6. Issues found during analysis

| # | Severity | Issue |
|---|---|---|
| I-1 | **Critical** | `AuthService.LoginAsync` has password verification commented out, so **any password logs in**. This is committed to `main`. No test covers a wrong password. |
| I-2 | **High** | The JWT signing key and seed admin credentials are committed in `appsettings.json`. The key is in git history and must be rotated. Local changes also add an SA database password to that file. |
| I-3 | Medium | The seed admin password check was weakened to 5 characters, while its error message still says 12. |
| I-4 | Medium | `.gitignore` lists about 990 individual files instead of patterns. As a result, `bin/` and `obj/` show as untracked and `.vs/` is committed. |
| I-5 | Low | `JobRepository.SaveChangesAsync` maps *every* unique-index violation to `DuplicateJobCodeException`, and job-code generation races under concurrent creates. |
| I-6 | Low | Job status changes are unrestricted (for example, Closed can go straight to Draft). |
| I-7 | Low | Placeholder projects `Domain.Contracts` and `Shared/Utils` contain only `Class1`. `Database.sqlproj` duplicates the EF migrations as a second schema source and is now out of date (no candidate, application or skill tables). |
| I-8 | Low | No CI pipeline. Nothing runs the tests on a PR. |

## 7. Roadmap

### Phase 0 — Stabilize and secure _(done 2026-11-15, pending JWT key rotation in shared environments)_
- [x] P0-1 Restore password verification and add tests for a wrong password and an inactive user (I-1)
- [x] P0-2 Move secrets out of `appsettings.json` into user-secrets or environment variables, and rotate the JWT key (I-2)
- [x] P0-3 Enforce a 12-character minimum for the seed admin password (I-3)
- [x] P0-4 Replace `.gitignore` with standard patterns and untrack `.vs/` (I-4)
- [x] P0-5 Add a GitHub Actions CI job that runs `dotnet test`, `npm test`, lint and build (I-8)

### Phase 1 — User management _(done 2026-11-15)_
- [x] Admins can create, list, edit and deactivate users (Recruiter or Admin) and reset passwords
- [x] Users page in the frontend; recruiter picker on jobs reuses the same API
- [x] Users can change their own password

### Vendor access _(done 2026-11-17)_
- [x] `Vendor` role: a client contact linked to exactly one company (mandatory), not combinable with staff roles
- [x] Vendors see only their company's jobs that have left Draft, read-only, without internal recruiter assignments
- [x] Candidate profiles, exports, insights, skills, companies and users are staff-only, enforced by the API
- [x] Vendors see candidates submitted to their company's jobs, redacted to name, current role, level, stage, interview date, rejection reasons and the timeline; no contact details, date of birth, CTC, employer or internal notes
- [x] Vendors move those candidates through the workflow (shortlist / not shortlist, schedule or reschedule interview, select / reject); they cannot add or edit candidates or export
- [ ] When a company is deleted, deactivate its vendor users (agreed, deferred)

### Skill library _(done 2026-11-16)_
- [x] Shared skill catalogue with categories; admins and recruiters add skills (bulk or inline from the job form); admins rename, recategorise and deactivate
- [x] Job skills reference the library and are picked with Primary / Secondary / Good-to-have multi-selects; existing free-text job skills migrated into the library
- [ ] Minimum years per skill is kept on existing jobs but no longer editable in the UI
- [ ] Use the library for candidate skills and job matching

### Phase 2 — Candidates _(done 2026-11-15)_
- [x] Candidate profile: name, DOB, phone, personal and company email, LinkedIn, current role, company, level, current CTC (with variable flag and amount), expected CTC, notice period, notes. CTC is stored in LPA.
- [x] CRUD and search (name, email, phone, company, role) with level and stage filters; duplicate detection by personal email or phone
- [x] Recruiters see candidates they sourced or that are linked to their assigned jobs; only admins delete
- [ ] Resume upload, stored behind an abstraction (local disk first)

### Phase 3 — Pipeline and interviews _(done 2026-11-15)_
- [x] `JobApplication` (candidate × job, unique) submitted only to Open jobs, from the candidate form, candidate page or job page
- [x] Workflow: Screening → Shortlisted / Not shortlisted → Interview scheduled (reschedulable) → Selected / Rejected, with reasons required on post-interview rejection
- [x] Timeline of every step, with who, when and notes
- [x] Pipeline on each job page with stage filters
- [x] Each job defines its interview process: 1–10 named rounds in order (e.g. Coding test → Face to face → HR discussion)
- [x] Track candidates per round: schedule or reschedule each of the job's rounds and record cleared / not cleared; clearing the final round selects, failing any round rejects
- [x] After selection: date of joining, then Joined / Did not join with required reasons (accepted another offer, counter-offer, compensation, relocation, personal, health, no response, offer withdrawn, other)
- [ ] Interview mode and interviewer per round
- [x] Post-selection tracking: date of joining, Joined / Did not join (an explicit Offered stage is still open)

### Phase 4 — Dashboard and reporting
- [x] Live counts: open jobs, active candidates, interviews this week
- [ ] Per-recruiter view: my jobs, my pipeline and upcoming interviews

### Phase 5 — Hardening
- [ ] Rules for job status transitions (I-6) and correct mapping of unique-index errors (I-5)
- [ ] Revoke tokens immediately when a user is deactivated (today they stay valid for up to 60 minutes)
- [ ] Rate limiting on login; token expiry and refresh handling in the frontend
- [ ] Remove the placeholder projects and settle on one schema source (I-7)

## 8. Definition of done

A feature is done when it has migrations, API endpoints with role checks and validation, integration tests covering both the success path and the authorization path, a frontend page with a form test, and green CI.

## 9. Team

| Role | Who |
|---|---|
| Owner / reviewer | Repository owner (muraliveligiram) |
| Contributor | sairampinninti89 |
