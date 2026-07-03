import type { Profile, Goal, Checkin, UserStats, MonthlyNonNegotiable, OnboardingData, UserMetric, MetricEntry } from '../types'
import { MAX_LIVES, POINTS, DEFAULT_PRIZES, PRIZE_UNLOCK_POINTS } from '../data/constants'
import { METRIC_TEMPLATES } from '../data/metricTemplates'

const STORAGE_KEY = 'vis_local_data'
const PRIZES_VERSION = 3

interface LocalData {
  userId: string
  email: string
  displayName: string
  profile: Profile | null
  goals: Goal[]
  checkins: Checkin[]
  stats: UserStats
  nonNegotiables: MonthlyNonNegotiable[]
  prizes: typeof DEFAULT_PRIZES
  collectedPrizes: string[]
  metrics: UserMetric[]
  metricEntries: MetricEntry[]
  prizesVersion?: number
}

function generateId() {
  return crypto.randomUUID()
}

function migratePrizes(data: LocalData) {
  if ((data.prizesVersion ?? 1) < PRIZES_VERSION) {
    const oldClaimed = (data.prizes as { claimed_by?: string; id: string }[])
      .find((p) => p.claimed_by)?.id
    data.prizes = DEFAULT_PRIZES.map((p) => ({ ...p }))
    data.collectedPrizes = data.collectedPrizes ?? (oldClaimed ? [oldClaimed] : [])
    data.prizesVersion = PRIZES_VERSION
    saveData(data)
  }
  if (!data.collectedPrizes) data.collectedPrizes = []
}

function getData(): LocalData | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const data = JSON.parse(raw) as LocalData
  migratePrizes(data)
  return data
}

