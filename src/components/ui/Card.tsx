import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
}

export function Card({ children, className = '', onClick, active }: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`
        bg-card rounded-2xl cartoon-border p-4
        ${onClick ? 'cursor-pointer hover:-translate-y-0.5 transition-transform' : ''}
        ${active ? 'ring-2 ring-forest-light bg-forest-light/5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  change?: string
  color?: string
}

export function StatCard({ icon, label, value, change, color = '#52b788' }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg cartoon-border-sm"
          style={{ backgroundColor: `${color}33` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">{label}</p>
          <p className="text-xl font-extrabold text-ink truncate">{value}</p>
        </div>
      </div>
      {change && (
        <div className="bg-ink/5 rounded-lg px-2 py-1 text-xs font-bold text-forest-light">
          {change}
        </div>
      )}
    </Card>
  )
}
