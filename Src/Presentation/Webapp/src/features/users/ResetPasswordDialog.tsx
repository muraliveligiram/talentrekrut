import { zodResolver } from '@hookform/resolvers/zod'
import { Wand2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import { getErrorMessage } from '@/lib/api-error'
import { generatePassword, MIN_PASSWORD_LENGTH } from '@/lib/password'
import { useResetPassword } from './useUsers'
import type { User } from './userTypes'

const schema = z.object({
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(128)
    .refine((value) => value.trim() === value, 'Password must not start or end with a space.'),
})

interface ResetPasswordDialogProps {
  user: User | null
  onOpenChange: (open: boolean) => void
}

export function ResetPasswordDialog({ user, onOpenChange }: ResetPasswordDialogProps) {
  const resetPassword = useResetPassword()
  const {
    register,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { newPassword: '' } })

  useEffect(() => {
    if (user) {
      reset({ newPassword: '' })
      resetPassword.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reset])

  const submit = handleSubmit(async ({ newPassword }) => {
    if (!user) return
    try {
      await resetPassword.mutateAsync({ id: user.id, newPassword })
      toast.success('Password reset', { description: `Share the new password with ${user.fullName} securely.` })
      onOpenChange(false)
    } catch {
      // Rendered below from mutation state.
    }
  })

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title="Reset password"
        description={user ? `Set a new password for ${user.fullName}.` : undefined}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {resetPassword.isError && (
            <Alert>{getErrorMessage(resetPassword.error, 'Unable to reset the password.')}</Alert>
          )}
          <Field label="New password" required error={errors.newPassword?.message}>
            <PasswordInput autoComplete="new-password" autoFocus {...register('newPassword')} />
          </Field>
          <Button
            variant="link"
            size="sm"
            className="-mt-2 w-fit"
            onClick={() => setValue('newPassword', generatePassword(), { shouldValidate: true })}
          >
            <Wand2 />
            Generate a strong password
          </Button>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={resetPassword.isPending}>
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
