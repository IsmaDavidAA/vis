import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto') &&
    !supabaseAnonKey.includes('tu-anon-key'),
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export function getAuthRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base}`.replace(/\/+$/, '') + '/'
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string
          current_state: string
          accountability_partner: string
          december_feeling: string
          december_have: string
          december_left: string
          onboarding_complete: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      goals: {
        Row: {
          id: string
          user_id: string
          category: string
          title: string
          description: string | null
          month: string | null
          is_non_negotiable: boolean
          relationship_name: string | null
          relationship_change: string | null
          learn_how: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['goals']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['goals']['Insert']>
      }
      monthly_non_negotiables: {
        Row: {
          id: string
          user_id: string
          month: string
          title: string
        }
        Insert: Omit<Database['public']['Tables']['monthly_non_negotiables']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['monthly_non_negotiables']['Insert']>
      }
      checkins: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          date: string
          completed: boolean
          points: number
        }
        Insert: Omit<Database['public']['Tables']['checkins']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['checkins']['Insert']>
      }
      user_stats: {
        Row: {
          user_id: string
          total_points: number
          lives: number
          max_lives: number
          streak: number
          stars_earned: number
          fails: number
        }
        Insert: Database['public']['Tables']['user_stats']['Row']
        Update: Partial<Database['public']['Tables']['user_stats']['Insert']>
      }
      prizes: {
        Row: {
          id: string
          title: string
          description: string
          claimed_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['prizes']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['prizes']['Insert']>
      }
    }
  }
}
