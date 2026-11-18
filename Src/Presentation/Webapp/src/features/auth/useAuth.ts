import { useContext } from 'react'
import { AuthContext } from './authContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}

/** Convenience flags for role-based UI. Vendors never hold a staff role. */
export function useRoleFlags() {
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const isStaff = isAdmin || roles.includes('Recruiter')
  return { isAdmin, isStaff, isVendor: !isStaff && roles.includes('Vendor') }
}
