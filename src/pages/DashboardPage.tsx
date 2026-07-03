import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { GoalCard } from '../components/GoalCard'
import { Card, StatCard } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { StarBadge, AngryFace } from '../components/ui/FeedbackIcons'
import { MESSAGES } from '../data/messages'
import { useAuth } from '../context/AuthContext'
import { localStore } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import { DailyTip } from '../components/DailyTip'
import { ComplianceRing } from '../components/ui/ComplianceRing'
import { computeMetricCompliance, computeOverallCompliance } from '../lib/metrics'
import { METRIC_TEMPLATES } from '../data/metricTemplates'
import type { Goal, Checkin, UserMetric, MetricEntry } from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function DashboardPage() {
  const { profile, stats, refreshStats, isDemoMode } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [metricEntries, setMetricEntries] = useState<MetricEntry[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const today = todayStr()

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setGoals(localStore.getGoals())
      setCheckins(localStore.getCheckins())
      setMetrics(localStore.getMetrics())
      setMetricEntries(localStore.getMetricEntries())
      return
    }
    if (!supabase) return
    const { data: g } = await supabase.from('goals').select('*')
    const { data: c } = await supabase.from('checkins').select('*').eq('date', today)
    if (g) setGoals(g as Goal[])
    if (c) setCheckins(c as Checkin[])
  }, [isDemoMode, today])

  useEffect(() => { loadData() }, [loadData])

  const isCompleted = (goalId: string) =>
    checkins.some((c) => c.goal_id === goalId && c.date === today && c.completed)

  const handleToggle = async (goalId: string) => {
    if (isDemoMode) {
      const result = localStore.toggleCheckin(goalId, today)
      setCheckins(localStore.getCheckins())
      await refreshStats()
      setAlert({
        type: result.completed ? 'success' : 'error',
        message: result.completed ? MESSAGES.starEarned : 'Check-in deshecho',
      })
      return
    }
    // Supabase toggle would go here
  }

  const handleFail = async () => {
    if (isDemoMode) {
      localStore.markFail()
      await refreshStats()
      setAlert({ type: 'error', message: MESSAGES.lifeLost })
    }
  }

  const activeMetrics = metrics.filter((m) => m.active)
  const overallCompliance = computeOverallCompliance(
    activeMetrics.map((m) => {
      const template = METRIC_TEMPLATES.find((t) => t.id === m.template_id)!
      return computeMetricCompliance(m, template, metricEntries, 'week')
    }),
  )

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
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            icon={alert.type === 'success' ? <StarBadge size="sm" animate /> : <AngryFace size="sm" animate />}
          />
        )}

        {stats.lives === 0 && (
          <Alert type="warning" message={MESSAGES.noLives} />
        )}

        <DailyTip />

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

        <div className="animate-slide-up">
          <p className="font-serif text-lg font-bold text-ink leading-relaxed">
            {MESSAGES.doJuly}
          </p>
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
          <h2 className="font-bold text-ink mb-3">Metas de hoy</h2>
          {goals.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-muted">No tienes metas aún.</p>
              <Link to="/goals" className="text-sm font-bold text-forest mt-2 inline-block">
                Agregar metas →
              </Link>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  completed={isCompleted(goal.id)}
                  onToggle={() => handleToggle(goal.id)}
                  onFail={handleFail}
                />
              ))}
            </div>
          )}
        </div>

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
