import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function CompanyLoginPage() {
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
  const { signIn, resetPassword, session } = useAuth()

  // Check for password recovery session (for existing users resetting their password)
  useEffect(() => {
    // Check URL hash for recovery type
    const hash = window.location.hash.substring(1)
    if (hash) {
      const params = new URLSearchParams(hash)
      const type = params.get('type')
      const error = params.get('error')
      const errorDescription = params.get('error_description')

      if (error) {
        // Handle errors like expired tokens
        toast.error(errorDescription?.replace(/\+/g, ' ') || 'The link has expired or is invalid.')
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      if (type === 'recovery') {
        setIsRecoveryMode(true)
      }
    }

    // Listen for PASSWORD_RECOVERY event (for existing users)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true)
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  // Redirect if already logged in (but not in recovery mode)
  useEffect(() => {
    if (session && !isRecoveryMode) {
      navigate('/company/dashboard')
    }
  }, [session, isRecoveryMode, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setIsLoading(true)
    const { error } = await signIn(email.trim(), password)
    setIsLoading(false)

    if (error) {
      console.error('Login error:', error)
      toast.error('Invalid email or password')
    } else {
      navigate('/company/dashboard')
    }
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
      navigate('/company/dashboard')
    }
  }

  // Recovery mode - Set new password form (for existing users)
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
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
      </div>
    )
  }

  // Normal login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/velocity-logo.png"
            alt="Velocity"
            className="h-12 mx-auto mb-4"
          />
          <CardTitle className="text-xl">Company Login</CardTitle>
          <CardDescription>
            Sign in to access your business scorecard
          </CardDescription>
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
    </div>
  )
}
