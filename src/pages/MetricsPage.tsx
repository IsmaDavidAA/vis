import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2, Copy, Check, Plus, Users } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { MetricCard } from '../components/MetricCard'
import { Card, StatCard } from '../components/ui/Card'
import { ComplianceRing } from '../components/ui/ComplianceRing'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { HabitWeekGrid, MonthHeatmap, buildCompletionMap } from '../components/HabitCalendar'
import { METRIC_TEMPLATES, METRIC_CATEGORIES } from '../data/metricTemplates'
import { resolveMetricTemplate } from '../lib/metricResolver'
import { computeMetricCompliance, computeOverallCompliance } from '../lib/metrics'
import { localStore } from '../lib/localStore'
import { shareStore } from '../lib/shareStore'
import { api, getShareUrl } from '../lib/api'
import { notifyMetricsProgress } from '../lib/telegram'
import { useAuth } from '../context/AuthContext'
import type { UserMetric, MetricEntry } from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function MetricsPage() {
  const { user, profile, stats, refreshStats, refreshProfile, isDemoMode } = useAuth()
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [entries, setEntries] = useState<MetricEntry[]>([])
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [shareCode, setShareCode] = useState(profile?.share_code ?? '')
  const [sharing, setSharing] = useState(profile?.sharing_enabled ?? false)
  const [copied, setCopied] = useState(false)
  const [viewCode, setViewCode] = useState('')
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const today = todayStr()

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setMetrics(localStore.getMetrics())
      setEntries(localStore.getMetricEntries())
      return
    }
    if (!user) return
    const [m, e] = await Promise.all([
      api.getMetrics(user.id),
      api.getMetricEntries(user.id),
    ])
    setMetrics(m)
    setEntries(e)
  }, [isDemoMode, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setShareCode(profile?.share_code ?? '')
    setSharing(profile?.sharing_enabled ?? false)
  }, [profile])

  const activeMetrics = metrics.filter((m) => m.active)
  const compliances = activeMetrics
    .map((m) => {
      const template = resolveMetricTemplate(m)
      if (!template) return null
      return computeMetricCompliance(m, template, entries, period)
    })
    .filter(Boolean) as ReturnType<typeof computeMetricCompliance>[]
  const overall = computeOverallCompliance(compliances)
  const completionMap = buildCompletionMap([], metrics, entries)
  const now = new Date()

  const refresh = async () => {
    await loadData()
    await refreshStats()
  }

  const handleAdd = async (templateId: string) => {
    if (busy) return
    setBusy(true)
    try {
      if (isDemoMode) {
        localStore.addMetric(templateId)
        await refresh()
        setShowAdd(false)
        setAlert({ type: 'success', message: 'Métrica agregada' })
        return
      }
      if (!user) return
      const { error } = await api.addMetric(user.id, templateId)
      if (error) {
        setAlert({ type: 'error', message: error })
        return
      }
      await refresh()
      setShowAdd(false)
      setAlert({ type: 'success', message: 'Métrica agregada' })
    } finally {
      setBusy(false)
    }
  }

  const afterMetricChange = async () => {
    await refresh()
    if (isDemoMode || !user) return
    const [m, e] = await Promise.all([
      api.getMetrics(user.id),
      api.getMetricEntries(user.id),
    ])
    setMetrics(m)
    setEntries(e)
    await notifyMetricsProgress(m, e)
  }

  const handleIncrement = async (metricId: string) => {
    if (isDemoMode) {
      localStore.incrementMetric(metricId, today)
      await refresh()
      return
    }
    if (!user) return
    const { error } = await api.incrementMetric(user.id, metricId, today)
    if (error) setAlert({ type: 'error', message: error })
    else await afterMetricChange()
  }

  const handleDecrement = async (metricId: string) => {
    if (isDemoMode) {
      localStore.decrementMetric(metricId, today)
      await refresh()
      return
    }
    if (!user) return
    const { error } = await api.decrementMetric(user.id, metricId, today)
    if (error) setAlert({ type: 'error', message: error })
    else await afterMetricChange()
  }

  const handleToggle = async (metricId: string) => {
    if (isDemoMode) {
      localStore.toggleBooleanMetric(metricId, today)
      await refresh()
      return
    }
    if (!user) return
    const { error } = await api.toggleBooleanMetric(user.id, metricId, today)
    if (error) setAlert({ type: 'error', message: error })
    else await afterMetricChange()
  }

  const handleRemove = async (metricId: string) => {
    if (isDemoMode) {
      localStore.removeMetric(metricId)
      await refresh()
      return
    }
    if (!user) return
    const { error } = await api.removeMetric(user.id, metricId)
    if (error) setAlert({ type: 'error', message: error })
    else await refresh()
  }

  const handleEnableShare = async () => {
    setBusy(true)
    try {
      if (isDemoMode) {
        const code = shareStore.enableSharing()
        if (!code) {
          setAlert({ type: 'error', message: 'Completa el onboarding primero' })
          return
        }
        setShareCode(code)
        setSharing(true)
        setAlert({ type: 'success', message: 'Código generado' })
        return
      }
      if (!user || !profile) {
        setAlert({ type: 'error', message: 'Sesión no encontrada' })
        return
      }
      const { code, error } = await api.enableSharing(
        user.id,
        profile,
        metrics,
        entries,
        stats,
      )
      if (error || !code) {
        setAlert({ type: 'error', message: error ?? 'No se pudo generar el código' })
        return
      }
      setShareCode(code)
      setSharing(true)
      await refreshProfile()
      setAlert({ type: 'success', message: 'Código generado. Compártelo.' })
    } finally {
      setBusy(false)
    }
  }

  const handleDisableShare = async () => {
    if (isDemoMode) {
      shareStore.disableSharing()
      setSharing(false)
      return
    }
    if (!user) return
    await api.disableSharing(user.id, shareCode)
    setSharing(false)
    await refreshProfile()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl(shareCode))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredTemplates = METRIC_TEMPLATES.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || t.category === filterCat
    const notAdded = !metrics.some((m) => m.template_id === t.id && m.active)
    return matchSearch && matchCat && notAdded
  })

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Métricas</h1>
          <p className="text-sm text-ink-muted">Tu cumplimiento real, número por número.</p>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        <Card className="flex items-center gap-4">
          <ComplianceRing percentage={overall} size={90} label="Cumplimiento" />
          <div className="flex-1">
            <p className="font-extrabold text-ink text-lg">{overall}% general</p>
            <p className="text-xs text-ink-muted">{activeMetrics.length} métricas activas</p>
            <div className="flex gap-1 mt-2">
              {(['week', 'month', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all
                    ${period === p ? 'bg-forest text-white' : 'bg-ink/5 text-ink-muted'}`}
                >
                  {p === 'week' ? '7 días' : p === 'month' ? '30 días' : 'Todo'}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <StatCard icon="⭐" label="Estrellas" value={stats.stars_earned} color="#fbbf24" />
          <StatCard icon="🔥" label="Racha" value={`${stats.streak}d`} color="#f59e0b" />
          <StatCard icon="🏆" label="Puntos" value={stats.total_points} color="#40916c" />
        </div>

        <HabitWeekGrid metrics={metrics} entries={entries} />

        <MonthHeatmap
          year={now.getFullYear()}
          month={now.getMonth()}
          completedByDate={completionMap}
          maxPerDay={Math.max(1, activeMetrics.length)}
        />

        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-ink">Mis métricas</h2>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus size={16} /> Agregar
            </Button>
          </div>

          {activeMetrics.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-sm text-ink-muted mb-3">
                Agrega métricas como cepillarte, dormir temprano, agua...
              </p>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                Explorar {METRIC_TEMPLATES.length} métricas
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {activeMetrics.map((metric) => {
                const template = resolveMetricTemplate(metric)
                if (!template) return null
                return (
                  <div key={metric.id} className="relative">
                    <MetricCard
                      metric={metric}
                      template={template}
                      entries={entries}
                      period={period}
                      onIncrement={() => handleIncrement(metric.id)}
                      onDecrement={() => handleDecrement(metric.id)}
                      onToggle={() => handleToggle(metric.id)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(metric.id)}
                      className="absolute top-2 right-2 text-[10px] text-red-400 font-bold cursor-pointer hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {showAdd && (
          <Card className="flex flex-col gap-3 animate-slide-up">
            <Input
              placeholder="Buscar métrica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterCat('all')}
                className={`px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer
                  ${filterCat === 'all' ? 'bg-forest text-white' : 'bg-ink/5'}`}
              >
                Todas
              </button>
              {METRIC_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setFilterCat(c.id)}
                  className={`px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer
                    ${filterCat === c.id ? 'bg-forest text-white' : 'bg-ink/5'}`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-4">No hay más métricas en esta categoría</p>
              ) : (
                filteredTemplates.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => handleAdd(t.id)}
                    disabled={busy}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-paper-dark cursor-pointer text-left transition-all disabled:opacity-50"
                  >
                    <span>{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{t.title}</p>
                      <p className="text-[10px] text-ink-muted">
                        {t.type === 'counter'
                          ? `${t.dailyTarget} ${t.unit}/día`
                          : 'Sí/No diario'}
                      </p>
                    </div>
                    <Plus size={16} className="text-forest shrink-0" />
                  </button>
                ))
              )}
            </div>
          </Card>
        )}

        <Card className="bg-forest/5">
          <div className="flex items-center gap-2 mb-3">
            <Share2 size={18} className="text-forest" />
            <h2 className="font-bold text-ink">Compartir progreso</h2>
          </div>
          <p className="text-xs text-ink-muted mb-3">
            Genera un código para que alguien vea tus métricas y cumplimiento. Sin datos privados.
          </p>

          {sharing && shareCode ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-4 py-3 rounded-xl cartoon-border-sm font-extrabold text-xl text-forest tracking-widest text-center">
                  {shareCode}
                </code>
                <Button size="sm" variant="secondary" onClick={handleCopy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
              <Alert type="success" message="Tu progreso es visible para quien tenga este código." />
              <Button size="sm" variant="ghost" onClick={handleDisableShare}>
                Dejar de compartir
              </Button>
            </div>
          ) : (
            <Button onClick={handleEnableShare} fullWidth disabled={busy}>
              <Share2 size={16} /> {busy ? 'Generando...' : 'Generar código para compartir'}
            </Button>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-forest" />
            <h2 className="font-bold text-ink">Ver progreso de alguien</h2>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Código (ej: ABC123)"
                value={viewCode}
                onChange={(e) => setViewCode(e.target.value.toUpperCase())}
              />
            </div>
            <Link to={`/share/${viewCode}`}>
              <Button size="md" disabled={viewCode.length < 4}>
                Ver
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
