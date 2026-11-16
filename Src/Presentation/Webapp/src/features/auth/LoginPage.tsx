import { zodResolver } from '@hookform/resolvers/zod'
import { Briefcase, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { getStatus } from '@/lib/api-error'
import { useAuth } from './useAuth'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginValues = z.infer<typeof loginSchema>

const highlights = [
  { icon: Briefcase, text: 'Track every requirement from draft to closed.' },
  { icon: Users, text: 'Assign recruiters and keep focus on their jobs.' },
  { icon: ShieldCheck, text: 'Role-based access for admins and recruiters.' },
]

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [requestError, setRequestError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  const submit = handleSubmit(async (values) => {
    setRequestError(null)
    try {
      await login(values)
      navigate(from, { replace: true })
    } catch (error) {
      setRequestError(
        getStatus(error) === 401
          ? 'The email or password is incorrect.'
          : 'Unable to sign in. Check your connection and try again.',
      )
    }
  })

  if (isAuthenticated && !isSubmitting) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.25_0.09_270)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.5_0.2_270/.55),transparent_55%),radial-gradient(circle_at_80%_90%,oklch(0.55_0.16_200/.35),transparent_50%)]"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold ring-1 ring-white/25">
            T
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Talent Pool</span>
        </div>
        <div className="relative flex max-w-md flex-col gap-8">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            The recruitment workspace for IT staffing teams.
          </h2>
          <ul className="flex flex-col gap-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Talent Pool</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted">Sign in to manage your recruitment pipeline.</p>
          </div>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {requestError && <Alert>{requestError}</Alert>}
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" autoComplete="email" autoFocus placeholder="you@company.com" {...register('email')} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <PasswordInput autoComplete="current-password" {...register('password')} />
            </Field>
            <Button type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-xs text-muted">
            Forgot your password? Ask an administrator to reset it.
          </p>
        </div>
      </main>
    </div>
  )
}
