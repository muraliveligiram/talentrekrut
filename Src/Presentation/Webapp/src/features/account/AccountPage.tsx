import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { PageHeader } from '@/components/ui/page-header'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/features/auth/useAuth'
import { useChangeOwnPassword } from '@/features/users/useUsers'
import { getErrorMessage, getStatus } from '@/lib/api-error'
import { MIN_PASSWORD_LENGTH } from '@/lib/password'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(128)
      .refine((value) => value.trim() === value, 'Password must not start or end with a space.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'The new password must be different from the current password.',
  })

type ChangePasswordValues = z.infer<typeof schema>

export function AccountPage() {
  const { user, roles } = useAuth()
  const changePassword = useChangeOwnPassword()
  const {
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      reset()
      toast.success('Password updated')
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update your password.')
      if (getStatus(error) === 400 && /current password/i.test(message)) {
        setError('currentPassword', { message })
      }
    }
  })

  const showGeneralError = changePassword.isError && !errors.currentPassword

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Account" description="Your profile and sign-in settings." />

      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar name={user?.name ?? 'User'} className="size-12 text-base" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate font-semibold">{user?.name}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
            <div className="flex gap-1">
              {roles.map((role) => (
                <Badge key={role} tone={role === 'Admin' ? 'primary' : 'neutral'}>
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={submit} noValidate>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Use at least {MIN_PASSWORD_LENGTH} characters. A passphrase works well.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {showGeneralError && (
              <Alert>{getErrorMessage(changePassword.error, 'Unable to update your password.')}</Alert>
            )}
            <Field label="Current password" required error={errors.currentPassword?.message} className="sm:max-w-sm">
              <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" required error={errors.newPassword?.message}>
                <PasswordInput autoComplete="new-password" {...register('newPassword')} />
              </Field>
              <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
                <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
              </Field>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={changePassword.isPending}>
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
