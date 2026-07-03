import { getDailyTipForUser } from '../lib/dailyTip'
import { TIP_CATEGORY_ICONS, TIP_CATEGORY_LABELS } from '../data/dailyTips'
import { Card } from './ui/Card'
import { useAuth } from '../context/AuthContext'

export function DailyTip() {
  const { user } = useAuth()
  const userId = user?.id ?? 'guest'
  const tip = getDailyTipForUser(userId)

  return (
    <Card className="bg-gradient-to-br from-forest/5 to-star/10 border-forest/20">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{TIP_CATEGORY_ICONS[tip.category]}</span>
        <div>
          <p className="text-[10px] font-extrabold text-forest uppercase tracking-wide mb-1">
            Consejo del día · {TIP_CATEGORY_LABELS[tip.category]}
          </p>
          <p className="text-sm font-semibold text-ink leading-relaxed">{tip.text}</p>
          {tip.author && (
            <p className="text-xs text-ink-muted mt-2 italic">— {tip.author}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
