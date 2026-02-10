import { Clock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function SessionTimeoutModal(): React.ReactElement | null {
  const { isSessionExpiring, extendSession, signOut } = useAuth()

  return (
    <Dialog open={isSessionExpiring} onOpenChange={(open) => { if (!open) extendSession() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <DialogTitle>Session Expiring</DialogTitle>
          </div>
          <DialogDescription>
            Your session will expire in 5 minutes due to inactivity. Would you like to stay logged in?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => signOut()}>
            Log Out
          </Button>
          <Button onClick={() => extendSession()}>
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
