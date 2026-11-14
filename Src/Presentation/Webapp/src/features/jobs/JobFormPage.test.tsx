import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JobFormPage } from './JobFormPage'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
}))

vi.mock('./useJobs', () => ({
  useJob: () => ({ data: undefined, isError: false, isLoading: false }),
  useSaveJob: () => ({ mutate: mocks.mutate, isError: false, isPending: false }),
}))

vi.mock('../companies/useCompanies', () => ({
  useCompanies: () => ({
    data: {
      items: [{ id: 42, name: 'Contoso' }],
    },
    isError: false,
  }),
}))

function renderJobForm() {
  return render(
    <MemoryRouter initialEntries={['/jobs/new']}>
      <Routes>
        <Route path="/jobs/new" element={<JobFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('JobFormPage', () => {
  beforeEach(() => {
    mocks.mutate.mockReset()
  })

  it('requires at least one primary skill', async () => {
    const user = userEvent.setup()
    renderJobForm()

    await user.click(screen.getByLabelText('Company'))
    await user.click(await screen.findByRole('option', { name: 'Contoso' }))
    await user.type(screen.getByRole('textbox', { name: /job title/i }), 'Engineer')
    await user.click(screen.getByLabelText('Skill type'))
    await user.click(await screen.findByRole('option', { name: 'Secondary' }))
    await user.type(screen.getByRole('textbox', { name: 'Skill' }), 'C#')
    await user.click(screen.getByRole('button', { name: 'Save job' }))

    expect(await screen.findByText('At least one primary skill is required.')).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('submits a job with the numeric company id', async () => {
    const user = userEvent.setup()
    renderJobForm()

    await user.click(screen.getByLabelText('Company'))
    await user.click(await screen.findByRole('option', { name: 'Contoso' }))
    await user.type(screen.getByRole('textbox', { name: /job title/i }), 'Engineer')
    await user.type(screen.getByRole('textbox', { name: 'Skill' }), 'C#')
    await user.click(screen.getByRole('button', { name: 'Save job' }))

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 42, title: 'Engineer' }),
      expect.any(Object),
    )
  })
})
