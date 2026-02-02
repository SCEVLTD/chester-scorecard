import type { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'business_user'
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
    return <Redirect to="/login" />
  }

  if (requiredRole === 'admin' && userRole !== 'admin') {
    return <Redirect to="/unauthorized" />
  }

  if (allowedBusinessId && userRole !== 'admin' && businessId !== allowedBusinessId) {
    return <Redirect to="/unauthorized" />
  }

  return <>{children}</>
}
