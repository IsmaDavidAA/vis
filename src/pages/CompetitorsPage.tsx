import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Users, Plus, Trash2, Trophy, Crown } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { ComplianceRing } from '../components/ui/ComplianceRing'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { localStore } from '../lib/localStore'
import { getLeaderName } from '../lib/competitors'
import type { CompetitorComparison } from '../types'

export function CompetitorsPage() {
  const { user, profile, stats, isDemoMode } = useAuth()
  const [comparison, setComparison] = useState<CompetitorComparison[]>([])
  const [searchParams] = useSearchParams()
  const [newCode, setNewCode] = useState(searchParams.get('code')?.toUpperCase() ?? '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (isDemoMode) {
      setComparison(localStore.getWeeklyComparison())
      setLoading(false)
      return
    }
    if (!user || !profile) return
    const [metrics, entries] = await Promise.all([
      api.getMetrics(user.id),
      api.getMetricEntries(user.id),
    ])
    const list = await api.getWeeklyComparison(
      user.id,
      profile.display_name,
      metrics,
      entries,
      stats,
    )
    setComparison(list)
    setLoading(false)
  }, [isDemoMode, user, profile, stats])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    if (!newCode.trim()) return
    setBusy(true)
    setAlert(null)
    if (isDemoMode) {
      const result = localStore.addCompetitor(newCode)
      if (!result.ok) setAlert({ type: 'error', message: result.error ?? 'Error' })
      else {
        setNewCode('')
        setAlert({ type: 'success', message: 'Participante agregado al reto' })
        await load()
      }
      setBusy(false)
      return
    }
    if (!user) return
    const { error } = await api.addCompetitor(user.id, newCode)
    if (error) setAlert({ type: 'error', message: error })
    else {
      setNewCode('')
      setAlert({ type: 'success', message: 'Participante agregado al reto' })
      await load()
    }
    setBusy(false)
  }

  const handleRemove = async (shareCode: string) => {
    if (isDemoMode) {
      const comp = localStore.getCompetitors().find((c) => c.share_code === shareCode)
      if (comp) localStore.removeCompetitor(comp.id)
      await load()
      return
    }
    if (!user) return
    const comp = comparison.find((c) => c.share_code === shareCode && !c.is_me)
    if (!comp) return
    const competitors = await api.getCompetitors(user.id)
    const row = competitors.find((c) => c.share_code === shareCode)
    if (row) {
      await api.removeCompetitor(user.id, row.id)
      await load()
    }
  }

  const leader = getLeaderName(comparison)
  const me = comparison.find((c) => c.is_me)
  const friends = comparison.filter((c) => !c.is_me)

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <Users size={24} className="text-forest" />
            Reto — Competidores
          </h1>
          <p className="text-sm text-ink-muted">
            Compara tu cumplimiento semanal con amigos que compartieron su código.
          </p>
        </div>

        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {leader && comparison.length > 1 && (
          <Card className="bg-forest/10 flex items-center gap-3">
            <Crown size={28} className="text-forest shrink-0" />
            <div>
              <p className="text-xs font-bold text-forest uppercase">Líder esta semana</p>
              <p className="font-extrabold text-ink">{leader}</p>
            </div>
          </Card>
        )}

        {me && (
          <Card className="ring-2 ring-forest/30">
            <p className="text-[10px] font-bold text-forest uppercase mb-2">Tú</p>
            <div className="flex items-center gap-4">
              <ComplianceRing percentage={me.weekly_compliance} size={72} label="Semana" />
              <div className="flex-1">
                <p className="font-extrabold text-ink">{me.display_name}</p>
                <p className="text-xs text-ink-muted mt-1">
                  🔥 {me.streak}d · 🏆 {me.total_points} pts
                </p>
                <div className="mt-2 h-3 bg-ink/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forest rounded-full transition-all"
                    style={{ width: `${me.weekly_compliance}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        <div>
          <h2 className="font-bold text-ink mb-3">Comparativa semanal</h2>
          {loading ? (
            <Card><p className="text-sm text-ink-muted animate-pulse">Cargando...</p></Card>
          ) : friends.length === 0 ? (
            <Card className="text-center py-6">
              <Trophy size={32} className="mx-auto text-ink-muted mb-2" />
              <p className="text-sm text-ink-muted">
                Agrega amigos con su código de compartir para ver quién cumple más.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {friends.map((f) => (
                <Card key={f.share_code}>
                  <div className="flex items-start gap-3">
                    <ComplianceRing percentage={f.weekly_compliance} size={56} strokeWidth={5} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-ink truncate">{f.display_name}</p>
                        <button
                          type="button"
                          onClick={() => handleRemove(f.share_code)}
                          className="text-red-400 hover:text-red-600 cursor-pointer shrink-0"
                          title="Quitar del reto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-ink-muted">
                        {f.weekly_compliance}% semana · 🔥 {f.streak}d · 🏆 {f.total_points} pts
                      </p>
                      <div className="mt-2 h-2.5 bg-ink/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-forest/80 rounded-full"
                          style={{ width: `${f.weekly_compliance}%` }}
                        />
                      </div>
                      {me && f.weekly_compliance > me.weekly_compliance && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1">
                          Va {f.weekly_compliance - me.weekly_compliance}% arriba de ti
                        </p>
                      )}
                      {me && me.weekly_compliance > f.weekly_compliance && (
                        <p className="text-[10px] text-forest font-bold mt-1">
                          Vas {me.weekly_compliance - f.weekly_compliance}% arriba 🎉
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/share/${f.share_code}`}
                    className="text-[10px] font-bold text-forest mt-2 inline-block hover:underline"
                  >
                    Ver detalle →
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card>
          <h2 className="font-bold text-ink mb-3 flex items-center gap-2">
            <Plus size={18} /> Agregar participante
          </h2>
          <p className="text-xs text-ink-muted mb-3">
            Pide su código en Métricas → Compartir progreso. Debe tener compartir activo.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Código ABC123"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button onClick={handleAdd} disabled={busy || newCode.length < 4}>
              {busy ? '...' : 'Agregar'}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
