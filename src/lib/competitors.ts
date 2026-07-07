import { computeMetricCompliance, computeOverallCompliance } from './metrics'
import { resolveMetricTemplate } from './metricResolver'
import type {
  UserMetric,
  MetricEntry,
  UserStats,
  PublicProfileSnapshot,
  CompetitorComparison,
  Competitor,
} from '../types'

export function computeWeeklyCompliance(
  metrics: UserMetric[],
  entries: MetricEntry[],
): number {
  const active = metrics.filter((m) => m.active)
  const compliances = active
    .map((m) => {
      const template = resolveMetricTemplate(m)
      if (!template) return null
      return computeMetricCompliance(m, template, entries, 'week')
    })
    .filter(Boolean) as ReturnType<typeof computeMetricCompliance>[]
  return computeOverallCompliance(compliances)
}

export function buildComparisonList(
  myName: string,
  myMetrics: UserMetric[],
  myEntries: MetricEntry[],
  myStats: UserStats,
  competitors: Competitor[],
  snapshots: Record<string, PublicProfileSnapshot | null>,
): CompetitorComparison[] {
  const list: CompetitorComparison[] = [
    {
      share_code: 'me',
      display_name: myName,
      weekly_compliance: computeWeeklyCompliance(myMetrics, myEntries),
      streak: myStats.streak,
      total_points: myStats.total_points,
      is_me: true,
    },
  ]

  for (const c of competitors) {
    const snap = snapshots[c.share_code.toUpperCase()]
    list.push({
      share_code: c.share_code,
      display_name: snap?.display_name ?? c.display_name,
      weekly_compliance: snap?.overall_compliance ?? 0,
      streak: snap?.streak ?? 0,
      total_points: snap?.total_points ?? 0,
    })
  }

  return list.sort((a, b) => b.weekly_compliance - a.weekly_compliance)
}

export function getLeaderName(list: CompetitorComparison[]): string | null {
  if (list.length === 0) return null
  return list[0].display_name
}
