import type { PublicProfileSnapshot, UserMetric, MetricEntry } from '../types'
import { resolveMetricTemplate } from './metricResolver'
import { computeMetricCompliance, computeOverallCompliance } from './metrics'
import { localStore } from './localStore'

const PUBLIC_STORAGE_KEY = 'vis_public_profiles'

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function getPublicProfiles(): Record<string, PublicProfileSnapshot> {
  const raw = localStorage.getItem(PUBLIC_STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

function savePublicProfiles(profiles: Record<string, PublicProfileSnapshot>) {
  localStorage.setItem(PUBLIC_STORAGE_KEY, JSON.stringify(profiles))
}

function buildSnapshot(
  shareCode: string,
  displayName: string,
  metrics: UserMetric[],
  entries: MetricEntry[],
): PublicProfileSnapshot {
  const stats = localStore.getStats()
  const metricSnapshots = metrics
    .filter((m) => m.active)
    .map((m) => {
      const template = resolveMetricTemplate(m)
      if (!template) return null
      const compliance = computeMetricCompliance(m, template, entries, 'week')
      const today = new Date().toISOString().split('T')[0]
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
    })
    .filter(Boolean) as PublicProfileSnapshot['metrics']

  const compliances = metrics
    .filter((m) => m.active)
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

export const shareStore = {
  generateShareCode,

  enableSharing(): string {
    const profile = localStore.getProfile()
    if (!profile) return ''

    let code = profile.share_code
    if (!code) {
      code = generateShareCode()
      localStore.updateShareSettings(code, true)
    } else {
      localStore.updateShareSettings(code, true)
    }

    this.syncPublicSnapshot(code)
    return code
  },

  disableSharing() {
    const profile = localStore.getProfile()
    if (!profile?.share_code) return
    localStore.updateShareSettings(profile.share_code, false)
    const profiles = getPublicProfiles()
    delete profiles[profile.share_code]
    savePublicProfiles(profiles)
  },

  syncPublicSnapshot(shareCode?: string) {
    const profile = localStore.getProfile()
    if (!profile?.sharing_enabled) return
    const code = shareCode ?? profile.share_code
    if (!code) return

    const metrics = localStore.getMetrics()
    const entries = localStore.getMetricEntries()
    const snapshot = buildSnapshot(code, profile.display_name, metrics, entries)

    const profiles = getPublicProfiles()
    profiles[code] = snapshot
    savePublicProfiles(profiles)
  },

  getSharedProfile(code: string): PublicProfileSnapshot | null {
    const profiles = getPublicProfiles()
    return profiles[code.toUpperCase()] ?? null
  },

  getShareUrl(code: string): string {
    const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '')
    return `${base}/share/${code}`
  },
}
