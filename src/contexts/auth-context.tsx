/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { SessionTimeoutModal } from '@/components/session-timeout-modal'

/** Duration of inactivity before showing the warning modal (25 minutes) */
const WARNING_TIMEOUT_MS = 25 * 60 * 1000
/** Duration of inactivity before auto sign-out (30 minutes) */
const LOGOUT_TIMEOUT_MS = 30 * 60 * 1000
/** Minimum interval between activity event processing (30 seconds) */
const ACTIVITY_THROTTLE_MS = 30 * 1000

interface AuthContextType {
  session: Session | null
  user: User | null
  userRole: 'super_admin' | 'consultant' | 'business_user' | null
  businessId: string | null
  isLoading: boolean
  isSessionExpiring: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  extendSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSessionExpiring, setIsSessionExpiring] = useState(false)

  // Refs for idle detection timers
  const lastActivityRef = useRef<number>(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const getJwtClaims = (accessToken: string | undefined): { user_role: 'super_admin' | 'consultant' | 'business_user' | null, business_id: string | null } => {
    if (!accessToken) {
      return { user_role: null, business_id: null }
    }
    try {
      const payload = accessToken.split('.')[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      const rawRole = decoded.user_role || null
      // Backward compat: old 'admin' role maps to 'super_admin'
      const user_role = rawRole === 'admin' ? 'super_admin' : rawRole
      return {
        user_role,
        business_id: decoded.business_id || null
      }
    } catch (e) {
      console.error('[Auth] JWT parse error:', e)
      return { user_role: null, business_id: null }
    }
  }

  const claims = getJwtClaims(session?.access_token)
  const userRole = claims.user_role
  const businessId = claims.business_id

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

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  /** Clear all idle detection timers */
  const clearIdleTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  /** Start (or restart) the idle detection timers */
  const startIdleTimers = useCallback(() => {
    clearIdleTimers()
    lastActivityRef.current = Date.now()
    setIsSessionExpiring(false)

    warningTimerRef.current = setTimeout(() => {
      setIsSessionExpiring(true)
    }, WARNING_TIMEOUT_MS)

    logoutTimerRef.current = setTimeout(() => {
      setIsSessionExpiring(false)
      toast.info('Session expired due to inactivity')
      supabase.auth.signOut()
    }, LOGOUT_TIMEOUT_MS)
  }, [clearIdleTimers])

  /** Called when user clicks "Stay Logged In" on the timeout modal */
  const extendSession = useCallback(() => {
    startIdleTimers()
  }, [startIdleTimers])

  // Idle detection: track user activity and manage timers
  useEffect(() => {
    // Only run timers when user has an active session
    if (!session) {
      clearIdleTimers()
      setIsSessionExpiring(false)
      return
    }

    // Start timers on mount / session change
    startIdleTimers()

    /** Throttled activity handler - resets timers on user interaction */
    const handleActivity = (): void => {
      const now = Date.now()
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) {
        return // Throttle: ignore events within 30s of last reset
      }
      startIdleTimers()
    }

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handleActivity)
      }
      clearIdleTimers()
    }
  }, [session, startIdleTimers, clearIdleTimers])

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      userRole,
      businessId,
      isLoading,
      isSessionExpiring,
      signIn,
      signInWithMagicLink,
      resetPassword,
      signOut,
      extendSession,
    }}>
      {children}
      <SessionTimeoutModal />
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
