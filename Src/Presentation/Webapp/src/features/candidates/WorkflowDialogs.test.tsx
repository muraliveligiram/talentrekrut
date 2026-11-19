import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Application } from './candidateTypes'
import { WorkflowDialog } from './WorkflowDialogs'

const mocks = vi.hoisted(() => ({ screen: vi.fn(), schedule: vi.fn(), outcome: vi.fn(), joiningDate: vi.fn(), joining: vi.fn() }))

vi.mock('./useCandidates', () => ({
  useScreenApplication: () => ({ mutateAsync: mocks.screen, isPending: false }),
  useScheduleInterview: () => ({ mutateAsync: mocks.schedule, isPending: false }),
  useRecordOutcome: () => ({ mutateAsync: mocks.outcome, isPending: false }),
  useSetJoiningDate: () => ({ mutateAsync: mocks.joiningDate, isPending: false }),
  useRecordJoining: () => ({ mutateAsync: mocks.joining, isPending: false }),
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
  jobStatus: 'Open',
  stage: 'Screening',
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

  it('names the round and requires rejection reasons when a round is not cleared', async () => {
    const user = userEvent.setup()
    mocks.outcome.mockResolvedValue({ ...base, stage: 'Rejected' })
    const interviewing: Application = {
      ...base,
      stage: 'InterviewScheduled',
      interviewScheduledAt: '2026-12-01T10:00:00Z',
      rounds: [
        { sequence: 1, name: 'Coding test', status: 'Cleared', scheduledAt: null, decidedAt: '2026-11-20T10:00:00Z' },
        { sequence: 2, name: 'Face to face', status: 'Scheduled', scheduledAt: '2026-12-01T10:00:00Z', decidedAt: null },
        { sequence: 3, name: 'HR discussion', status: 'Upcoming', scheduledAt: null, decidedAt: null },
      ],
    }
    render(<WorkflowDialog application={interviewing} action="outcome" onClose={vi.fn()} />)

    expect(screen.getByText('Result of round 2 · Face to face')).toBeInTheDocument()
    expect(screen.getByText('Move on to the next round.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /^not cleared/i }))
    await user.click(screen.getByRole('button', { name: 'Save result' }))
    expect(await screen.findByText('Select at least one rejection reason.')).toBeInTheDocument()
    expect(mocks.outcome).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox', { name: 'Skill mismatch' }))
    await user.click(screen.getByRole('checkbox', { name: 'Did not attend interview' }))
    await user.click(screen.getByRole('button', { name: 'Save result' }))

    await waitFor(() =>
      expect(mocks.outcome).toHaveBeenCalledWith({
        id: 11,
        passed: false,
        rejectionReasons: ['SkillMismatch', 'DidNotAttendInterview'],
        notes: null,
      }),
    )
  })

  it('explains that clearing the final round selects the candidate', () => {
    const finalRound: Application = {
      ...base,
      stage: 'InterviewScheduled',
      rounds: [
        { sequence: 1, name: 'Coding test', status: 'Cleared', scheduledAt: null, decidedAt: null },
        { sequence: 2, name: 'HR discussion', status: 'Scheduled', scheduledAt: '2026-12-01T10:00:00Z', decidedAt: null },
      ],
    }
    render(<WorkflowDialog application={finalRound} action="outcome" onClose={vi.fn()} />)
    expect(screen.getByText('Final round: the candidate will be marked Selected.')).toBeInTheDocument()
  })

  it('sets the date of joining for a selected candidate', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mocks.joiningDate.mockResolvedValue({ ...base, stage: 'Selected' })
    render(<WorkflowDialog application={{ ...base, stage: 'Selected' }} action="joiningDate" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Save date' }))
    expect(await screen.findByText('Choose the date of joining.')).toBeInTheDocument()

    const date = new Date()
    date.setDate(date.getDate() + 30)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    await user.type(screen.getByLabelText(/^date of joining/i), iso)
    await user.click(screen.getByRole('button', { name: 'Save date' }))

    await waitFor(() => expect(mocks.joiningDate).toHaveBeenCalledWith({ id: 11, joiningDate: iso, notes: null }))
    expect(onClose).toHaveBeenCalled()
  })

  it('requires reasons when a candidate did not join', async () => {
    const user = userEvent.setup()
    mocks.joining.mockResolvedValue({ ...base, stage: 'NotJoined' })
    render(
      <WorkflowDialog application={{ ...base, stage: 'Selected', joiningDate: '2026-12-15' }} action="joining" onClose={vi.fn()} />,
    )

    expect(screen.getByText(/Expected to join on/)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /^did not join/i }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Select at least one reason for not joining.')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Accepted another offer' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(mocks.joining).toHaveBeenCalledWith({ id: 11, joined: false, notJoiningReasons: ['AcceptedAnotherOffer'], notes: null }),
    )
  })
})
