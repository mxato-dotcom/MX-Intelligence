import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/errors'
import * as authService from '@/services/authService'
import type { Profile } from '@/types/profile'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signIn: (input: authService.SignInInput) => Promise<void>
  signUp: (input: authService.SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profileData = await authService.getProfile(userId)
      setProfile(profileData)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        const currentSession = await authService.getSession()
        if (!isMounted) {
          return
        }

        setSession(currentSession)

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id)
        } else {
          setProfile(null)
        }
      } catch {
        if (isMounted) {
          setSession(null)
          setProfile(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }

      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (input: authService.SignInInput) => {
    const { session: nextSession } = await authService.signIn(input)
    setSession(nextSession)

    if (nextSession?.user) {
      await loadProfile(nextSession.user.id)
    }
  }, [loadProfile])

  const signUp = useCallback(async (input: authService.SignUpInput) => {
    const data = await authService.signUp(input)
    const needsEmailConfirmation = Boolean(data.user && !data.session)

    if (data.session) {
      setSession(data.session)
      if (data.user) {
        await loadProfile(data.user.id)
      }
    }

    return { needsEmailConfirmation }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, isLoading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

export { getAuthErrorMessage }
