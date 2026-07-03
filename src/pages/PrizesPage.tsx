import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { PrizeFigurine, PrizeCollection } from '../components/PrizeFigurine'
import { MESSAGES } from '../data/messages'
import { DEFAULT_PRIZES, PRIZE_UNLOCK_POINTS } from '../data/constants'
import { useAuth } from '../context/AuthContext'
import { localStore } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import type { Prize } from '../types'

export function PrizesPage() {
  const { stats, user, isDemoMode } = useAuth()
  const [prizes] = useState<Prize[]>(DEFAULT_PRIZES)
  const [collected, setCollected] = useState<string[]>([])
  const [slots, setSlots] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const refresh = () => {
    if (isDemoMode) {
      setCollected(localStore.getCollectedPrizes())
      setSlots(localStore.getAvailableCollectionSlots())
    }
  }

  useEffect(() => {
    refresh()
  }, [isDemoMode, stats.total_points])

  const handleCollect = (prizeId: string) => {
    if (isDemoMode) {
      const result = localStore.collectPrize(prizeId)
      if (result.ok) {
        setAlert({ type: 'success', message: '¡Figurita desbloqueada! 🎉' })
        refresh()
        setSelectedId(prizeId)
      } else {
        setAlert({ type: 'error', message: result.error ?? 'No se pudo coleccionar' })
      }
      return
    }
    if (supabase && user) {
      // Supabase collection would go here
      setAlert({ type: 'success', message: '¡Figurita desbloqueada!' })
    }
  }

  const selected = prizes.find((p) => p.id === selectedId)
  const nextUnlockAt = (Math.floor(stats.total_points / PRIZE_UNLOCK_POINTS) + 1) * PRIZE_UNLOCK_POINTS

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">{MESSAGES.prizeTitle}</h1>
          <p className="text-sm text-ink-muted">
            Colecciona figuritas. Cada {PRIZE_UNLOCK_POINTS} pts desbloqueas una nueva.
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        <Card>
          <PrizeCollection
            prizes={prizes}
            collectedIds={collected}
            onSelect={(id) => setSelectedId(id)}
          />
        </Card>

        {slots > 0 && (
          <Alert
            type="success"
            message={`Tienes ${slots} figurita${slots > 1 ? 's' : ''} por desbloquear. Elige abajo.`}
          />
        )}

        {slots === 0 && collected.length < prizes.length && (
          <Alert
            type="info"
            message={`Te faltan ${Math.max(0, nextUnlockAt - stats.total_points)} pts para la siguiente figurita.`}
          />
        )}

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
                Premio doble
              </span>
            </div>
          </Card>
        )}

        <div>
          <h2 className="font-bold text-ink mb-3">Álbum de premios</h2>
          <div className="grid grid-cols-1 gap-3">
            {prizes.map((prize) => {
              const owned = collected.includes(prize.id)
              const canCollect = slots > 0 && !owned
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
                      {owned && (
                        <p className="text-xs font-bold text-forest mt-2">✓ En tu colección</p>
                      )}
                    </div>
                  </div>
                  {canCollect && (
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
