export type MetricType = 'counter' | 'boolean'
export type MetricCategory = 'salud' | 'dinero' | 'habitos' | 'relaciones' | 'aprender' | 'dejar'

export interface MetricTemplate {
  id: string
  title: string
  icon: string
  category: MetricCategory
  type: MetricType
  dailyTarget: number
  unit?: string
  description: string
}

export const METRIC_CATEGORIES: { id: MetricCategory; label: string; icon: string }[] = [
  { id: 'salud', label: 'Salud', icon: '💪' },
  { id: 'habitos', label: 'Hábitos', icon: '🔄' },
  { id: 'dinero', label: 'Dinero', icon: '💰' },
  { id: 'relaciones', label: 'Relaciones', icon: '💛' },
  { id: 'aprender', label: 'Aprender', icon: '📚' },
  { id: 'dejar', label: 'Dejar', icon: '🚫' },
]

export const METRIC_TEMPLATES: MetricTemplate[] = [
  // Salud
  { id: 'brush-teeth', title: 'Cepillarse los dientes', icon: '🪥', category: 'salud', type: 'counter', dailyTarget: 2, unit: 'veces', description: 'Mañana y noche' },
  { id: 'floss', title: 'Usar hilo dental', icon: '🦷', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Al menos una vez al día' },
  { id: 'sleep-before-11', title: 'Dormir antes de las 11', icon: '🌙', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'En la cama antes de las 23:00' },
  { id: 'sleep-7h', title: 'Dormir 7+ horas', icon: '😴', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Sueño reparador completo' },
  { id: 'water', title: 'Beber agua', icon: '💧', category: 'salud', type: 'counter', dailyTarget: 8, unit: 'vasos', description: '~2 litros al día' },
  { id: 'vegetables', title: 'Comer verduras', icon: '🥗', category: 'salud', type: 'counter', dailyTarget: 3, unit: 'porciones', description: 'En comidas principales' },
  { id: 'no-junk', title: 'Evitar ultraprocesados', icon: '🚫🍔', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Sin comida chatarra hoy' },
  { id: 'walk-30', title: 'Caminar 30 min', icon: '🚶', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Caminata activa' },
  { id: 'gym', title: 'Ir al gym / ejercicio', icon: '🏋️', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Entrenamiento de fuerza o cardio' },
  { id: 'stretch', title: 'Estiramientos', icon: '🧘', category: 'salud', type: 'boolean', dailyTarget: 1, description: '10 min mínimo' },
  { id: 'vitamins', title: 'Tomar vitaminas', icon: '💊', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Suplementos diarios' },
  { id: 'no-late-eating', title: 'No comer después de las 9', icon: '🍽️', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Ayuno nocturno' },
  { id: 'wake-early', title: 'Despertar temprano', icon: '⏰', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Antes de tu hora meta' },
  { id: 'steps-8k', title: '8,000 pasos', icon: '👟', category: 'salud', type: 'boolean', dailyTarget: 1, description: 'Actividad diaria' },
  { id: 'sunlight', title: 'Tomar sol / luz natural', icon: '☀️', category: 'salud', type: 'boolean', dailyTarget: 1, description: '15 min al aire libre' },

  // Hábitos
  { id: 'meditate', title: 'Meditar', icon: '🧠', category: 'habitos', type: 'boolean', dailyTarget: 1, description: '5-10 min de mindfulness' },
  { id: 'read-20', title: 'Leer 20 minutos', icon: '📖', category: 'habitos', type: 'boolean', dailyTarget: 1, description: 'Lectura sin distracciones' },
  { id: 'journal', title: 'Escribir en diario', icon: '📝', category: 'habitos', type: 'boolean', dailyTarget: 1, description: 'Reflexión o gratitud' },
  { id: 'no-phone-bed', title: 'Sin pantalla 1h antes de dormir', icon: '📵', category: 'habitos', type: 'boolean', dailyTarget: 1, description: 'Modo avión nocturno' },
  { id: 'plan-day', title: 'Planificar el día', icon: '📋', category: 'habitos', type: 'boolean', dailyTarget: 1, description: '3 prioridades claras' },
  { id: 'tidy-space', title: 'Ordenar espacio', icon: '🧹', category: 'habitos', type: 'boolean', dailyTarget: 1, description: '10 min de orden' },
  { id: 'deep-work', title: 'Bloque de enfoque profundo', icon: '🎯', category: 'habitos', type: 'counter', dailyTarget: 2, unit: 'bloques', description: '25-50 min sin interrupciones' },
  { id: 'review-day', title: 'Revisar el día', icon: '🔍', category: 'habitos', type: 'boolean', dailyTarget: 1, description: 'Qué salió bien, qué mejorar' },
  { id: 'cold-shower', title: 'Ducha fría', icon: '🚿', category: 'habitos', type: 'boolean', dailyTarget: 1, description: 'Al menos 30 segundos' },
  { id: 'make-bed', title: 'Tender la cama', icon: '🛏️', category: 'habitos', type: 'boolean', dailyTarget: 1, description: 'Primer logro del día' },

  // Dinero
  { id: 'log-expenses', title: 'Registrar gastos', icon: '📊', category: 'dinero', type: 'boolean', dailyTarget: 1, description: 'Anotar todo lo que gastaste' },
  { id: 'no-impulse', title: 'Sin compra impulsiva', icon: '🛒', category: 'dinero', type: 'boolean', dailyTarget: 1, description: 'Nada que no estaba planeado' },
  { id: 'save-daily', title: 'Ahorrar hoy', icon: '🏦', category: 'dinero', type: 'boolean', dailyTarget: 1, description: 'Transferir a ahorros' },
  { id: 'check-budget', title: 'Revisar presupuesto', icon: '💳', category: 'dinero', type: 'boolean', dailyTarget: 1, description: 'Estado financiero del mes' },
  { id: 'no-delivery', title: 'Sin delivery / comida fuera', icon: '🍕', category: 'dinero', type: 'boolean', dailyTarget: 1, description: 'Cocinar en casa' },

  // Relaciones
  { id: 'message-loved', title: 'Mensaje a alguien querido', icon: '💬', category: 'relaciones', type: 'boolean', dailyTarget: 1, description: 'Un mensaje genuino, no emoji suelto' },
  { id: 'call-family', title: 'Llamar a familia/amigo', icon: '📞', category: 'relaciones', type: 'boolean', dailyTarget: 1, description: 'Conversación real' },
  { id: 'quality-time', title: 'Tiempo quality sin pantalla', icon: '👥', category: 'relaciones', type: 'boolean', dailyTarget: 1, description: 'Presencia total con alguien' },
  { id: 'compliment', title: 'Dar un cumplido sincero', icon: '✨', category: 'relaciones', type: 'boolean', dailyTarget: 1, description: 'Reconocer algo en alguien' },
  { id: 'active-listen', title: 'Escuchar sin interrumpir', icon: '👂', category: 'relaciones', type: 'boolean', dailyTarget: 1, description: 'En al menos una conversación' },

  // Aprender
  { id: 'practice-skill', title: 'Practicar habilidad', icon: '🎨', category: 'aprender', type: 'boolean', dailyTarget: 1, description: 'Tu meta de aprendizaje' },
  { id: 'language-15', title: 'Idioma 15 min', icon: '🌍', category: 'aprender', type: 'boolean', dailyTarget: 1, description: 'Duolingo, podcast, etc.' },
  { id: 'online-course', title: 'Avanzar curso online', icon: '💻', category: 'aprender', type: 'boolean', dailyTarget: 1, description: 'Al menos una lección' },
  { id: 'podcast-edu', title: 'Podcast educativo', icon: '🎧', category: 'aprender', type: 'boolean', dailyTarget: 1, description: 'Aprender algo nuevo' },

  // Dejar
  { id: 'no-scroll-night', title: 'No scrollear de noche', icon: '📱', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Después de las 22:00' },
  { id: 'no-sugar', title: 'Sin azúcar añadida', icon: '🍬', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Evitar dulces y refrescos' },
  { id: 'no-alcohol', title: 'Sin alcohol', icon: '🍺', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Día limpio' },
  { id: 'no-procrastinate', title: 'Sin procrastinar lo importante', icon: '⏳', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Lo difícil primero' },
  { id: 'no-complain', title: 'Sin quejarme', icon: '🤐', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Enfocarse en soluciones' },
  { id: 'no-skip-meals', title: 'No saltar comidas', icon: '🥣', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Alimentación regular' },
  { id: 'say-no', title: 'Decir no cuando toca', icon: '🙅', category: 'dejar', type: 'boolean', dailyTarget: 1, description: 'Sin sobrecargarte' },
]

export function getTemplateById(id: string): MetricTemplate | undefined {
  return METRIC_TEMPLATES.find((t) => t.id === id)
}
