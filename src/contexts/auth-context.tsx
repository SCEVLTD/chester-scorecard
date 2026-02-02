/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  userRole: 'admin' | 'business_user' | null
  businessId: string | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Extract custom claims from JWT
  // Custom access token hook adds claims to JWT payload, not app_metadata
  // Decode JWT to get the claims (access_token is a JWT: header.payload.signature)
  const getJwtClaims = (accessToken: string | undefined) => {
    if (!accessToken) return { user_role: null, business_id: null }
    try {
      const payload = accessToken.split('.')[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      return {
        user_role: decoded.user_role || null,
        business_id: decoded.business_id || null
      }
    } catch {
      return { user_role: null, business_id: null }
    }
  }

  const claims = getJwtClaims(session?.access_token)
  const userRole = claims.user_role as 'admin' | 'business_user' | null
  const businessId = claims.business_id as string | null

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/company/dashboard`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      userRole,
      businessId,
      isLoading,
      signIn,
      signInWithMagicLink,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