function saveData(data: LocalData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function defaultStats(userId: string): UserStats {
  return {
    user_id: userId,
    total_points: 0,
    lives: MAX_LIVES,
    max_lives: MAX_LIVES,
    streak: 0,
    stars_earned: 0,
    fails: 0,
  }
}

export const localStore = {
  isLoggedIn(): boolean {
    return Boolean(getData()?.userId)
  },

  getCurrentUser() {
    const data = getData()
    if (!data) return null
    return { id: data.userId, email: data.email }
  },

  login(email: string, _password: string) {
    let data = getData()
    if (!data || data.email !== email) {
      const userId = generateId()
      data = {
        userId,
        email,
        displayName: email.split('@')[0],
        profile: null,
        goals: [],
        checkins: [],
        stats: defaultStats(userId),
        nonNegotiables: [],
        prizes: DEFAULT_PRIZES.map((p) => ({ ...p })),
        collectedPrizes: [],
        metrics: [],
        metricEntries: [],
        prizesVersion: PRIZES_VERSION,
      }
    }
    saveData(data)
    return { id: data.userId, email: data.email }
  },

  register(email: string, displayName: string, _password: string) {
    const userId = generateId()
    const data: LocalData = {
      userId,
      email,
      displayName,
      profile: null,
      goals: [],
      checkins: [],
      stats: defaultStats(userId),
      nonNegotiables: [],
      prizes: DEFAULT_PRIZES.map((p) => ({ ...p })),
      collectedPrizes: [],
      metrics: [],
      metricEntries: [],
      prizesVersion: PRIZES_VERSION,
    }
    saveData(data)
    return { id: userId, email }
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY)
  },

  getProfile(): Profile | null {
    return getData()?.profile ?? null
  },

  saveProfile(profile: Omit<Profile, 'id' | 'user_id' | 'created_at'>) {
    const data = getData()
    if (!data) return null
    data.profile = {
      ...profile,
      id: generateId(),
      user_id: data.userId,
      created_at: new Date().toISOString(),
    }
    data.displayName = profile.display_name
    saveData(data)
    return data.profile
  },

  saveOnboarding(onboarding: OnboardingData) {
    const data = getData()
    if (!data) return

    data.profile = {
      id: generateId(),
      user_id: data.userId,
      display_name: data.displayName,
      current_state: onboarding.current_state,
      accountability_partner: onboarding.accountability_partner,
      december_feeling: onboarding.december_feeling,
      december_have: onboarding.december_have,
      december_left: onboarding.december_left,
      onboarding_complete: true,
      created_at: new Date().toISOString(),
    }

    data.goals = []
    for (const [category, title] of Object.entries(onboarding.goals)) {
      if (title) {
        data.goals.push({
          id: generateId(),
          user_id: data.userId,
          category: category as Goal['category'],
          title,
          is_non_negotiable: false,
          learn_how: category === 'aprender' ? onboarding.learn_how : undefined,
          created_at: new Date().toISOString(),
        })
      }
    }

    for (const rel of onboarding.relationships) {
      if (rel.name) {
        data.goals.push({
          id: generateId(),
          user_id: data.userId,
          category: 'relaciones',
          title: rel.name,
          relationship_name: rel.name,
          relationship_change: rel.change,
          is_non_negotiable: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    data.nonNegotiables = []
    for (const [month, title] of Object.entries(onboarding.non_negotiables)) {
      if (title) {
        data.nonNegotiables.push({
          id: generateId(),
          user_id: data.userId,
          month: month as MonthlyNonNegotiable['month'],
          title,
        })
      }
    }

    saveData(data)
  },

  updateShareSettings(shareCode: string, enabled: boolean) {
    const data = getData()
    if (!data?.profile) return
    data.profile.share_code = shareCode
    data.profile.sharing_enabled = enabled
    saveData(data)
  },

  getMetrics(): UserMetric[] {
    return getData()?.metrics ?? []
  },

  getMetricEntries(): MetricEntry[] {
    return getData()?.metricEntries ?? []
  },

  addMetric(templateId: string): UserMetric | null {
    const data = getData()
    if (!data) return null
    if (data.metrics.some((m) => m.template_id === templateId)) return null

    const template = METRIC_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return null

    const metric: UserMetric = {
      id: generateId(),
      user_id: data.userId,
      template_id: templateId,
      daily_target: template.dailyTarget,
      active: true,
      created_at: new Date().toISOString(),
    }
    data.metrics.push(metric)
    saveData(data)
    return metric
  },

  removeMetric(metricId: string) {
    const data = getData()
    if (!data) return
    data.metrics = data.metrics.filter((m) => m.id !== metricId)
    data.metricEntries = data.metricEntries.filter((e) => e.metric_id !== metricId)
    saveData(data)
  },

  logMetricEntry(metricId: string, date: string, value: number): MetricEntry {
    const data = getData()
    if (!data) throw new Error('Not logged in')

    const existing = data.metricEntries.find(
      (e) => e.metric_id === metricId && e.date === date,
    )

    if (existing) {
      existing.value = value
    } else {
      data.metricEntries.push({
        id: generateId(),
        user_id: data.userId,
        metric_id: metricId,
        date,
        value,
      })
    }

    // Award points when target met for the first time today
    const metric = data.metrics.find((m) => m.id === metricId)
    const template = metric ? METRIC_TEMPLATES.find((t) => t.id === metric.template_id) : null
    if (metric && template) {
      const target = metric.daily_target
      const prevValue = existing?.value ?? 0
      const wasMet = template.type === 'boolean' ? prevValue >= 1 : prevValue >= target
      const isMet = template.type === 'boolean' ? value >= 1 : value >= target
      if (isMet && !wasMet) {
        data.stats.total_points += POINTS.COMPLETE
        data.stats.stars_earned += 1
        data.stats.streak += 1
      } else if (!isMet && wasMet) {
        data.stats.total_points = Math.max(0, data.stats.total_points - POINTS.COMPLETE)
        data.stats.stars_earned = Math.max(0, data.stats.stars_earned - 1)
      }
    }

    saveData(data)
    return data.metricEntries.find((e) => e.metric_id === metricId && e.date === date)!
  },

  incrementMetric(metricId: string, date: string): number {
    const data = getData()
    if (!data) return 0
    const existing = data.metricEntries.find(
      (e) => e.metric_id === metricId && e.date === date,
    )
    const newValue = (existing?.value ?? 0) + 1
    this.logMetricEntry(metricId, date, newValue)
    return newValue
  },

  decrementMetric(metricId: string, date: string): number {
    const data = getData()
    if (!data) return 0
    const existing = data.metricEntries.find(
      (e) => e.metric_id === metricId && e.date === date,
    )
    const newValue = Math.max(0, (existing?.value ?? 0) - 1)
    this.logMetricEntry(metricId, date, newValue)
    return newValue
  },

  toggleBooleanMetric(metricId: string, date: string): boolean {
    const data = getData()
    if (!data) return false
    const existing = data.metricEntries.find(
      (e) => e.metric_id === metricId && e.date === date,
    )
    const newValue = existing?.value >= 1 ? 0 : 1
    this.logMetricEntry(metricId, date, newValue)
    return newValue >= 1
  },

  getGoals(): Goal[] {
    return getData()?.goals ?? []
  },

  getStats(): UserStats {
    const data = getData()
    return data?.stats ?? defaultStats('')
  },

  getCheckins(): Checkin[] {
    return getData()?.checkins ?? []
  },

  getNonNegotiables(): MonthlyNonNegotiable[] {
    return getData()?.nonNegotiables ?? []
  },

  toggleCheckin(goalId: string, date: string): { completed: boolean; points: number } {
    const data = getData()
    if (!data) return { completed: false, points: 0 }

    const existing = data.checkins.find((c) => c.goal_id === goalId && c.date === date)
    const goal = data.goals.find((g) => g.id === goalId)
    const isNonNeg = data.nonNegotiables.some((n) => n.title === goal?.title)

    if (existing) {
      existing.completed = !existing.completed
      if (existing.completed) {
        existing.points = isNonNeg ? POINTS.NON_NEGOTIABLE_BONUS : POINTS.COMPLETE
        data.stats.total_points += existing.points
        data.stats.stars_earned += 1
        data.stats.streak += 1
      } else {
        data.stats.total_points -= existing.points
        data.stats.stars_earned = Math.max(0, data.stats.stars_earned - 1)
        data.stats.streak = 0
        existing.points = 0
      }
    } else {
      const points = isNonNeg ? POINTS.NON_NEGOTIABLE_BONUS : POINTS.COMPLETE
      data.checkins.push({
        id: generateId(),
        user_id: data.userId,
        goal_id: goalId,
        date,
        completed: true,
        points,
      })
      data.stats.total_points += points
      data.stats.stars_earned += 1
      data.stats.streak += 1
    }

    saveData(data)
    const checkin = data.checkins.find((c) => c.goal_id === goalId && c.date === date)!
    return { completed: checkin.completed, points: checkin.points }
  },

  markFail(): void {
    const data = getData()
    if (!data) return
    data.stats.fails += 1
    data.stats.total_points = Math.max(0, data.stats.total_points + POINTS.FAIL_PENALTY)
    data.stats.lives = Math.max(0, data.stats.lives - 1)
    data.stats.streak = 0
    saveData(data)
  },

  getLeaderboard(): { display_name: string; total_points: number; stars_earned: number; streak: number }[] {
    const data = getData()
    if (!data) return []
    return [{
      display_name: data.displayName,
      total_points: data.stats.total_points,
      stars_earned: data.stats.stars_earned,
      streak: data.stats.streak,
    }]
  },

  getPrizes() {
    return getData()?.prizes ?? DEFAULT_PRIZES
  },

  getCollectedPrizes(): string[] {
    return getData()?.collectedPrizes ?? []
  },

  getAvailableCollectionSlots(): number {
    const data = getData()
    if (!data) return 0
    const earned = Math.floor(data.stats.total_points / PRIZE_UNLOCK_POINTS)
    return Math.max(0, earned - data.collectedPrizes.length)
  },

  collectPrize(prizeId: string): { ok: boolean; error?: string } {
    const data = getData()
    if (!data) return { ok: false, error: 'No session' }
    if (data.collectedPrizes.includes(prizeId)) {
      return { ok: false, error: 'Ya tienes esta figurita' }
    }
    if (this.getAvailableCollectionSlots() <= 0) {
      return { ok: false, error: `Necesitas ${PRIZE_UNLOCK_POINTS} pts por figurita` }
    }
    if (!DEFAULT_PRIZES.some((p) => p.id === prizeId)) {
      return { ok: false, error: 'Premio no encontrado' }
    }
    data.collectedPrizes.push(prizeId)
    saveData(data)
    return { ok: true }
  },
}
