import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
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
    control,
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
      onSuccess: (company) => navigate(`/companies/${company.id}`),
    })
  })

  if (id && companyQuery.isLoading) {
    return <Typography>Loading company…</Typography>
  }
  if (id && (companyQuery.isError || !companyQuery.data)) {
    return <Alert severity="error">Unable to load this company.</Alert>
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700}>
          {id ? 'Edit company' : 'Add company'}
        </Typography>
        <Typography color="text.secondary">Enter organization and contact details.</Typography>
      </Box>
      {saveCompany.isError && (
        <Alert severity="error">
          Unable to save company. Check for a duplicate name and try again.
        </Alert>
      )}
      <Paper component="form" onSubmit={submit} noValidate variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Company name"
              required
              fullWidth
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Industry" fullWidth {...register('industry')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Website"
              fullWidth
              {...register('website')}
              error={Boolean(errors.website)}
              helperText={errors.website?.message}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Contact person" fullWidth {...register('contactPersonName')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Contact email"
              type="email"
              fullWidth
              {...register('contactEmail')}
              error={Boolean(errors.contactEmail)}
              helperText={errors.contactEmail?.message}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Contact phone" fullWidth {...register('contactPhone')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="About" multiline minRows={3} fullWidth {...register('about')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Address" fullWidth {...register('address')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="City" fullWidth {...register('city')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="State" fullWidth {...register('state')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Country" fullWidth {...register('country')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Postal code" fullWidth {...register('postalCode')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Logo path" fullWidth {...register('logoPath')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  label="Active"
                  control={<Checkbox checked={field.value} onChange={field.onChange} />}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => navigate('/companies')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveCompany.isPending}>
                {saveCompany.isPending ? 'Saving…' : 'Save company'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Stack>
  )
}
