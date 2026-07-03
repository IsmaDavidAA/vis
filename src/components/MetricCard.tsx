import { Minus, Plus, Check } from 'lucide-react'
import { Card } from './ui/Card'
import { ComplianceRing, ProgressBar } from './ui/ComplianceRing'
import { StarBadge, AngryFace } from './ui/FeedbackIcons'
import type { UserMetric, MetricEntry } from '../types'
import type { MetricTemplate } from '../data/metricTemplates'
import { computeMetricCompliance } from '../lib/metrics'

interface MetricCardProps {
  metric: UserMetric
  template: MetricTemplate
  entries: MetricEntry[]
  period: 'week' | 'month' | 'all'
  onIncrement?: () => void
  onDecrement?: () => void
  onToggle?: () => void
  readonly?: boolean
}

export function MetricCard({
  metric,
  template,
  entries,
  period,
  onIncrement,
  onDecrement,
  onToggle,
  readonly,
}: MetricCardProps) {
  const compliance = computeMetricCompliance(metric, template, entries, period)
  const today = new Date().toISOString().split('T')[0]
  const todayValue = entries
    .filter((e) => e.metric_id === metric.id && e.date === today)
    .reduce((s, e) => s + e.value, 0)
  const target = metric.daily_target
  const isMet = template.type === 'boolean' ? todayValue >= 1 : todayValue >= target

  return (
    <Card className={`${isMet ? 'bg-green-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <ComplianceRing percentage={compliance.percentage} size={64} strokeWidth={5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{template.icon}</span>
            <p className="font-bold text-ink text-sm leading-snug">{template.title}</p>
            {isMet ? <StarBadge size="sm" /> : <AngryFace size="sm" />}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{template.description}</p>

          <div className="mt-2">
            <ProgressBar
              current={todayValue}
              target={target}
              unit={template.unit}
              label="Hoy"
            />
          </div>

          <p className="text-[10px] text-ink-muted mt-1 font-semibold">
            Semana: {compliance.percentage}% · {compliance.daysTracked} días registrados
          </p>
        </div>
      </div>

      {!readonly && (
        <div className="flex gap-2 mt-3">
          {template.type === 'counter' ? (
            <>
              <button
                onClick={onDecrement}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white cartoon-border-sm cursor-pointer hover:bg-paper-dark"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 flex items-center justify-center font-extrabold text-xl text-ink">
                {todayValue}/{target}
              </div>
              <button
                onClick={onIncrement}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-forest text-white cartoon-border-sm cursor-pointer hover:bg-forest-light"
              >
                <Plus size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm
                cartoon-border-sm cursor-pointer transition-all
                ${isMet ? 'bg-green-100 text-green-800' : 'bg-white hover:bg-green-50'}
              `}
            >
              <Check size={16} />
              {isMet ? 'Cumplido hoy' : 'Marcar cumplido'}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
