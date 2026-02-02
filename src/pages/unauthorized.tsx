import { Link } from 'wouter'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function UnauthorizedPage() {
  const { userRole, businessId } = useAuth()

  // Determine where to redirect based on user role
  const homeLink = userRole === 'admin'
    ? '/'
    : businessId
      ? `/business/${businessId}`
      : '/login'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button asChild>
          <Link href={homeLink}>Return to Home</Link>
        </Button>
      </div>
    </div>
  )
}
