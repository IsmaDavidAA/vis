import { DEFAULT_PRIZES } from '../data/constants'
import type { Prize } from '../types'

export function getDefaultPrizes(): Prize[] {
  return DEFAULT_PRIZES.map((p) => ({ ...p }))
}

export function canUnlockPrize(
  prize: Prize,
  streak: number,
  totalPoints: number,
  collectedIds: string[],
): { ok: boolean; reason?: string } {
  if (collectedIds.includes(prize.id)) {
    return { ok: false, reason: 'Ya lo tienes' }
  }
  if (streak < prize.streakRequired) {
    return { ok: false, reason: `Necesitas racha de ${prize.streakRequired} días` }
  }
  const minPoints = prize.streakRequired * 5
  if (totalPoints < minPoints) {
    return { ok: false, reason: `Necesitas al menos ${minPoints} pts` }
  }
  const earnedSlots = Math.floor(streak / 3)
  if (collectedIds.length >= earnedSlots) {
    return { ok: false, reason: 'Suma más días de racha para otra figurita' }
  }
  return { ok: true }
}

export function nextStreakUnlock(collectedCount: number): number {
  return (collectedCount + 1) * 3
}
