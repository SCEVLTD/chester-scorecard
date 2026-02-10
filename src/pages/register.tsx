import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation } from 'wouter'
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

const registerSchema = z.object({
  organisationName: z
    .string()
    .min(2, 'Organisation name must be at least 2 characters')
    .max(100, 'Organisation name must be under 100 characters'),
  adminName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters'),
  adminEmail: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage(): ReactElement {
  const [, navigate] = useLocation()
  const { session } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  // Redirect to home if already logged in
  if (session) {
    navigate('/')
    return <></>
  }

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setIsSubmitting(true)

    try {
      const response = await supabase.functions.invoke('create-organisation', {
        body: {
          organisationName: data.organisationName,
          adminEmail: data.adminEmail,
          adminName: data.adminName,
          password: data.password,
        },
      })

      if (response.error) {
        // Supabase functions.invoke wraps errors
        const errorMessage = response.error.message || 'Failed to create organisation'
        toast.error(errorMessage)
        return
      }

      const result = response.data
      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Organisation created successfully! Please sign in.')
      navigate('/login')
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Create Your Organisation</CardTitle>
            <CardDescription>
              Start your 14-day free trial. No credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Organisation Name */}
              <div className="space-y-2">
                <Label htmlFor="organisationName">Organisation Name</Label>
                <Input
                  id="organisationName"
                  placeholder="e.g. Acme Consulting"
                  autoComplete="organization"
                  {...register('organisationName')}
                />
                {errors.organisationName && (
                  <p className="text-sm text-destructive">{errors.organisationName.message}</p>
                )}
              </div>

              {/* Admin Name */}
              <div className="space-y-2">
                <Label htmlFor="adminName">Your Name</Label>
                <Input
                  id="adminName"
                  placeholder="e.g. Jane Smith"
                  autoComplete="name"
                  {...register('adminName')}
                />
                {errors.adminName && (
                  <p className="text-sm text-destructive">{errors.adminName.message}</p>
                )}
              </div>

              {/* Admin Email */}
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email Address</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="jane@acme-consulting.com"
                  autoComplete="email"
                  {...register('adminEmail')}
                />
                {errors.adminEmail && (
                  <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 12 characters, letter + number"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Organisation...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </a>
            </p>
          </CardFooter>
        </Card>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          {' \u00b7 '}
          <a href="/terms" className="hover:underline">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
