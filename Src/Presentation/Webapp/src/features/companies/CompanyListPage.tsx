import { Building2, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/lib/hooks'
import type { Company } from './companyTypes'
import { useCompanies, useDeleteCompany } from './useCompanies'

const pageSize = 10

export function CompanyListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const debouncedSearch = useDebouncedValue(search)
  const companiesQuery = useCompanies(debouncedSearch, page, pageSize)
  const deleteCompany = useDeleteCompany()
  const companies = companiesQuery.data?.items ?? []

  const confirmDelete = async () => {
    if (!companyToDelete) return
    try {
      await deleteCompany.mutateAsync(companyToDelete.id)
      toast.success('Company deleted', { description: companyToDelete.name })
      setCompanyToDelete(null)
    } catch {
      // Error shown inside the dialog.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Companies"
        description="Client organizations you recruit for."
        actions={
          <ButtonLink to="/companies/new">
            <Plus />
            Add company
          </ButtonLink>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b p-4 sm:px-6">
          <SearchInput
            aria-label="Search companies"
            placeholder="Search companies…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs"
          />
        </div>

        {companiesQuery.isError ? (
          <div className="p-6">
            <Alert title="Unable to load companies">{getErrorMessage(companiesQuery.error, 'Please try again.')}</Alert>
          </div>
        ) : !companiesQuery.isLoading && companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search ? 'No matching companies' : 'No companies yet'}
            description={search ? 'Try a different search term.' : 'Add your first client company to start creating jobs.'}
            action={
              !search && (
                <ButtonLink to="/companies/new" size="sm">
                  <Plus />
                  Add company
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companiesQuery.isLoading
                  ? Array.from({ length: 4 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={company.name} className="rounded-lg" />
                            <div className="flex min-w-0 flex-col">
                              <Link to={`/companies/${company.id}`} className="truncate font-medium hover:underline">
                                {company.name}
                              </Link>
                              <span className="truncate text-xs text-muted">{company.industry || 'No industry set'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted md:table-cell">
                          {[company.city, company.country].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col">
                            <span>{company.contactPersonName || '—'}</span>
                            {company.contactEmail && <span className="text-xs text-muted">{company.contactEmail}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge tone={company.isActive ? 'success' : 'neutral'} dot>
                            {company.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${company.name}`}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => navigate(`/companies/${company.id}`)}>
                                <Eye />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => navigate(`/companies/${company.id}/edit`)}>
                                <Pencil />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                tone="danger"
                                onSelect={() => {
                                  deleteCompany.reset()
                                  setCompanyToDelete(company)
                                }}
                              >
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={companiesQuery.data?.totalCount ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={companyToDelete !== null}
        onOpenChange={(open) => !open && setCompanyToDelete(null)}
        title="Delete company?"
        description={`${companyToDelete?.name} will be removed from company lists. Companies with active jobs cannot be deleted.`}
        confirmLabel="Delete company"
        loading={deleteCompany.isPending}
        error={deleteCompany.isError ? getErrorMessage(deleteCompany.error, 'Unable to delete the company.') : null}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
