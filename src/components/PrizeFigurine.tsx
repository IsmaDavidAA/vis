import type { Prize } from '../types'

interface PrizeFigurineProps {
  prize: Prize
  collected: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  showLabel?: boolean
}

const sizes = {
  sm: { box: 'w-12 h-12', emoji: 'text-xl' },
  md: { box: 'w-16 h-16', emoji: 'text-2xl' },
  lg: { box: 'w-20 h-20', emoji: 'text-4xl' },
}

export function PrizeFigurine({
  prize,
  collected,
  size = 'md',
  onClick,
  showLabel = false,
}: PrizeFigurineProps) {
  const s = sizes[size]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        flex flex-col items-center gap-1
        ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}
      `}
    >
      <div
        className={`
          ${s.box} rounded-2xl flex items-center justify-center
          cartoon-border-sm transition-all duration-300
          ${collected ? 'animate-pop-in' : 'opacity-40 grayscale'}
        `}
        style={{
          backgroundColor: collected ? `${prize.color}33` : '#e5e5e5',
          borderColor: collected ? prize.color : undefined,
        }}
      >
        <span className={s.emoji}>{collected ? prize.icon : '❓'}</span>
      </div>
      {showLabel && (
        <span className="text-[9px] font-bold text-ink-muted text-center leading-tight max-w-[4.5rem] truncate">
          {collected ? prize.title : '???'}
        </span>
      )}
    </button>
  )
}

interface PrizeCollectionProps {
  prizes: Prize[]
  collectedIds: string[]
  onSelect?: (prizeId: string) => void
}

export function PrizeCollection({ prizes, collectedIds, onSelect }: PrizeCollectionProps) {
  const collected = collectedIds.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-extrabold text-ink">Mi colección</p>
        <span className="text-xs font-bold text-forest bg-forest/10 px-2 py-1 rounded-full">
          {collected}/{prizes.length} figuritas
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {prizes.map((prize) => (
          <PrizeFigurine
            key={prize.id}
            prize={prize}
            collected={collectedIds.includes(prize.id)}
            size="sm"
            showLabel
            onClick={onSelect ? () => onSelect(prize.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
