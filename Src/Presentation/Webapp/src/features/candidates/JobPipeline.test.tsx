import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Application } from './candidateTypes'
import { JobPipeline } from './JobPipeline'

const mocks = vi.hoisted(() => ({ exportFn: vi.fn(), saveBlob: vi.fn() }))

const application = (id: number, name: string, stage: Application['stage']): Application => ({
  id,
  candidateId: id,
  candidateName: name,
  candidateRole: 'Engineer',
  candidateCompany: 'Globex',
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
})
