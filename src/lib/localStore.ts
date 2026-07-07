import type { Profile, Goal, Checkin, UserStats, MonthlyNonNegotiable, OnboardingData, UserMetric, MetricEntry, GeneratedMetricSuggestion, GoalCategory, MetricDifficulty, UserMetricCategory, Competitor, GoalConfirmationRequest } from '../types'
import { MAX_LIVES, POINTS, DEFAULT_PRIZES } from '../data/constants'
import { METRIC_TEMPLATES, getTemplateById } from '../data/metricTemplates'
import { resolveMetricTemplate } from './metricResolver'
import { DIFFICULTY_COUNT } from './metricsAi'
import { canUnlockPrize } from './prizes'
import { buildComparisonList } from './competitors'
import { shareStore } from './shareStore'

const STORAGE_KEY = 'vis_local_data'
const INBOX_KEY = 'vis_goal_inbox'
const PRIZES_VERSION = 4

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function readInbox(): GoalConfirmationRequest[] {
  try {
    return JSON.parse(localStorage.getItem(INBOX_KEY) || '[]') as GoalConfirmationRequest[]
  } catch {
    return []
  }
}

function writeInbox(items: GoalConfirmationRequest[]) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(items))
}

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
  customCategories: UserMetricCategory[]
  competitors: Competitor[]
  goalConfirmations: GoalConfirmationRequest[]
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
  if (!data.customCategories) data.customCategories = []
  if (!data.competitors) data.competitors = []
  if (!data.goalConfirmations) data.goalConfirmations = []
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
        customCategories: [],
        competitors: [],
        goalConfirmations: [],
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
      customCategories: [],
      competitors: [],
      goalConfirmations: [],
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

    for (const [category, plan] of Object.entries(onboarding.metricPlans ?? {})) {
      if (!plan?.accepted) continue
      const filled = plan.metrics.filter((m) => m.title?.trim())
      if (filled.length !== DIFFICULTY_COUNT[plan.difficulty]) continue
      const goal = data.goals.find((g) => g.category === category)
      for (const suggestion of filled) {
        this.addGeneratedMetric(suggestion, category as GoalCategory, plan.difficulty, goal?.id)
      }
    }

    saveData(data)
  },

  addGeneratedMetric(
    suggestion: GeneratedMetricSuggestion,
    category: GoalCategory | string,
    difficulty: MetricDifficulty,
    goalId?: string,
  ): UserMetric | null {
    const data = getData()
    if (!data) return null

    if (suggestion.templateId && getTemplateById(suggestion.templateId)) {
      return this.addMetric(suggestion.templateId, goalId, category)
    }

    const templateId = `custom-${generateId()}`
    const metric: UserMetric = {
      id: generateId(),
      user_id: data.userId,
      template_id: templateId,
      daily_target: suggestion.dailyTarget,
      active: true,
      created_at: new Date().toISOString(),
      is_custom: true,
      custom_title: suggestion.title,
      custom_icon: suggestion.icon,
      custom_description: suggestion.description,
      custom_type: suggestion.type,
      custom_unit: suggestion.unit,
      goal_category: category,
      goal_id: goalId ?? null,
      difficulty,
    }
    data.metrics.push(metric)
    saveData(data)
    return metric
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

  addMetric(templateId: string, goalId?: string, sectionId?: string): UserMetric | null {
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
      goal_category: sectionId ?? template.category,
      goal_id: goalId ?? null,
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
    const template = metric ? resolveMetricTemplate(metric) : null
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

  addGoal(data: {
    category: string
    title: string
    relationship_change?: string
    learn_how?: string
  }): Goal | null {
    const store = getData()
    if (!store || !data.title.trim()) return null
    const goal: Goal = {
      id: generateId(),
      user_id: store.userId,
      category: data.category,
      title: data.title.trim(),
      relationship_change: data.relationship_change?.trim(),
      learn_how: data.learn_how?.trim(),
      is_non_negotiable: false,
      created_at: new Date().toISOString(),
    }
    store.goals.push(goal)
    saveData(store)
    return goal
  },

  removeGoal(goalId: string) {
    const data = getData()
    if (!data) return
    const metricIds = data.metrics.filter((m) => m.goal_id === goalId).map((m) => m.id)
    data.metrics = data.metrics.filter((m) => m.goal_id !== goalId)
    data.metricEntries = data.metricEntries.filter((e) => !metricIds.includes(e.metric_id))
    data.goals = data.goals.filter((g) => g.id !== goalId)
    data.goalConfirmations = data.goalConfirmations.filter((r) => r.goal_id !== goalId)
    data.checkins = data.checkins.filter((c) => c.goal_id !== goalId)
    saveData(data)
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
    const earned = Math.floor(data.stats.streak / 3)
    return Math.max(0, earned - data.collectedPrizes.length)
  },

  collectPrize(prizeId: string): { ok: boolean; error?: string } {
    const data = getData()
    if (!data) return { ok: false, error: 'No session' }
    const prize = DEFAULT_PRIZES.find((p) => p.id === prizeId)
    if (!prize) return { ok: false, error: 'Premio no encontrado' }
    const check = canUnlockPrize(
      prize,
      data.stats.streak,
      data.stats.total_points,
      data.collectedPrizes,
    )
    if (!check.ok) return { ok: false, error: check.reason }
    data.collectedPrizes.push(prizeId)
    saveData(data)
    return { ok: true }
  },

  addCustomHabit(data: {
    title: string
    description?: string
    icon?: string
    category: string
    goalId: string
    type: 'boolean' | 'counter'
    dailyTarget: number
    unit?: string
  }): UserMetric | null {
    if (!data.goalId) return null
    return this.addGeneratedMetric(
      {
        title: data.title,
        description: data.description ?? '',
        icon: data.icon ?? '✨',
        type: data.type,
        dailyTarget: data.dailyTarget,
        unit: data.unit,
      },
      data.category,
      'medium',
      data.goalId,
    )
  },

  getCustomCategories(): UserMetricCategory[] {
    return getData()?.customCategories ?? []
  },

  addCustomCategory(label: string, icon = '✨'): UserMetricCategory | null {
    const data = getData()
    if (!data || !label.trim()) return null
    const cat: UserMetricCategory = {
      id: `custom-cat-${generateId()}`,
      user_id: data.userId,
      label: label.trim(),
      icon,
      created_at: new Date().toISOString(),
    }
    data.customCategories.push(cat)
    saveData(data)
    return cat
  },

  removeCustomCategory(categoryId: string) {
    const data = getData()
    if (!data) return
    data.customCategories = data.customCategories.filter((c) => c.id !== categoryId)
    saveData(data)
  },

  getCompetitors(): Competitor[] {
    return getData()?.competitors ?? []
  },

  addCompetitor(code: string): { ok: boolean; error?: string } {
    const data = getData()
    if (!data) return { ok: false, error: 'Sin sesión' }
    const shareCode = code.trim().toUpperCase()
    const snap = shareStore.getSharedProfile(shareCode)
    if (!snap) return { ok: false, error: 'Código no encontrado' }
    if (data.competitors.some((c) => c.share_code === shareCode)) {
      return { ok: false, error: 'Ya está en tu reto' }
    }
    data.competitors.push({
      id: generateId(),
      user_id: data.userId,
      share_code: shareCode,
      display_name: snap.display_name,
      created_at: new Date().toISOString(),
    })
    saveData(data)
    return { ok: true }
  },

  removeCompetitor(id: string) {
    const data = getData()
    if (!data) return
    data.competitors = data.competitors.filter((c) => c.id !== id)
    saveData(data)
  },

  getGoalConfirmationRequests(date?: string): GoalConfirmationRequest[] {
    const data = getData()
    if (!data) return []
    const list = data.goalConfirmations ?? []
    return date ? list.filter((r) => r.date === date) : list
  },

  getPendingGoalConfirmationsForMe(shareCode?: string): GoalConfirmationRequest[] {
    if (!shareCode) return []
    const code = shareCode.toUpperCase()
    return readInbox().filter((r) => r.confirmer_share_code === code && r.status === 'pending')
  },

  requestGoalConfirmation(
    goal: Goal,
    confirmerShareCode: string,
    requesterName: string,
    note = '',
    date = todayStr(),
  ): { request: GoalConfirmationRequest | null; error?: string } {
    const data = getData()
    if (!data) return { request: null, error: 'Sin sesión' }

    const code = confirmerShareCode.trim().toUpperCase()
    if (!data.competitors.some((c) => c.share_code === code)) {
      return { request: null, error: 'Ese amigo no está en tu lista de reto' }
    }

    const existing = data.goalConfirmations.find((r) => r.goal_id === goal.id && r.date === date)
    if (existing?.status === 'pending') {
      return { request: null, error: 'Ya tienes una solicitud pendiente para hoy' }
    }
    if (existing?.status === 'confirmed') {
      return { request: null, error: 'Esta meta ya está confirmada hoy' }
    }

    const req: GoalConfirmationRequest = {
      id: generateId(),
      user_id: data.userId,
      goal_id: goal.id,
      goal_title: goal.title,
      goal_category: goal.category,
      requester_name: requesterName,
      date,
      confirmer_share_code: code,
      status: 'pending',
      requester_note: note.trim(),
      created_at: new Date().toISOString(),
    }

    data.goalConfirmations = [
      ...data.goalConfirmations.filter((r) => !(r.goal_id === goal.id && r.date === date)),
      req,
    ]
    saveData(data)

    const inbox = readInbox().filter((r) => r.id !== req.id)
    inbox.push(req)
    writeInbox(inbox)

    return { request: req }
  },

  respondGoalConfirmation(
    requestId: string,
    accept: boolean,
  ): { status: string | null; error?: string } {
    const inbox = readInbox()
    const idx = inbox.findIndex((r) => r.id === requestId && r.status === 'pending')
    if (idx < 0) return { status: null, error: 'Solicitud no encontrada' }

    const req = inbox[idx]
    const now = new Date().toISOString()
    req.status = accept ? 'confirmed' : 'rejected'
    req.confirmed_at = now
    inbox[idx] = req
    writeInbox(inbox)

    const data = getData()
    if (data && data.userId === req.user_id) {
      data.goalConfirmations = data.goalConfirmations.map((r) =>
        r.id === requestId ? { ...req } : r,
      )
      if (accept) {
        const goal = data.goals.find((g) => g.id === req.goal_id)
        const isNonNeg = data.nonNegotiables.some((n) => n.title === goal?.title)
        const points = isNonNeg ? POINTS.NON_NEGOTIABLE_BONUS : POINTS.COMPLETE
        const existing = data.checkins.find((c) => c.goal_id === req.goal_id && c.date === req.date)
        if (existing) {
          if (!existing.completed) {
            existing.completed = true
            existing.points = points
            data.stats.total_points += points
            data.stats.stars_earned += 1
            data.stats.streak += 1
          }
        } else {
          data.checkins.push({
            id: generateId(),
            user_id: data.userId,
            goal_id: req.goal_id,
            date: req.date,
            completed: true,
            points,
          })
          data.stats.total_points += points
          data.stats.stars_earned += 1
          data.stats.streak += 1
        }
      }
      saveData(data)
    }

    return { status: req.status }
  },

  getWeeklyComparison(): ReturnType<typeof buildComparisonList> {
    const data = getData()
    if (!data) return []
    const snapshots: Record<string, ReturnType<typeof shareStore.getSharedProfile>> = {}
    for (const c of data.competitors) {
      snapshots[c.share_code] = shareStore.getSharedProfile(c.share_code)
    }
    return buildComparisonList(
      data.displayName,
      data.metrics,
      data.metricEntries,
      data.stats,
      data.competitors,
      snapshots,
    )
  },
}
