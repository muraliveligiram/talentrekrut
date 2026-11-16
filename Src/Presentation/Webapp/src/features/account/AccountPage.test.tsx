import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountPage } from './AccountPage'

const mocks = vi.hoisted(() => ({ change: vi.fn() }))

vi.mock('@/features/users/useUsers', () => ({
  useChangeOwnPassword: () => ({ mutateAsync: mocks.change, isPending: false, isError: false, error: null }),
}))

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ada Admin', email: 'ada@example.test' }, roles: ['Admin'] }),
}))

function badRequest(title: string) {
  return new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    data: { title },
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

async function fill(current: string, next: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^current password/i), current)
  await user.type(screen.getByLabelText(/^new password/i), next)
  await user.type(screen.getByLabelText(/^confirm new password/i), confirm)
  await user.click(screen.getByRole('button', { name: 'Update password' }))
}

describe('AccountPage', () => {
  beforeEach(() => {
    mocks.change.mockReset()
  })

  it('requires the confirmation to match', async () => {
    render(<AccountPage />)
    await fill('old-password-123', 'new-password-456', 'different-789')

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(mocks.change).not.toHaveBeenCalled()
  })

  it('submits and flags an incorrect current password', async () => {
    mocks.change.mockRejectedValue(badRequest('The current password is incorrect.'))
    render(<AccountPage />)
    await fill('wrong-password-1', 'new-password-456', 'new-password-456')

    expect(await screen.findByText('The current password is incorrect.')).toBeInTheDocument()
    expect(mocks.change.mock.calls[0][0]).toEqual({ currentPassword: 'wrong-password-1', newPassword: 'new-password-456' })
  })
})
