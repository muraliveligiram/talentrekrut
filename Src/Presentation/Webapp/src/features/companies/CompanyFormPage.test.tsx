import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompanyFormPage } from './CompanyFormPage'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
}))

vi.mock('./useCompanies', () => ({
  useCompany: () => ({ data: undefined, isError: false, isLoading: false }),
  useSaveCompany: () => ({
    mutate: mocks.mutate,
    isError: false,
    isPending: false,
  }),
}))

function renderCompanyForm() {
  return render(
    <MemoryRouter initialEntries={['/companies/new']}>
      <Routes>
        <Route path="/companies/new" element={<CompanyFormPage />} />
        <Route path="/companies" element={<div>Companies list</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CompanyFormPage', () => {
  beforeEach(() => {
    mocks.mutate.mockReset()
  })

  it('requires a company name before submitting', async () => {
    const user = userEvent.setup()
    renderCompanyForm()

    await user.click(screen.getByRole('button', { name: 'Save company' }))

    expect(await screen.findByText('Company name is required.')).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('submits a valid company profile', async () => {
    const user = userEvent.setup()
    renderCompanyForm()

    await user.type(screen.getByRole('textbox', { name: /company name/i }), 'Northwind')
    await user.type(screen.getByLabelText('Industry'), 'Technology')
    await user.click(screen.getByRole('button', { name: 'Save company' }))

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Northwind',
        industry: 'Technology',
        isActive: true,
      }),
      expect.any(Object),
    )
  })
})
