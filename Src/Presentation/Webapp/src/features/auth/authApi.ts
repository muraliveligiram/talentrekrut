import { http } from '../../api/http'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokenResponse {
  accessToken: string
  expiresAtUtc: string
}

export async function loginRequest(credentials: LoginCredentials): Promise<AuthTokenResponse> {
  const response = await http.post<AuthTokenResponse>('/auth/login', credentials)
  return response.data
}
