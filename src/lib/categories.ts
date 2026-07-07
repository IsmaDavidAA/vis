import { METRIC_CATEGORIES, type MetricCategory } from '../data/metricTemplates'
import type { UserMetricCategory } from '../types'

export type CategoryOption = {
  id: string
  label: string
  icon: string
  isCustom?: boolean
}

export function getAllCategories(custom: UserMetricCategory[] = []): CategoryOption[] {
  const builtIn: CategoryOption[] = METRIC_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
  }))
  const extra: CategoryOption[] = custom.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    isCustom: true,
  }))
  return [...builtIn, ...extra]
}

export function getCategoryLabel(
  categoryId: string | null | undefined,
  custom: UserMetricCategory[] = [],
): { label: string; icon: string } {
  if (!categoryId) return { label: 'General', icon: '✨' }
  const builtIn = METRIC_CATEGORIES.find((c) => c.id === categoryId)
  if (builtIn) return { label: builtIn.label, icon: builtIn.icon }
  const customCat = custom.find((c) => c.id === categoryId)
  if (customCat) return { label: customCat.label, icon: customCat.icon }
  return { label: 'General', icon: '✨' }
}

export function isBuiltInCategory(id: string): id is MetricCategory {
  return METRIC_CATEGORIES.some((c) => c.id === id)
}
