import { createContext } from 'react'
import type { LoginCredentials } from './authApi'

export interface CurrentUser {
  id: number
  name: string
  email: string
}

export interface AuthContextValue {
  accessToken: string | null
  isAuthenticated: boolean
  roles: string[]
  user: CurrentUser | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
