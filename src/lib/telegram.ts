import { supabase, isSupabaseConfigured } from './supabase'
import { resolveMetricTemplate } from './metricResolver'
import type { UserMetric, MetricEntry } from '../types'

export type NotifyType =
  | 'metrics_progress'
  | 'metrics_complete'
  | 'goal_completed'
  | 'goal_fail'
  | 'prize_collected'
  | 'streak'
  | 'lives_low'
  | 'partner_linked'
  | 'custom'

const PROGRESS_THRESHOLDS = [50, 70, 100]

export function todayMetricsPercent(
  metrics: UserMetric[],
  entries: MetricEntry[],
  date = new Date().toISOString().split('T')[0],
): number {
  const active = metrics.filter((m) => m.active)
  if (active.length === 0) return 0

  let done = 0
  for (const m of active) {
    const template = resolveMetricTemplate(m)
    if (!template) continue
    const value = entries
      .filter((e) => e.metric_id === m.id && e.date === date)
      .reduce((s, e) => s + e.value, 0)
    const met = template.type === 'boolean' ? value >= 1 : value >= m.daily_target
    if (met) done++
  }
  return Math.round((done / active.length) * 100)
}

export async function notifyPartner(
  type: NotifyType,
  payload: Record<string, unknown> = {},
  eventKey?: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  try {
    await supabase.functions.invoke('telegram-notify', {
      body: {
        type,
        payload,
        event_key: eventKey,
      },
    })
  } catch (err) {
    console.warn('Telegram notify failed', err)
  }
}

/** After metrics change: notify partner at 50/70/100% */
export async function notifyMetricsProgress(
  metrics: UserMetric[],
  entries: MetricEntry[],
): Promise<void> {
  const percent = todayMetricsPercent(metrics, entries)
  const today = new Date().toISOString().split('T')[0]

  for (const threshold of PROGRESS_THRESHOLDS) {
    if (percent < threshold) continue
    if (threshold === 100) {
      await notifyPartner(
        'metrics_complete',
        { percent },
        `metrics_complete:${today}`,
      )
    } else {
      await notifyPartner(
        'metrics_progress',
        { percent: threshold },
        `metrics_progress:${today}:${threshold}`,
      )
    }
  }
}

export function getTelegramBotUsername(): string {
  return (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.replace(
    /^@/,
    '',
  ) ?? ''
}

export function getTelegramStartLink(linkCode: string): string {
  const bot = getTelegramBotUsername()
  if (!bot) return ''
  return `https://t.me/${bot}?start=${linkCode}`
}

export function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
