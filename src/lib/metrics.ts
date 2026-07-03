import type { UserMetric, MetricEntry, MetricCompliance } from '../types'
import type { MetricTemplate } from '../data/metricTemplates'

function parseDate(d: string): Date {
  return new Date(d + 'T12:00:00')
}

function daysBetween(start: string, end: string): number {
  const s = parseDate(start)
  const e = parseDate(end)
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

function dateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days + 1)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function getPeriodRange(period: 'week' | 'month' | 'all'): { start: string; end: string } {
  if (period === 'week') return dateRange(7)
  if (period === 'month') return dateRange(30)
  const start = new Date()
  start.setMonth(6, 1) // July 1
  if (start > new Date()) start.setFullYear(start.getFullYear() - 1)
  return {
    start: start.toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  }
}

export function computeMetricCompliance(
  metric: UserMetric,
  template: MetricTemplate,
  entries: MetricEntry[],
  period: 'week' | 'month' | 'all' = 'week',
): MetricCompliance {
  const { start, end } = getPeriodRange(period)
  const periodEntries = entries.filter(
    (e) => e.metric_id === metric.id && e.date >= start && e.date <= end,
  )

  const totalDays = daysBetween(start, end)
  const target = metric.daily_target ?? template.dailyTarget

  if (template.type === 'boolean') {
    const daysCompleted = periodEntries.filter((e) => e.value >= 1).length
    const percentage = Math.round((daysCompleted / totalDays) * 100)
    return {
      metric_id: metric.id,
      period,
      percentage: Math.min(100, percentage),
      current: daysCompleted,
      target: totalDays,
      unit: 'días',
      daysTracked: periodEntries.length,
    }
  }

  // counter: sum values vs (days * daily target)
  const totalValue = periodEntries.reduce((sum, e) => sum + e.value, 0)
  const expectedTotal = totalDays * target
  const percentage = expectedTotal > 0 ? Math.round((totalValue / expectedTotal) * 100) : 0

  // Also compute today's value
  const today = new Date().toISOString().split('T')[0]
  const todayValue = periodEntries.filter((e) => e.date === today).reduce((s, e) => s + e.value, 0)

  return {
    metric_id: metric.id,
    period,
    percentage: Math.min(100, percentage),
    current: totalValue,
    target: expectedTotal,
    todayValue,
    dailyTarget: target,
    unit: template.unit ?? 'veces',
    daysTracked: new Set(periodEntries.map((e) => e.date)).size,
  }
}

export function computeOverallCompliance(compliances: MetricCompliance[]): number {
  if (compliances.length === 0) return 0
  const sum = compliances.reduce((s, c) => s + c.percentage, 0)
  return Math.round(sum / compliances.length)
}

export function getTodayEntry(
  entries: MetricEntry[],
  metricId: string,
  date: string = new Date().toISOString().split('T')[0],
): MetricEntry | undefined {
  return entries.find((e) => e.metric_id === metricId && e.date === date)
}

export function getTodayValue(entries: MetricEntry[], metricId: string): number {
  const today = new Date().toISOString().split('T')[0]
  return entries
    .filter((e) => e.metric_id === metricId && e.date === today)
    .reduce((s, e) => s + e.value, 0)
}
