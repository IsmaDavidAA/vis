import { supabase } from './supabase'
import { getTemplateById } from '../data/metricTemplates'
import { resolveMetricTemplate } from './metricResolver'
import { DIFFICULTY_COUNT } from './metricsAi'
import { POINTS, MAX_LIVES } from '../data/constants'
import {
  computeMetricCompliance,
  computeOverallCompliance,
} from './metrics'
import type {
  UserMetric,
  MetricEntry,
  Goal,
  Checkin,
  UserStats,
  Profile,
  PublicProfileSnapshot,
  GeneratedMetricSuggestion,
  GoalCategory,
  MetricDifficulty,
  CategoryMetricPlan,
} from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function getStats(userId: string): Promise<UserStats | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data as UserStats | null
}

async function updateStats(userId: string, patch: Partial<UserStats>) {
  if (!supabase) return
  await supabase.from('user_stats').update(patch).eq('user_id', userId)
}

async function awardComplete(userId: string, points: number) {
  const stats = await getStats(userId)
  if (!stats) return
  await updateStats(userId, {
    total_points: stats.total_points + points,
    stars_earned: stats.stars_earned + 1,
    streak: stats.streak + 1,
  })
}

async function revokeComplete(userId: string, points: number) {
  const stats = await getStats(userId)
  if (!stats) return
  await updateStats(userId, {
    total_points: Math.max(0, stats.total_points - points),
    stars_earned: Math.max(0, stats.stars_earned - 1),
    streak: 0,
  })
}

