import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ roles: ['Admin'], user: { id: 1, name: 'Ada Admin', email: 'ada@example.test' } }),
}))

vi.mock('@/features/jobs/jobsApi', () => ({
  getJobs: vi.fn(async () => ({ items: [], totalCount: 7, page: 1, pageSize: 1 })),
}))

vi.mock('@/features/candidates/candidatesApi', () => ({
  getPipelineStats: vi.fn(async () => ({ activeCandidates: 12, interviewsInRange: 3 })),
  getPipelineInsights: vi.fn(async () => ({
    days: 60,
    from: '2026-09-17T00:00:00Z',
    to: '2026-11-16T00:00:00Z',
    selectedCount: 4,
    outcomes: { submitted: 10, inProgress: 3, notShortlisted: 4, selected: 2, rejected: 1 },
    recruiters: [
      { userId: 2, name: 'Riya Recruiter', processed: 8, submitted: 6, shortlisted: 3, notShortlisted: 3, selected: 2, rejected: 0 },
      { userId: 1, name: 'Ada Admin', processed: 2, submitted: 0, shortlisted: 1, notShortlisted: 1, selected: 1, rejected: 1 },
    ],
  })),
}))

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  it('shows 60-day selections, outcomes and recruiter activity instead of active users', async () => {
    renderDashboard()

    const selected = (await screen.findByText('Candidates selected in the last 60 days')).closest('a')!
    expect(await within(selected).findByText('4')).toBeInTheDocument()
    expect(screen.queryByText('Active users')).not.toBeInTheDocument()

    expect(await screen.findByText(/the 10 profiles submitted in the last 60 days/i)).toBeInTheDocument()
    const notShortlisted = screen.getByRole('meter', { name: 'Not shortlisted' })
    expect(notShortlisted).toHaveAttribute('aria-valuenow', '4')
    expect(notShortlisted).toHaveAttribute('aria-valuetext', expect.stringContaining('4 of 10'))
    expect(screen.getByRole('meter', { name: 'Selected' })).toHaveAttribute('aria-valuenow', '2')

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Riya Recruiter')).toBeInTheDocument()
    // Columns: processed, submitted, shortlisted, not shortlisted, selected, rejected.
    expect(within(rows[0]).getAllByRole('cell').slice(1).map((cell) => cell.textContent)).toEqual([
      '8',
      '6',
      '3',
      '3',
      '2',
      '0',
    ])
  })
})
