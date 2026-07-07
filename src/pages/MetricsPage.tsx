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
import { Modal } from '../components/ui/Modal'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { HabitWeekGrid, MonthHeatmap, buildCompletionMap } from '../components/HabitCalendar'
import { METRIC_TEMPLATES, METRIC_CATEGORIES } from '../data/metricTemplates'
import { resolveMetricTemplate } from '../lib/metricResolver'
import { computeMetricCompliance, computeOverallCompliance } from '../lib/metrics'
import { localStore } from '../lib/localStore'
import { shareStore } from '../lib/shareStore'
import { api, getShareUrl } from '../lib/api'
import { notifyMetricsProgress } from '../lib/telegram'
import { getAllCategories } from '../lib/categories'
import { useAuth } from '../context/AuthContext'
import type { UserMetric, MetricEntry, UserMetricCategory, Goal } from '../types'

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
  const [customCategories, setCustomCategories] = useState<UserMetricCategory[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [addTab, setAddTab] = useState<'templates' | 'custom' | 'section'>('custom')
  const [customHabit, setCustomHabit] = useState({
    title: '',
    description: '',
    icon: '✨',
    category: 'habitos',
    goalId: '',
    type: 'boolean' as 'boolean' | 'counter',
    dailyTarget: 1,
    unit: '',
  })
  const [newSection, setNewSection] = useState({ label: '', icon: '✨' })
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'habit'; id: string; name: string }
    | { type: 'section'; id: string; name: string }
    | null
  >(null)
  const today = todayStr()
  const allCategories = getAllCategories(customCategories)
  const goalsInSelectedSection = goals.filter((g) => g.category === customHabit.category)

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setMetrics(localStore.getMetrics())
      setEntries(localStore.getMetricEntries())
      setCustomCategories(localStore.getCustomCategories())
      setGoals(localStore.getGoals())
      return
    }
    if (!user) return
    const [m, e, cats, g] = await Promise.all([
      api.getMetrics(user.id),
      api.getMetricEntries(user.id),
      api.getCustomCategories(user.id),
      api.getGoals(user.id),
    ])
    setMetrics(m)
    setEntries(e)
    setCustomCategories(cats)
    setGoals(g)
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
  const completionMap = buildCompletionMap(metrics, entries)
  const now = new Date()

  const refresh = async () => {
    await loadData()
    await refreshStats()
  }

  const handleAddCustom = async () => {
    if (busy || !customHabit.title.trim()) {
      setAlert({ type: 'error', message: 'Escribe el nombre del hábito' })
      return
    }
    if (!customHabit.goalId) {
      setAlert({
        type: 'error',
        message: 'Selecciona la meta. Créala en Metas si aún no tienes una en esta sección.',
      })
      return
    }
    setBusy(true)
    try {
      if (isDemoMode) {
        const created = localStore.addCustomHabit({
          ...customHabit,
          dailyTarget: customHabit.type === 'boolean' ? 1 : customHabit.dailyTarget,
        })
        if (!created) {
          setAlert({ type: 'error', message: 'No se pudo crear el hábito' })
          return
        }
        await refresh()
        setCustomHabit({
          title: '',
          description: '',
          icon: '✨',
          category: 'habitos',
          goalId: '',
          type: 'boolean',
          dailyTarget: 1,
          unit: '',
        })
        setShowAdd(false)
        setAlert({ type: 'success', message: 'Hábito creado' })
        return
      }
      if (!user) return
      const { error } = await api.addCustomHabit(user.id, {
        ...customHabit,
        dailyTarget: customHabit.type === 'boolean' ? 1 : customHabit.dailyTarget,
      })
      if (error) setAlert({ type: 'error', message: error })
      else {
        await refresh()
        setCustomHabit({
          title: '',
          description: '',
          icon: '✨',
          category: 'habitos',
          goalId: '',
          type: 'boolean',
          dailyTarget: 1,
          unit: '',
        })
        setShowAdd(false)
        setAlert({ type: 'success', message: 'Hábito creado' })
      }
    } finally {
      setBusy(false)
    }
  }

  const handleAddSection = async () => {
    if (!newSection.label.trim()) return
    setBusy(true)
    if (isDemoMode) {
      const cat = localStore.addCustomCategory(newSection.label, newSection.icon)
      if (cat) {
        setCustomCategories(localStore.getCustomCategories())
        setCustomHabit((h) => ({ ...h, category: cat.id }))
        setNewSection({ label: '', icon: '✨' })
        setAlert({ type: 'success', message: 'Sección creada' })
      }
      setBusy(false)
      return
    }
    if (!user) return
    const { category, error } = await api.addCustomCategory(user.id, newSection.label, newSection.icon)
    if (error) setAlert({ type: 'error', message: error })
    else if (category) {
      setCustomCategories((c) => [...c, category])
      setCustomHabit((h) => ({ ...h, category: category.id }))
      setNewSection({ label: '', icon: '✨' })
      setAlert({ type: 'success', message: 'Sección creada' })
    }
    setBusy(false)
  }

  const handleAdd = async (templateId: string) => {
    if (busy) return
    if (!customHabit.goalId) {
      setAlert({
        type: 'error',
        message: 'Elige sección y meta antes de agregar una plantilla.',
      })
      return
    }
    setBusy(true)
    try {
      if (isDemoMode) {
        localStore.addMetric(templateId, customHabit.goalId, customHabit.category)
        await refresh()
        setShowAdd(false)
        setAlert({ type: 'success', message: 'Métrica agregada' })
        return
      }
      if (!user) return
      const { error } = await api.addMetric(
        user.id,
        templateId,
        customHabit.goalId,
        customHabit.category,
      )
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

  const handleRemove = (metricId: string) => {
    const metric = metrics.find((m) => m.id === metricId)
    const template = metric ? resolveMetricTemplate(metric) : null
    setDeleteTarget({
      type: 'habit',
      id: metricId,
      name: template?.title ?? 'este hábito',
    })
  }

  const handleRemoveSection = (categoryId: string, label: string) => {
    setDeleteTarget({ type: 'section', id: categoryId, name: label })
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      if (deleteTarget.type === 'habit') {
        if (isDemoMode) {
          localStore.removeMetric(deleteTarget.id)
        } else if (user) {
          const { error } = await api.removeMetric(user.id, deleteTarget.id)
          if (error) {
            setAlert({ type: 'error', message: error })
            return
          }
        }
        setAlert({ type: 'success', message: 'Hábito eliminado' })
        await refresh()
      } else {
        const habitsInSection = activeMetrics.filter(
          (m) => m.goal_category === deleteTarget.id,
        )
        const goalsInSection = goals.filter((g) => g.category === deleteTarget.id)
        if (habitsInSection.length > 0 || goalsInSection.length > 0) {
          setAlert({
            type: 'error',
            message: `Quita las ${goalsInSection.length} meta(s) y ${habitsInSection.length} hábito(s) de esta sección antes.`,
          })
          return
        }
        if (isDemoMode) {
          localStore.removeCustomCategory(deleteTarget.id)
          setCustomCategories(localStore.getCustomCategories())
        } else if (user) {
          const { error } = await api.removeCustomCategory(user.id, deleteTarget.id)
          if (error) {
            setAlert({ type: 'error', message: error })
            return
          }
          setCustomCategories((cats) => cats.filter((c) => c.id !== deleteTarget.id))
        }
        setAlert({ type: 'success', message: 'Sección eliminada' })
      }
      setDeleteTarget(null)
    } finally {
      setBusy(false)
    }
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

  const groupedMetrics = allCategories
    .map((cat) => ({
      ...cat,
      items: activeMetrics.filter((m) => (m.goal_category ?? 'habitos') === cat.id),
    }))
    .filter((g) => g.items.length > 0)

  const uncategorized = activeMetrics.filter(
    (m) => !allCategories.some((c) => c.id === (m.goal_category ?? 'habitos')),
  )

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
                Crea tu primer hábito o elige de las plantillas.
              </p>
              <Button size="sm" onClick={() => { setShowAdd(true); setAddTab('custom') }}>
                Crear hábito propio
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              {groupedMetrics.map((group) => (
                <div key={group.id}>
                  <p className="text-xs font-bold text-ink-muted uppercase mb-2 flex items-center gap-1">
                    <span>{group.icon}</span> {group.label}
                  </p>
                  <div className="flex flex-col gap-3">
                    {group.items.map((metric) => {
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
                </div>
              ))}
              {uncategorized.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase mb-2">Otros</p>
                  <div className="flex flex-col gap-3">
                    {uncategorized.map((metric) => {
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
                </div>
              )}
            </div>
          )}
        </div>

        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar hábito">
            <div className="flex gap-1">
              {(['custom', 'templates', 'section'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAddTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold cursor-pointer ${
                    addTab === tab ? 'bg-forest text-white' : 'bg-ink/5'
                  }`}
                >
                  {tab === 'custom' ? 'Crear hábito' : tab === 'templates' ? 'Plantillas' : 'Nueva sección'}
                </button>
              ))}
            </div>

            {addTab === 'custom' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Input
                    label="Emoji"
                    value={customHabit.icon}
                    onChange={(e) => setCustomHabit((h) => ({ ...h, icon: e.target.value.slice(0, 4) }))}
                    className="max-w-[4.5rem]"
                  />
                  <Input
                    label="Nombre del hábito"
                    value={customHabit.title}
                    onChange={(e) => setCustomHabit((h) => ({ ...h, title: e.target.value }))}
                    placeholder="Ej: Leer 10 páginas"
                    className="flex-1"
                  />
                </div>
                <Input
                  label="Detalle (opcional)"
                  value={customHabit.description}
                  onChange={(e) => setCustomHabit((h) => ({ ...h, description: e.target.value }))}
                />
                <div>
                  <p className="text-sm font-bold text-ink mb-1">Sección de vida</p>
                  <select
                    value={customHabit.category}
                    onChange={(e) => {
                      const category = e.target.value
                      const firstGoal = goals.find((g) => g.category === category)?.id ?? ''
                      setCustomHabit((h) => ({ ...h, category, goalId: firstGoal }))
                    }}
                    className="w-full px-3 py-2 rounded-xl cartoon-border-sm bg-white text-sm"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink mb-1">Meta vinculada</p>
                  {goalsInSelectedSection.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-xl">
                      No hay metas en esta sección.{' '}
                      <Link to="/goals" className="font-bold underline">
                        Créala en Metas
                      </Link>
                    </p>
                  ) : (
                    <select
                      value={customHabit.goalId}
                      onChange={(e) => setCustomHabit((h) => ({ ...h, goalId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl cartoon-border-sm bg-white text-sm"
                    >
                      <option value="">Selecciona una meta</option>
                      {goalsInSelectedSection.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={customHabit.type}
                    onChange={(e) =>
                      setCustomHabit((h) => ({
                        ...h,
                        type: e.target.value as 'boolean' | 'counter',
                      }))
                    }
                    className="flex-1 px-3 py-2 rounded-xl cartoon-border-sm text-sm bg-white"
                  >
                    <option value="boolean">Sí / No diario</option>
                    <option value="counter">Contador</option>
                  </select>
                  {customHabit.type === 'counter' && (
                    <>
                      <Input
                        type="number"
                        min={1}
                        value={customHabit.dailyTarget}
                        onChange={(e) =>
                          setCustomHabit((h) => ({ ...h, dailyTarget: Number(e.target.value) || 1 }))
                        }
                        className="max-w-[4rem]"
                      />
                      <Input
                        placeholder="unidad"
                        value={customHabit.unit}
                        onChange={(e) => setCustomHabit((h) => ({ ...h, unit: e.target.value }))}
                        className="max-w-[5rem]"
                      />
                    </>
                  )}
                </div>
                <Button fullWidth onClick={handleAddCustom} disabled={busy}>
                  Guardar hábito
                </Button>
              </div>
            )}

            {addTab === 'section' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-ink-muted">
                  Crea una sección personalizada: trabajo, espiritualidad, creatividad...
                </p>
                <div className="flex gap-2">
                  <Input
                    label="Emoji"
                    value={newSection.icon}
                    onChange={(e) => setNewSection((s) => ({ ...s, icon: e.target.value.slice(0, 4) }))}
                    className="max-w-[4.5rem]"
                  />
                  <Input
                    label="Nombre de la sección"
                    value={newSection.label}
                    onChange={(e) => setNewSection((s) => ({ ...s, label: e.target.value }))}
                    placeholder="Ej: Trabajo"
                    className="flex-1"
                  />
                </div>
                <Button fullWidth variant="secondary" onClick={handleAddSection} disabled={busy}>
                  Crear sección
                </Button>
                {customCategories.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-ink-muted uppercase">Tus secciones</p>
                    {customCategories.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-forest/5"
                      >
                        <span className="text-sm font-bold text-ink">
                          {c.icon} {c.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(c.id, c.label)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {addTab === 'templates' && (
              <>
            <div className="flex flex-col gap-2 mb-2">
              <p className="text-xs font-bold text-ink-muted uppercase">Sección y meta</p>
              <select
                value={customHabit.category}
                onChange={(e) => {
                  const category = e.target.value
                  const firstGoal = goals.find((g) => g.category === category)?.id ?? ''
                  setCustomHabit((h) => ({ ...h, category, goalId: firstGoal }))
                  setFilterCat(category === 'habitos' ? 'all' : category)
                }}
                className="w-full px-3 py-2 rounded-xl cartoon-border-sm bg-white text-sm"
              >
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
              {goalsInSelectedSection.length === 0 ? (
                <p className="text-xs text-amber-700">
                  Crea una meta en{' '}
                  <Link to="/goals" className="font-bold underline">
                    Metas
                  </Link>{' '}
                  para esta sección.
                </p>
              ) : (
                <select
                  value={customHabit.goalId}
                  onChange={(e) => setCustomHabit((h) => ({ ...h, goalId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl cartoon-border-sm bg-white text-sm"
                >
                  <option value="">Selecciona meta</option>
                  {goalsInSelectedSection.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
              </>
            )}
        </Modal>

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
            <Link to={`/competitors?code=${viewCode}`}>
              <Button size="md" variant="secondary" disabled={viewCode.length < 4}>
                + Reto
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <ConfirmDeleteModal
        open={deleteTarget?.type === 'habit'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        busy={busy}
        title="Eliminar hábito"
        message={`Vas a eliminar "${deleteTarget?.type === 'habit' ? deleteTarget.name : ''}" y todo su historial de check-ins. Esta acción no se puede deshacer.`}
        confirmPhrase="eliminar habito"
      />

      <ConfirmDeleteModal
        open={deleteTarget?.type === 'section'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        busy={busy}
        title="Eliminar sección"
        message={`Vas a eliminar la sección "${deleteTarget?.type === 'section' ? deleteTarget.name : ''}". Solo puedes hacerlo si no tiene hábitos activos.`}
        confirmPhrase="eliminar seccion"
      />
    </AppLayout>
  )
}
