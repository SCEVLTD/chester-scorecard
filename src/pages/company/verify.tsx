import { useState } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function CompanyVerifyPage() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [, navigate] = useLocation()

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !token.trim()) {
      toast.error('Please enter both email and verification code')
      return
    }

    setIsLoading(true)

    // Verify the OTP token - this creates a session
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    })

    setIsLoading(false)

    if (error) {
      console.error('Token verification error:', error)
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        toast.error('Code has expired or is invalid. Please request a new one.')
      } else {
        toast.error(error.message || 'Failed to verify code')
      }
    } else {
      toast.success('Code verified! Now set your password.')
      setIsVerified(true)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
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

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)

    if (error) {
      console.error('Password update error:', error)
      toast.error('Failed to set password. Please try again.')
    } else {
      toast.success('Password set successfully!')
      navigate('/company/dashboard')
    }
  }

  // Step 2: Set password after verification
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img
              src="/velocity-logo.png"
              alt="Velocity"
              className="h-12 mx-auto mb-4"
            />
            <CardTitle className="text-xl">Set Your Password</CardTitle>
            <CardDescription>
              Create a password to access your business scorecard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || password !== confirmPassword}>
                {isLoading ? 'Setting Password...' : 'Set Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 1: Enter email and verification code
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/velocity-logo.png"
            alt="Velocity"
            className="h-12 mx-auto mb-4"
          />
          <CardTitle className="text-xl">Verify Your Email</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your email to set up your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyToken} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="6-digit verification code"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || token.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => navigate('/login')}
              >
                Back to login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
