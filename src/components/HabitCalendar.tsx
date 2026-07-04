import type { UserMetric, MetricEntry } from '../types'
import { resolveMetricTemplate } from '../lib/metricResolver'
import { Card } from './ui/Card'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // Monday = 0
  date.setDate(date.getDate() - day)
  date.setHours(12, 0, 0, 0)
  return date
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

interface WeekStripProps {
  selected: string
  onSelect: (date: string) => void
  completedByDate: Record<string, number>
}

export function WeekStrip({ selected, onSelect, completedByDate }: WeekStripProps) {
  const start = startOfWeek(new Date())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  return (
    <div className="flex gap-1.5 justify-between">
      {days.map((d) => {
        const key = toDateStr(d)
        const isSelected = key === selected
        const isToday = key === toDateStr(new Date())
        const count = completedByDate[key] ?? 0
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`
              flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold
              cartoon-border-sm cursor-pointer transition-all
              ${isSelected ? 'bg-forest text-white' : 'bg-white text-ink hover:bg-paper-dark'}
            `}
          >
            <span className={isSelected ? 'text-white/70' : 'text-ink-muted'}>
              {WEEKDAYS[(d.getDay() + 6) % 7]}
            </span>
            <span className="text-base">{d.getDate()}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                count > 0
                  ? isSelected
                    ? 'bg-star'
                    : 'bg-forest'
                  : isToday
                    ? 'bg-ink/20'
                    : 'bg-transparent'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

interface MonthHeatmapProps {
  year: number
  month: number
  completedByDate: Record<string, number>
  maxPerDay?: number
}

export function MonthHeatmap({ year, month, completedByDate, maxPerDay = 1 }: MonthHeatmapProps) {
  const totalDays = daysInMonth(year, month)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  const monthLabel = new Date(year, month, 1).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <Card>
      <p className="text-sm font-extrabold text-ink capitalize mb-3">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center text-[10px] font-bold text-ink-muted">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = completedByDate[key] ?? 0
          const intensity = maxPerDay > 0 ? Math.min(1, count / maxPerDay) : 0
          const isToday = key === toDateStr(new Date())
          return (
            <div
              key={key}
              title={`${key}: ${count}`}
              className={`
                aspect-square rounded-md flex items-center justify-center text-[10px] font-bold
                ${isToday ? 'ring-2 ring-forest' : ''}
              `}
              style={{
                backgroundColor:
                  intensity === 0
                    ? '#ebe8e2'
                    : `rgba(45, 106, 79, ${0.25 + intensity * 0.75})`,
                color: intensity > 0.5 ? '#fff' : '#1a1a1a',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-ink-muted font-semibold">
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span
            key={v}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: v === 0 ? '#ebe8e2' : `rgba(45, 106, 79, ${0.25 + v * 0.75})`,
            }}
          />
        ))}
        <span>Más</span>
      </div>
    </Card>
  )
}

interface HabitWeekGridProps {
  metrics: UserMetric[]
  entries: MetricEntry[]
}

export function HabitWeekGrid({ metrics, entries }: HabitWeekGridProps) {
  const start = startOfWeek(new Date())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toDateStr(d)
  })

  const rows: { id: string; icon: string; title: string; done: boolean[] }[] = []

  for (const m of metrics.filter((x) => x.active)) {
    const template = resolveMetricTemplate(m)
    if (!template) continue
    const done = days.map((date) => {
      const value = entries
        .filter((e) => e.metric_id === m.id && e.date === date)
        .reduce((s, e) => s + e.value, 0)
      return template.type === 'boolean' ? value >= 1 : value >= m.daily_target
    })
    rows.push({ id: m.id, icon: template.icon, title: template.title, done })
  }

  if (rows.length === 0) return null

  const totalDone = rows.reduce((s, r) => s + r.done.filter(Boolean).length, 0)
  const totalCells = rows.length * 7
  const pct = totalCells > 0 ? Math.round((totalDone / totalCells) * 100) : 0

  return (
    <Card>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-extrabold text-ink">Semana</p>
        <span className="text-xs font-bold text-forest bg-forest/10 px-2 py-1 rounded-full">
          {pct}% cumplido
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="grid grid-cols-[1fr_repeat(7,1.5rem)] gap-1 mb-1 items-center">
            <span />
            {days.map((d) => (
              <span key={d} className="text-center text-[10px] font-bold text-ink-muted">
                {WEEKDAYS[(new Date(d + 'T12:00:00').getDay() + 6) % 7]}
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_repeat(7,1.5rem)] gap-1 items-center py-1"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm shrink-0">{row.icon}</span>
                <span className="text-xs font-bold truncate">{row.title}</span>
              </div>
              {row.done.map((ok, i) => (
                <span
                  key={i}
                  className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold
                    ${ok ? 'bg-forest text-white' : 'bg-ink/10 text-ink-muted'}`}
                >
                  {ok ? '✓' : ''}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="bg-paper-dark rounded-xl px-3 py-2">
          <p className="text-[10px] font-bold text-ink-muted uppercase">Hechos</p>
          <p className="text-lg font-extrabold text-ink">{totalDone}</p>
        </div>
        <div className="bg-paper-dark rounded-xl px-3 py-2">
          <p className="text-[10px] font-bold text-ink-muted uppercase">Hábitos</p>
          <p className="text-lg font-extrabold text-ink">{rows.length}</p>
        </div>
      </div>
    </Card>
  )
}

/** Build map date -> count of completed habits (metrics only) */
export function buildCompletionMap(
  metrics: UserMetric[],
  entries: MetricEntry[],
): Record<string, number> {
  const map: Record<string, number> = {}

  for (const m of metrics.filter((x) => x.active)) {
    const template = resolveMetricTemplate(m)
    if (!template) continue
    for (const e of entries.filter((x) => x.metric_id === m.id)) {
      const met = template.type === 'boolean' ? e.value >= 1 : e.value >= m.daily_target
      if (met) map[e.date] = (map[e.date] ?? 0) + 1
    }
  }

  return map
}
