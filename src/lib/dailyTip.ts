import { DAILY_TIPS, type DailyTip } from '../data/dailyTips'

/** Deterministic daily tip — same tip all day, changes at midnight */
export function getDailyTip(date: Date = new Date()): DailyTip {
  const seed =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate()
  const index = seed % DAILY_TIPS.length
  return DAILY_TIPS[index]
}

/** Optional: personalized tip based on user id + date */
export function getDailyTipForUser(userId: string, date: Date = new Date()): DailyTip {
  let hash = 0
  const key = `${userId}-${date.toISOString().split('T')[0]}`
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % DAILY_TIPS.length
  return DAILY_TIPS[index]
}
