import { useState, useEffect } from 'react'
import { useLocation, useSearch } from 'wouter'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

type SetupState = 'loading' | 'valid' | 'expired' | 'invalid' | 'already_used' | 'success'

interface InvitationInfo {
  email: string
  role: string
  roleDisplay: string
}

export function AdminSetupPage() {
  const [state, setState] = useState<SetupState>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, navigate] = useLocation()
  const search = useSearch()

  const token = new URLSearchParams(search).get('token')

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }

    const validateToken = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-admin-setup?token=${token}`,
          {
            method: 'GET',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        )

        const result = await response.json()

        if (!response.ok) {
          if (result.code === 'EXPIRED') {
            setState('expired')
          } else if (result.code === 'ALREADY_USED') {
            setState('already_used')
          } else {
            setState('invalid')
          }
          return
        }

        if (result.valid) {
          setInvitation({
            email: result.email,
            role: result.role,
            roleDisplay: result.roleDisplay,
          })
          setState('valid')
        } else {
          setState('invalid')
        }
      } catch (error) {
        console.error('Token validation error:', error)
        setState('invalid')
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error('Please fill in both password fields')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-admin-setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token, password }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to set up account')
        setIsSubmitting(false)
        return
      }

      if (result.redirectToLogin) {
        toast.success('Account created! Please log in.')
        navigate('/login')
        return
      }

      if (result.session) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })

        setState('success')
        toast.success('Account set up successfully!')

        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (error) {
      console.error('Setup error:', error)
      toast.error('Failed to set up account. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'invalid' || state === 'expired' || state === 'already_used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img
              src="/velocity-logo.png"
              alt="Velocity"
              className="h-12 mx-auto mb-4"
            />
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-xl">
              {state === 'expired' && 'Invitation Expired'}
              {state === 'already_used' && 'Invitation Already Used'}
              {state === 'invalid' && 'Invalid Invitation'}
            </CardTitle>
            <CardDescription>
              {state === 'expired' && 'This invitation link has expired. Please contact your administrator to request a new one.'}
              {state === 'already_used' && 'This invitation has already been used. If you need to reset your password, use the login page.'}
              {state === 'invalid' && 'This invitation link is invalid. Please check the link or contact your administrator.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/velocity-logo.png"
            alt="Velocity"
            className="h-12 mx-auto mb-4"
          />
          <CardTitle className="text-xl">Admin Account Setup</CardTitle>
          <CardDescription>
            Set up your password to access Chester Business Scorecard as{' '}
            <strong>{invitation?.roleDisplay}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <Input
                type="text"
                value={invitation?.roleDisplay || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up account...
                </>
              ) : (
                'Set Up Account'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:underline"
              >
                Log in here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
