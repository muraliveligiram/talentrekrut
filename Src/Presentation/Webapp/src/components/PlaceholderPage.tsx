import { Paper, Typography } from '@mui/material'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">
        This section will be available in the next implementation phase.
      </Typography>
    </Paper>
  )
}
