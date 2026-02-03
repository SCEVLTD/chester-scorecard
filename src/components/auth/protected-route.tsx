import type { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'super_admin' | 'consultant' | 'business_user'
  allowedBusinessId?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  allowedBusinessId
}: ProtectedRouteProps) {
  const { session, userRole, businessId, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    // All users go to unified login
    return <Redirect to="/login" />
  }

  // Check admin role (includes both super_admin and consultant)
  const isAdminRole = userRole === 'super_admin' || userRole === 'consultant'

  if (requiredRole === 'admin' && !isAdminRole) {
    // Business users trying to access admin pages go to their dashboard
    if (userRole === 'business_user' && businessId) {
      return <Redirect to="/company/dashboard" />
    }
    return <Redirect to="/unauthorized" />
  }

  if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
    return <Redirect to="/unauthorized" />
  }

  if (requiredRole === 'consultant' && userRole !== 'consultant') {
    return <Redirect to="/unauthorized" />
  }

  if (requiredRole === 'business_user' && userRole !== 'business_user' && !isAdminRole) {
    return <Redirect to="/unauthorized" />
  }

  if (allowedBusinessId && !isAdminRole && businessId !== allowedBusinessId) {
    return <Redirect to="/unauthorized" />
  }

  return <>{children}</>
}
