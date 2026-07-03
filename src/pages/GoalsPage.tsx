import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { GOAL_CATEGORIES, MONTHS } from '../data/constants'
import { useAuth } from '../context/AuthContext'
import { localStore } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import type { Goal, MonthlyNonNegotiable } from '../types'

export function GoalsPage() {
  const { profile, isDemoMode } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [nonNeg, setNonNeg] = useState<MonthlyNonNegotiable[]>([])

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        setGoals(localStore.getGoals())
        setNonNeg(localStore.getNonNegotiables())
        return
      }
      if (!supabase) return
      const { data: g } = await supabase.from('goals').select('*')
      const { data: n } = await supabase.from('monthly_non_negotiables').select('*')
      if (g) setGoals(g as Goal[])
      if (n) setNonNeg(n as MonthlyNonNegotiable[])
    }
    load()
  }, [isDemoMode])

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Tu Segunda Mitad</h1>
          <p className="text-sm text-ink-muted">Todo lo que decidiste sostener desde julio.</p>
        </div>

        {profile && (
          <Card className="bg-forest/5">
            <p className="text-xs font-bold text-forest uppercase mb-1">Estado actual</p>
            <p className="text-sm text-ink">{profile.current_state || '—'}</p>
          </Card>
        )}

        {GOAL_CATEGORIES.map((cat) => {
          const catGoals = goals.filter((g) => g.category === cat.id)
          if (catGoals.length === 0 && cat.id !== 'relaciones') return null
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{cat.icon}</span>
                <h2 className="font-bold text-ink">{cat.title}</h2>
              </div>
              {catGoals.length === 0 ? (
                <Card><p className="text-sm text-ink-muted italic">Sin metas aún</p></Card>
              ) : (
                <div className="flex flex-col gap-2">
                  {catGoals.map((g) => (
                    <Card key={g.id} className="py-3">
                      <p className="font-bold text-sm">{g.title}</p>
                      {g.relationship_change && (
                        <p className="text-xs text-ink-muted">→ {g.relationship_change}</p>
                      )}
                      {g.learn_how && (
                        <p className="text-xs text-ink-muted">Plan: {g.learn_how}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {nonNeg.length > 0 && (
          <div>
            <h2 className="font-bold text-ink mb-3">🔒 No negociables</h2>
            <div className="flex flex-col gap-2">
              {MONTHS.map(({ id, label }) => {
                const item = nonNeg.find((n) => n.month === id)
                if (!item) return null
                return (
                  <Card key={id} className="flex items-center gap-3 py-3">
                    <span className="text-xs font-extrabold text-forest w-20 shrink-0">{label}</span>
                    <span className="text-sm font-bold">{item.title}</span>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {profile && (profile.december_feeling || profile.december_have) && (
          <div>
            <h2 className="font-bold text-ink mb-3">🎄 31 de diciembre</h2>
            <Card className="flex flex-col gap-2">
              {profile.december_feeling && (
                <p className="text-sm"><span className="font-bold">Sentirme:</span> {profile.december_feeling}</p>
              )}
              {profile.december_have && (
                <p className="text-sm"><span className="font-bold">Tener:</span> {profile.december_have}</p>
              )}
              {profile.december_left && (
                <p className="text-sm"><span className="font-bold">Haber dejado:</span> {profile.december_left}</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