export const api = {
  async getGoals(userId: string): Promise<Goal[]> {
    if (!supabase) return []
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId)
    return (data as Goal[]) ?? []
  },

  async getCheckins(userId: string, date?: string): Promise<Checkin[]> {
    if (!supabase) return []
    let q = supabase.from('checkins').select('*').eq('user_id', userId)
    if (date) q = q.eq('date', date)
    const { data } = await q
    return (data as Checkin[]) ?? []
  },

  async getCheckinsRange(userId: string, start: string, end: string): Promise<Checkin[]> {
    if (!supabase) return []
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
    return (data as Checkin[]) ?? []
  },

  async getMetrics(userId: string): Promise<UserMetric[]> {
    if (!supabase) return []
    const { data } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
    return (data as UserMetric[]) ?? []
  },

  async getMetricEntries(userId: string): Promise<MetricEntry[]> {
    if (!supabase) return []
    const { data } = await supabase
      .from('metric_entries')
      .select('*')
      .eq('user_id', userId)
    return (data as MetricEntry[]) ?? []
  },

  async addMetric(userId: string, templateId: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    const template = getTemplateById(templateId)
    if (!template) return { error: 'Métrica no encontrada' }

    const { error } = await supabase.from('user_metrics').upsert(
      {
        user_id: userId,
        template_id: templateId,
        daily_target: template.dailyTarget,
        active: true,
      },
      { onConflict: 'user_id,template_id' },
    )
    return { error: error?.message ?? null }
  },

  async removeMetric(userId: string, metricId: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    await supabase.from('metric_entries').delete().eq('metric_id', metricId).eq('user_id', userId)
    const { error } = await supabase
      .from('user_metrics')
      .update({ active: false })
      .eq('id', metricId)
      .eq('user_id', userId)
    return { error: error?.message ?? null }
  },

  async setMetricValue(
    userId: string,
    metricId: string,
    date: string,
    value: number,
  ): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }

    const metrics = await this.getMetrics(userId)
    const metric = metrics.find((m) => m.id === metricId)
    const template = metric ? resolveMetricTemplate(metric) : null

    const { data: existing } = await supabase
      .from('metric_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('metric_id', metricId)
      .eq('date', date)
      .maybeSingle()

    const prevValue = (existing as MetricEntry | null)?.value ?? 0
    const nextValue = Math.max(0, value)

    const { error } = await supabase.from('metric_entries').upsert(
      {
        user_id: userId,
        metric_id: metricId,
        date,
        value: nextValue,
      },
      { onConflict: 'user_id,metric_id,date' },
    )
    if (error) return { error: error.message }

    if (metric && template) {
      const target = metric.daily_target
      const wasMet = template.type === 'boolean' ? prevValue >= 1 : prevValue >= target
      const isMet = template.type === 'boolean' ? nextValue >= 1 : nextValue >= target
      if (isMet && !wasMet) await awardComplete(userId, POINTS.COMPLETE)
      else if (!isMet && wasMet) await revokeComplete(userId, POINTS.COMPLETE)
    }

    return { error: null }
  },

  async incrementMetric(userId: string, metricId: string, date = todayStr()) {
    const entries = await this.getMetricEntries(userId)
    const current = entries
      .filter((e) => e.metric_id === metricId && e.date === date)
      .reduce((s, e) => s + e.value, 0)
    return this.setMetricValue(userId, metricId, date, current + 1)
  },

  async decrementMetric(userId: string, metricId: string, date = todayStr()) {
    const entries = await this.getMetricEntries(userId)
    const current = entries
      .filter((e) => e.metric_id === metricId && e.date === date)
      .reduce((s, e) => s + e.value, 0)
    return this.setMetricValue(userId, metricId, date, Math.max(0, current - 1))
  },

  async toggleBooleanMetric(userId: string, metricId: string, date = todayStr()) {
    const entries = await this.getMetricEntries(userId)
    const current = entries
      .filter((e) => e.metric_id === metricId && e.date === date)
      .reduce((s, e) => s + e.value, 0)
    return this.setMetricValue(userId, metricId, date, current >= 1 ? 0 : 1)
  },

  async toggleGoalCheckin(
    userId: string,
    goalId: string,
    date = todayStr(),
  ): Promise<{ completed: boolean; error: string | null }> {
    if (!supabase) return { completed: false, error: 'No conectado' }

    const { data: existing } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('date', date)
      .maybeSingle()

    const row = existing as Checkin | null

    if (row) {
      const nextCompleted = !row.completed
      const points = nextCompleted ? POINTS.COMPLETE : 0
      const { error } = await supabase
        .from('checkins')
        .update({ completed: nextCompleted, points })
        .eq('id', row.id)
      if (error) return { completed: row.completed, error: error.message }

      if (nextCompleted) await awardComplete(userId, POINTS.COMPLETE)
      else await revokeComplete(userId, row.points || POINTS.COMPLETE)

      return { completed: nextCompleted, error: null }
    }

    const { error } = await supabase.from('checkins').insert({
      user_id: userId,
      goal_id: goalId,
      date,
      completed: true,
      points: POINTS.COMPLETE,
    })
    if (error) return { completed: false, error: error.message }
    await awardComplete(userId, POINTS.COMPLETE)
    return { completed: true, error: null }
  },

  async markFail(userId: string): Promise<{ error: string | null }> {
    const stats = await getStats(userId)
    if (!stats) return { error: 'Stats no encontradas' }
    await updateStats(userId, {
      fails: stats.fails + 1,
      total_points: Math.max(0, stats.total_points + POINTS.FAIL_PENALTY),
      lives: Math.max(0, stats.lives - 1),
      streak: 0,
    })
    return { error: null }
  },

  async enableSharing(
    userId: string,
    profile: Profile,
    metrics: UserMetric[],
    entries: MetricEntry[],
    stats: UserStats,
  ): Promise<{ code: string; error: string | null }> {
    if (!supabase) return { code: '', error: 'No conectado' }

    const code = profile.share_code || generateShareCode()

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ share_code: code, sharing_enabled: true })
      .eq('user_id', userId)
    if (profileError) return { code: '', error: profileError.message }

    const snapshot = buildSnapshot(code, profile.display_name, metrics, entries, stats)
    const { error: snapError } = await supabase.from('shared_snapshots').upsert(
      {
        share_code: code,
        user_id: userId,
        snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'share_code' },
    )
    if (snapError) return { code: '', error: snapError.message }

    return { code, error: null }
  },

  async disableSharing(userId: string, shareCode?: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    await supabase
      .from('profiles')
      .update({ sharing_enabled: false })
      .eq('user_id', userId)
    if (shareCode) {
      await supabase.from('shared_snapshots').delete().eq('share_code', shareCode)
    }
    return { error: null }
  },

  async syncSnapshot(
    userId: string,
    profile: Profile,
    metrics: UserMetric[],
    entries: MetricEntry[],
    stats: UserStats,
  ) {
    if (!supabase || !profile.sharing_enabled || !profile.share_code) return
    const snapshot = buildSnapshot(
      profile.share_code,
      profile.display_name,
      metrics,
      entries,
      stats,
    )
    await supabase.from('shared_snapshots').upsert(
      {
        share_code: profile.share_code,
        user_id: userId,
        snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'share_code' },
    )
  },

  async getSharedProfile(code: string): Promise<PublicProfileSnapshot | null> {
    if (!supabase) return null
    const { data } = await supabase
      .from('shared_snapshots')
      .select('*')
      .eq('share_code', code.toUpperCase())
      .maybeSingle()
    if (!data) return null
    return data.snapshot as PublicProfileSnapshot
  },

  async ensureTelegramLinkCode(userId: string, existing?: string | null): Promise<string> {
    if (existing) return existing
    const code = generateShareCode() + generateShareCode().slice(0, 2)
    if (!supabase) return code
    await supabase
      .from('profiles')
      .update({ telegram_link_code: code })
      .eq('user_id', userId)
    return code
  },

  async unlinkTelegram(userId: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    const { error } = await supabase
      .from('profiles')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_notify: true,
      })
      .eq('user_id', userId)
    return { error: error?.message ?? null }
  },

  async setTelegramNotify(userId: string, enabled: boolean): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    const { error } = await supabase
      .from('profiles')
      .update({ telegram_notify: enabled })
      .eq('user_id', userId)
    return { error: error?.message ?? null }
  },

  async linkPartnerByCode(
    userId: string,
    partnerCode: string,
  ): Promise<{ error: string | null; partnerName?: string }> {
    if (!supabase) return { error: 'No conectado' }
    const code = partnerCode.trim().toUpperCase()

    const { data: rows, error: lookupError } = await supabase.rpc('lookup_profile_by_code', {
      p_code: code,
    })

    if (lookupError) return { error: lookupError.message }
    const partner = Array.isArray(rows) ? rows[0] : rows

    if (!partner) return { error: 'Código no encontrado' }
    if (partner.user_id === userId) return { error: 'No puedes vincularte contigo' }

    // Solo actualiza tu fila (RLS). La otra persona debe vincularte con tu código.
    const { error: e1 } = await supabase
      .from('profiles')
      .update({ partner_user_id: partner.user_id })
      .eq('user_id', userId)
    if (e1) return { error: e1.message }

    return { error: null, partnerName: partner.display_name }
  },

  async unlinkPartner(userId: string, partnerUserId?: string | null): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    await supabase.from('profiles').update({ partner_user_id: null }).eq('user_id', userId)
    if (partnerUserId) {
      await supabase
        .from('profiles')
        .update({ partner_user_id: null })
        .eq('user_id', partnerUserId)
        .eq('partner_user_id', userId)
    }
    return { error: null }
  },

  async getPartnerProfile(partnerUserId: string): Promise<Profile | null> {
    if (!supabase) return null
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', partnerUserId)
      .maybeSingle()
    return data as Profile | null
  },

  async collectPrize(
    userId: string,
    prizeId: string,
    totalPoints: number,
  ): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }
    const unlockSlots = Math.floor(totalPoints / 50)
    const { data: owned } = await supabase
      .from('user_prize_collection')
      .select('prize_id')
      .eq('user_id', userId)
    const count = owned?.length ?? 0
    if (count >= unlockSlots) {
      return { error: 'Necesitas más puntos para otra figurita' }
    }
    if (owned?.some((p) => p.prize_id === prizeId)) {
      return { error: 'Ya tienes esta figurita' }
    }
    const { error } = await supabase.from('user_prize_collection').insert({
      user_id: userId,
      prize_id: prizeId,
    })
    return { error: error?.message ?? null }
  },

  async addGeneratedMetric(
    userId: string,
    suggestion: GeneratedMetricSuggestion,
    category: GoalCategory,
    difficulty: MetricDifficulty,
  ): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'No conectado' }

    if (suggestion.templateId && getTemplateById(suggestion.templateId)) {
      return this.addMetric(userId, suggestion.templateId)
    }

    const templateId = `custom-${crypto.randomUUID()}`
    const { error } = await supabase.from('user_metrics').upsert(
      {
        user_id: userId,
        template_id: templateId,
        daily_target: suggestion.dailyTarget,
        active: true,
        is_custom: true,
        custom_title: suggestion.title,
        custom_icon: suggestion.icon,
        custom_description: suggestion.description,
        custom_type: suggestion.type,
        custom_unit: suggestion.unit ?? null,
        goal_category: category,
        difficulty,
      },
      { onConflict: 'user_id,template_id' },
    )
    return { error: error?.message ?? null }
  },

  async addMetricPlans(
    userId: string,
    plans: Partial<Record<GoalCategory, CategoryMetricPlan>>,
  ): Promise<{ error: string | null }> {
    for (const [category, plan] of Object.entries(plans)) {
      if (!plan?.accepted) continue
      const filled = plan.metrics.filter((m) => m.title?.trim())
      if (filled.length !== DIFFICULTY_COUNT[plan.difficulty]) continue
      for (const metric of filled) {
        const { error } = await this.addGeneratedMetric(
          userId,
          metric,
          category as GoalCategory,
          plan.difficulty,
        )
        if (error) return { error }
      }
    }
    return { error: null }
  },

  async getCollectedPrizes(userId: string): Promise<string[]> {
    if (!supabase) return []
    const { data } = await supabase
      .from('user_prize_collection')
      .select('prize_id')
      .eq('user_id', userId)
    return (data ?? []).map((r) => r.prize_id)
  },
}

