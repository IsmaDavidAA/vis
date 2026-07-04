import { getTemplateById } from '../data/metricTemplates'
import type { MetricTemplate } from '../data/metricTemplates'
import type { UserMetric } from '../types'

export function resolveMetricTemplate(metric: UserMetric): MetricTemplate | null {
  if (metric.is_custom || metric.template_id.startsWith('custom-')) {
    if (!metric.custom_title) return null
    return {
      id: metric.template_id,
      title: metric.custom_title,
      icon: metric.custom_icon ?? '✨',
      category: (metric.goal_category as MetricTemplate['category']) ?? 'habitos',
      type: metric.custom_type ?? 'boolean',
      dailyTarget: metric.daily_target,
      unit: metric.custom_unit ?? undefined,
      description: metric.custom_description ?? '',
    }
  }

  return getTemplateById(metric.template_id) ?? null
}
