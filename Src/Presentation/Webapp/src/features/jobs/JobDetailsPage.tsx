import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { JobStatus } from './jobTypes'
import { useAssignRecruiter, useJob, useRecruiters, useRemoveRecruiter, useUpdateJobStatus } from './useJobs'

const statuses: JobStatus[] = ['Draft', 'Open', 'OnHold', 'Closed']

export function JobDetailsPage() {
  const { id = '' } = useParams()
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const [recruiterId, setRecruiterId] = useState<number | ''>('')
  const jobQuery = useJob(id)
  const recruitersQuery = useRecruiters(isAdmin)
  const updateStatus = useUpdateJobStatus(id)
  const assignRecruiter = useAssignRecruiter(id)
  const removeRecruiter = useRemoveRecruiter(id)

  if (jobQuery.isLoading) {
    return <Typography>Loading job…</Typography>
  }
  if (jobQuery.isError || !jobQuery.data) {
    return <Alert severity="error">Unable to find this job.</Alert>
  }

  const job = jobQuery.data
  const handleAssign = () => {
    if (recruiterId !== '') {
      assignRecruiter.mutate(recruiterId, { onSuccess: () => setRecruiterId('') })
    }
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">{job.jobCode}</Typography>
          <Typography variant="h4" component="h1" fontWeight={700}>{job.title}</Typography>
          <Typography color="text.secondary">{job.companyName}</Typography>
        </Box>
        {isAdmin && (
          <Button
            component={RouterLink}
            to={`/jobs/${job.id}/edit`}
            variant="contained"
            startIcon={<EditOutlinedIcon />}
          >
            Edit job
          </Button>
        )}
      </Box>
      {(assignRecruiter.isError || removeRecruiter.isError || updateStatus.isError) && (
        <Alert severity="error">Unable to update this job. Refresh and try again.</Alert>
      )}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            {isAdmin ? (
              <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                <InputLabel id="job-status-label">Status</InputLabel>
                <Select
                  labelId="job-status-label"
                  label="Status"
                  value={job.status}
                  onChange={(event) => updateStatus.mutate(event.target.value as JobStatus)}
                >
                  {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <Chip label={job.status} size="small" sx={{ display: 'flex', width: 'fit-content', mt: 0.5 }} />
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary">Experience</Typography>
            <Typography>{job.minExperienceYears}–{job.maxExperienceYears} years</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary">Openings</Typography>
            <Typography>{job.openings}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary">Location and work mode</Typography>
            <Typography>{job.location || '—'} · {job.workMode}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary">Employment type</Typography>
            <Typography>{job.employmentType}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Description</Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{job.description || '—'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Communication requirement</Typography>
            <Typography>{job.communicationRequirement || '—'}</Typography>
          </Grid>
        </Grid>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Skills</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {job.skills.map((skill) => (
            <Chip
              key={skill.id}
              label={`${skill.skillName} · ${skill.skillType}${skill.minYears ? ` · ${skill.minYears}+ years` : ''}`}
              variant={skill.skillType === 'Primary' ? 'filled' : 'outlined'}
              color={skill.skillType === 'Primary' ? 'primary' : 'default'}
            />
          ))}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Recruiter assignments</Typography>
          {isAdmin && (
            <Stack direction="row" spacing={1}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="recruiter-label">Recruiter</InputLabel>
                <Select
                  labelId="recruiter-label"
                  label="Recruiter"
                  value={recruiterId}
                  onChange={(event) => setRecruiterId(Number(event.target.value))}
                >
                  {(recruitersQuery.data ?? []).map((recruiter) => (
                    <MenuItem key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAssign}
                disabled={!recruiterId || assignRecruiter.isPending}
              >
                Assign
              </Button>
            </Stack>
          )}
        </Stack>
        {recruitersQuery.isError && <Alert severity="error">Unable to load recruiters.</Alert>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Recruiter</TableCell>
              <TableCell>Assigned</TableCell>
              {isAdmin && <TableCell align="right">Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {job.assignments.length ? job.assignments.map((assignment) => (
              <TableRow key={assignment.recruiterUserId}>
                <TableCell>{assignment.recruiterName}</TableCell>
                <TableCell>{new Date(assignment.assignedAt).toLocaleDateString()}</TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <Button
                      color="error"
                      size="small"
                      onClick={() => removeRecruiter.mutate(assignment.recruiterUserId)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 3 : 2}>No recruiters are assigned.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}
