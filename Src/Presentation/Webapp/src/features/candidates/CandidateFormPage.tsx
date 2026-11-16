import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardFooter } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form-section'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/spinner'
import { getErrorMessage, getStatus } from '@/lib/api-error'
import { LEVELS, levelLabels, NOTICE_PERIODS, noticeLabel } from './candidateTypes'
import { useCandidate, useOpenJobs, useSaveCandidate } from './useCandidates'

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function yearsAgo(years: number) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return isoDate(date)
}

const lpa = (label: string) =>
  z
    .number({ error: `${label} is required.` })
    .min(0, `${label} cannot be negative.`)
    .max(10_000, `${label} looks too large.`)

const optionalText = (max: number) => z.string().trim().max(max)

const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required.').max(200),
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required.')
      .refine((value) => value <= yearsAgo(16) && value >= yearsAgo(80), 'Candidate must be between 16 and 80 years old.'),
    phone: z
      .string()
      .trim()
      .min(1, 'Contact number is required.')
      .regex(/^\+?[0-9\s\-()]{7,30}$/, 'Enter a valid phone number.')
      .refine((value) => value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15, 'Enter a valid phone number.'),
    personalEmail: z.string().trim().min(1, 'Personal email is required.').email('Enter a valid email address.').max(200),
    linkedInUrl: optionalText(300).refine(
      (value) => !value || /^https?:\/\/([\w-]+\.)*linkedin\.com\/.+/i.test(value),
      'Enter a full LinkedIn URL, e.g. https://www.linkedin.com/in/name',
    ),
    currentRole: z.string().trim().min(1, 'Current role is required.').max(200),
    currentCompany: z.string().trim().min(1, 'Current company is required.').max(200),
    level: z.enum(LEVELS, { error: 'Select a level.' }),
    companyEmail: optionalText(200).refine((value) => !value || z.email().safeParse(value).success, 'Enter a valid email address.'),
    currentCtcLpa: lpa('Current CTC'),
    currentCtcIncludesVariable: z.boolean(),
    variablePayLpa: z.number().min(0).max(10_000).nullable(),
    expectedCtcLpa: lpa('Expected CTC'),
    noticePeriodDays: z.number().int().min(0).max(365),
    notes: optionalText(4000),
    jobId: z.string(),
  })
  .refine((values) => values.variablePayLpa === null || values.variablePayLpa <= values.currentCtcLpa, {
    path: ['variablePayLpa'],
    message: 'Variable pay cannot exceed the current CTC.',
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  fullName: '',
  dateOfBirth: '',
  phone: '',
  personalEmail: '',
  linkedInUrl: '',
  currentRole: '',
  currentCompany: '',
  level: 'MidLevel',
  companyEmail: '',
  currentCtcLpa: Number.NaN,
  currentCtcIncludesVariable: false,
  variablePayLpa: null,
  expectedCtcLpa: Number.NaN,
  noticePeriodDays: 30,
  notes: '',
  jobId: '',
}

const optionalNumber = (value: unknown) => (value === '' || value === null || value === undefined ? null : Number(value))

export function CandidateFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const candidateQuery = useCandidate(id ?? '', isEdit)
  const jobsQuery = useOpenJobs(!isEdit)
  const save = useSaveCandidate(id)
  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  })
  const includesVariable = useWatch({ control, name: 'currentCtcIncludesVariable' })
  const presetJobId = searchParams.get('jobId')

  // The job options load asynchronously; re-apply a preselected job once they are rendered.
  useEffect(() => {
    if (presetJobId && jobsQuery.data?.some((job) => String(job.id) === presetJobId)) {
      setValue('jobId', presetJobId)
    }
  }, [jobsQuery.data, presetJobId, setValue])

  useEffect(() => {
    const candidate = candidateQuery.data
    if (candidate) {
      reset({
        fullName: candidate.fullName,
        dateOfBirth: candidate.dateOfBirth,
        phone: candidate.phone,
        personalEmail: candidate.personalEmail,
        linkedInUrl: candidate.linkedInUrl ?? '',
        currentRole: candidate.currentRole,
        currentCompany: candidate.currentCompany,
        level: candidate.level,
        companyEmail: candidate.companyEmail ?? '',
        currentCtcLpa: candidate.currentCtcLpa,
        currentCtcIncludesVariable: candidate.currentCtcIncludesVariable,
        variablePayLpa: candidate.variablePayLpa,
        expectedCtcLpa: candidate.expectedCtcLpa,
        noticePeriodDays: candidate.noticePeriodDays,
        notes: candidate.notes ?? '',
        jobId: '',
      })
    }
  }, [candidateQuery.data, reset])

  const submit = handleSubmit((values) => {
    const { jobId, ...profile } = values
    save.mutate(
      {
        ...profile,
        companyEmail: profile.companyEmail || null,
        linkedInUrl: profile.linkedInUrl || null,
        notes: profile.notes || null,
        variablePayLpa: profile.currentCtcIncludesVariable ? profile.variablePayLpa : null,
        jobId: jobId ? Number(jobId) : null,
      },
      {
        onSuccess: (candidate) => {
          toast.success(isEdit ? 'Candidate updated' : 'Candidate added', {
            description: !isEdit && jobId ? 'Submitted for screening.' : candidate.fullName,
          })
          navigate(`/candidates/${candidate.id}`)
        },
      },
    )
  })

  if (isEdit && candidateQuery.isLoading) return <PageLoader label="Loading candidate…" />
  if (isEdit && (candidateQuery.isError || !candidateQuery.data)) {
    return <Alert title="Unable to load this candidate">They may have been removed or are not visible to you.</Alert>
  }

  const backTo = id ? `/candidates/${id}` : '/candidates'
  const existingCandidateId =
    getStatus(save.error) === 409 && axios.isAxiosError<{ existingCandidateId?: number }>(save.error)
      ? save.error.response?.data?.existingCandidateId
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: backTo, label: isEdit ? 'Back to candidate' : 'Candidates' }}
        title={isEdit ? 'Edit candidate' : 'Add candidate'}
        description="Candidate profile, compensation and availability."
      />
      {save.isError && (
        <Alert title={existingCandidateId ? 'Possible duplicate' : undefined}>
          {getErrorMessage(save.error, 'Unable to save the candidate. Please try again.')}{' '}
          {existingCandidateId && (
            <Link to={`/candidates/${existingCandidateId}`} className="font-medium underline">
              View existing candidate
            </Link>
          )}
        </Alert>
      )}
      <Card>
        <form onSubmit={submit} noValidate>
          <FormSection title="Personal details" description="Who the candidate is and how to reach them.">
            <Field label="Full name" required error={errors.fullName?.message}>
              <Input autoComplete="off" {...register('fullName')} />
            </Field>
            <Field label="Date of birth" required error={errors.dateOfBirth?.message}>
              <Input type="date" max={yearsAgo(16)} min={yearsAgo(80)} {...register('dateOfBirth')} />
            </Field>
            <Field label="Contact number" required error={errors.phone?.message}>
              <Input type="tel" placeholder="+91 98765 43210" {...register('phone')} />
            </Field>
            <Field label="Personal email" required error={errors.personalEmail?.message}>
              <Input type="email" {...register('personalEmail')} />
            </Field>
            <Field label="LinkedIn profile" error={errors.linkedInUrl?.message} hint="Optional" className="sm:col-span-2">
              <Input type="url" placeholder="https://www.linkedin.com/in/…" {...register('linkedInUrl')} />
            </Field>
          </FormSection>

          <FormSection title="Current employment" description="Where the candidate works today.">
            <Field label="Current role" required error={errors.currentRole?.message}>
              <Input placeholder="e.g. Senior Software Engineer" {...register('currentRole')} />
            </Field>
            <Field label="Current company" required error={errors.currentCompany?.message}>
              <Input {...register('currentCompany')} />
            </Field>
            <Field label="Level" required error={errors.level?.message}>
              <Select {...register('level')}>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {levelLabels[level]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Company email" error={errors.companyEmail?.message} hint="Optional">
              <Input type="email" {...register('companyEmail')} />
            </Field>
          </FormSection>

          <FormSection title="Compensation & availability" description="Annual amounts in lakhs per annum (LPA).">
            <Field label="Current CTC (LPA)" required error={errors.currentCtcLpa?.message}>
              <Input type="number" min={0} step={0.1} inputMode="decimal" {...register('currentCtcLpa', { valueAsNumber: true })} />
            </Field>
            <Field label="Expected CTC (LPA)" required error={errors.expectedCtcLpa?.message}>
              <Input type="number" min={0} step={0.1} inputMode="decimal" {...register('expectedCtcLpa', { valueAsNumber: true })} />
            </Field>
            <label className="flex items-center gap-3 sm:col-span-2">
              <Checkbox {...register('currentCtcIncludesVariable')} />
              <span className="flex flex-col">
                <span className="text-sm font-medium">Current CTC includes variable pay</span>
                <span className="text-xs text-muted">Bonus, incentives or other performance-linked pay.</span>
              </span>
            </label>
            {includesVariable && (
              <Field label="Variable component (LPA)" error={errors.variablePayLpa?.message} hint="Optional">
                <Input type="number" min={0} step={0.1} inputMode="decimal" {...register('variablePayLpa', { setValueAs: optionalNumber })} />
              </Field>
            )}
            <Field label="Notice period" required error={errors.noticePeriodDays?.message} className={includesVariable ? undefined : 'sm:col-start-1'}>
              <Select {...register('noticePeriodDays', { valueAsNumber: true })}>
                {NOTICE_PERIODS.map((days) => (
                  <option key={days} value={days}>
                    {noticeLabel(days)}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Notes" description="Context for the team: strengths, concerns, preferences.">
            <Field label="Candidate notes" error={errors.notes?.message} className="sm:col-span-2">
              <Textarea rows={4} {...register('notes')} />
            </Field>
          </FormSection>

          {!isEdit && (
            <FormSection title="Submit to job" description="Optionally start screening for an open job right away.">
              <Field
                label="Job"
                className="sm:col-span-2"
                hint={!jobsQuery.isLoading && (jobsQuery.data ?? []).length === 0 ? 'No open jobs are available to you.' : 'Optional'}
              >
                <Select {...register('jobId')} disabled={jobsQuery.isLoading}>
                  <option value="">Don't submit yet</option>
                  {(jobsQuery.data ?? []).map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.jobCode} · {job.title} ({job.companyName})
                    </option>
                  ))}
                </Select>
              </Field>
            </FormSection>
          )}

          <CardFooter>
            <Button variant="outline" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Add candidate'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
