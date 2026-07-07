import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { PrizeFigurine, PrizeCollection } from '../components/PrizeFigurine'
import { MESSAGES } from '../data/messages'
import { DEFAULT_PRIZES } from '../data/constants'
import { canUnlockPrize, nextStreakUnlock } from '../lib/prizes'
import { useAuth } from '../context/AuthContext'
import { localStore } from '../lib/localStore'
import { api } from '../lib/api'
import { notifyPartner } from '../lib/telegram'
import type { Prize } from '../types'

export function PrizesPage() {
  const { stats, user, isDemoMode } = useAuth()
  const [prizes] = useState<Prize[]>(DEFAULT_PRIZES)
  const [collected, setCollected] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const refresh = async () => {
    if (isDemoMode) {
      setCollected(localStore.getCollectedPrizes())
      return
    }
    if (!user) return
    const owned = await api.getCollectedPrizes(user.id)
    setCollected(owned)
  }

  useEffect(() => {
    refresh()
  }, [isDemoMode, stats.streak, user?.id])

  const handleCollect = async (prizeId: string) => {
    const prize = prizes.find((p) => p.id === prizeId)

    if (isDemoMode) {
      const result = localStore.collectPrize(prizeId)
      if (result.ok) {
        setAlert({ type: 'success', message: '¡Figurita desbloqueada! 🎉' })
        await refresh()
        setSelectedId(prizeId)
      } else {
        setAlert({ type: 'error', message: result.error ?? 'No se pudo coleccionar' })
      }
      return
    }

    if (!user) return
    const { error } = await api.collectPrize(user.id, prizeId, stats.streak, stats.total_points)
    if (error) {
      setAlert({ type: 'error', message: error })
      return
    }
    await refresh()
    setSelectedId(prizeId)
    setAlert({ type: 'success', message: '¡Figurita desbloqueada! 🎉' })
    if (prize) {
      await notifyPartner(
        'prize_collected',
        { prize_title: prize.title, title: prize.title, description: prize.description },
        `prize_collected:${prizeId}`,
      )
    }
  }

  const selected = prizes.find((p) => p.id === selectedId)
  const nextStreak = nextStreakUnlock(collected.length)

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">{MESSAGES.prizeTitle}</h1>
          <p className="text-sm text-ink-muted">
            Premios sencillos entre ustedes. Se desbloquean con racha de hábitos.
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        <Card className="flex items-center gap-4 bg-forest/5">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="font-extrabold text-ink">Racha actual: {stats.streak} días</p>
            <p className="text-xs text-ink-muted">
              {collected.length < prizes.length
                ? `Próxima figurita disponible con ${nextStreak} días de racha`
                : '¡Álbum completo!'}
            </p>
          </div>
        </Card>

        <Card>
          <PrizeCollection
            prizes={prizes}
            collectedIds={collected}
            onSelect={(id) => setSelectedId(id)}
          />
        </Card>

        {selected && (
          <Card className="flex items-center gap-4 bg-forest/5">
            <PrizeFigurine
              prize={selected}
              collected={collected.includes(selected.id)}
              size="lg"
            />
            <div className="flex-1">
              <p className="font-extrabold text-ink">{selected.title}</p>
              <p className="text-sm text-ink-muted mt-1">{selected.description}</p>
              <span className="inline-block mt-2 text-[10px] font-extrabold uppercase bg-forest/10 text-forest px-2 py-0.5 rounded-full">
                Racha {selected.streakRequired}d · Premio doble
              </span>
            </div>
          </Card>
        )}

        <div>
          <h2 className="font-bold text-ink mb-3">Álbum de premios</h2>
          <div className="grid grid-cols-1 gap-3">
            {prizes.map((prize) => {
              const owned = collected.includes(prize.id)
              const unlock = canUnlockPrize(prize, stats.streak, stats.total_points, collected)
              return (
                <Card
                  key={prize.id}
                  className={`${owned ? 'bg-green-50/30' : ''} ${selectedId === prize.id ? 'ring-2 ring-forest' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <PrizeFigurine prize={prize} collected={owned} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-ink">{prize.title}</p>
                      <p className="text-sm text-ink-muted mt-0.5">{prize.description}</p>
                      <p className="text-[10px] font-bold text-forest mt-1">
                        🔥 Racha {prize.streakRequired} días
                      </p>
                      {owned && (
                        <p className="text-xs font-bold text-forest mt-2">✓ En tu colección</p>
                      )}
                      {!owned && !unlock.ok && (
                        <p className="text-xs text-ink-muted mt-1">{unlock.reason}</p>
                      )}
                    </div>
                  </div>
                  {unlock.ok && (
                    <Button size="sm" className="mt-3" onClick={() => handleCollect(prize.id)}>
                      Desbloquear figurita
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
