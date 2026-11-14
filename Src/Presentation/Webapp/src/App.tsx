import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'

const DashboardLayout = lazy(() =>
  import('./components/DashboardLayout').then((module) => ({ default: module.DashboardLayout })),
)
const PlaceholderPage = lazy(() =>
  import('./components/PlaceholderPage').then((module) => ({ default: module.PlaceholderPage })),
)
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const LoginPage = lazy(() =>
  import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const CompanyDetailsPage = lazy(() =>
  import('./features/companies/CompanyDetailsPage').then((module) => ({
    default: module.CompanyDetailsPage,
  })),
)
const CompanyFormPage = lazy(() =>
  import('./features/companies/CompanyFormPage').then((module) => ({
    default: module.CompanyFormPage,
  })),
)
const CompanyListPage = lazy(() =>
  import('./features/companies/CompanyListPage').then((module) => ({
    default: module.CompanyListPage,
  })),
)
const JobListPage = lazy(() =>
  import('./features/jobs/JobListPage').then((module) => ({ default: module.JobListPage })),
)
const JobFormPage = lazy(() =>
  import('./features/jobs/JobFormPage').then((module) => ({ default: module.JobFormPage })),
)
const JobDetailsPage = lazy(() =>
  import('./features/jobs/JobDetailsPage').then((module) => ({ default: module.JobDetailsPage })),
)

export default function App() {
  return (
    <Suspense fallback={<div role="status">Loading page…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="companies" element={<RequireAuth allowedRoles={['Admin']} />}>
              <Route index element={<CompanyListPage />} />
              <Route path="new" element={<CompanyFormPage />} />
              <Route path=":id" element={<CompanyDetailsPage />} />
              <Route path=":id/edit" element={<CompanyFormPage />} />
            </Route>
            <Route path="jobs">
              <Route index element={<JobListPage />} />
              <Route path="new" element={<RequireAuth allowedRoles={['Admin']}><JobFormPage /></RequireAuth>} />
              <Route path=":id" element={<JobDetailsPage />} />
              <Route path=":id/edit" element={<RequireAuth allowedRoles={['Admin']}><JobFormPage /></RequireAuth>} />
            </Route>
            <Route path="candidates" element={<PlaceholderPage title="Candidates" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
