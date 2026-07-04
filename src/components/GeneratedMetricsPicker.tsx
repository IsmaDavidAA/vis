import { useEffect, useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Alert } from './ui/Alert'
import {
  generateMetricsFromGoal,
  generateSingleMetric,
  DIFFICULTY_LABELS,
  emptyMetricSlot,
  isMetricFilled,
  resizeMetricsToCount,
} from '../lib/metricsAi'
import type {
  GoalCategory,
  MetricDifficulty,
  CategoryMetricPlan,
  GeneratedMetricSuggestion,
} from '../types'

interface GeneratedMetricsPickerProps {
  category: GoalCategory
  goal: string
  context?: string
  plan?: CategoryMetricPlan
  onPlanChange: (plan: CategoryMetricPlan | undefined) => void
}

export function GeneratedMetricsPicker({
  category,
  goal,
  context,
  plan,
  onPlanChange,
}: GeneratedMetricsPickerProps) {
  const [difficulty, setDifficulty] = useState<MetricDifficulty>(plan?.difficulty ?? 'medium')
  const [loading, setLoading] = useState<number | 'all' | null>(null)
  const [error, setError] = useState('')
  const [source, setSource] = useState<'deepseek' | 'fallback' | null>(null)

  const requiredCount = DIFFICULTY_LABELS[difficulty].count
  const metrics = resizeMetricsToCount(plan?.metrics ?? [], requiredCount)
  const filledCount = metrics.filter(isMetricFilled).length
  const allFilled = filledCount === requiredCount

  useEffect(() => {
    if (plan?.difficulty) setDifficulty(plan.difficulty)
  }, [plan?.difficulty])

  const commitMetrics = (
    nextMetrics: GeneratedMetricSuggestion[],
    accepted = plan?.accepted ?? false,
  ) => {
    onPlanChange({
      difficulty,
      metrics: resizeMetricsToCount(nextMetrics, requiredCount),
      accepted: nextMetrics.filter(isMetricFilled).length === requiredCount && accepted,
    })
  }

  const handleDifficultyChange = (d: MetricDifficulty) => {
    setDifficulty(d)
    const count = DIFFICULTY_LABELS[d].count
    onPlanChange({
      difficulty: d,
      metrics: resizeMetricsToCount(plan?.metrics ?? [], count),
      accepted: false,
    })
  }

  const handleFieldChange = (
    index: number,
    patch: Partial<GeneratedMetricSuggestion>,
  ) => {
    const next = [...metrics]
    next[index] = { ...next[index], ...patch }
    commitMetrics(next, false)
  }

  const handleGenerateAll = async () => {
    if (!goal.trim()) {
      setError('Escribe tu meta arriba para generar hábitos')
      return
    }
    setError('')
    setLoading('all')
    const result = await generateMetricsFromGoal(goal, category, difficulty, context)
    setLoading(null)
    setSource(result.source)
    if (result.metrics.length === 0) {
      setError(result.error ?? 'No se pudieron generar métricas')
      return
    }
    onPlanChange({
      difficulty,
      metrics: resizeMetricsToCount(result.metrics, requiredCount),
      accepted: true,
    })
  }

  const handleRegenerateOne = async (index: number) => {
    if (!goal.trim()) {
      setError('Escribe tu meta arriba para generar sugerencias')
      return
    }
    setError('')
    setLoading(index)
    const excludeTitles = metrics
      .filter((_, i) => i !== index)
      .map((m) => m.title)
      .filter(Boolean)
    const result = await generateSingleMetric(goal, category, difficulty, excludeTitles, context)
    setLoading(null)
    setSource(result.source)
    const next = [...metrics]
    if (result.metrics[0]) {
      next[index] = result.metrics[0]
      commitMetrics(next, plan?.accepted ?? false)
    } else {
      setError(result.error ?? 'No se pudo generar este hábito')
    }
  }

  const handleClear = (index: number) => {
    const next = [...metrics]
    next[index] = emptyMetricSlot()
    commitMetrics(next, false)
  }

  return (
    <Card className="bg-paper-dark/50 border-dashed">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-forest" />
          <p className="font-bold text-sm text-ink">Hábitos para tu meta</p>
        </div>
        <span className="text-[10px] font-bold text-ink-muted">
          {filledCount}/{requiredCount} hábitos
        </span>
      </div>
      <p className="text-xs text-ink-muted mb-3">
        Escribe tus hábitos o genera sugerencias con IA. Debes completar{' '}
        {requiredCount} según la dificultad.
      </p>

      <div className="flex gap-2 mb-3">
        {(Object.keys(DIFFICULTY_LABELS) as MetricDifficulty[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDifficultyChange(d)}
            className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold cartoon-border-sm cursor-pointer transition-all ${
              difficulty === d ? 'bg-forest text-white' : 'bg-white hover:bg-paper'
            }`}
          >
            {DIFFICULTY_LABELS[d].label}
            <span className="block font-normal opacity-80 text-[10px]">
              {DIFFICULTY_LABELS[d].hint}
            </span>
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={handleGenerateAll}
        disabled={loading !== null || !goal.trim()}
        className="mb-3"
      >
        {loading === 'all' ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Generando...
          </>
        ) : (
          <>
            <Sparkles size={16} /> {filledCount > 0 ? 'Regenerar todas' : 'Generar métricas'}
          </>
        )}
      </Button>

      {error && (
        <div className="mb-3">
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      )}

      {source === 'fallback' && filledCount > 0 && (
        <p className="text-[10px] text-ink-muted mb-2 italic">
          Sugerencias locales (conecta DeepSeek para personalización con IA)
        </p>
      )}
      {source === 'deepseek' && filledCount > 0 && (
        <p className="text-[10px] text-forest mb-2 font-semibold">✨ Generado con DeepSeek</p>
      )}

      <div className="flex flex-col gap-3">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 p-3 rounded-xl bg-white cartoon-border-sm ${
              !isMetricFilled(m) ? 'border-dashed' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-ink-muted shrink-0 w-4">
                {i + 1}.
              </span>
              <input
                type="text"
                value={m.icon}
                onChange={(e) => handleFieldChange(i, { icon: e.target.value.slice(0, 4) })}
                className="w-10 px-1 py-2 rounded-lg cartoon-border-sm text-center text-base bg-paper shrink-0"
                placeholder="✨"
                aria-label={`Emoji hábito ${i + 1}`}
              />
              <input
                type="text"
                value={m.title}
                onChange={(e) => handleFieldChange(i, { title: e.target.value })}
                placeholder={`Hábito ${i + 1} — ej: Caminar 30 min`}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl cartoon-border-sm text-sm bg-white text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-forest-light/50"
              />
              <button
                type="button"
                title="Generar sugerencia"
                onClick={() => handleRegenerateOne(i)}
                disabled={loading !== null || !goal.trim()}
                className="p-2 rounded-xl bg-white cartoon-border-sm cursor-pointer hover:bg-paper-dark disabled:opacity-40 shrink-0"
              >
                {loading === i ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
              </button>
              <button
                type="button"
                title="Limpiar"
                onClick={() => handleClear(i)}
                className="p-2 rounded-xl hover:bg-red-50 text-red-500 cursor-pointer shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <input
              type="text"
              value={m.description}
              onChange={(e) => handleFieldChange(i, { description: e.target.value })}
              placeholder="Detalle opcional — ej: Antes de las 23:00, mañana y noche..."
              className="w-full px-3 py-2 rounded-xl cartoon-border-sm text-xs bg-paper text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-forest-light/50"
            />

            <div className="flex gap-2 items-center">
              <select
                value={m.type}
                onChange={(e) =>
                  handleFieldChange(i, {
                    type: e.target.value as 'boolean' | 'counter',
                    dailyTarget: e.target.value === 'boolean' ? 1 : m.dailyTarget,
                  })
                }
                className="flex-1 px-2 py-1.5 rounded-lg cartoon-border-sm text-xs bg-white"
              >
                <option value="boolean">Sí / No diario</option>
                <option value="counter">Contador diario</option>
              </select>
              {m.type === 'counter' && (
                <>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={m.dailyTarget}
                    onChange={(e) =>
                      handleFieldChange(i, { dailyTarget: Number(e.target.value) || 1 })
                    }
                    className="w-14 px-2 py-1.5 rounded-lg cartoon-border-sm text-xs text-center bg-white"
                    aria-label="Meta diaria"
                  />
                  <input
                    type="text"
                    value={m.unit ?? ''}
                    onChange={(e) =>
                      handleFieldChange(i, { unit: e.target.value || undefined })
                    }
                    placeholder="unidad"
                    className="w-20 px-2 py-1.5 rounded-lg cartoon-border-sm text-xs bg-white placeholder:text-ink-muted/60"
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer mt-4">
        <input
          type="checkbox"
          checked={plan?.accepted ?? false}
          disabled={!allFilled}
          onChange={(e) =>
            onPlanChange({
              difficulty,
              metrics: resizeMetricsToCount(metrics, requiredCount),
              accepted: e.target.checked,
            })
          }
          className="rounded"
        />
        Usar estas métricas en mi plan
        {!allFilled && (
          <span className="text-ink-muted italic">
            (escribe {requiredCount - filledCount} hábito{requiredCount - filledCount !== 1 ? 's' : ''} más)
          </span>
        )}
      </label>
    </Card>
  )
}
