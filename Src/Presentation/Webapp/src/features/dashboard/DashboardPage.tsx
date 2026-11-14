import { Card, CardContent, Grid, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'

export function DashboardPage() {
  const { roles } = useAuth()

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Recruitment overview
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Signed in as {roles.join(', ') || 'user'}
      </Typography>
      <Grid container spacing={2}>
        {['Open jobs', 'Active candidates', 'Interviews this week'].map((label) => (
          <Grid item xs={12} md={4} key={label}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                  —
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  )
}
