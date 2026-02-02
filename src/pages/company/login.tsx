import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Mail, CheckCircle } from 'lucide-react'

export function CompanyLoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { signInWithMagicLink } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    const { error } = await signInWithMagicLink(email.trim())
    setIsLoading(false)

    if (error) {
      toast.error('Failed to send login link. Please try again.')
    } else {
      setEmailSent(true)
      toast.success('Check your email for the login link!')
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a login link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Click the link in the email to sign in.</p>
            <p className="mt-2">Didn't receive it? Check your spam folder.</p>
            <Button
              variant="link"
              className="mt-4"
              onClick={() => setEmailSent(false)}
            >
              Try a different email
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
          <CardTitle className="text-xl">Company Login</CardTitle>
          <CardDescription>
            Enter your email to receive a secure login link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Mail className="mr-2 h-4 w-4" />
              {isLoading ? 'Sending...' : 'Send Login Link'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No password required. We'll email you a secure link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
