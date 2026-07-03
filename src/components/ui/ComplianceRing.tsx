interface ComplianceRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ComplianceRing({
  percentage,
  size = 80,
  strokeWidth = 6,
  label,
}: ComplianceRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const color =
    percentage >= 80 ? '#40916c' : percentage >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold text-ink">{percentage}%</span>
        </div>
      </div>
      {label && <span className="text-[10px] font-bold text-ink-muted uppercase">{label}</span>}
    </div>
  )
}

interface ProgressBarProps {
  current: number
  target: number
  label?: string
  unit?: string
}

export function ProgressBar({ current, target, label, unit }: ProgressBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const color = pct >= 100 ? '#40916c' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex justify-between text-xs font-bold">
          <span className="text-ink-muted">{label}</span>
          <span className="text-ink">
            {current}/{target}{unit ? ` ${unit}` : ''}
          </span>
        </div>
      )}
      <div className="h-3 bg-ink/10 rounded-full overflow-hidden cartoon-border-sm shadow-none">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
