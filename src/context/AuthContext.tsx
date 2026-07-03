import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../lib/supabase'
import { localStore } from '../lib/localStore'
import type { Profile, UserStats } from '../types'
import { MAX_LIVES } from '../data/constants'

interface AuthContextType {
  user: User | { id: string; email: string } | null
  profile: Profile | null
  stats: UserStats
  loading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshStats: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const defaultStats = (userId: string): UserStats => ({
  user_id: userId,
  total_points: 0,
  lives: MAX_LIVES,
  max_lives: MAX_LIVES,
  streak: 0,
  stars_earned: 0,
  fails: 0,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | { id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats>(defaultStats(''))
  const [loading, setLoading] = useState(true)
  const isDemoMode = !isSupabaseConfigured

  const refreshProfile = useCallback(async () => {
    if (isDemoMode) {
      setProfile(localStore.getProfile())
      return
    }
    if (!user || !supabase) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setProfile(data)
  }, [user, isDemoMode])

  const refreshStats = useCallback(async () => {
    if (isDemoMode) {
      setStats(localStore.getStats())
      return
    }
    if (!user || !supabase) return
    const { data } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) setStats(data)
  }, [user, isDemoMode])

  useEffect(() => {
    async function init() {
      if (isDemoMode) {
        const localUser = localStore.getCurrentUser()
        if (localUser) {
          setUser(localUser)
          setProfile(localStore.getProfile())
          setStats(localStore.getStats())
        }
        setLoading(false)
        return
      }

      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setUser(session.user)

      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      setLoading(false)
    }
    init()
  }, [isDemoMode])

  useEffect(() => {
    if (user) {
      refreshProfile()
      refreshStats()
    }
  }, [user, refreshProfile, refreshStats])

  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      const u = localStore.login(email, password)
      setUser(u)
      setProfile(localStore.getProfile())
      setStats(localStore.getStats())
      return { error: null }
    }
    if (!supabase) return { error: 'Supabase no configurado' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    if (isDemoMode) {
      const u = localStore.register(email, displayName, password)
      setUser(u)
      return { error: null }
    }
    if (!supabase) return { error: 'Supabase no configurado' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    })
    if (error) return { error: error.message }
    // profile + user_stats los crea el trigger handle_new_user en Supabase
    return { error: null }
  }

  const signOut = async () => {
    if (isDemoMode) {
      localStore.logout()
      setUser(null)
      setProfile(null)
      setStats(defaultStats(''))
      return
    }
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        stats,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
