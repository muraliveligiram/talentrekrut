import AddIcon from '@mui/icons-material/Add'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useCompanies } from '../companies/useCompanies'
import { useAuth } from '../auth/useAuth'
import type { JobStatus } from './jobTypes'
import { useJobs } from './useJobs'

const pageSize = 10
const statuses: JobStatus[] = ['Draft', 'Open', 'OnHold', 'Closed']

export function JobListPage() {
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [status, setStatus] = useState<JobStatus | ''>('')
  const [page, setPage] = useState(0)
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const companiesQuery = useCompanies('', 1, 100)
  const jobsQuery = useJobs({ search, companyId, status }, page + 1, pageSize)

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Jobs
          </Typography>
          <Typography color="text.secondary">
            {isAdmin ? 'Manage job postings and recruiter assignments.' : 'Jobs assigned to you.'}
          </Typography>
        </Box>
        {isAdmin && (
          <Button component={RouterLink} to="/jobs/new" variant="contained" startIcon={<AddIcon />}>
            Add job
          </Button>
        )}
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Search jobs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(0)
          }}
          sx={{ flex: 1 }}
        />
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="company-filter-label">Company</InputLabel>
          <Select
            labelId="company-filter-label"
            label="Company"
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value)
              setPage(0)
            }}
          >
            <MenuItem value="">All companies</MenuItem>
            {(companiesQuery.data?.items ?? []).map((company) => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as JobStatus | '')
              setPage(0)
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {statuses.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {companiesQuery.isError && <Alert severity="error">Unable to load the company filter options.</Alert>}
      {jobsQuery.isError && <Alert severity="error">Unable to load jobs. Please try again.</Alert>}
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Openings</TableCell>
              <TableCell align="right">View</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading jobs…</TableCell>
              </TableRow>
            ) : jobsQuery.data?.items.length ? (
              jobsQuery.data.items.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/jobs/${job.id}`} underline="hover">
                      <Typography fontWeight={600}>{job.title}</Typography>
                    </Link>
                    <Typography variant="caption" color="text.secondary">
                      {job.jobCode}
                    </Typography>
                  </TableCell>
                  <TableCell>{job.companyName}</TableCell>
                  <TableCell>{job.location || '—'}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell align="right">{job.openings}</TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/jobs/${job.id}`}
                      aria-label={`View ${job.title}`}
                      size="small"
                    >
                      <VisibilityOutlinedIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>
                  {search || companyId || status
                    ? 'No jobs match these filters.'
                    : 'No jobs have been assigned or created yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={jobsQuery.data?.totalCount ?? 0}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
        />
      </Paper>
    </Stack>
  )
}
