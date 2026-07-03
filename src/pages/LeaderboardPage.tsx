import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { StarBadge } from '../components/ui/FeedbackIcons'
import { MESSAGES } from '../data/messages'
import { useAuth } from '../context/AuthContext'
import { localStore } from '../lib/localStore'
import { supabase } from '../lib/supabase'

interface Entry {
  display_name: string
  total_points: number
  stars_earned: number
  streak: number
}

export function LeaderboardPage() {
  const { stats, isDemoMode } = useAuth()
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        setEntries(localStore.getLeaderboard())
        return
      }
      if (!supabase) return
      const { data } = await supabase
        .from('user_stats')
        .select('*, profiles(display_name)')
        .order('total_points', { ascending: false })
        .limit(20)
      if (data) {
        setEntries(
          data.map((d: Record<string, unknown>) => ({
            display_name: (d.profiles as { display_name: string })?.display_name ?? 'Anónimo',
            total_points: d.total_points as number,
            stars_earned: d.stars_earned as number,
            streak: d.streak as number,
          })),
        )
      }
    }
    load()
  }, [isDemoMode, stats.total_points])

  const sorted = [...entries].sort((a, b) => b.total_points - a.total_points)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">{MESSAGES.leaderboardTitle}</h1>
          <p className="text-sm text-ink-muted">Puntos acumulados en la segunda mitad.</p>
        </div>

        {sorted.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-ink-muted">Aún no hay participantes.</p>
            <p className="text-sm text-ink-muted mt-2">Completa metas para sumar puntos.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((entry, i) => (
              <Card
                key={entry.display_name + i}
                className={`flex items-center gap-4 ${i === 0 ? 'ring-2 ring-star bg-star/5' : ''}`}
              >
                <span className="text-2xl w-8 text-center">
                  {medals[i] ?? `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-ink truncate">{entry.display_name}</p>
                  <div className="flex gap-3 text-xs text-ink-muted font-semibold">
                    <span>⭐ {entry.stars_earned}</span>
                    <span>🔥 {entry.streak}d</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-forest">{entry.total_points}</p>
                  <p className="text-[10px] font-bold text-ink-muted uppercase">pts</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="text-center bg-forest/5">
          <StarBadge size="lg" />
          <p className="font-bold text-ink mt-2">Tus puntos: {stats.total_points}</p>
          <p className="text-xs text-ink-muted">Sigue cumpliendo para escalar</p>
        </Card>
      </div>
    </AppLayout>
  )
}
