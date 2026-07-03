import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, StatCard } from '../components/ui/Card'
import { ComplianceRing, ProgressBar } from '../components/ui/ComplianceRing'
import { shareStore } from '../lib/shareStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { PublicProfileSnapshot } from '../types'

export function SharedProgressPage() {
  const { code } = useParams<{ code: string }>()
  const [snapshot, setSnapshot] = useState<PublicProfileSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      if (!code) return

      if (!isSupabaseConfigured) {
        const data = shareStore.getSharedProfile(code)
        setSnapshot(data)
        setNotFound(!data)
        setLoading(false)
        return
      }

      if (supabase) {
        const { data } = await supabase
          .from('shared_snapshots')
          .select('*')
          .eq('share_code', code.toUpperCase())
          .single()

        if (data) {
          setSnapshot(data.snapshot as PublicProfileSnapshot)
        } else {
          setNotFound(true)
        }
      }
      setLoading(false)
    }
    load()
  }, [code])

  if (loading) {
    return (
      <div className="min-h-dvh paper-texture flex items-center justify-center">
        <p className="text-forest font-extrabold animate-pulse">Cargando progreso...</p>
      </div>
    )
  }

  if (notFound || !snapshot) {
    return (
      <div className="min-h-dvh paper-texture flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-4xl">🔍</p>
        <p className="font-serif text-xl font-bold text-ink">Código no encontrado</p>
        <p className="text-sm text-ink-muted text-center">
          Pide a tu accountability partner que active compartir en su app VIS.
        </p>
        <Link to="/" className="text-forest font-bold text-sm hover:underline">
          ← Volver a VIS
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh paper-texture">
      <div className="halftone-bg px-6 py-6 text-center">
        <p className="text-white/70 text-xs font-bold uppercase">Progreso compartido</p>
        <h1 className="text-2xl font-extrabold text-white mt-1">{snapshot.display_name}</h1>
        <p className="text-white/60 text-xs mt-1">
          Actualizado {new Date(snapshot.updated_at).toLocaleDateString('es')}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <Card className="flex items-center gap-4">
          <ComplianceRing percentage={snapshot.overall_compliance} size={100} label="Cumplimiento" />
          <div className="flex-1 grid grid-cols-1 gap-2">
            <StatCard icon="🏆" label="Puntos" value={snapshot.total_points} color="#40916c" />
            <StatCard icon="🔥" label="Racha" value={`${snapshot.streak}d`} color="#f59e0b" />
          </div>
        </Card>

        <div>
          <h2 className="font-bold text-ink mb-3">Métricas</h2>
          {snapshot.metrics.length === 0 ? (
            <Card><p className="text-sm text-ink-muted">Sin métricas activas aún.</p></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {snapshot.metrics.map((m, i) => (
                <Card key={i}>
                  <div className="flex items-center gap-3 mb-2">
                    <ComplianceRing percentage={m.percentage} size={48} strokeWidth={4} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{m.icon}</span>
                        <p className="font-bold text-sm">{m.title}</p>
                      </div>
                      <p className="text-xs text-ink-muted">{m.percentage}% esta semana</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={m.todayValue}
                    target={m.dailyTarget}
                    unit={m.unit}
                    label="Hoy"
                  />
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="text-center bg-forest/5">
          <p className="text-sm font-bold text-ink">👀 Accountability activo</p>
          <p className="text-xs text-ink-muted mt-1">
            Anímale. Pregúntale cómo va. Eso es lo que importa.
          </p>
        </Card>

        <Link to="/" className="text-center text-sm font-bold text-forest hover:underline">
          Crear tu propio plan en VIS →
        </Link>
      </div>
    </div>
  )
}