function buildSnapshot(
  shareCode: string,
  displayName: string,
  metrics: UserMetric[],
  entries: MetricEntry[],
  stats: UserStats,
): PublicProfileSnapshot {
  const active = metrics.filter((m) => m.active)
  const metricSnapshots = active.map((m) => {
    const template = resolveMetricTemplate(m)
    if (!template) return null
    const compliance = computeMetricCompliance(m, template, entries, 'week')
    const today = todayStr()
    const todayValue = entries
      .filter((e) => e.metric_id === m.id && e.date === today)
      .reduce((s, e) => s + e.value, 0)
    return {
      title: template.title,
      icon: template.icon,
      percentage: compliance.percentage,
      todayValue,
      dailyTarget: m.daily_target,
      unit: template.unit ?? 'veces',
      type: template.type,
    }
  }).filter(Boolean) as PublicProfileSnapshot['metrics']

  const compliances = active
    .map((m) => {
      const template = resolveMetricTemplate(m)
      if (!template) return null
      return computeMetricCompliance(m, template, entries, 'week')
    })
    .filter(Boolean) as ReturnType<typeof computeMetricCompliance>[]

  return {
    share_code: shareCode,
    display_name: displayName,
    overall_compliance: computeOverallCompliance(compliances),
    total_points: stats.total_points,
    streak: stats.streak,
    stars_earned: stats.stars_earned,
    metrics: metricSnapshots,
    updated_at: new Date().toISOString(),
  }
}

export function getShareUrl(code: string): string {
  const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/share/${code}`
}

export { MAX_LIVES }
