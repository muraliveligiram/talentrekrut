import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Application } from './candidateTypes'
import { JobPipeline } from './JobPipeline'

const mocks = vi.hoisted(() => ({ exportFn: vi.fn(), saveBlob: vi.fn(), remove: vi.fn() }))

const application = (id: number, name: string, stage: Application['stage']): Application => ({
  id,
  candidateId: id,
  candidateName: name,
  candidateRole: 'Engineer',
  candidateCompany: 'Globex',
  candidateLevel: 'Senior',
  jobId: 123,
  jobCode: 'JOB-2026-0123',
  jobTitle: 'Backend Engineer',
  companyName: 'Acme',
  stage,
  submittedAt: '2026-11-01T10:00:00Z',
  submittedByName: 'Recruiter Rao',
  interviewScheduledAt: null,
  rejectionReasons: [],
  rejectionNotes: null,
  history: [],
})

vi.mock('./useCandidates', () => ({
  useJobApplications: () => ({
    isLoading: false,
    isError: false,
    data: [application(1, 'Priya', 'Screening'), application(2, 'Arun', 'Rejected')],
  }),
  useExportJobApplications: () => ({ mutateAsync: mocks.exportFn, isPending: false }),
  useRemoveApplication: () => ({ mutateAsync: mocks.remove, reset: vi.fn(), isPending: false, isError: false, error: null }),
  useScreenApplication: () => ({}),
  useScheduleInterview: () => ({}),
  useRecordOutcome: () => ({}),
}))

vi.mock('@/lib/download', () => ({ saveBlob: mocks.saveBlob }))

describe('JobPipeline export', () => {
  beforeEach(() => {
    mocks.exportFn.mockReset()
    mocks.saveBlob.mockReset()
  })

  it('downloads every candidate on the job, not just the filtered stage', async () => {
    const user = userEvent.setup()
    const blob = new Blob(['xlsx'])
    mocks.exportFn.mockResolvedValue({ blob, fileName: 'JOB-2026-0123-candidates-2026-11-16.xlsx' })
    render(
      <MemoryRouter>
        <JobPipeline jobId="123" isOpen />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /rejected/i }))
    await user.click(screen.getByRole('button', { name: 'Export to Excel' }))

    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(blob, 'JOB-2026-0123-candidates-2026-11-16.xlsx'))
    expect(mocks.exportFn).toHaveBeenCalledWith('123')
  })

  it('gives vendors the workflow without exports, new candidates or profile links', async () => {
    render(
      <MemoryRouter>
        <JobPipeline jobId="123" isOpen isStaff={false} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Export to Excel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /add candidate/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Priya' })).not.toBeInTheDocument()
    expect(screen.getByText('Priya')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Screen candidate' })).toBeInTheDocument()
  })

  it('lets admins remove a candidate from the job after confirming', async () => {
    const user = userEvent.setup()
    mocks.remove.mockReset().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <JobPipeline jobId="123" isOpen isAdmin />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Remove Priya from Backend Engineer' }))
    expect(await screen.findByText('Remove candidate from this job?')).toBeInTheDocument()
    expect(mocks.remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Remove from job' }))

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(1))
  })

  it('hides removal from non-admins', () => {
    render(
      <MemoryRouter>
        <JobPipeline jobId="123" isOpen />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /remove priya/i })).not.toBeInTheDocument()
  })
})
