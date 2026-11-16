import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardFooter } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form-section'
import { Checkbox, Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/api-error'
import { useCompany, useSaveCompany } from './useCompanies'

const optionalHttpUrl = z
  .string()
  .max(300)
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Enter an HTTP or HTTPS URL.')

const companySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required.').max(200),
  industry: z.string().max(100),
  website: optionalHttpUrl,
  about: z.string(),
  address: z.string().max(300),
  city: z.string().max(100),
  state: z.string().max(100),
  country: z.string().max(100),
  postalCode: z.string().max(30),
  contactPersonName: z.string().max(200),
  contactEmail: z.union([z.literal(''), z.string().email().max(200)]),
  contactPhone: z.string().max(30),
  logoPath: z.string().max(500),
  isActive: z.boolean(),
})

type CompanyFormValues = z.infer<typeof companySchema>

const emptyValues: CompanyFormValues = {
  name: '',
  industry: '',
  website: '',
  about: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  contactPersonName: '',
  contactEmail: '',
  contactPhone: '',
  logoPath: '',
  isActive: true,
}

export function CompanyFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const companyQuery = useCompany(id ?? '', Boolean(id))
  const saveCompany = useSaveCompany(id)
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (companyQuery.data) {
      reset({
        name: companyQuery.data.name,
        industry: companyQuery.data.industry ?? '',
        website: companyQuery.data.website ?? '',
        about: companyQuery.data.about ?? '',
        address: companyQuery.data.address ?? '',
        city: companyQuery.data.city ?? '',
        state: companyQuery.data.state ?? '',
        country: companyQuery.data.country ?? '',
        postalCode: companyQuery.data.postalCode ?? '',
        contactPersonName: companyQuery.data.contactPersonName ?? '',
        contactEmail: companyQuery.data.contactEmail ?? '',
        contactPhone: companyQuery.data.contactPhone ?? '',
        logoPath: companyQuery.data.logoPath ?? '',
        isActive: companyQuery.data.isActive,
      })
    }
  }, [companyQuery.data, reset])

  const submit = handleSubmit((values) => {
    saveCompany.mutate(values, {
      onSuccess: (company) => {
        toast.success(id ? 'Company updated' : 'Company created', { description: company.name })
        navigate(`/companies/${company.id}`)
      },
    })
  })

  if (id && companyQuery.isLoading) {
    return <PageLoader label="Loading company…" />
  }
  if (id && (companyQuery.isError || !companyQuery.data)) {
    return <Alert title="Unable to load this company">It may have been deleted.</Alert>
  }

  const backTo = id ? `/companies/${id}` : '/companies'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: backTo, label: id ? 'Back to company' : 'Companies' }}
        title={id ? 'Edit company' : 'Add company'}
        description="Organization profile and the primary contact for this client."
      />
      {saveCompany.isError && (
        <Alert>{getErrorMessage(saveCompany.error, 'Unable to save the company. Please try again.')}</Alert>
      )}
      <Card>
        <form onSubmit={submit} noValidate>
          <FormSection title="Profile" description="How this client appears across TalRekrut.">
            <Field label="Company name" required error={errors.name?.message}>
              <Input {...register('name')} />
            </Field>
            <Field label="Industry" error={errors.industry?.message}>
              <Input placeholder="e.g. Fintech" {...register('industry')} />
            </Field>
            <Field label="Website" error={errors.website?.message} className="sm:col-span-2">
              <Input type="url" placeholder="https://" {...register('website')} />
            </Field>
            <Field label="About" error={errors.about?.message} className="sm:col-span-2">
              <Textarea rows={4} {...register('about')} />
            </Field>
            <Field label="Logo URL" error={errors.logoPath?.message} className="sm:col-span-2">
              <Input {...register('logoPath')} />
            </Field>
            <label className="flex items-center gap-3 sm:col-span-2">
              <Checkbox {...register('isActive')} />
              <span className="flex flex-col">
                <span className="text-sm font-medium">Active</span>
                <span className="text-xs text-muted">Inactive companies can't have new jobs created.</span>
              </span>
            </label>
          </FormSection>
          <FormSection title="Primary contact" description="Who you work with at this company.">
            <Field label="Contact person" error={errors.contactPersonName?.message} className="sm:col-span-2">
              <Input {...register('contactPersonName')} />
            </Field>
            <Field label="Contact email" error={errors.contactEmail?.message}>
              <Input type="email" {...register('contactEmail')} />
            </Field>
            <Field label="Contact phone" error={errors.contactPhone?.message}>
              <Input type="tel" {...register('contactPhone')} />
            </Field>
          </FormSection>
          <FormSection title="Address">
            <Field label="Street address" error={errors.address?.message} className="sm:col-span-2">
              <Input {...register('address')} />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input {...register('city')} />
            </Field>
            <Field label="State / region" error={errors.state?.message}>
              <Input {...register('state')} />
            </Field>
            <Field label="Country" error={errors.country?.message}>
              <Input {...register('country')} />
            </Field>
            <Field label="Postal code" error={errors.postalCode?.message}>
              <Input {...register('postalCode')} />
            </Field>
          </FormSection>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="submit" loading={saveCompany.isPending}>
              Save company
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
