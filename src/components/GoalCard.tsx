import { Check, X } from 'lucide-react'
import { Card } from './ui/Card'
import { StarBadge, AngryFace } from './ui/FeedbackIcons'
import type { Goal } from '../types'
import { GOAL_CATEGORIES } from '../data/constants'

interface GoalCardProps {
  goal: Goal
  completed: boolean
  onToggle: () => void
  onFail?: () => void
}

export function GoalCard({ goal, completed, onToggle, onFail }: GoalCardProps) {
  const category = GOAL_CATEGORIES.find((c) => c.id === goal.category)

  return (
    <Card className={`relative overflow-hidden ${completed ? 'bg-green-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 cartoon-border-sm"
          style={{ backgroundColor: `${category?.color ?? '#52b788'}33` }}
        >
          {category?.icon ?? '🎯'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink-muted uppercase">{category?.title}</p>
          <p className="font-bold text-ink leading-snug">{goal.title}</p>
          {goal.relationship_change && (
            <p className="text-xs text-ink-muted mt-1">Cambio: {goal.relationship_change}</p>
          )}
          {goal.learn_how && (
            <p className="text-xs text-ink-muted mt-1">Cómo: {goal.learn_how}</p>
          )}
        </div>

        {completed ? (
          <StarBadge size="sm" animate />
        ) : (
          <AngryFace size="sm" />
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onToggle}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm
            cartoon-border-sm cursor-pointer transition-all
            ${completed
              ? 'bg-green-100 text-green-800'
              : 'bg-white hover:bg-green-50 text-ink'}
          `}
        >
          <Check size={16} />
          {completed ? 'Hecho' : 'Cumplí'}
        </button>
        {!completed && onFail && (
          <button
            onClick={onFail}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-bold text-sm
              bg-red-50 text-red-700 cartoon-border-sm cursor-pointer hover:bg-red-100 transition-all"
          >
            <X size={16} />
            No
          </button>
        )}
      </div>
    </Card>
  )
}
