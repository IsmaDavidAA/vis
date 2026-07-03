import { useState, useEffect, useCallback } from 'react'
import { Share2, Copy, Check, Plus, Users } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { MetricCard } from '../components/MetricCard'
import { Card, StatCard } from '../components/ui/Card'
import { ComplianceRing } from '../components/ui/ComplianceRing'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { METRIC_TEMPLATES, METRIC_CATEGORIES } from '../data/metricTemplates'
import { computeMetricCompliance, computeOverallCompliance } from '../lib/metrics'
import { localStore } from '../lib/localStore'
import { shareStore } from '../lib/shareStore'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { UserMetric, MetricEntry } from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function MetricsPage() {
  const { profile, stats, refreshStats, isDemoMode } = useAuth()
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
  const today = todayStr()

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setMetrics(localStore.getMetrics())
      setEntries(localStore.getMetricEntries())
      return
    }
    if (!supabase) return
    const { data: m } = await supabase.from('user_metrics').select('*').eq('active', true)
    const { data: e } = await supabase.from('metric_entries').select('*')
    if (m) setMetrics(m as UserMetric[])
    if (e) setEntries(e as MetricEntry[])
  }, [isDemoMode])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    setShareCode(profile?.share_code ?? '')
    setSharing(profile?.sharing_enabled ?? false)
  }, [profile])

  const activeMetrics = metrics.filter((m) => m.active)
  const compliances = activeMetrics.map((m) => {
    const template = METRIC_TEMPLATES.find((t) => t.id === m.template_id)!
    return computeMetricCompliance(m, template, entries, period)
  })
  const overall = computeOverallCompliance(compliances)

  const refresh = async () => {
    await loadData()
    await refreshStats()
    if (sharing && shareCode) shareStore.syncPublicSnapshot(shareCode)
  }

  const handleAdd = async (templateId: string) => {
    if (isDemoMode) {
      localStore.addMetric(templateId)
      await refresh()
      return
    }
    // Supabase insert would go here
  }

  const handleIncrement = async (metricId: string) => {
    if (isDemoMode) {
      localStore.incrementMetric(metricId, today)
      await refresh()
    }
  }

  const handleDecrement = async (metricId: string) => {
    if (isDemoMode) {
      localStore.decrementMetric(metricId, today)
      await refresh()
    }
  }

  const handleToggle = async (metricId: string) => {
    if (isDemoMode) {
      localStore.toggleBooleanMetric(metricId, today)
      await refresh()
    }
  }

  const handleRemove = async (metricId: string) => {
    if (isDemoMode) {
      localStore.removeMetric(metricId)
      await refresh()
    }
  }

  const handleEnableShare = () => {
    const code = shareStore.enableSharing()
    setShareCode(code)
    setSharing(true)
  }

  const handleDisableShare = () => {
    shareStore.disableSharing()
    setSharing(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareStore.getShareUrl(shareCode))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredTemplates = METRIC_TEMPLATES.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || t.category === filterCat
    const notAdded = !metrics.some((m) => m.template_id === t.id)
    return matchSearch && matchCat && notAdded
  })

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Métricas</h1>
          <p className="text-sm text-ink-muted">Tu cumplimiento real, número por número.</p>
        </div>

        {/* Overall compliance */}
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

        {/* Active metrics */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-ink">Mis métricas</h2>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus size={16} /> Agregar
            </Button>
          </div>

          {activeMetrics.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-sm text-ink-muted mb-3">Agrega métricas como cepillarte, dormir temprano, agua...</p>
              <Button size="sm" onClick={() => setShowAdd(true)}>Explorar {METRIC_TEMPLATES.length} métricas</Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {activeMetrics.map((metric) => {
                const template = METRIC_TEMPLATES.find((t) => t.id === metric.template_id)!
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

        {/* Add metrics panel */}
        {showAdd && (
          <Card className="flex flex-col gap-3 animate-slide-up">
            <Input
              placeholder="Buscar métrica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterCat('all')}
                className={`px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer
                  ${filterCat === 'all' ? 'bg-forest text-white' : 'bg-ink/5'}`}
              >
                Todas
              </button>
              {METRIC_CATEGORIES.map((c) => (
                <button
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
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAdd(t.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-paper-dark cursor-pointer text-left transition-all"
                >
                  <span>{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{t.title}</p>
                    <p className="text-[10px] text-ink-muted">
                      {t.type === 'counter' ? `${t.dailyTarget} ${t.unit}/día` : 'Sí/No diario'}
                    </p>
                  </div>
                  <Plus size={16} className="text-forest shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Share section */}
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
            <Button onClick={handleEnableShare} fullWidth>
              <Share2 size={16} /> Generar código para compartir
            </Button>
          )}
        </Card>

        {/* View someone else's progress */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-forest" />
            <h2 className="font-bold text-ink">Ver progreso de alguien</h2>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Código (ej: ABC123)"
              value={viewCode}
              onChange={(e) => setViewCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <a href={`/share/${viewCode}`}>
              <Button size="md" disabled={viewCode.length < 4}>Ver</Button>
            </a>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
