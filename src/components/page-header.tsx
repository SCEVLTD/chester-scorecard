import type { ReactNode } from 'react'
import { useLocation } from 'wouter'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

interface PageHeaderProps {
  /** Path to navigate back to, or false to hide back button */
  backTo?: string | false
  /** Custom back button text (default: no text, just icon) */
  backText?: string
  /** Whether to show the tagline under the logo (default: true) */
  showTagline?: boolean
  /** Whether to show the home button (default: true) */
  showHomeButton?: boolean
  /** Action buttons or other content for the right side */
  actions?: ReactNode
}

export function PageHeader({
  backTo,
  backText,
  showTagline = true,
  showHomeButton = true,
  actions,
}: PageHeaderProps) {
  const [, navigate] = useLocation()
  const { userRole } = useAuth()

  // Determine home path based on user role
  const homePath = userRole === 'business_user' ? '/company/dashboard' : '/'

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
      {/* Left section - back button */}
      <div className="justify-self-start flex items-center gap-1">
        {backTo !== false && (
          <Button
            variant="ghost"
            size={backText ? 'default' : 'icon'}
            onClick={() => navigate(backTo || '/')}
            title="Go back"
          >
            <ArrowLeft className={backText ? 'mr-2 h-4 w-4' : 'h-5 w-5'} />
            {backText}
          </Button>
        )}
        {showHomeButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(homePath)}
            title="Go to home"
          >
            <Home className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Center section - logo (truly centered) */}
      <div className="flex flex-col items-center">
        <img
          src="/velocity-logo.png"
          alt="Velocity"
          className="h-10"
        />
        {showTagline && (
          <p className="text-xs text-muted-foreground mt-1">
            Doing good by doing well
          </p>
        )}
      </div>

      {/* Right section - actions */}
      <div className="justify-self-end flex items-center gap-2 flex-wrap justify-end">
        {actions}
      </div>
    </header>
  )
}

interface PageHeaderActionsProps {
  children: ReactNode
}

/** Container for action buttons with proper spacing */
export function PageHeaderActions({ children }: PageHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {children}
    </div>
  )
}
