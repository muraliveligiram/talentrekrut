import { KeyRound, MoreHorizontal, Pencil, Power, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/useAuth'
import { getErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/lib/hooks'
import { formatDate, formatRelative } from '@/lib/utils'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import { UserFormDialog } from './UserFormDialog'
import { useUpdateUser, useUsers } from './useUsers'
import { ROLES, type User, type UserFilters } from './userTypes'

const pageSize = 10

export function UserListPage() {
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserFilters['role']>('')
  const [status, setStatus] = useState<UserFilters['status']>('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const usersQuery = useUsers({ search: debouncedSearch, role, status }, page, pageSize)
  const updateUser = useUpdateUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [toggling, setToggling] = useState<User | null>(null)

  const hasFilters = Boolean(search || role || status)
  const users = usersQuery.data?.items ?? []

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (user: User) => {
    setEditing(user)
    setFormOpen(true)
  }

  const confirmToggle = async () => {
    if (!toggling) return
    const activate = !toggling.isActive
    try {
      await updateUser.mutateAsync({
        id: toggling.id,
        request: {
          email: toggling.email,
          fullName: toggling.fullName,
          roles: toggling.roles,
          isActive: activate,
          companyId: toggling.companyId,
        },
      })
      toast.success(activate ? 'User activated' : 'User deactivated', { description: toggling.fullName })
      setToggling(null)
    } catch {
      // Error shown inside the confirm dialog.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage who can sign in to Talent Pool and what they can access."
        actions={
          <Button onClick={openCreate}>
            <UserPlus />
            Invite user
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchInput
            aria-label="Search users"
            placeholder="Search by name or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs sm:flex-1"
          />
          <div className="flex gap-3">
            <Select
              aria-label="Filter by role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as UserFilters['role'])
                setPage(1)
              }}
              className="flex-1 sm:w-40"
            >
              <option value="">All roles</option>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as UserFilters['status'])
                setPage(1)
              }}
              className="flex-1 sm:w-40"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        {usersQuery.isError ? (
          <div className="p-6">
            <Alert title="Unable to load users">{getErrorMessage(usersQuery.error, 'Please try again.')}</Alert>
          </div>
        ) : !usersQuery.isLoading && users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? 'No matching users' : 'No users yet'}
            description={hasFilters ? 'Try a different search or clear the filters.' : 'Invite your first recruiter to get started.'}
            action={
              !hasFilters && (
                <Button onClick={openCreate} size="sm">
                  <UserPlus />
                  Invite user
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table aria-busy={usersQuery.isFetching}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last sign-in</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading
                  ? Array.from({ length: 4 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-8 rounded-full" />
                            <div className="flex flex-col gap-1.5">
                              <Skeleton className="h-3.5 w-40" />
                              <Skeleton className="h-3 w-56" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : users.map((user) => {
                      const isSelf = user.id === currentUser?.id
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar name={user.fullName} />
                              <div className="flex min-w-0 flex-col">
                                <span className="flex items-center gap-2 font-medium">
                                  <span className="truncate">{user.fullName}</span>
                                  {isSelf && <Badge tone="primary">You</Badge>}
                                </span>
                                <span className="truncate text-xs text-muted">{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((value) => (
                                  <Badge
                                    key={value}
                                    tone={value === 'Admin' ? 'primary' : value === 'Vendor' ? 'warning' : 'neutral'}
                                  >
                                    {value}
                                  </Badge>
                                ))}
                              </div>
                              {user.companyName && <span className="text-xs text-muted">{user.companyName}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge tone={user.isActive ? 'success' : 'neutral'} dot>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-muted md:table-cell">
                            <span title={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : undefined}>
                              {formatRelative(user.lastLoginAt)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-muted lg:table-cell">{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.fullName}`}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => openEdit(user)}>
                                  <Pencil />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setResetting(user)}>
                                  <KeyRound />
                                  Reset password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  tone={user.isActive ? 'danger' : undefined}
                                  disabled={isSelf}
                                  onSelect={() => {
                                    updateUser.reset()
                                    setToggling(user)
                                  }}
                                >
                                  <Power />
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={usersQuery.data?.totalCount ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        currentUserId={currentUser?.id}
      />
      <ResetPasswordDialog user={resetting} onOpenChange={(open) => !open && setResetting(null)} />
      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.isActive ? 'Deactivate user?' : 'Activate user?'}
        description={
          toggling?.isActive
            ? `${toggling.fullName} will no longer be able to sign in and won't appear in recruiter assignment lists. Existing job assignments are kept.`
            : `${toggling?.fullName} will be able to sign in again.`
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        loading={updateUser.isPending}
        error={updateUser.isError ? getErrorMessage(updateUser.error, 'Unable to update the user.') : null}
        onConfirm={confirmToggle}
      />
    </div>
  )
}
