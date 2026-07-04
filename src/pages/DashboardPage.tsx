import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { DailyTip } from '../components/DailyTip'
import { ComplianceRing } from '../components/ui/ComplianceRing'
import {
  WeekStrip,
  MonthHeatmap,
  HabitWeekGrid,
  buildCompletionMap,
} from '../components/HabitCalendar'
import { MESSAGES } from '../data/messages'
import { resolveMetricTemplate } from '../lib/metricResolver'
import { computeMetricCompliance, computeOverallCompliance } from '../lib/metrics'
import { useAuth } from '../context/AuthContext'
import { localStore } from '../lib/localStore'
import { api } from '../lib/api'
import type { Goal, Checkin, UserMetric, MetricEntry } from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function DashboardPage() {
  const { user, profile, stats, isDemoMode } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [allCheckins, setAllCheckins] = useState<Checkin[]>([])
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [metricEntries, setMetricEntries] = useState<MetricEntry[]>([])
  const [selectedDate, setSelectedDate] = useState(todayStr())

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setGoals(localStore.getGoals())
      setAllCheckins(localStore.getCheckins())
      setMetrics(localStore.getMetrics())
      setMetricEntries(localStore.getMetricEntries())
      return
    }
    if (!user) return
    const [g, c, m, e] = await Promise.all([
      api.getGoals(user.id),
      api.getCheckins(user.id),
      api.getMetrics(user.id),
      api.getMetricEntries(user.id),
    ])
    setGoals(g)
    setAllCheckins(c)
    setMetrics(m)
    setMetricEntries(e)
  }, [isDemoMode, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeMetrics = metrics.filter((m) => m.active)
  const overallCompliance = computeOverallCompliance(
    activeMetrics
      .map((m) => {
        const template = resolveMetricTemplate(m)
        if (!template) return null
        return computeMetricCompliance(m, template, metricEntries, 'week')
      })
      .filter(Boolean) as ReturnType<typeof computeMetricCompliance>[],
  )

  const completionMap = buildCompletionMap(allCheckins, metrics, metricEntries)
  const now = new Date()
  const maxPerDay = Math.max(1, goals.length + activeMetrics.length)

  if (!profile?.onboarding_complete) {
    return (
      <div className="min-h-dvh paper-texture flex items-center justify-center px-6">
        <Card className="text-center max-w-sm w-full">
          <p className="font-serif text-xl font-bold mb-4">Aún no tienes tu plan</p>
          <p className="text-sm text-ink-muted mb-6">10 minutos para ordenar tu segunda mitad.</p>
          <Link to="/onboarding">
            <button className="w-full py-3 bg-forest text-white font-bold rounded-xl cartoon-border cursor-pointer">
              Empezar onboarding
            </button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {stats.lives === 0 && <Alert type="warning" message={MESSAGES.noLives} />}

        <DailyTip />

        <div className="animate-slide-up">
          <p className="font-serif text-lg font-bold text-ink leading-relaxed">{MESSAGES.doJuly}</p>
          {profile.december_feeling && (
            <p className="text-sm text-ink-muted mt-2 italic">
              Recuerda: quieres sentirte "{profile.december_feeling}"
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="⭐" label="Estrellas" value={stats.stars_earned} color="#fbbf24" />
          <StatCard icon="😤" label="Fails" value={stats.fails} color="#ef4444" />
        </div>

        <div>
          <h2 className="font-bold text-ink mb-3">Calendario</h2>
          <WeekStrip
            selected={selectedDate}
            onSelect={setSelectedDate}
            completedByDate={completionMap}
          />
        </div>

        {activeMetrics.length > 0 && (
          <Card className="flex items-center gap-4">
            <ComplianceRing percentage={overallCompliance} size={70} />
            <div>
              <p className="font-bold text-ink">{overallCompliance}% cumplimiento</p>
              <Link to="/metrics" className="text-xs font-bold text-forest hover:underline">
                Ver {activeMetrics.length} métricas →
              </Link>
            </div>
          </Card>
        )}

        <HabitWeekGrid
          metrics={metrics}
          entries={metricEntries}
          goals={goals}
          checkins={allCheckins}
        />

        <MonthHeatmap
          year={now.getFullYear()}
          month={now.getMonth()}
          completedByDate={completionMap}
          maxPerDay={maxPerDay}
        />

        {profile.accountability_partner && (
          <Card className="bg-forest/5">
            <p className="text-xs font-bold text-forest uppercase">Accountability</p>
            <p className="font-bold text-ink">{profile.accountability_partner}</p>
            <p className="text-xs text-ink-muted mt-1">te está esperando un update 👀</p>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
