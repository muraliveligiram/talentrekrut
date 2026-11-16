import axios from 'axios'

interface ProblemDetails {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

/** Extracts a human-readable message from an API ProblemDetails response. */
export function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ProblemDetails>(error)) return fallback
  if (!error.response) return 'Unable to reach the server. Check your connection and try again.'
  const problem = error.response.data
  const fieldErrors = problem?.errors ? Object.values(problem.errors).flat() : []
  if (fieldErrors.length > 0) return fieldErrors.join(' ')
  if (error.response.status >= 500) return fallback
  return problem?.detail || problem?.title || fallback
}

export function getStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
