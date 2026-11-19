import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApplicationCard } from './ApplicationCard'
import type { Application } from './candidateTypes'

const base: Application = {
  id: 1,
  candidateId: 2,
  candidateName: 'Priya',
  candidateRole: 'Engineer',
  candidateCompany: 'Globex',
  candidateLevel: 'Senior',
  jobId: 123,
  jobCode: 'JOB-2026-0123',
  jobTitle: 'Backend Engineer',
  companyName: 'Acme',
  jobStatus: 'Open',
  stage: 'Shortlisted',
  submittedAt: '2026-11-01T10:00:00Z',
  submittedByName: 'Recruiter Rao',
  interviewScheduledAt: null,
  rejectionReasons: [],
  rejectionNotes: null,
  history: [],
  rounds: [],
  joiningDate: null,
  notJoiningReasons: [],
  notJoiningNotes: null,
}

function renderCard(application: Application) {
  return render(
    <MemoryRouter>
      <ApplicationCard application={application} context="candidate" onAction={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('ApplicationCard on the candidate page', () => {
  it('shows the job status and no warning while the job is open', () => {
    renderCard(base)
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.queryByText(/This job is closed/)).not.toBeInTheDocument()
  })

  it('flags a closed job while the candidate is still in progress', () => {
    renderCard({ ...base, jobStatus: 'Closed' })
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText(/This job is closed, but the candidate is still in progress/)).toBeInTheDocument()
  })

  it('shows the closed status without a warning once the candidate is finished', () => {
    renderCard({ ...base, jobStatus: 'Closed', stage: 'Joined' })
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByText(/still in progress/)).not.toBeInTheDocument()
  })

  it('still renders when an older API sends no job status', () => {
    renderCard({ ...base, jobStatus: undefined as unknown as Application['jobStatus'] })
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.queryByText(/This job is/)).not.toBeInTheDocument()
  })
})
