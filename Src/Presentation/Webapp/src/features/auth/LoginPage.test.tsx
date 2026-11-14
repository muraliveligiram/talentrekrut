import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { loginRequest } from './authApi'
import { LoginPage } from './LoginPage'
import { tokenStore } from './tokenStore'

vi.mock('./authApi', () => ({
  loginRequest: vi.fn(),
}))

const mockedLoginRequest = vi.mocked(loginRequest)

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Signed in</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function createToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, role: 'Admin' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `header.${payload}.signature`
}

describe('LoginPage', () => {
  beforeEach(() => {
    tokenStore.clear()
    mockedLoginRequest.mockReset()
  })

  it('shows validation errors and does not submit invalid email', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'invalid')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(mockedLoginRequest).not.toHaveBeenCalled()
  })

  it('stores the returned access token and navigates after successful login', async () => {
    const user = userEvent.setup()
    const accessToken = createToken()
    mockedLoginRequest.mockResolvedValue({
      accessToken,
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    })
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'admin@example.test')
    await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Signed in')).toBeInTheDocument())
    expect(tokenStore.get()).toBe(accessToken)
    expect(mockedLoginRequest).toHaveBeenCalledWith({
      email: 'admin@example.test',
      password: 'correct-password',
    })
  })
})
