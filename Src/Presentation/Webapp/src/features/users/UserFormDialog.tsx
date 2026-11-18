import { zodResolver } from '@hookform/resolvers/zod'
import { Wand2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Checkbox, Input, Select } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { getErrorMessage, getStatus } from '@/lib/api-error'
import { generatePassword, MIN_PASSWORD_LENGTH } from '@/lib/password'
import { cn } from '@/lib/utils'
import { useCompanies } from '@/features/companies/useCompanies'
import { useCreateUser, useUpdateUser } from './useUsers'
import { ROLES, roleDescriptions, type User } from './userTypes'

const baseSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').max(200),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.').max(200),
  roles: z.array(z.enum(ROLES)).min(1, 'Select at least one role.'),
  password: z.string(),
  companyId: z.string(),
})

const createSchema = baseSchema.extend({
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(128)
    .refine((value) => value.trim() === value, 'Password must not start or end with a space.'),
})

/** Vendors belong to exactly one company and hold no other role. */
function withVendorRules(schema: z.ZodType<z.infer<typeof baseSchema>, z.input<typeof baseSchema>>) {
  return schema.superRefine((values, context) => {
    if (values.roles.includes('Vendor') && !values.companyId) {
      context.addIssue({ code: 'custom', path: ['companyId'], message: 'Select the company this vendor belongs to.' })
    }
    if (values.roles.includes('Vendor') && values.roles.length > 1) {
      context.addIssue({ code: 'custom', path: ['roles'], message: 'Vendor cannot be combined with other roles.' })
    }
  })
}

type UserFormValues = z.infer<typeof baseSchema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The user being edited; omit to create a new user. */
  user?: User | null
  currentUserId?: number
}

export function UserFormDialog({ open, onOpenChange, user, currentUserId }: UserFormDialogProps) {
  const isEdit = Boolean(user)
  const isSelf = user?.id === currentUserId
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const mutation = isEdit ? updateUser : createUser
  const {
    control,
    register,
    reset,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(withVendorRules(isEdit ? baseSchema : createSchema)),
    defaultValues: { fullName: '', email: '', roles: ['Recruiter'], password: '', companyId: '' },
  })

  useEffect(() => {
    if (open) {
      createUser.reset()
      updateUser.reset()
      reset(
        user
          ? { fullName: user.fullName, email: user.email, roles: user.roles, password: '', companyId: user.companyId ? String(user.companyId) : '' }
          : { fullName: '', email: '', roles: ['Recruiter'], password: '', companyId: '' },
      )
    }
    // Reset only when the dialog opens or switches user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, reset])

  const submit = handleSubmit(async ({ companyId: rawCompanyId, ...values }) => {
    const companyId = values.roles.includes('Vendor') && rawCompanyId ? Number(rawCompanyId) : null
    try {
      if (user) {
        await updateUser.mutateAsync({
          id: user.id,
          request: { fullName: values.fullName, email: values.email, roles: values.roles, isActive: user.isActive, companyId },
        })
        toast.success('User updated', { description: values.fullName })
      } else {
        await createUser.mutateAsync({ ...values, companyId })
        toast.success('User created', {
          description: `${values.fullName} can now sign in with the password you set.`,
        })
      }
      onOpenChange(false)
    } catch (error) {
      const message = getErrorMessage(error, '')
      if (getStatus(error) === 409 && /email/i.test(message)) {
        setError('email', { message })
      }
    }
  })

  const showGeneralError = mutation.isError && !errors.email
  const selectedRoles = useWatch({ control, name: 'roles' })
  const isVendor = selectedRoles.includes('Vendor')
  const companiesQuery = useCompanies('', 1, 100, open && isVendor)
  const companies = companiesQuery.data?.items ?? []
  const currentCompanyId = user?.companyId ? String(user.companyId) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEdit ? 'Edit user' : 'Invite user'}
        description={
          isEdit ? 'Update profile details and access.' : 'Create an account and share the initial password securely.'
        }
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {showGeneralError && <Alert>{getErrorMessage(mutation.error, 'Unable to save the user.')}</Alert>}
          <Field label="Full name" required error={errors.fullName?.message}>
            <Input autoComplete="off" autoFocus {...register('fullName')} />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="off" {...register('email')} />
          </Field>

          {!isEdit && (
            <Field
              label="Initial password"
              required
              error={errors.password?.message}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters. The user can change it after signing in.`}
            >
              <PasswordInput autoComplete="new-password" {...register('password')} />
            </Field>
          )}
          {!isEdit && (
            <Button
              variant="link"
              size="sm"
              className="-mt-2 w-fit"
              onClick={() => setValue('password', generatePassword(), { shouldValidate: true })}
            >
              <Wand2 />
              Generate a strong password
            </Button>
          )}

          <Controller
            name="roles"
            control={control}
            render={({ field }) => (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-medium">
                  Roles<span className="ml-0.5 text-danger" aria-hidden>*</span>
                </legend>
                {ROLES.map((role) => {
                  const checked = field.value.includes(role)
                  const locked = isSelf && role === 'Admin'
                  return (
                    <label
                      key={role}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                        checked ? 'border-primary/50 bg-primary-soft/40' : 'hover:bg-surface-muted/60',
                        locked && 'cursor-not-allowed opacity-70',
                      )}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        disabled={locked}
                        onChange={(event) => {
                          if (!event.target.checked) {
                            field.onChange(field.value.filter((value) => value !== role))
                          } else if (role === 'Vendor') {
                            // Vendor is exclusive: selecting it replaces any staff roles.
                            field.onChange(['Vendor'])
                          } else {
                            field.onChange([...field.value.filter((value) => value !== 'Vendor'), role])
                          }
                        }}
                      />
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">{role}</span>
                        <span className="text-xs text-muted">
                          {locked ? 'You cannot remove your own Admin role.' : roleDescriptions[role]}
                        </span>
                      </span>
                    </label>
                  )
                })}
                {errors.roles && <p className="text-xs font-medium text-danger">{errors.roles.message}</p>}
              </fieldset>
            )}
          />

          {isVendor && (
            <Field
              label="Company"
              required
              error={errors.companyId?.message}
              hint="The vendor will only see this company's job postings."
            >
              <Select {...register('companyId')} disabled={companiesQuery.isLoading}>
                <option value="">{companiesQuery.isLoading ? 'Loading companies…' : 'Select a company…'}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id} disabled={!company.isActive && String(company.id) !== currentCompanyId}>
                    {company.name}
                    {company.isActive ? '' : ' (inactive)'}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
