import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CandidateFormPage } from './CandidateFormPage'

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('./useCandidates', () => ({
  useCandidate: () => ({ data: undefined, isLoading: false, isError: false }),
  useSaveCandidate: () => ({ mutate: mocks.mutate, isPending: false, isError: false, error: null }),
  useOpenJobs: () => ({
    isLoading: false,
    data: [{ id: 5, jobCode: 'JOB-2026-0005', title: 'Backend Engineer', companyName: 'Acme' }],
  }),
}))

function renderForm(url = '/candidates/new') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/candidates/new" element={<CandidateFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Priya Sharma')
  await user.type(screen.getByLabelText(/^date of birth/i), '1994-05-17')
  await user.type(screen.getByRole('textbox', { name: 'Contact number' }), '+91 98765 43210')
  await user.type(screen.getByRole('textbox', { name: 'Personal email' }), 'priya@mail.test')
  await user.type(screen.getByRole('textbox', { name: 'Current role' }), 'Senior Engineer')
  await user.type(screen.getByRole('textbox', { name: 'Current company' }), 'Globex')
  await user.type(screen.getByRole('spinbutton', { name: 'Current CTC (LPA)' }), '18.5')
  await user.type(screen.getByRole('spinbutton', { name: 'Expected CTC (LPA)' }), '25')
}

describe('CandidateFormPage', () => {
  beforeEach(() => {
    mocks.mutate.mockReset()
  })

  it('validates required fields and the LinkedIn URL', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByRole('textbox', { name: 'LinkedIn profile' }), 'https://example.com/me')
    await user.click(screen.getByRole('button', { name: 'Add candidate' }))

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByText('Contact number is required.')).toBeInTheDocument()
    expect(screen.getByText('Current CTC is required.')).toBeInTheDocument()
    expect(screen.getByText(/Enter a full LinkedIn URL/)).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('reveals variable pay and submits to the preselected job', async () => {
    const user = userEvent.setup()
    renderForm('/candidates/new?jobId=5')

    expect(screen.queryByRole('spinbutton', { name: 'Variable component (LPA)' })).not.toBeInTheDocument()
    await fillRequired(user)
    await user.click(screen.getByRole('checkbox', { name: /includes variable pay/i }))
    await user.type(screen.getByRole('spinbutton', { name: 'Variable component (LPA)' }), '3')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Notice period' }), '60 days')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Job' })).toHaveValue('5'))
    await user.click(screen.getByRole('button', { name: 'Add candidate' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1))
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      fullName: 'Priya Sharma',
      dateOfBirth: '1994-05-17',
      level: 'MidLevel',
      currentCtcLpa: 18.5,
      currentCtcIncludesVariable: true,
      variablePayLpa: 3,
      expectedCtcLpa: 25,
      noticePeriodDays: 60,
      companyEmail: null,
      linkedInUrl: null,
      jobId: 5,
    })
  })
})
