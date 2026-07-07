import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Clock, Plus, Target, Trash2, Users, X } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { GOAL_CATEGORIES, MONTHS } from '../data/constants'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { localStore } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import { getAllCategories, getCategoryLabel } from '../lib/categories'
import { resolveMetricTemplate } from '../lib/metricResolver'
import type {
  Competitor,
  Goal,
  GoalConfirmationRequest,
  MonthlyNonNegotiable,
  UserMetric,
  UserMetricCategory,
} from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function statusLabel(status: GoalConfirmationRequest['status'] | 'none') {
  switch (status) {
    case 'pending':
      return { text: 'Esperando confirmación', className: 'bg-amber-100 text-amber-800' }
    case 'confirmed':
      return { text: 'Confirmada hoy', className: 'bg-green-100 text-green-800' }
    case 'rejected':
      return { text: 'Rechazada', className: 'bg-red-100 text-red-800' }
    default:
      return { text: 'Sin solicitar', className: 'bg-paper-dark text-ink-muted' }
  }
}

function habitsForGoal(goal: Goal, metrics: UserMetric[]) {
  return metrics.filter(
    (m) =>
      m.goal_id === goal.id ||
      (!m.goal_id && m.goal_category === goal.category),
  )
}

export function GoalsPage() {
  const { user, profile, isDemoMode, refreshStats } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [customCategories, setCustomCategories] = useState<UserMetricCategory[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [nonNeg, setNonNeg] = useState<MonthlyNonNegotiable[]>([])
  const [myRequests, setMyRequests] = useState<GoalConfirmationRequest[]>([])
  const [pendingForMe, setPendingForMe] = useState<GoalConfirmationRequest[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const [requestGoal, setRequestGoal] = useState<Goal | null>(null)
  const [selectedFriend, setSelectedFriend] = useState('')
  const [requestNote, setRequestNote] = useState('')

  const [addGoalSection, setAddGoalSection] = useState<string | null>(null)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalExtra, setNewGoalExtra] = useState('')

  const [addHabitGoal, setAddHabitGoal] = useState<Goal | null>(null)
  const [habitForm, setHabitForm] = useState({
    title: '',
    icon: '✨',
    type: 'boolean' as 'boolean' | 'counter',
    dailyTarget: 1,
    unit: '',
  })

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'goal'; id: string; name: string }
    | { type: 'habit'; id: string; name: string }
    | null
  >(null)

  const today = todayStr()
  const allSections = useMemo(() => getAllCategories(customCategories), [customCategories])

  const load = useCallback(async () => {
    if (!user) return

    if (isDemoMode) {
      setGoals(localStore.getGoals())
      setNonNeg(localStore.getNonNegotiables())
      setMetrics(localStore.getMetrics().filter((m) => m.active))
      setCustomCategories(localStore.getCustomCategories())
      setCompetitors(localStore.getCompetitors())
      setMyRequests(localStore.getGoalConfirmationRequests(today))
      setPendingForMe(localStore.getPendingGoalConfirmationsForMe(profile?.share_code))
      return
    }

    const [g, n, m, cats, comps, reqs, incoming] = await Promise.all([
      api.getGoals(user.id),
      supabase
        ? supabase.from('monthly_non_negotiables').select('*').then(({ data }) => (data as MonthlyNonNegotiable[]) ?? [])
        : Promise.resolve([]),
      api.getMetrics(user.id),
      api.getCustomCategories(user.id),
      api.getCompetitors(user.id),
      api.getGoalConfirmationRequests(user.id, today),
      api.getPendingGoalConfirmationsForMe(user.id),
    ])

    setGoals(g)
    setNonNeg(n)
    setMetrics(m.filter((x) => x.active))
    setCustomCategories(cats)
    setCompetitors(comps)
    setMyRequests(reqs)
    setPendingForMe(incoming)
  }, [user, isDemoMode, profile?.share_code, today])

  useEffect(() => {
    load()
  }, [load])

  const getRequestForGoal = (goalId: string) =>
    myRequests.find((r) => r.goal_id === goalId && r.date === today)

  const handleAddGoal = async () => {
    if (!user || !addGoalSection || !newGoalTitle.trim()) return
    setBusy(true)
    setAlert(null)

    const payload = {
      category: addGoalSection,
      title: newGoalTitle,
      relationship_change: addGoalSection === 'relaciones' ? newGoalExtra : undefined,
      learn_how: addGoalSection === 'aprender' ? newGoalExtra : undefined,
    }

    const result = isDemoMode
      ? (() => {
          const goal = localStore.addGoal(payload)
          return goal ? { goal, error: null } : { goal: null, error: 'No se pudo crear la meta' }
        })()
      : await api.createGoal(user.id, payload)

    setBusy(false)
    if (result.error) {
      setAlert({ type: 'error', message: result.error })
      return
    }

    setAddGoalSection(null)
    setNewGoalTitle('')
    setNewGoalExtra('')
    setAlert({ type: 'success', message: 'Meta creada' })
    await load()
  }

  const handleAddHabit = async () => {
    if (!user || !addHabitGoal || !habitForm.title.trim()) return
    setBusy(true)
    setAlert(null)

    const payload = {
      title: habitForm.title,
      icon: habitForm.icon,
      category: addHabitGoal.category,
      goalId: addHabitGoal.id,
      type: habitForm.type,
      dailyTarget: habitForm.type === 'boolean' ? 1 : habitForm.dailyTarget,
      unit: habitForm.unit,
    }

    const result = isDemoMode
      ? localStore.addCustomHabit(payload)
        ? { error: null }
        : { error: 'No se pudo crear el hábito' }
      : await api.addCustomHabit(user.id, payload)

    setBusy(false)
    if (result.error) {
      setAlert({ type: 'error', message: result.error })
      return
    }

    setAddHabitGoal(null)
    setHabitForm({ title: '', icon: '✨', type: 'boolean', dailyTarget: 1, unit: '' })
    setAlert({ type: 'success', message: 'Hábito agregado a la meta' })
    await load()
  }

  const executeDelete = async () => {
    if (!deleteTarget || !user) return
    setBusy(true)
    try {
      if (deleteTarget.type === 'goal') {
        const result = isDemoMode
          ? (localStore.removeGoal(deleteTarget.id), { error: null })
          : await api.deleteGoal(user.id, deleteTarget.id)
        if (result.error) {
          setAlert({ type: 'error', message: result.error })
          return
        }
        setAlert({ type: 'success', message: 'Meta y sus hábitos eliminados' })
      } else {
        if (isDemoMode) localStore.removeMetric(deleteTarget.id)
        else {
          const { error } = await api.removeMetric(user.id, deleteTarget.id)
          if (error) {
            setAlert({ type: 'error', message: error })
            return
          }
        }
        setAlert({ type: 'success', message: 'Hábito eliminado' })
      }
      setDeleteTarget(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const handleRequest = async () => {
    if (!user || !profile || !requestGoal || !selectedFriend) return
    setBusy(true)
    setAlert(null)

    const result = isDemoMode
      ? localStore.requestGoalConfirmation(
          requestGoal,
          selectedFriend,
          profile.display_name,
          requestNote,
          today,
        )
      : await api.requestGoalConfirmation(
          user.id,
          requestGoal,
          selectedFriend,
          profile.display_name,
          requestNote,
          today,
        )

    setBusy(false)
    if (result.error) {
      setAlert({ type: 'error', message: result.error })
      return
    }

    setAlert({
      type: 'success',
      message: `Solicitud enviada. ${competitors.find((c) => c.share_code === selectedFriend)?.display_name ?? 'Tu amigo'} debe confirmar.`,
    })
    setRequestGoal(null)
    setSelectedFriend('')
    setRequestNote('')
    await load()
  }

  const handleRespond = async (requestId: string, accept: boolean) => {
    setBusy(true)
    setAlert(null)

    const result = isDemoMode
      ? localStore.respondGoalConfirmation(requestId, accept)
      : await api.respondGoalConfirmation(requestId, accept)

    setBusy(false)
    if (result.error) {
      setAlert({ type: 'error', message: result.error })
      return
    }

    setAlert({
      type: 'success',
      message: accept ? 'Meta confirmada para tu amigo' : 'Solicitud rechazada',
    })
    await refreshStats()
    await load()
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Tus metas</h1>
          <p className="text-sm text-ink-muted">
            Cada meta vive en una sección y tiene sus propios hábitos. Solo un amigo puede confirmar el cumplimiento.
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        {pendingForMe.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-forest" />
              <h2 className="font-bold text-ink">Te piden confirmar</h2>
            </div>
            <div className="flex flex-col gap-2">
              {pendingForMe.map((req) => {
                const section = getCategoryLabel(req.goal_category, customCategories)
                return (
                  <Card key={req.id} className="border-amber-200 bg-amber-50/40">
                    <p className="text-xs font-bold text-amber-800 uppercase mb-1">
                      {req.requester_name} dice que cumplió
                    </p>
                    <p className="font-bold text-ink">{req.goal_title}</p>
                    <p className="text-xs text-ink-muted mt-1">
                      {section.icon} Sección: {section.label}
                    </p>
                    {req.requester_note && (
                      <p className="text-sm text-ink-muted mt-2 italic">"{req.requester_note}"</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handleRespond(req.id, true)} disabled={busy} className="flex-1">
                        <Check size={16} />
                        Confirmar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleRespond(req.id, false)} disabled={busy}>
                        <X size={16} />
                        Rechazar
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {competitors.length === 0 && (
          <Card className="bg-paper-dark">
            <p className="text-sm text-ink-muted mb-3">
              Enlaza amigos en <strong>Reto</strong> para que puedan confirmar tus metas.
            </p>
            <Link to="/competitors">
              <Button size="sm" variant="secondary">
                <Users size={16} />
                Ir a Reto
              </Button>
            </Link>
          </Card>
        )}

        {allSections.map((section) => {
          const catGoals = goals.filter((g) => g.category === section.id)
          const builtIn = GOAL_CATEGORIES.find((c) => c.id === section.id)

          return (
            <div key={section.id}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <h2 className="font-bold text-ink">{section.label}</h2>
                    <p className="text-xs text-ink-muted">
                      {catGoals.length} meta{catGoals.length !== 1 ? 's' : ''} en esta sección
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAddGoalSection(section.id)
                    setNewGoalTitle('')
                    setNewGoalExtra('')
                  }}
                >
                  <Plus size={16} />
                  Meta
                </Button>
              </div>

              {builtIn && catGoals.length === 0 && (
                <Card className="mb-2">
                  <p className="text-sm text-ink-muted italic">Sin metas en esta sección. Agrega la primera.</p>
                </Card>
              )}

              <div className="flex flex-col gap-2">
                {catGoals.map((g) => {
                  const req = getRequestForGoal(g.id)
                  const status = req?.status ?? 'none'
                  const badge = statusLabel(status)
                  const canRequest = status !== 'pending' && status !== 'confirmed'
                  const goalHabits = habitsForGoal(g, metrics)

                  return (
                    <Card key={g.id} className={status === 'confirmed' ? 'bg-green-50/50' : ''}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{g.title}</p>
                          {g.relationship_change && (
                            <p className="text-xs text-ink-muted">→ {g.relationship_change}</p>
                          )}
                          {g.learn_how && (
                            <p className="text-xs text-ink-muted">Plan: {g.learn_how}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${badge.className}`}>
                            {status === 'pending' && <Clock size={10} className="inline mr-1" />}
                            {badge.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: 'goal', id: g.id, name: g.title })}
                            className="text-xs text-red-600 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-ink/10">
                        <p className="text-xs font-bold text-ink-muted uppercase mb-2">Hábitos de esta meta</p>
                        {goalHabits.length === 0 ? (
                          <p className="text-xs text-ink-muted italic mb-2">Sin hábitos aún</p>
                        ) : (
                          <div className="flex flex-col gap-1.5 mb-2">
                            {goalHabits.map((m) => {
                              const t = resolveMetricTemplate(m)
                              if (!t) return null
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between gap-2 text-sm bg-paper-dark/50 px-2 py-1.5 rounded-lg"
                                >
                                  <span>
                                    {t.icon} {t.title}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({ type: 'habit', id: m.id, name: t.title })
                                    }
                                    className="text-red-600 cursor-pointer p-1"
                                    aria-label="Quitar hábito"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddHabitGoal(g)
                            setHabitForm({ title: '', icon: '✨', type: 'boolean', dailyTarget: 1, unit: '' })
                          }}
                        >
                          <Plus size={14} />
                          Agregar hábito
                        </Button>
                      </div>

                      {req?.status === 'pending' && (
                        <p className="text-xs text-ink-muted mt-2">
                          Esperando a{' '}
                          <strong>
                            {competitors.find((c) => c.share_code === req.confirmer_share_code)
                              ?.display_name ?? req.confirmer_share_code}
                          </strong>
                        </p>
                      )}

                      {canRequest && competitors.length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          fullWidth
                          className="mt-3"
                          onClick={() => {
                            setRequestGoal(g)
                            setSelectedFriend(competitors[0]?.share_code ?? '')
                            setRequestNote('')
                          }}
                        >
                          <Target size={16} />
                          Solicitar confirmación
                        </Button>
                      )}
                    </Card>
                  )
                })}
              </div>
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
                <p className="text-sm">
                  <span className="font-bold">Sentirme:</span> {profile.december_feeling}
                </p>
              )}
              {profile.december_have && (
                <p className="text-sm">
                  <span className="font-bold">Tener:</span> {profile.december_have}
                </p>
              )}
              {profile.december_left && (
                <p className="text-sm">
                  <span className="font-bold">Haber dejado:</span> {profile.december_left}
                </p>
              )}
            </Card>
          </div>
        )}
      </div>

      <Modal open={Boolean(addGoalSection)} onClose={() => setAddGoalSection(null)} title="Nueva meta">
        {addGoalSection && (
          <>
            <p className="text-sm text-ink-muted">
              Sección: <strong>{getCategoryLabel(addGoalSection, customCategories).label}</strong>
            </p>
            <Input
              label="¿Qué quieres lograr?"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="Ej: Ir al gym 3 veces por semana"
            />
            {addGoalSection === 'relaciones' && (
              <Input
                label="¿Qué cambio buscas?"
                value={newGoalExtra}
                onChange={(e) => setNewGoalExtra(e.target.value)}
                placeholder="Ej: Llamar cada semana"
              />
            )}
            {addGoalSection === 'aprender' && (
              <Input
                label="¿Cómo lo harás?"
                value={newGoalExtra}
                onChange={(e) => setNewGoalExtra(e.target.value)}
                placeholder="Ej: 20 min de práctica diaria"
              />
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAddGoalSection(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={handleAddGoal} disabled={busy || !newGoalTitle.trim()} className="flex-1">
                Crear meta
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(addHabitGoal)} onClose={() => setAddHabitGoal(null)} title="Hábito para la meta">
        {addHabitGoal && (
          <>
            <p className="text-sm text-ink-muted">
              Meta: <strong>{addHabitGoal.title}</strong>
            </p>
            <p className="text-xs text-ink-muted">
              Sección: {getCategoryLabel(addHabitGoal.category, customCategories).label}
            </p>
            <Input
              label="Nombre del hábito"
              value={habitForm.title}
              onChange={(e) => setHabitForm((h) => ({ ...h, title: e.target.value }))}
              placeholder="Ej: Caminar 30 min"
            />
            <Input
              label="Emoji"
              value={habitForm.icon}
              onChange={(e) => setHabitForm((h) => ({ ...h, icon: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHabitForm((h) => ({ ...h, type: 'boolean' }))}
                className={`flex-1 py-2 rounded-xl font-bold text-sm cartoon-border-sm cursor-pointer ${
                  habitForm.type === 'boolean' ? 'bg-forest text-white' : 'bg-white'
                }`}
              >
                Sí / No
              </button>
              <button
                type="button"
                onClick={() => setHabitForm((h) => ({ ...h, type: 'counter' }))}
                className={`flex-1 py-2 rounded-xl font-bold text-sm cartoon-border-sm cursor-pointer ${
                  habitForm.type === 'counter' ? 'bg-forest text-white' : 'bg-white'
                }`}
              >
                Contador
              </button>
            </div>
            {habitForm.type === 'counter' && (
              <>
                <Input
                  label="Meta diaria"
                  type="number"
                  min={1}
                  value={habitForm.dailyTarget}
                  onChange={(e) =>
                    setHabitForm((h) => ({ ...h, dailyTarget: Number(e.target.value) || 1 }))
                  }
                />
                <Input
                  label="Unidad (opcional)"
                  value={habitForm.unit}
                  onChange={(e) => setHabitForm((h) => ({ ...h, unit: e.target.value }))}
                  placeholder="veces, vasos..."
                />
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAddHabitGoal(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={handleAddHabit} disabled={busy || !habitForm.title.trim()} className="flex-1">
                Agregar hábito
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(requestGoal)} onClose={() => setRequestGoal(null)} title="Solicitar confirmación">
        {requestGoal && (
          <>
            <p className="text-sm text-ink-muted">
              Pide a un amigo de tu <strong>Reto</strong> que confirme que cumpliste:
            </p>
            <p className="font-bold text-ink">{requestGoal.title}</p>
            <label className="text-xs font-bold text-ink-muted uppercase">¿Quién te confirma?</label>
            <div className="flex flex-col gap-2">
              {competitors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedFriend(c.share_code)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all cartoon-border-sm
                    ${selectedFriend === c.share_code ? 'bg-forest/10 border-forest' : 'bg-white hover:bg-paper-dark'}
                  `}
                >
                  <Users size={18} className="text-forest shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{c.display_name}</p>
                    <p className="text-xs text-ink-muted">{c.share_code}</p>
                  </div>
                </button>
              ))}
            </div>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Nota para tu amigo (opcional)"
              className="w-full min-h-[80px] p-3 rounded-xl cartoon-border text-sm resize-none"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRequestGoal(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={handleRequest} disabled={busy || !selectedFriend} className="flex-1">
                Enviar solicitud
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget?.type === 'goal'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        busy={busy}
        title="Eliminar meta"
        message={`Vas a eliminar "${deleteTarget?.type === 'goal' ? deleteTarget.name : ''}" y todos sus hábitos. Esta acción no se puede deshacer.`}
        confirmPhrase="eliminar meta"
      />

      <ConfirmDeleteModal
        open={deleteTarget?.type === 'habit'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        busy={busy}
        title="Eliminar hábito"
        message={`Vas a eliminar "${deleteTarget?.type === 'habit' ? deleteTarget.name : ''}" y su historial.`}
        confirmPhrase="eliminar habito"
      />
    </AppLayout>
  )
}
