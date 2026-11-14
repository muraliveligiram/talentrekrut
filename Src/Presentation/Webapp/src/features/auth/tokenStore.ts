const tokenKey = 'rekrutms.accessToken'

export const tokenStore = {
  get(): string | null {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(tokenKey)
  },

  set(token: string): void {
    window.sessionStorage.setItem(tokenKey, token)
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(tokenKey)
    }
  },
}
