import type { GoalCategory, Month, Prize } from '../types'

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

/** Premios dobles sencillos — se desbloquean con racha de hábitos */
export const DEFAULT_PRIZES: Prize[] = [
  { id: '1', title: 'Elegir la música', description: 'Tú pones la playlist en el carro o en casa. Sin quejas.', icon: '🎵', color: '#a855f7', is_double: true, streakRequired: 3 },
  { id: '2', title: 'Abrazo de 20 seg', description: 'El otro te debe un abrazo largo. Timer en el cel.', icon: '🤗', color: '#f472b6', is_double: true, streakRequired: 5 },
  { id: '3', title: 'Té o café hecho', description: 'Te preparan tu bebida favorita una mañana.', icon: '☕', color: '#a16207', is_double: true, streakRequired: 7 },
  { id: '4', title: 'Mensaje bonito', description: 'Un mensaje de voz o texto que te haga sonreír.', icon: '💬', color: '#38bdf8', is_double: true, streakRequired: 10 },
  { id: '5', title: 'Elegir película', description: 'Tú eliges qué ver. El otro no cambia el canal.', icon: '🎬', color: '#6366f1', is_double: true, streakRequired: 12 },
  { id: '6', title: '5 min de masaje', description: 'Hombros o espalda. Solo 5 min, pero con ganas.', icon: '💆', color: '#ec4899', is_double: true, streakRequired: 14 },
  { id: '7', title: 'Favor pequeño', description: 'Un favor sencillo: traer algo, guardar algo, lo que pidas.', icon: '🎟️', color: '#14b8a6', is_double: true, streakRequired: 17 },
  { id: '8', title: 'Cocinar juntos', description: 'Cocinan algo fácil juntos. Tú eliges el menú.', icon: '🍳', color: '#ef4444', is_double: true, streakRequired: 21 },
  { id: '9', title: 'Paseo corto', description: '15 min caminando juntos. Tú eliges la ruta.', icon: '🚶', color: '#22c55e', is_double: true, streakRequired: 24 },
  { id: '10', title: 'Cartita escrita', description: 'Una nota a mano. Corta pero sincera.', icon: '💌', color: '#f472b6', is_double: true, streakRequired: 28 },
  { id: '11', title: 'Noche de juegos', description: 'Cartas, dominó o lo que tengan. Tú eliges.', icon: '🎲', color: '#8b5cf6', is_double: true, streakRequired: 30 },
  { id: '12', title: 'Desayuno sorpresa', description: 'Te preparan algo simple para desayunar un día.', icon: '🥐', color: '#fbbf24', is_double: true, streakRequired: 35 },
  { id: '13', title: 'Selfie tonta', description: 'Foto graciosa juntos. Sin filtros exagerados.', icon: '📸', color: '#0ea5e9', is_double: true, streakRequired: 40 },
  { id: '14', title: 'Una hora libre', description: 'El otro cubre una tarea tuya por 1 hora.', icon: '⏰', color: '#84cc16', is_double: true, streakRequired: 45 },
  { id: '15', title: 'Elogio en voz alta', description: 'Te dicen algo bueno frente a alguien más.', icon: '✨', color: '#eab308', is_double: true, streakRequired: 50 },
  { id: '16', title: 'Gloria del reto', description: 'Admiten que vas ganando el reto de hábitos. Una vez.', icon: '🏅', color: '#f59e0b', is_double: true, streakRequired: 60 },
]

export const PRIZE_UNLOCK_POINTS = 50

export const POINTS = {
  COMPLETE: 10,
  STREAK_BONUS: 5,
  FAIL_PENALTY: -5,
  NON_NEGOTIABLE_BONUS: 15,
} as const

export const MAX_LIVES = 5
