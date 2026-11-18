import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserFormDialog } from './UserFormDialog'
import type { User } from './userTypes'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('./useUsers', () => ({
  useCreateUser: () => ({ mutateAsync: mocks.create, reset: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateUser: () => ({ mutateAsync: mocks.update, reset: vi.fn(), isPending: false, isError: false, error: null }),
}))

vi.mock('@/features/companies/useCompanies', () => ({
  useCompanies: () => ({
    isLoading: false,
    data: {
      items: [
        { id: 42, name: 'Acme', isActive: true },
        { id: 43, name: 'Dormant Ltd', isActive: false },
      ],
    },
  }),
}))

const existing: User = {
  id: 7,
  email: 'admin@example.test',
  fullName: 'Ada Admin',
  roles: ['Admin'],
  isActive: true,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  companyId: null,
  companyName: null,
}

function conflict(title: string) {
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    data: { title },
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('UserFormDialog', () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.update.mockReset()
  })

  it('validates required fields and password length before creating', async () => {
    const user = userEvent.setup()
    render(<UserFormDialog open onOpenChange={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'not-an-email')
    await user.type(screen.getByLabelText(/initial password/i), 'short')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 12 characters.')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a recruiter with a generated password', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    mocks.create.mockResolvedValue({ ...existing, id: 9 })
    render(<UserFormDialog open onOpenChange={onOpenChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Riya Recruiter')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'riya@example.test')
    await user.click(screen.getByRole('button', { name: /generate a strong password/i }))
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    const request = mocks.create.mock.calls[0][0]
    expect(request).toMatchObject({ fullName: 'Riya Recruiter', email: 'riya@example.test', roles: ['Recruiter'] })
    expect(request.password).toHaveLength(16)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows a duplicate email conflict on the email field', async () => {
    const user = userEvent.setup()
    mocks.create.mockRejectedValue(conflict('A user with this email address already exists.'))
    render(<UserFormDialog open onOpenChange={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Dup')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'dup@example.test')
    await user.type(screen.getByLabelText(/initial password/i), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const email = screen.getByRole('textbox', { name: 'Email' })
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('A user with this email address already exists.')).toBeInTheDocument()
  })

  it('prevents admins from removing their own Admin role', () => {
    render(<UserFormDialog open onOpenChange={vi.fn()} user={existing} currentUserId={existing.id} />)

    expect(screen.getByRole('checkbox', { name: /admin/i })).toBeDisabled()
    expect(screen.queryByLabelText(/initial password/i)).not.toBeInTheDocument()
  })

  it('requires a company for vendors and keeps Vendor exclusive', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({ ...existing, id: 12 })
    render(<UserFormDialog open onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('combobox', { name: 'Company' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Vee Vendor')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'vee@acme.test')
    await user.click(screen.getByRole('button', { name: /generate a strong password/i }))
    await user.click(screen.getByRole('checkbox', { name: /vendor/i }))

    expect(screen.getByRole('checkbox', { name: /recruiter/i })).not.toBeChecked()
    const company = screen.getByRole('combobox', { name: 'Company' })
    expect(screen.getByRole('option', { name: 'Dormant Ltd (inactive)' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Select the company this vendor belongs to.')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()

    await user.selectOptions(company, 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ roles: ['Vendor'], companyId: 42 })

    // Picking a staff role again drops Vendor and hides the company field.
    await user.click(screen.getByRole('checkbox', { name: /recruiter/i }))
    expect(screen.getByRole('checkbox', { name: /vendor/i })).not.toBeChecked()
    expect(screen.queryByRole('combobox', { name: 'Company' })).not.toBeInTheDocument()
  })

  it('sends no company for staff users', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({ ...existing, id: 13 })
    render(<UserFormDialog open onOpenChange={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Riya')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'riya@example.test')
    await user.type(screen.getByLabelText(/initial password/i), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ roles: ['Recruiter'], companyId: null })
  })
})
