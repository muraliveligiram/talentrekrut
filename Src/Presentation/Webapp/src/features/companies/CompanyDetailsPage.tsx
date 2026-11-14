import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useCompany } from './useCompanies'

export function CompanyDetailsPage() {
  const { id = '' } = useParams()
  const companyQuery = useCompany(id)

  if (companyQuery.isLoading) {
    return <Typography>Loading company…</Typography>
  }
  if (companyQuery.isError || !companyQuery.data) {
    return <Alert severity="error">Unable to find this company.</Alert>
  }

  const company = companyQuery.data
  const details = [
    ['Industry', company.industry],
    ['Website', company.website],
    ['About', company.about],
    ['Address', company.address],
    ['City', company.city],
    ['State', company.state],
    ['Country', company.country],
    ['Postal code', company.postalCode],
    ['Contact person', company.contactPersonName],
    ['Contact email', company.contactEmail],
    ['Contact phone', company.contactPhone],
  ]

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {company.name}
          </Typography>
          <Chip
            size="small"
            color={company.isActive ? 'success' : 'default'}
            label={company.isActive ? 'Active' : 'Inactive'}
            sx={{ mt: 1 }}
          />
        </Box>
        <Button
          component={RouterLink}
          to={`/companies/${company.id}/edit`}
          variant="contained"
          startIcon={<EditOutlinedIcon />}
        >
          Edit
        </Button>
      </Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {details.map(([label, value]) => (
            <Grid item xs={12} md={6} key={label}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{value || '—'}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Stack>
  )
}
