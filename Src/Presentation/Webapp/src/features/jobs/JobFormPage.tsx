import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardFooter } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form-section'
import { Input, Select, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/spinner'
import type { MultiSelectOption } from '@/components/ui/multi-select'
import { useCompanies } from '@/features/companies/useCompanies'
import { SkillMultiSelect } from '@/features/skills/SkillMultiSelect'
import { getErrorMessage } from '@/lib/api-error'
import { humanize } from '@/lib/utils'
import type { EmploymentType, JobSkill, JobSkillType, WorkMode } from './jobTypes'
import { useJob, useSaveJob } from './useJobs'

const employmentTypes: EmploymentType[] = ['FullTime', 'PartTime', 'Contract', 'Temporary', 'Internship']
const workModes: WorkMode[] = ['Onsite', 'Remote', 'Hybrid']

const skillOption = z.object({ value: z.number(), label: z.string(), group: z.string().optional() })

const jobSchema = z.object({
  companyId: z.number().int().positive('Select a company.'),
  title: z.string().trim().min(1, 'Job title is required.').max(200),
  description: z.string(),
  minExperienceYears: z.number().min(0),
  maxExperienceYears: z.number().min(0),
  openings: z.number().int().min(1),
  location: z.string().max(200),
  employmentType: z.enum(['FullTime', 'PartTime', 'Contract', 'Temporary', 'Internship']),
  workMode: z.enum(['Onsite', 'Remote', 'Hybrid']),
  communicationRequirement: z.string().max(500),
  primarySkills: z.array(skillOption).min(1, 'At least one primary skill is required.').max(30),
  secondarySkills: z.array(skillOption).max(30),
  goodToHaveSkills: z.array(skillOption).max(30),
}).refine((job) => job.minExperienceYears <= job.maxExperienceYears, {
  path: ['maxExperienceYears'],
  message: 'Maximum experience must be at least minimum experience.',
})

type JobFormValues = z.infer<typeof jobSchema>

const emptyValues: JobFormValues = {
  companyId: 0,
  title: '',
  description: '',
  minExperienceYears: 0,
  maxExperienceYears: 0,
  openings: 1,
  location: '',
  employmentType: 'FullTime',
  workMode: 'Onsite',
  communicationRequirement: '',
  primarySkills: [],
  secondarySkills: [],
  goodToHaveSkills: [],
}

function skillsOfType(skills: JobSkill[], type: JobSkillType): MultiSelectOption[] {
  return skills.filter((skill) => skill.skillType === type).map((skill) => ({ value: skill.skillId, label: skill.skillName }))
}

export function JobFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const jobQuery = useJob(id ?? '', Boolean(id))
  const companiesQuery = useCompanies('', 1, 100)
  const saveJob = useSaveJob(id)
  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: emptyValues,
  })
  const [primarySkills, secondarySkills, goodToHaveSkills] = useWatch({
    control,
    name: ['primarySkills', 'secondarySkills', 'goodToHaveSkills'],
  })
  const ids = (options: MultiSelectOption[]) => options.map((option) => option.value)
  // Minimum years is no longer edited in the form; keep any values already stored on the job.
  const existingMinYears = useMemo(
    () => new Map((jobQuery.data?.skills ?? []).map((skill) => [skill.skillId, skill.minYears])),
    [jobQuery.data],
  )

  useEffect(() => {
    if (jobQuery.data) {
      reset({
        companyId: jobQuery.data.companyId,
        title: jobQuery.data.title,
        description: jobQuery.data.description ?? '',
        minExperienceYears: jobQuery.data.minExperienceYears,
        maxExperienceYears: jobQuery.data.maxExperienceYears,
        openings: jobQuery.data.openings,
        location: jobQuery.data.location ?? '',
        employmentType: jobQuery.data.employmentType,
        workMode: jobQuery.data.workMode,
        communicationRequirement: jobQuery.data.communicationRequirement ?? '',
        primarySkills: skillsOfType(jobQuery.data.skills, 'Primary'),
        secondarySkills: skillsOfType(jobQuery.data.skills, 'Secondary'),
        goodToHaveSkills: skillsOfType(jobQuery.data.skills, 'GoodToHave'),
      })
    }
  }, [jobQuery.data, reset])

  const submit = handleSubmit(({ primarySkills, secondarySkills, goodToHaveSkills, ...job }) => {
    const toRequest = (options: MultiSelectOption[], skillType: JobSkillType) =>
      options.map((option) => ({ skillId: option.value, skillType, minYears: existingMinYears.get(option.value) ?? null }))
    const request = {
      ...job,
      skills: [
        ...toRequest(primarySkills, 'Primary'),
        ...toRequest(secondarySkills, 'Secondary'),
        ...toRequest(goodToHaveSkills, 'GoodToHave'),
      ],
    }
    saveJob.mutate(request, {
      onSuccess: (job) => {
        toast.success(id ? 'Job updated' : 'Job created', { description: `${job.jobCode} · ${job.title}` })
        navigate(`/jobs/${job.id}`)
      },
    })
  })

  if (id && jobQuery.isLoading) {
    return <PageLoader label="Loading job…" />
  }
  if (id && (jobQuery.isError || !jobQuery.data)) {
    return <Alert title="Unable to load this job">It may have been removed.</Alert>
  }

  const backTo = id ? `/jobs/${id}` : '/jobs'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: backTo, label: id ? 'Back to job' : 'Jobs' }}
        title={id ? 'Edit job' : 'Create job'}
        description="Define the role, its requirements and the skills you are screening for."
      />
      {saveJob.isError && <Alert>{getErrorMessage(saveJob.error, 'Unable to save the job. Please try again.')}</Alert>}
      {companiesQuery.isError && <Alert>Unable to load companies.</Alert>}
      <Card>
        <form onSubmit={submit} noValidate>
          <FormSection title="Basics" description="Which client this role is for and what it involves.">
            <Controller
              name="companyId"
              control={control}
              render={({ field }) => (
                <Field label="Company" required error={errors.companyId?.message}>
                  <Select
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value || ''}
                    onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))}
                  >
                    <option value="">Select a company…</option>
                    {(companiesQuery.data?.items ?? []).map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            />
            <Field label="Job title" required error={errors.title?.message}>
              <Input placeholder="e.g. Senior .NET Engineer" {...register('title')} />
            </Field>
            <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
              <Textarea rows={5} {...register('description')} />
            </Field>
          </FormSection>

          <FormSection title="Requirements" description="Experience, headcount and working arrangement.">
            <Field label="Minimum experience (years)" error={errors.minExperienceYears?.message}>
              <Input type="number" min={0} step={0.5} {...register('minExperienceYears', { valueAsNumber: true })} />
            </Field>
            <Field label="Maximum experience (years)" error={errors.maxExperienceYears?.message}>
              <Input type="number" min={0} step={0.5} {...register('maxExperienceYears', { valueAsNumber: true })} />
            </Field>
            <Field label="Openings" error={errors.openings?.message}>
              <Input type="number" min={1} step={1} {...register('openings', { valueAsNumber: true })} />
            </Field>
            <Field label="Location" error={errors.location?.message}>
              <Input placeholder="e.g. Bengaluru" {...register('location')} />
            </Field>
            <Field label="Employment type">
              <Select {...register('employmentType')}>
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Work mode">
              <Select {...register('workMode')}>
                {workModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Communication requirement"
              error={errors.communicationRequirement?.message}
              className="sm:col-span-2"
            >
              <Input placeholder="e.g. Fluent English, client-facing" {...register('communicationRequirement')} />
            </Field>
          </FormSection>

          <FormSection
            title="Skills"
            description="Pick from the skill library. Each skill can belong to one group only."
          >
            <Controller
              name="primarySkills"
              control={control}
              render={({ field }) => (
                <Field
                  label="Primary skills"
                  required
                  error={errors.primarySkills?.message}
                  hint="Must-haves for this role."
                  className="sm:col-span-2"
                >
                  <SkillMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={[...ids(secondarySkills), ...ids(goodToHaveSkills)]}
                  />
                </Field>
              )}
            />
            <Controller
              name="secondarySkills"
              control={control}
              render={({ field }) => (
                <Field label="Secondary skills" error={errors.secondarySkills?.message} className="sm:col-span-2">
                  <SkillMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={[...ids(primarySkills), ...ids(goodToHaveSkills)]}
                  />
                </Field>
              )}
            />
            <Controller
              name="goodToHaveSkills"
              control={control}
              render={({ field }) => (
                <Field label="Good-to-have skills" error={errors.goodToHaveSkills?.message} className="sm:col-span-2">
                  <SkillMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={[...ids(primarySkills), ...ids(secondarySkills)]}
                  />
                </Field>
              )}
            />
            <p className="text-xs text-muted sm:col-span-2">
              Can't find a skill? Type it and choose “Add”, or{' '}
              <ButtonLink to="/skills" variant="link" size="sm" className="text-xs">
                manage the skill library
              </ButtonLink>
              .
            </p>
          </FormSection>

          <CardFooter>
            <Button variant="outline" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="submit" loading={saveJob.isPending}>
              Save job
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
