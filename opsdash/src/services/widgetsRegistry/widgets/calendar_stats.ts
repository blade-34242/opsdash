import { defineAsyncComponent } from 'vue'
import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'
import { ALL_CALENDAR_STATS_METRICS, DEFAULT_CALENDAR_STATS_METRICS, parseCalendarStatsMetrics } from '../../calendarStats'

const CalendarStatsWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/calendar/CalendarStatsWidget.vue').then((m) => m.default),
)

const baseTitle = 'Calendar stats'

export const calendarStatsEntry: RegistryEntry = {
  component: CalendarStatsWidget,
  defaultLayout: { width: 'half', height: 'm', order: 54 },
  label: 'Calendar stats',
  category: 'Time',
  baseTitle,
  configurable: true,
  defaultOptions: { metrics: [...DEFAULT_CALENDAR_STATS_METRICS] },
  controls: [{ key: 'metrics', label: 'Metrics', type: 'multiselect', options: [] }],
  dynamicControls: () => [{
    key: 'metrics',
    label: 'Metrics',
    type: 'multiselect',
    options: ALL_CALENDAR_STATS_METRICS.map((value) => ({ value, label: metricLabel(value) })),
  }],
  buildProps: (def, ctx) => ({
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    showHeader: def.options?.showHeader !== false,
    metrics: parseCalendarStatsMetrics(def.options?.metrics),
    byCal: ctx.byCal || [],
    rangeLabel: ctx.rangeLabel || '',
  }),
}

function metricLabel(metric: string): string {
  return {
    tracked_hours: 'Tracked time',
    planned_later: 'Planned later',
    total_with_planned: 'Total incl. planned',
    event_count: 'Events',
    average_event_duration: 'Average event duration',
  }[metric] || metric
}
