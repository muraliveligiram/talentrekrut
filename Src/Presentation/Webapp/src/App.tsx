import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { PageLoader } from './components/ui/spinner'

function lazyNamed<K extends string, P extends object>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
) {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}

const AppShell = lazyNamed(() => import('./components/layout/AppShell'), 'AppShell')
const LoginPage = lazyNamed(() => import('./features/auth/LoginPage'), 'LoginPage')
const DashboardPage = lazyNamed(() => import('./features/dashboard/DashboardPage'), 'DashboardPage')
const CompanyListPage = lazyNamed(() => import('./features/companies/CompanyListPage'), 'CompanyListPage')
const CompanyFormPage = lazyNamed(() => import('./features/companies/CompanyFormPage'), 'CompanyFormPage')
const CompanyDetailsPage = lazyNamed(() => import('./features/companies/CompanyDetailsPage'), 'CompanyDetailsPage')
const JobListPage = lazyNamed(() => import('./features/jobs/JobListPage'), 'JobListPage')
const JobFormPage = lazyNamed(() => import('./features/jobs/JobFormPage'), 'JobFormPage')
const JobDetailsPage = lazyNamed(() => import('./features/jobs/JobDetailsPage'), 'JobDetailsPage')
const UserListPage = lazyNamed(() => import('./features/users/UserListPage'), 'UserListPage')
const CandidateListPage = lazyNamed(() => import('./features/candidates/CandidateListPage'), 'CandidateListPage')
const CandidateFormPage = lazyNamed(() => import('./features/candidates/CandidateFormPage'), 'CandidateFormPage')
const CandidateDetailsPage = lazyNamed(() => import('./features/candidates/CandidateDetailsPage'), 'CandidateDetailsPage')
const SkillsPage = lazyNamed(() => import('./features/skills/SkillsPage'), 'SkillsPage')
const AccountPage = lazyNamed(() => import('./features/account/AccountPage'), 'AccountPage')

const adminOnly = ['Admin']

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="companies" element={<RequireAuth allowedRoles={adminOnly} />}>
              <Route index element={<CompanyListPage />} />
              <Route path="new" element={<CompanyFormPage />} />
              <Route path=":id" element={<CompanyDetailsPage />} />
              <Route path=":id/edit" element={<CompanyFormPage />} />
            </Route>
            <Route path="jobs">
              <Route index element={<JobListPage />} />
              <Route path=":id" element={<JobDetailsPage />} />
              <Route element={<RequireAuth allowedRoles={adminOnly} />}>
                <Route path="new" element={<JobFormPage />} />
                <Route path=":id/edit" element={<JobFormPage />} />
              </Route>
            </Route>
            <Route path="users" element={<RequireAuth allowedRoles={adminOnly} />}>
              <Route index element={<UserListPage />} />
            </Route>
            <Route path="candidates">
              <Route index element={<CandidateListPage />} />
              <Route path="new" element={<CandidateFormPage />} />
              <Route path=":id" element={<CandidateDetailsPage />} />
              <Route path=":id/edit" element={<CandidateFormPage />} />
            </Route>
            <Route path="skills" element={<SkillsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
