import { Pencil, Plus, Tags } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/useAuth'
import { getErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/lib/hooks'
import { formatDate } from '@/lib/utils'
import { AddSkillsDialog, EditSkillDialog } from './SkillDialogs'
import { categoryLabels, SKILL_CATEGORIES, type Skill, type SkillFilters } from './skillTypes'
import { useSkills } from './useSkills'

const pageSize = 20

export function SkillsPage() {
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SkillFilters['category']>('')
  const [status, setStatus] = useState<SkillFilters['status']>('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Skill | null>(null)
  const debouncedSearch = useDebouncedValue(search)
  const query = useSkills({ search: debouncedSearch, category, status }, page, pageSize)
  const skills = query.data?.items ?? []
  const hasFilters = Boolean(search || category || status)
  const columns = isAdmin ? 5 : 4

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Skill library"
        description={
          isAdmin
            ? 'The shared list of skills used on jobs. Add new skills, rename, recategorise or retire them.'
            : 'The shared list of skills used on jobs. Add any skill that is missing.'
        }
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            Add skills
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchInput
            aria-label="Search skills"
            placeholder="Search skills…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs sm:flex-1"
          />
          <div className="flex gap-3">
            <Select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as SkillFilters['category'])
                setPage(1)
              }}
              className="flex-1 sm:w-52"
            >
              <option value="">All categories</option>
              {SKILL_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as SkillFilters['status'])
                setPage(1)
              }}
              className="flex-1 sm:w-36"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        {query.isError ? (
          <div className="p-6">
            <Alert title="Unable to load skills">{getErrorMessage(query.error, 'Please try again.')}</Alert>
          </div>
        ) : !query.isLoading && skills.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={hasFilters ? 'No matching skills' : 'The skill library is empty'}
            description={hasFilters ? 'Try a different search or clear the filters.' : 'Add the skills your jobs ask for.'}
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus />
                Add skills
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Skill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Used in jobs</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading
                  ? Array.from({ length: 6 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={columns}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : skills.map((skill) => (
                      <TableRow key={skill.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{skill.name}</span>
                            <span className="text-xs text-muted">Added {formatDate(skill.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{categoryLabels[skill.category]}</Badge>
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{skill.jobCount}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge tone={skill.isActive ? 'success' : 'neutral'} dot>
                            {skill.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${skill.name}`} onClick={() => setEditing(skill)}>
                              <Pencil />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} totalCount={query.data?.totalCount ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>

      <AddSkillsDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditSkillDialog skill={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
