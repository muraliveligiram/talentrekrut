import { jwtDecode } from 'jwt-decode'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loginRequest, type LoginCredentials } from './authApi'
import { AuthContext, type AuthContextValue, type CurrentUser } from './authContext'
import { tokenStore } from './tokenStore'

const claimTypes = {
  id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
} as const

interface TokenClaims {
  exp?: number
  [claimTypes.id]?: string
  [claimTypes.name]?: string
  [claimTypes.email]?: string
  role?: string | string[]
  roles?: string | string[]
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[]
}

function getTokenClaims(token: string | null): TokenClaims | null {
  if (!token) {
    return null
  }

  try {
    const claims = jwtDecode<TokenClaims>(token)
    if (claims.exp && claims.exp * 1000 <= Date.now()) {
      tokenStore.clear()
      return null
    }
    return claims
  } catch {
    tokenStore.clear()
    return null
  }
}

function getRoles(claims: TokenClaims | null): string[] {
  const roleClaims =
    claims?.role ??
    claims?.roles ??
    claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
  if (typeof roleClaims === 'string') {
    return [roleClaims]
  }
  return roleClaims ?? []
}

function getUser(claims: TokenClaims | null): CurrentUser | null {
  if (!claims) {
    return null
  }
  const email = claims[claimTypes.email] ?? ''
  return {
    id: Number(claims[claimTypes.id] ?? 0),
    name: claims[claimTypes.name] || email || 'User',
    email,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState(() => tokenStore.get())

  const logout = useCallback(() => {
    tokenStore.clear()
    setAccessToken(null)
  }, [])

  useEffect(() => {
    const expireSession = () => logout()
    window.addEventListener('auth:expired', expireSession)
    return () => window.removeEventListener('auth:expired', expireSession)
  }, [logout])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const tokenResponse = await loginRequest(credentials)
    tokenStore.set(tokenResponse.accessToken)
    setAccessToken(tokenResponse.accessToken)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const claims = getTokenClaims(accessToken)
    return {
      accessToken: claims ? accessToken : null,
      isAuthenticated: claims !== null,
      roles: getRoles(claims),
      user: getUser(claims),
      login,
      logout,
    }
  }, [accessToken, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
