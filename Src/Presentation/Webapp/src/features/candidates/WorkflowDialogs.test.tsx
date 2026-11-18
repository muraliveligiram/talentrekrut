import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Application } from './candidateTypes'
import { WorkflowDialog } from './WorkflowDialogs'

const mocks = vi.hoisted(() => ({ screen: vi.fn(), schedule: vi.fn(), outcome: vi.fn() }))

vi.mock('./useCandidates', () => ({
  useScreenApplication: () => ({ mutateAsync: mocks.screen, isPending: false }),
  useScheduleInterview: () => ({ mutateAsync: mocks.schedule, isPending: false }),
  useRecordOutcome: () => ({ mutateAsync: mocks.outcome, isPending: false }),
}))

const base: Application = {
  id: 11,
  candidateId: 3,
  candidateName: 'Priya Sharma',
  candidateRole: 'Senior Engineer',
  candidateCompany: 'Globex',
  candidateLevel: 'Senior',
  jobId: 5,
  jobCode: 'JOB-2026-0005',
  jobTitle: 'Backend Engineer',
  companyName: 'Acme',
  stage: 'Screening',
  submittedAt: '2026-11-01T10:00:00Z',
  submittedByName: 'Recruiter Rao',
  interviewScheduledAt: null,
  rejectionReasons: [],
  rejectionNotes: null,
  history: [],
}

describe('WorkflowDialog', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
  })

  it('shortlists a candidate at screening', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mocks.screen.mockResolvedValue({ ...base, stage: 'Shortlisted' })
    render(<WorkflowDialog application={base} action="screen" onClose={onClose} />)

    await user.click(screen.getByRole('radio', { name: /^shortlist/i }))
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Good fit')
    await user.click(screen.getByRole('button', { name: 'Save decision' }))

    await waitFor(() =>
      expect(mocks.screen).toHaveBeenCalledWith({ id: 11, shortlisted: true, rejectionReasons: [], notes: 'Good fit' }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('rejects scheduling in the past', async () => {
    const user = userEvent.setup()
    render(<WorkflowDialog application={{ ...base, stage: 'Shortlisted' }} action="schedule" onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/interview date and time/i), '2020-01-01T10:00')
    await user.click(screen.getByRole('button', { name: 'Schedule interview' }))

    expect(await screen.findByText('The interview must be scheduled in the future.')).toBeInTheDocument()
    expect(mocks.schedule).not.toHaveBeenCalled()
  })

  it('requires rejection reasons after an interview', async () => {
    const user = userEvent.setup()
    mocks.outcome.mockResolvedValue({ ...base, stage: 'Rejected' })
    const interviewing = { ...base, stage: 'InterviewScheduled' as const, interviewScheduledAt: '2026-12-01T10:00:00Z' }
    render(<WorkflowDialog application={interviewing} action="outcome" onClose={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: /^rejected/i }))
    await user.click(screen.getByRole('button', { name: 'Save outcome' }))
    expect(await screen.findByText('Select at least one rejection reason.')).toBeInTheDocument()
    expect(mocks.outcome).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox', { name: 'Skill mismatch' }))
    await user.click(screen.getByRole('checkbox', { name: 'Did not attend interview' }))
    await user.click(screen.getByRole('button', { name: 'Save outcome' }))

    await waitFor(() =>
      expect(mocks.outcome).toHaveBeenCalledWith({
        id: 11,
        selected: false,
        rejectionReasons: ['SkillMismatch', 'DidNotAttendInterview'],
        notes: null,
      }),
    )
  })
})
