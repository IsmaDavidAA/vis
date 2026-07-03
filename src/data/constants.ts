import type { GoalCategory, Month } from '../types'

export const GOAL_CATEGORIES: {
  id: GoalCategory
  title: string
  subtitle: string
  icon: string
  color: string
  presets: string[]
}[] = [
  {
    id: 'salud',
    title: 'Salud y cuerpo',
    subtitle: 'Escribe lo que de verdad quieres para diciembre. Mantenlo simple. Realista.',
    icon: '💪',
    color: '#52b788',
    presets: [
      'Despertarme más temprano',
      'Crear el hábito del gym',
      'Comer más en casa',
      'Dormir antes de las 11',
      'Tomar más agua',
      'Caminar todos los días',
    ],
  },
  {
    id: 'dinero',
    title: 'Dinero',
    subtitle: 'No metas. Realidad. ¿Cómo quieres que se vea tu situación financiera para diciembre?',
    icon: '💰',
    color: '#40916c',
    presets: [
      'Empezar a ahorrar de verdad',
      'Registrar mis gastos',
      'Recortar un gasto',
      'Crear una fuente extra de ingreso',
      'Reducir deudas',
      'Tener fondo de emergencia',
    ],
  },
  {
    id: 'aprender',
    title: 'Algo que quieres aprender',
    subtitle: 'Una habilidad. En serio, solo una.',
    icon: '📚',
    color: '#74c69d',
    presets: [
      'Cocinar mejor',
      'Finanzas básicas',
      'Un idioma nuevo',
      'Manejar',
      'Hablar en público',
      'Edición',
      'Escritura',
    ],
  },
  {
    id: 'relaciones',
    title: 'Relaciones',
    subtitle: '¿Quién merece más de ti antes de que termine diciembre?',
    icon: '💛',
    color: '#95d5b2',
    presets: [],
  },
  {
    id: 'dejar',
    title: 'Algo que quieres dejar',
    subtitle: 'Una cosa que te está drenando en silencio.',
    icon: '🚫',
    color: '#b7e4c7',
    presets: [
      'Scrollear tarde en la noche',
      'Gastar de más los fines de semana',
      'Sacrificar sueño',
      'Aislarme',
      'Sobrepensar decisiones',
      'Decir que sí cuando quiero decir no',
    ],
  },
]

export const MONTHS: { id: Month; label: string }[] = [
  { id: 'julio', label: 'Julio' },
  { id: 'agosto', label: 'Agosto' },
  { id: 'septiembre', label: 'Septiembre' },
  { id: 'octubre', label: 'Octubre' },
  { id: 'noviembre', label: 'Noviembre' },
  { id: 'diciembre', label: 'Diciembre' },
]

export const DEFAULT_PRIZES = [
  { id: '1', title: 'Desayuno en cama', description: 'El otro te prepara desayuno un domingo. Sin excusas.', icon: '🥐', color: '#fbbf24', is_double: true },
  { id: '2', title: 'Elige la película', description: 'Tú eliges peli o serie. El otro ve sin quejarse.', icon: '🎬', color: '#6366f1', is_double: true },
  { id: '3', title: 'Masaje de 15 min', description: 'El otro te da masaje de hombros y espalda. Timer incluido.', icon: '💆', color: '#ec4899', is_double: true },
  { id: '4', title: 'Semana sin platos', description: 'El otro lava los platos toda la semana. Tú solo miras.', icon: '🫧', color: '#38bdf8', is_double: true },
  { id: '5', title: 'Paseo a tu elección', description: 'Eliges ruta, parque o lugar. Van juntos, gratis.', icon: '🌳', color: '#22c55e', is_double: true },
  { id: '6', title: 'Carta de gratitud', description: 'El otro te escribe una carta bonita a mano. Sin ChatGPT.', icon: '💌', color: '#f472b6', is_double: true },
  { id: '7', title: 'Café por 3 mañanas', description: 'El otro te prepara café o té 3 mañanas seguidas.', icon: '☕', color: '#a16207', is_double: true },
  { id: '8', title: 'Noche de juegos', description: 'Tú eliges el juego de mesa o cartas. Juegan juntos.', icon: '🎲', color: '#8b5cf6', is_double: true },
  { id: '9', title: 'Cocina mi favorito', description: 'El otro cocina tu platillo favorito. Tú eliges cuál.', icon: '🍲', color: '#ef4444', is_double: true },
  { id: '10', title: '3 favores canjeables', description: 'Guardas 3 favores pequeños: hacer la cama, un errand, lo que sea.', icon: '🎟️', color: '#14b8a6', is_double: true },
  { id: '11', title: 'Tarde planificada gratis', description: 'Tú planeas una tarde sin gastar: picnic, parque, biblioteca.', icon: '🧺', color: '#84cc16', is_double: true },
  { id: '12', title: 'Karaoke en casa', description: 'Eliges 5 canciones. Cantan juntos en la sala.', icon: '🎤', color: '#e879f9', is_double: true },
  { id: '13', title: 'Fotos tontas en el parque', description: '30 min de fotos divertidas juntos. El otro no puede poner cara seria.', icon: '📸', color: '#0ea5e9', is_double: true },
  { id: '14', title: 'Playlist para manejar', description: 'Armas la playlist. Manejan juntos a donde quieras.', icon: '🎧', color: '#a855f7', is_double: true },
  { id: '15', title: 'Un sábado tú mandas', description: 'Tú decides qué hacen un sábado completo. Sin gastar mucho.', icon: '👑', color: '#f59e0b', is_double: true },
  { id: '16', title: 'Gloria eterna', description: 'El otro admite en voz alta que ganaste. Una vez. Con testigos.', icon: '🏅', color: '#eab308', is_double: true },
]

export const PRIZE_UNLOCK_POINTS = 50

export const POINTS = {
  COMPLETE: 10,
  STREAK_BONUS: 5,
  FAIL_PENALTY: -5,
  NON_NEGOTIABLE_BONUS: 15,
} as const

export const MAX_LIVES = 5
