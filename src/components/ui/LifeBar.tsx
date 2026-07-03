interface LifeBarProps {
  current: number
  max: number
  label?: string
}

export function LifeBar({ current, max, label = 'Vidas' }: LifeBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const isLow = current <= 2

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-xs font-bold">
        <span className="text-ink-muted">{label}</span>
        <span className="text-ink">{current}/{max}</span>
      </div>
      <div className="h-4 bg-ink/10 rounded-full overflow-hidden cartoon-border-sm shadow-none">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: isLow
              ? 'linear-gradient(90deg, #ef4444, #f97316)'
              : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
          }}
        />
      </div>
    </div>
  )
}

interface PointsBarProps {
  points: number
  streak: number
}

export function PointsBar({ points, streak }: PointsBarProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="text-lg">🏆</span>
        <span className="text-sm font-extrabold text-forest">{points} pts</span>
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-bold text-ink-muted">{streak} días</span>
        </div>
      )}
    </div>
  )
}
