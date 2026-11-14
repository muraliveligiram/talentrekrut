import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useCompanies } from '../companies/useCompanies'
import type { EmploymentType, JobSkillType, WorkMode } from './jobTypes'
import { useJob, useSaveJob } from './useJobs'

const employmentTypes: EmploymentType[] = ['FullTime', 'PartTime', 'Contract', 'Temporary', 'Internship']
const workModes: WorkMode[] = ['Onsite', 'Remote', 'Hybrid']
const skillTypes: JobSkillType[] = ['Primary', 'Secondary', 'GoodToHave']

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
  skills: z.array(z.object({
    skillName: z.string().trim().min(1, 'Skill name is required.').max(100),
    skillType: z.enum(['Primary', 'Secondary', 'GoodToHave']),
    minYears: z.number().min(0).nullable(),
  })).min(1, 'Add at least one skill.')
    .refine((skills) => skills.some((skill) => skill.skillType === 'Primary'), {
      message: 'At least one primary skill is required.',
    }),
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
  skills: [{ skillName: '', skillType: 'Primary', minYears: null }],
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
  const { fields, append, remove } = useFieldArray({ control, name: 'skills' })

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
        skills: jobQuery.data.skills.map((skill) => ({
          skillName: skill.skillName,
          skillType: skill.skillType,
          minYears: skill.minYears,
        })),
      })
    }
  }, [jobQuery.data, reset])

  const submit = handleSubmit((values) => {
    saveJob.mutate(values, {
      onSuccess: (job) => navigate(`/jobs/${job.id}`),
    })
  })

  if (id && jobQuery.isLoading) {
    return <Typography>Loading job…</Typography>
  }
  if (id && (jobQuery.isError || !jobQuery.data)) {
    return <Alert severity="error">Unable to load this job.</Alert>
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700}>
          {id ? 'Edit job' : 'Create job'}
        </Typography>
        <Typography color="text.secondary">Define the role and required skills.</Typography>
      </Box>
      {saveJob.isError && <Alert severity="error">Unable to save the job. Please try again.</Alert>}
      {companiesQuery.isError && <Alert severity="error">Unable to load companies.</Alert>}
      <Paper component="form" onSubmit={submit} noValidate variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Controller
              name="companyId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.companyId)}>
                  <InputLabel id="job-company-label">Company</InputLabel>
                  <Select
                    {...field}
                    value={field.value || ''}
                    onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))}
                    labelId="job-company-label"
                    label="Company"
                  >
                    {(companiesQuery.data?.items ?? []).map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.companyId && <FormHelperText>{errors.companyId.message}</FormHelperText>}
                </FormControl>
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Job title"
              required
              fullWidth
              {...register('title')}
              error={Boolean(errors.title)}
              helperText={errors.title?.message}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" multiline minRows={4} fullWidth {...register('description')} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Minimum experience (years)"
              type="number"
              inputProps={{ min: 0, step: 0.5 }}
              fullWidth
              {...register('minExperienceYears', { valueAsNumber: true })}
              error={Boolean(errors.minExperienceYears)}
              helperText={errors.minExperienceYears?.message}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Maximum experience (years)"
              type="number"
              inputProps={{ min: 0, step: 0.5 }}
              fullWidth
              {...register('maxExperienceYears', { valueAsNumber: true })}
              error={Boolean(errors.maxExperienceYears)}
              helperText={errors.maxExperienceYears?.message}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Openings"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              {...register('openings', { valueAsNumber: true })}
              error={Boolean(errors.openings)}
              helperText={errors.openings?.message}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Location" fullWidth {...register('location')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Controller
              name="employmentType"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Employment type" fullWidth>
                  {employmentTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Controller
              name="workMode"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Work mode" fullWidth>
                  {workModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Communication requirement"
              fullWidth
              {...register('communicationRequirement')}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Skills</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => append({ skillName: '', skillType: 'Secondary', minYears: null })}
              >
                Add skill
              </Button>
            </Stack>
            {(errors.skills?.root?.message || errors.skills?.message) && (
              <Alert severity="error">{errors.skills.root?.message ?? errors.skills.message}</Alert>
            )}
            <Stack spacing={1.5}>
              {fields.map((field, index) => (
                <Grid container spacing={1.5} key={field.id}>
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="Skill"
                      fullWidth
                      {...register(`skills.${index}.skillName`)}
                      error={Boolean(errors.skills?.[index]?.skillName)}
                      helperText={errors.skills?.[index]?.skillName?.message}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name={`skills.${index}.skillType`}
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="Skill type" fullWidth>
                          {skillTypes.map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={10} md={2}>
                    <TextField
                      label="Minimum years"
                      type="number"
                      inputProps={{ min: 0, step: 0.5 }}
                      fullWidth
                      {...register(`skills.${index}.minYears`, {
                        setValueAs: (value: string) => value === '' ? null : Number(value),
                      })}
                    />
                  </Grid>
                  <Grid item xs={2} md={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      aria-label={`Remove skill ${index + 1}`}
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => navigate('/jobs')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveJob.isPending}>
                {saveJob.isPending ? 'Saving…' : 'Save job'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Stack>
  )
}
