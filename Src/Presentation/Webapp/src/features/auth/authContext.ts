import { createContext } from 'react'
import type { LoginCredentials } from './authApi'

export interface AuthContextValue {
  accessToken: string | null
  isAuthenticated: boolean
  roles: string[]
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
