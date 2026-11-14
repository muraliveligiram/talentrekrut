import { jwtDecode } from 'jwt-decode'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loginRequest, type LoginCredentials } from './authApi'
import { AuthContext, type AuthContextValue } from './authContext'
import { tokenStore } from './tokenStore'

interface TokenClaims {
  exp?: number
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

  const claims = getTokenClaims(accessToken)
  const roles = getRoles(claims)
  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: claims ? accessToken : null,
      isAuthenticated: claims !== null,
      roles,
      login,
      logout,
    }),
    [accessToken, claims, login, logout, roles],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
