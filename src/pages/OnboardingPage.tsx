import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, TextArea } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { MESSAGES } from '../data/messages'
import { GOAL_CATEGORIES, MONTHS } from '../data/constants'
import { localStore } from '../lib/localStore'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { GeneratedMetricsPicker } from '../components/GeneratedMetricsPicker'
import type { GoalCategory, Month, OnboardingData, CategoryMetricPlan } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TOTAL_STEPS = 8

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    current_state: '',
    goals: {},
    learn_how: '',
    relationships: [{ name: '', change: '' }, { name: '', change: '' }],
    monthly_assignments: {},
    non_negotiables: {},
    december_feeling: '',
    december_have: '',
    december_left: '',
    accountability_partner: '',
    metricPlans: {},
  })

  const updateMetricPlan = (category: GoalCategory, plan: CategoryMetricPlan | undefined) => {
    setData((d) => ({
      ...d,
      metricPlans: plan
        ? { ...d.metricPlans, [category]: plan }
        : Object.fromEntries(
            Object.entries(d.metricPlans).filter(([k]) => k !== category),
          ),
    }))
  }

  const updateGoal = (category: GoalCategory, value: string) => {
    setData((d) => ({ ...d, goals: { ...d.goals, [category]: value } }))
  }

  const updateRelationship = (index: number, field: 'name' | 'change', value: string) => {
    setData((d) => {
      const rels = [...d.relationships]
      rels[index] = { ...rels[index], [field]: value }
      return { ...d, relationships: rels }
    })
  }

  const handleFinish = async () => {
    if (!user) return
    setSaveError('')
    setSaving(true)

    try {
      if (!isSupabaseConfigured) {
        localStore.saveOnboarding(data)
        await refreshProfile()
        navigate('/dashboard')
        return
      }

      if (!supabase) return

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: user.id,
          display_name: (user as { email?: string }).email?.split('@')[0] ?? 'Usuario',
          current_state: data.current_state,
          accountability_partner: data.accountability_partner,
          december_feeling: data.december_feeling,
          december_have: data.december_have,
          december_left: data.december_left,
          onboarding_complete: true,
        },
        { onConflict: 'user_id' },
      )
      if (profileError) throw profileError

      // Reemplazar metas (evita duplicados si repite onboarding)
      await supabase.from('goals').delete().eq('user_id', user.id)

      const goalRows = []
      for (const [category, title] of Object.entries(data.goals)) {
        if (title) {
          goalRows.push({
            user_id: user.id,
            category,
            title,
            is_non_negotiable: false,
            learn_how: category === 'aprender' ? data.learn_how : null,
          })
        }
      }
      for (const rel of data.relationships) {
        if (rel.name) {
          goalRows.push({
            user_id: user.id,
            category: 'relaciones',
            title: rel.name,
            relationship_name: rel.name,
            relationship_change: rel.change,
            is_non_negotiable: false,
          })
        }
      }
      let goalIdsByCategory: Partial<Record<string, string>> = {}
      if (goalRows.length > 0) {
        const { data: insertedGoals, error: goalsError } = await supabase
          .from('goals')
          .insert(goalRows)
          .select('id, category')
        if (goalsError) throw goalsError
        for (const g of insertedGoals ?? []) {
          if (!goalIdsByCategory[g.category]) goalIdsByCategory[g.category] = g.id
        }
      }

      const nonNegRows = Object.entries(data.non_negotiables)
        .filter(([, title]) => title)
        .map(([month, title]) => ({
          user_id: user.id,
          month,
          title: title!,
        }))

      if (nonNegRows.length > 0) {
        const { error: nonNegError } = await supabase
          .from('monthly_non_negotiables')
          .upsert(nonNegRows, { onConflict: 'user_id,month' })
        if (nonNegError) throw nonNegError
      }

      const { error: metricsError } = await api.addMetricPlans(
        user.id,
        data.metricPlans,
        goalIdsByCategory,
      )
      if (metricsError) throw new Error(metricsError)

      await refreshProfile()
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Error al guardar tu plan'
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    // Step 0: Intro
    <div key="intro" className="flex flex-col gap-6 animate-slide-up">
      <Alert type="info" message={MESSAGES.onboardingIntro} />
      <TextArea
        label="¿Cómo te sientes hoy?"
        hint={MESSAGES.statePrompt}
        value={data.current_state}
        onChange={(e) => setData((d) => ({ ...d, current_state: e.target.value }))}
        placeholder="Sé honesto. No hay respuesta incorrecta..."
      />
    </div>,

    // Steps 1-5: Goal categories
    ...GOAL_CATEGORIES.map((cat) => (
      <div key={cat.id} className="flex flex-col gap-4 animate-slide-up">
        <div>
          <p className="text-xs font-bold text-forest uppercase tracking-wide mb-1">
            Sección {GOAL_CATEGORIES.indexOf(cat) + 1}
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">{cat.title}</h2>
          <p className="text-sm text-ink-muted mt-1">{cat.subtitle}</p>
        </div>

        {cat.presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cat.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateGoal(cat.id, preset)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all
                  cartoon-border-sm shadow-none
                  ${data.goals[cat.id] === preset
                    ? 'bg-forest text-white'
                    : 'bg-white hover:bg-paper-dark'}
                `}
              >
                → {preset}
              </button>
            ))}
          </div>
        )}

        {cat.id === 'relaciones' ? (
          <div className="flex flex-col gap-4">
            {data.relationships.map((rel, i) => (
              <Card key={i} className="flex flex-col gap-3">
                <Input
                  label={`Nombre ${i + 1}`}
                  value={rel.name}
                  onChange={(e) => updateRelationship(i, 'name', e.target.value)}
                  placeholder="¿Quién?"
                />
                <Input
                  label="Qué cambia"
                  value={rel.change}
                  onChange={(e) => updateRelationship(i, 'change', e.target.value)}
                  placeholder="Una cosa diferente con esta persona"
                />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <Input
              label="Escribe lo tuyo"
              value={data.goals[cat.id] ?? ''}
              onChange={(e) => updateGoal(cat.id, e.target.value)}
              placeholder="Tu meta personal..."
            />
            {cat.id === 'aprender' && (
              <Input
                label="Cómo la vas a aprender"
                value={data.learn_how}
                onChange={(e) => setData((d) => ({ ...d, learn_how: e.target.value }))}
                placeholder="Tu plan concreto..."
              />
            )}
            {data.goals[cat.id]?.trim() && (
              <GeneratedMetricsPicker
                category={cat.id}
                goal={data.goals[cat.id] ?? ''}
                context={cat.id === 'aprender' ? data.learn_how : undefined}
                plan={data.metricPlans[cat.id]}
                onPlanChange={(plan) => updateMetricPlan(cat.id, plan)}
              />
            )}
          </>
        )}
      </div>
    )),

    // Step 6: Non-negotiables
    <div key="nonneg" className="flex flex-col gap-4 animate-slide-up">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">No negociables</h2>
        <p className="text-sm text-ink-muted mt-1">{MESSAGES.nonNegotiablePrompt}</p>
      </div>
      {MONTHS.map(({ id, label }) => (
        <Input
          key={id}
          label={label}
          value={data.non_negotiables[id as Month] ?? ''}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              non_negotiables: { ...d.non_negotiables, [id]: e.target.value },
            }))
          }
          placeholder="Una cosa que no se mueve..."
        />
      ))}
      <p className="text-xs text-ink-muted italic text-center">{MESSAGES.nonNegotiableFooter}</p>
    </div>,

    // Step 7: December vision + accountability
    <div key="december" className="flex flex-col gap-4 animate-slide-up">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">31 de diciembre</h2>
        <p className="text-sm text-ink-muted mt-1">{MESSAGES.decemberSubtitle}</p>
      </div>
      <Input
        label="Quiero sentirme"
        value={data.december_feeling}
        onChange={(e) => setData((d) => ({ ...d, december_feeling: e.target.value }))}
        placeholder="Una sensación, no una meta..."
      />
      <Input
        label="Quiero tener"
        value={data.december_have}
        onChange={(e) => setData((d) => ({ ...d, december_have: e.target.value }))}
      />
      <Input
        label="Quiero haber dejado"
        value={data.december_left}
        onChange={(e) => setData((d) => ({ ...d, december_left: e.target.value }))}
      />
      <div className="border-t border-ink/10 pt-4 mt-2">
        <Input
          label="Accountability — Nombre"
          hint={MESSAGES.accountabilityPrompt}
          value={data.accountability_partner}
          onChange={(e) => setData((d) => ({ ...d, accountability_partner: e.target.value }))}
          placeholder="Alguien que te pregunte cómo vas"
        />
        <p className="text-xs text-ink-muted mt-2 italic">{MESSAGES.accountabilityAction}</p>
      </div>
    </div>,
  ]

  const isLast = step === TOTAL_STEPS - 1

  return (
    <div className="min-h-dvh paper-texture flex flex-col">
      <div className="halftone-bg px-6 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/70 text-xs font-bold">Segunda Mitad</span>
            <span className="text-white text-xs font-bold">{step + 1}/{TOTAL_STEPS}</span>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full">
        {saveError && <Alert type="error" message={saveError} onClose={() => setSaveError('')} />}
        {steps[step]}
      </div>

      <div className="sticky bottom-0 bg-paper/90 backdrop-blur px-6 py-4 border-t border-ink/10">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={18} /> Atrás
            </Button>
          )}
          {isLast ? (
            <Button fullWidth size="lg" onClick={handleFinish} disabled={saving}>
              {saving ? 'Guardando...' : MESSAGES.completeAction}
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={() => setStep(step + 1)}>
              Siguiente <ChevronRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
