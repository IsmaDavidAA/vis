export type GoalCategory =
  | 'salud'
  | 'dinero'
  | 'aprender'
  | 'relaciones'
  | 'dejar'

export type Month =
  | 'julio'
  | 'agosto'
  | 'septiembre'
  | 'octubre'
  | 'noviembre'
  | 'diciembre'

export interface Profile {
  id: string
  user_id: string
  display_name: string
  current_state: string
  accountability_partner: string
  december_feeling: string
  december_have: string
  december_left: string
  onboarding_complete: boolean
  share_code?: string
  sharing_enabled?: boolean
  telegram_chat_id?: string | null
  telegram_username?: string | null
  telegram_link_code?: string | null
  telegram_notify?: boolean
  partner_user_id?: string | null
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  category: GoalCategory
  title: string
  description?: string
  month?: Month
  is_non_negotiable: boolean
  relationship_name?: string
  relationship_change?: string
  learn_how?: string
  created_at: string
}

export interface MonthlyNonNegotiable {
  id: string
  user_id: string
  month: Month
  title: string
}

export interface Checkin {
  id: string
  user_id: string
  goal_id: string
  date: string
  completed: boolean
  points: number
}

export interface UserStats {
  user_id: string
  total_points: number
  lives: number
  max_lives: number
  streak: number
  stars_earned: number
  fails: number
}

export interface Prize {
  id: string
  title: string
  description: string
  icon: string
  color: string
  is_double?: boolean
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  total_points: number
  stars_earned: number
  streak: number
  rank: number
}

export interface OnboardingData {
  current_state: string
  goals: Partial<Record<GoalCategory, string>>
  learn_how: string
  relationships: { name: string; change: string }[]
  monthly_assignments: Partial<Record<Month, string>>
  non_negotiables: Partial<Record<Month, string>>
  december_feeling: string
  december_have: string
  december_left: string
  accountability_partner: string
  metricPlans: Partial<Record<GoalCategory, CategoryMetricPlan>>
}

export type MetricDifficulty = 'easy' | 'medium' | 'hard'

export interface GeneratedMetricSuggestion {
  title: string
  description: string
  icon: string
  type: 'counter' | 'boolean'
  dailyTarget: number
  unit?: string
  /** Si coincide con una plantilla existente, se usa en lugar de custom */
  templateId?: string
}

export interface CategoryMetricPlan {
  difficulty: MetricDifficulty
  metrics: GeneratedMetricSuggestion[]
  accepted: boolean
}

export interface UserMetric {
  id: string
  user_id: string
  template_id: string
  daily_target: number
  active: boolean
  created_at: string
  is_custom?: boolean
  custom_title?: string | null
  custom_icon?: string | null
  custom_description?: string | null
  custom_type?: 'counter' | 'boolean' | null
  custom_unit?: string | null
  goal_category?: string | null
  difficulty?: MetricDifficulty | null
}

export interface MetricEntry {
  id: string
  user_id: string
  metric_id: string
  date: string
  value: number
}

export interface MetricCompliance {
  metric_id: string
  period: 'week' | 'month' | 'all'
  percentage: number
  current: number
  target: number
  todayValue?: number
  dailyTarget?: number
  unit: string
  daysTracked: number
}

export interface PublicProfileSnapshot {
  share_code: string
  display_name: string
  overall_compliance: number
  total_points: number
  streak: number
  stars_earned: number
  metrics: {
    title: string
    icon: string
    percentage: number
    todayValue: number
    dailyTarget: number
    unit: string
    type: 'counter' | 'boolean'
  }[]
  updated_at: string
}
