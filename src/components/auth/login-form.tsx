import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [, navigate] = useLocation()
  const { signIn, resetPassword, session, userRole, businessId } = useAuth()

  // Helper function to redirect based on role
  const redirectByRole = (role: string | null, bizId: string | null) => {
    if (role === 'super_admin' || role === 'consultant' || role === 'admin') {
      navigate('/')
    } else if (role === 'business_user' && bizId) {
      navigate('/company/dashboard')
    } else {
      // No valid role - sign out and show error
      supabase.auth.signOut()
      toast.error('Your account is not configured correctly. Please contact support.')
    }
  }

  // Check for password recovery session
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (hash) {
      const params = new URLSearchParams(hash)
      const type = params.get('type')
      const error = params.get('error')
      const errorDescription = params.get('error_description')

      if (error) {
        toast.error(errorDescription?.replace(/\+/g, ' ') || 'The link has expired or is invalid.')
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      if (type === 'recovery') {
        setIsRecoveryMode(true)
      }
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true)
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  // Redirect if already logged in with valid role (but not in recovery mode)
  useEffect(() => {
    // Check if user just logged out - don't redirect them back
    const logoutRequested = sessionStorage.getItem('logout_requested')
    if (logoutRequested) {
      sessionStorage.removeItem('logout_requested')
      return
    }

    console.log('[LoginForm] Check redirect:', { hasSession: !!session, userRole, businessId, isRecoveryMode })
    if (session && userRole && !isRecoveryMode) {
      console.log('[LoginForm] Redirecting by role:', userRole)
      redirectByRole(userRole, businessId)
    }
  }, [session, userRole, businessId, isRecoveryMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setIsLoading(true)
    const { error } = await signIn(email.trim(), password)
    setIsLoading(false)

    if (error) {
      console.error('Login error:', error)
      toast.error('Invalid email or password')
    }
    // Redirect will happen via the useEffect when session/userRole update
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address first')
      return
    }
    setIsResetting(true)
    const { error } = await resetPassword(email.trim())
    setIsResetting(false)

    if (error) {
      toast.error('Failed to send reset email. Please try again.')
    } else {
      toast.success('Password reset email sent! Check your inbox.')
    }
  }

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsLoading(false)

    if (error) {
      console.error('Password update error:', error)
      toast.error('Failed to set password. Please try again.')
    } else {
      toast.success('Password updated successfully!')
      setIsRecoveryMode(false)
      window.history.replaceState(null, '', window.location.pathname)
      // Redirect based on role
      redirectByRole(userRole, businessId)
    }
  }

  // Recovery mode - Set new password form
  if (isRecoveryMode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/velocity-logo.png"
            alt="Velocity"
            className="h-12 mx-auto mb-4"
          />
          <CardTitle className="text-xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || newPassword !== confirmPassword}>
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Normal login form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <img
          src="/velocity-logo.png"
          alt="Velocity"
          className="h-12 mx-auto mb-4"
        />
        <CardTitle className="text-xl">Chester Business Scorecard</CardTitle>
        <CardDescription>Doing good by doing well</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <Button
            type="button"
            variant="link"
            className="w-full text-sm"
            onClick={handleResetPassword}
            disabled={isResetting}
          >
            {isResetting ? 'Sending...' : 'Forgot password?'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
