export type CalendarStatsMetric =
  | 'tracked_hours'
  | 'planned_later'
  | 'total_with_planned'
  | 'event_count'
  | 'average_event_duration'

export type CalendarStatsRow = {
  key: CalendarStatsMetric
  label: string
  hint: string
  value: string
}

export const ALL_CALENDAR_STATS_METRICS: CalendarStatsMetric[] = [
  'tracked_hours',
  'planned_later',
  'total_with_planned',
  'event_count',
  'average_event_duration',
]

export const DEFAULT_CALENDAR_STATS_METRICS: CalendarStatsMetric[] = [
  'tracked_hours',
  'planned_later',
  'event_count',
  'average_event_duration',
]

export function parseCalendarStatsMetrics(input: any): CalendarStatsMetric[] {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : []
  const allowed = new Set<CalendarStatsMetric>(ALL_CALENDAR_STATS_METRICS)
  const metrics = Array.from(new Set(raw.map((value) => String(value).trim()).filter((value): value is CalendarStatsMetric => allowed.has(value as CalendarStatsMetric))))
  return metrics.length ? metrics : [...DEFAULT_CALENDAR_STATS_METRICS]
}

export function buildCalendarStatsRows(byCal: any[], metrics?: CalendarStatsMetric[], rangeLabel = ''): CalendarStatsRow[] {
  const totals = (byCal || []).reduce((sum, row) => {
    sum.tracked += positive(row?.total_hours)
    sum.planned += positive(row?.future_hours ?? row?.planned_hours)
    sum.events += positive(row?.events_count ?? row?.events)
    return sum
  }, { tracked: 0, planned: 0, events: 0 })
  const selected = parseCalendarStatsMetrics(metrics)
  const within = rangeLabel ? `Within ${rangeLabel.toLowerCase()}` : 'Within current range'
  return selected.map((metric) => {
    switch (metric) {
      case 'tracked_hours': return { key: metric, label: 'Tracked time', hint: 'Already elapsed', value: formatHours(totals.tracked) }
      case 'planned_later': return { key: metric, label: 'Planned later', hint: 'Still upcoming', value: formatHours(totals.planned) }
      case 'total_with_planned': return { key: metric, label: 'Total incl. planned', hint: within, value: formatHours(totals.tracked + totals.planned) }
      case 'event_count': return { key: metric, label: 'Events', hint: within, value: formatNumber(totals.events) }
      case 'average_event_duration': return { key: metric, label: 'Avg. event', hint: 'Tracked time per event', value: totals.events > 0 ? formatHours(totals.tracked / totals.events) : '—' }
    }
  })
}

function positive(value: any): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function formatHours(value: number): string {
  return `${Number(value.toFixed(1))} h`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value))
}
