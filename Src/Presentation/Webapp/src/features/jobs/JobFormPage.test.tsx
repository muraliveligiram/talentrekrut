import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JobFormPage } from './JobFormPage'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  createSkills: vi.fn(),
}))

vi.mock('./useJobs', () => ({
  useJob: () => ({ data: undefined, isError: false, isLoading: false }),
  useSaveJob: () => ({ mutate: mocks.mutate, isError: false, isPending: false }),
}))

vi.mock('@/features/companies/useCompanies', () => ({
  useCompanies: () => ({ data: { items: [{ id: 42, name: 'Contoso' }] }, isError: false }),
}))

vi.mock('@/features/skills/useSkills', () => ({
  useSkillOptions: () => ({
    isLoading: false,
    data: [
      { id: 1, name: 'C#', category: 'ProgrammingLanguage' },
      { id: 2, name: 'SQL', category: 'ProgrammingLanguage' },
      { id: 3, name: 'Azure', category: 'CloudDevOps' },
    ],
  }),
  useCreateSkills: () => ({ mutateAsync: mocks.createSkills }),
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

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Company' }), 'Contoso')
  await user.type(screen.getByRole('textbox', { name: /job title/i }), 'Engineer')
}

describe('JobFormPage', () => {
  beforeEach(() => {
    mocks.mutate.mockReset()
    mocks.createSkills.mockReset()
  })

  it('requires at least one primary skill', async () => {
    const user = userEvent.setup()
    renderJobForm()
    await fillBasics(user)
    await user.click(screen.getByRole('button', { name: 'Save job' }))

    expect(await screen.findByText('At least one primary skill is required.')).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('submits skills picked from the multi-select dropdowns', async () => {
    const user = userEvent.setup()
    renderJobForm()
    await fillBasics(user)

    const primary = screen.getByRole('combobox', { name: /primary skills/i })
    await user.type(primary, 'c#{Enter}')
    expect(screen.getByRole('button', { name: 'Remove skill C#' })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /secondary skills/i }))
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).not.toContain('C#')
    await user.click(screen.getByRole('option', { name: 'Azure' }))
    await user.click(screen.getByRole('button', { name: 'Save job' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1))
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      companyId: 42,
      title: 'Engineer',
      skills: [
        { skillId: 1, skillType: 'Primary', minYears: null },
        { skillId: 3, skillType: 'Secondary', minYears: null },
      ],
    })
  })

  it('adds a missing skill to the library from the dropdown', async () => {
    const user = userEvent.setup()
    mocks.createSkills.mockResolvedValue({ created: [{ id: 9, name: 'Kafka', category: 'Other' }], existing: [] })
    renderJobForm()

    await user.type(screen.getByRole('combobox', { name: /primary skills/i }), 'Kafka')
    await user.click(screen.getByRole('option', { name: /add “kafka” to the skill library/i }))

    expect(mocks.createSkills).toHaveBeenCalledWith({ names: ['Kafka'], category: 'Other' })
    expect(await screen.findByRole('button', { name: 'Remove skill Kafka' })).toBeInTheDocument()
  })
})
