import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Paper,
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
import { useDeleteCompany, useCompanies } from './useCompanies'

const pageSize = 10

export function CompanyListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [companyToDelete, setCompanyToDelete] = useState<{ id: number; name: string } | null>(null)
  const companiesQuery = useCompanies(search, page + 1, pageSize)
  const deleteCompany = useDeleteCompany()

  const confirmDelete = () => {
    if (!companyToDelete) {
      return
    }
    deleteCompany.mutate(companyToDelete.id, {
      onSuccess: () => setCompanyToDelete(null),
    })
  }

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Companies
          </Typography>
          <Typography color="text.secondary">Manage organization profiles.</Typography>
        </Box>
        <Button component={RouterLink} to="/companies/new" variant="contained">
          Add company
        </Button>
      </Box>

      <TextField
        label="Search companies"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(0)
        }}
        sx={{ maxWidth: 420 }}
      />

      {companiesQuery.isError && (
        <Alert severity="error">Unable to load companies. Please try again.</Alert>
      )}
      {deleteCompany.isError && (
        <Alert severity="error">Unable to delete the company. It may have active jobs.</Alert>
      )}
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companiesQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading companies…</TableCell>
              </TableRow>
            ) : companiesQuery.data?.items.length ? (
              companiesQuery.data.items.map((company) => (
                <TableRow key={company.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/companies/${company.id}`} underline="hover">
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell>{company.industry || '—'}</TableCell>
                  <TableCell>{company.contactPersonName || company.contactEmail || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={company.isActive ? 'success' : 'default'}
                      label={company.isActive ? 'Active' : 'Inactive'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label={`View ${company.name}`}
                      component={RouterLink}
                      to={`/companies/${company.id}`}
                    >
                      <VisibilityOutlinedIcon />
                    </IconButton>
                    <IconButton
                      aria-label={`Edit ${company.name}`}
                      component={RouterLink}
                      to={`/companies/${company.id}/edit`}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${company.name}`}
                      onClick={() => setCompanyToDelete({ id: company.id, name: company.name })}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  {search ? 'No companies match your search.' : 'No companies have been added yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={companiesQuery.data?.totalCount ?? 0}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
        />
      </Paper>

      <Dialog open={companyToDelete !== null} onClose={() => setCompanyToDelete(null)}>
        <DialogTitle>Delete company?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {companyToDelete?.name} will be hidden from company lists. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompanyToDelete(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={confirmDelete}
            disabled={deleteCompany.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
