import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppToaster } from './components/ui/toaster'
import { AuthProvider } from './features/auth/AuthProvider'
import { getStatus } from './lib/api-error'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors such as 403/404; they will not succeed on retry.
      retry: (failureCount, error) => {
        const status = getStatus(error)
        return (status === undefined || status >= 500) && failureCount < 2
      },
    },
  },
})
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('The application root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* BASE_URL is "/" locally and e.g. "/app/" when built for a virtual path (npm run build:azure). */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <AuthProvider>
          <App />
          <AppToaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
