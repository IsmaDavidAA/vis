import { supabase, isSupabaseConfigured } from './supabase'
import { METRIC_TEMPLATES } from '../data/metricTemplates'
import type { GoalCategory, GeneratedMetricSuggestion, MetricDifficulty } from '../types'

export const DIFFICULTY_COUNT: Record<MetricDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

const CATEGORY_TO_METRIC: Record<GoalCategory, string[]> = {
  salud: ['brush-teeth', 'water', 'sleep-before-11', 'walk-30', 'gym', 'stretch', 'vegetables'],
  dinero: ['log-expenses', 'no-impulse', 'save-daily', 'check-budget', 'no-delivery'],
  aprender: ['practice-skill', 'language-15', 'online-course', 'read-20', 'podcast-edu'],
  relaciones: ['message-loved', 'call-family', 'quality-time', 'compliment', 'active-listen'],
  dejar: ['no-scroll-night', 'no-sugar', 'no-alcohol', 'no-procrastinate', 'no-complain'],
}

export function emptyMetricSlot(): GeneratedMetricSuggestion {
  return { title: '', description: '', icon: '✨', type: 'boolean', dailyTarget: 1 }
}

export function isMetricFilled(m: GeneratedMetricSuggestion): boolean {
  return Boolean(m.title?.trim())
}

export function resizeMetricsToCount(
  metrics: GeneratedMetricSuggestion[],
  count: number,
): GeneratedMetricSuggestion[] {
  const next = [...metrics]
  while (next.length < count) next.push(emptyMetricSlot())
  return next.slice(0, count)
}

function goalKeywords(goal: string): string[] {
  return goal
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\W+/)
    .filter((w) => w.length > 3)
}

function scoreTemplate(templateId: string, goal: string, category: GoalCategory): number {
  const template = METRIC_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return 0
  const keywords = goalKeywords(goal)
  const text = `${template.title} ${template.description}`.toLowerCase()
  let score = template.category === category || CATEGORY_TO_METRIC[category]?.includes(templateId) ? 2 : 0
  for (const kw of keywords) {
    if (text.includes(kw)) score += 3
  }
  return score
}

function buildCustomFromGoal(
  goal: string,
  category: GoalCategory,
  n: number,
  excludeTitles: string[] = [],
): GeneratedMetricSuggestion[] {
  const exclude = new Set(excludeTitles.map((t) => t.toLowerCase()))
  const short = goal.slice(0, 40)
  const base: GeneratedMetricSuggestion[] = [
    {
      title: `Avance: ${short}`,
      description: `Hacer algo concreto hoy hacia: ${goal}`,
      icon: category === 'salud' ? '💪' : category === 'dinero' ? '💰' : '✨',
      type: 'boolean',
      dailyTarget: 1,
    },
    {
      title: `Registro de ${short}`,
      description: 'Anotar qué hiciste hoy para esta meta',
      icon: '📝',
      type: 'boolean',
      dailyTarget: 1,
    },
    {
      title: 'Bloque enfocado',
      description: `15 min dedicados a: ${short}`,
      icon: '🎯',
      type: 'boolean',
      dailyTarget: 1,
    },
  ]
  return base.filter((m) => !exclude.has(m.title.toLowerCase())).slice(0, n)
}

/** Fallback local cuando no hay DeepSeek o falla la Edge Function */
export function generateMetricsFallback(
  goal: string,
  category: GoalCategory,
  count: number,
  excludeTitles: string[] = [],
): GeneratedMetricSuggestion[] {
  const exclude = new Set(excludeTitles.map((t) => t.toLowerCase()))
  const pool = CATEGORY_TO_METRIC[category] ?? []
  const ranked = [...pool]
    .map((id) => ({ id, score: scoreTemplate(id, goal, category) }))
    .sort((a, b) => b.score - a.score)
    .filter(({ id }) => {
      const t = METRIC_TEMPLATES.find((x) => x.id === id)
      return t && !exclude.has(t.title.toLowerCase())
    })

  const results: GeneratedMetricSuggestion[] = ranked.slice(0, count).map(({ id }) => {
    const t = METRIC_TEMPLATES.find((x) => x.id === id)!
    return {
      title: t.title,
      description: t.description,
      icon: t.icon,
      type: t.type,
      dailyTarget: t.dailyTarget,
      unit: t.unit,
      templateId: t.id,
    }
  })

  if (results.length < count && goal.trim()) {
    const extras = buildCustomFromGoal(goal, category, count - results.length, [
      ...excludeTitles,
      ...results.map((r) => r.title),
    ])
    results.push(...extras)
  }

  return resizeMetricsToCount(results, count)
}

type GenerateResult = {
  metrics: GeneratedMetricSuggestion[]
  source: 'deepseek' | 'fallback'
  error?: string
}

async function invokeGenerate(
  goal: string,
  category: GoalCategory,
  difficulty: MetricDifficulty,
  count: number,
  context?: string,
  excludeTitles: string[] = [],
): Promise<GenerateResult> {
  if (!goal.trim()) {
    return { metrics: [], source: 'fallback', error: 'Escribe tu meta primero' }
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      metrics: generateMetricsFallback(goal, category, count, excludeTitles),
      source: 'fallback',
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-metrics', {
      body: { goal, category, difficulty, context, count, excludeTitles },
    })

    if (error) throw error

    if (data?.metrics?.length) {
      return {
        metrics: resizeMetricsToCount(data.metrics as GeneratedMetricSuggestion[], count),
        source: data.source ?? 'deepseek',
      }
    }

    if (data?.fallback || data?.error) {
      return {
        metrics: generateMetricsFallback(goal, category, count, excludeTitles),
        source: 'fallback',
        error: data.error,
      }
    }
  } catch (err) {
    console.warn('generate-metrics failed, using fallback', err)
  }

  return {
    metrics: generateMetricsFallback(goal, category, count, excludeTitles),
    source: 'fallback',
  }
}

export async function generateMetricsFromGoal(
  goal: string,
  category: GoalCategory,
  difficulty: MetricDifficulty,
  context?: string,
  excludeTitles: string[] = [],
): Promise<GenerateResult> {
  const count = DIFFICULTY_COUNT[difficulty]
  return invokeGenerate(goal, category, difficulty, count, context, excludeTitles)
}

export async function generateSingleMetric(
  goal: string,
  category: GoalCategory,
  difficulty: MetricDifficulty,
  excludeTitles: string[] = [],
  context?: string,
): Promise<GenerateResult> {
  return invokeGenerate(goal, category, difficulty, 1, context, excludeTitles)
}

export const DIFFICULTY_LABELS: Record<
  MetricDifficulty,
  { label: string; hint: string; count: number }
> = {
  easy: { label: 'Sencillo', hint: '1 hábito al día', count: 1 },
  medium: { label: 'Medio', hint: '2 hábitos al día', count: 2 },
  hard: { label: 'Difícil', hint: '3 hábitos al día', count: 3 },
}
