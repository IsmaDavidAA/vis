import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/telegram.ts'

type Difficulty = 'easy' | 'medium' | 'hard'

interface GenerateBody {
  goal: string
  category: string
  difficulty: Difficulty
  context?: string
  count?: number
  excludeTitles?: string[]
}

interface RawMetric {
  title?: string
  description?: string
  icon?: string
  type?: string
  dailyTarget?: number
  unit?: string
  templateId?: string
}

const DIFFICULTY_COUNT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

const CATEGORY_LABELS: Record<string, string> = {
  salud: 'Salud y cuerpo',
  dinero: 'Dinero y finanzas',
  aprender: 'Aprender algo nuevo',
  relaciones: 'Relaciones',
  dejar: 'Dejar un hábito',
}

const EXISTING_TEMPLATES = [
  { id: 'brush-teeth', title: 'Cepillarse los dientes', category: 'salud' },
  { id: 'sleep-before-11', title: 'Dormir antes de las 11', category: 'salud' },
  { id: 'water', title: 'Beber agua', category: 'salud' },
  { id: 'gym', title: 'Ir al gym / ejercicio', category: 'salud' },
  { id: 'walk-30', title: 'Caminar 30 min', category: 'salud' },
  { id: 'log-expenses', title: 'Registrar gastos', category: 'dinero' },
  { id: 'no-impulse', title: 'Sin compra impulsiva', category: 'dinero' },
  { id: 'save-daily', title: 'Ahorrar hoy', category: 'dinero' },
  { id: 'practice-skill', title: 'Practicar habilidad', category: 'aprender' },
  { id: 'language-15', title: 'Idioma 15 min', category: 'aprender' },
  { id: 'read-20', title: 'Leer 20 minutos', category: 'habitos' },
  { id: 'message-loved', title: 'Mensaje a alguien querido', category: 'relaciones' },
  { id: 'no-scroll-night', title: 'No scrollear de noche', category: 'dejar' },
  { id: 'no-sugar', title: 'Sin azúcar añadida', category: 'dejar' },
]

function buildPrompt(body: GenerateBody): string {
  const count = body.count ?? DIFFICULTY_COUNT[body.difficulty]
  const label = CATEGORY_LABELS[body.category] ?? body.category
  const templates = EXISTING_TEMPLATES.filter(
    (t) => t.category === body.category || (body.category === 'salud' && t.category === 'salud'),
  )
  const exclude = body.excludeTitles?.length
    ? `\nNO repitas estas métricas ya usadas: ${body.excludeTitles.join(', ')}`
    : ''

  return `Eres un coach de hábitos para la app VIS (productividad personal en español).

Meta del usuario en "${label}": "${body.goal}"
${body.context ? `Contexto extra: ${body.context}` : ''}
${exclude}

Nivel de dificultad del plan: ${body.difficulty === 'easy' ? 'Sencillo' : body.difficulty === 'medium' ? 'Medio' : 'Difícil'}

Genera EXACTAMENTE ${count} métrica(s) diarias concretas, medibles y realistas para cumplir esa meta.

Reglas:
- Responde SOLO JSON válido, sin markdown
- Cada métrica debe ser accionable hoy mismo
- Usa emojis como icon (1 emoji)
- type: "boolean" (sí/no) o "counter" (contador)
- dailyTarget: 1 para boolean; para counter usa 2-8 según tenga sentido
- Si una métrica encaja con plantilla existente, incluye templateId
- Títulos cortos (máx 40 chars), descripciones claras (máx 80 chars)

Plantillas existentes (opcional templateId):
${JSON.stringify(templates)}

Formato:
{"metrics":[{"title":"...","description":"...","icon":"💪","type":"boolean","dailyTarget":1,"templateId":null}]}`
}

function normalizeMetrics(raw: RawMetric[], count: number) {
  return raw.slice(0, count).map((m) => ({
    title: String(m.title ?? 'Hábito diario').slice(0, 60),
    description: String(m.description ?? '').slice(0, 120),
    icon: String(m.icon ?? '✨').slice(0, 4),
    type: m.type === 'counter' ? 'counter' as const : 'boolean' as const,
    dailyTarget: Math.max(1, Math.min(20, Number(m.dailyTarget) || 1)),
    unit: m.unit ? String(m.unit) : undefined,
    templateId: m.templateId ? String(m.templateId) : undefined,
  }))
}

function parseAiJson(content: string): RawMetric[] {
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.metrics)) return parsed.metrics
  return []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = (await req.json()) as GenerateBody
    if (!body?.goal?.trim() || !body?.category || !body?.difficulty) {
      return json({ error: 'Faltan goal, category o difficulty' }, 400)
    }

    if (!apiKey) {
      return json({ error: 'DEEPSEEK_API_KEY no configurada', fallback: true }, 503)
    }

    const prompt = buildPrompt(body)
    const targetCount = body.count ?? DIFFICULTY_COUNT[body.difficulty]

    const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Respondes únicamente JSON válido en español. Sin explicaciones extra.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: false,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('DeepSeek error:', errText)
      return json({ error: 'Error al llamar DeepSeek', fallback: true }, 502)
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content ?? ''
    let metrics: RawMetric[] = []

    try {
      metrics = parseAiJson(content)
    } catch {
      console.error('Parse error:', content)
      return json({ error: 'Respuesta IA inválida', fallback: true }, 502)
    }

    if (metrics.length === 0) {
      return json({ error: 'Sin métricas generadas', fallback: true }, 502)
    }

    return json({
      metrics: normalizeMetrics(metrics, targetCount),
      source: 'deepseek',
    })
  } catch (err) {
    console.error(err)
    return json({ error: String(err), fallback: true }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
