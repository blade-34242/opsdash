import { defineAsyncComponent } from 'vue'

const DayOffTrendCard = defineAsyncComponent(() =>
  import('../../../components/widgets/cards/DayOffTrendCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'
import { parseIdList } from './chartHelpers'

const baseTitle = 'Time Off Trend'

type DayOffTrendEntry = {
  offset: number
  label: string
  from: string
  to: string
  totalDays: number
  daysOff: number
  daysWorked: number
}

function normalizeTrend(input: any): DayOffTrendEntry[] {
  if (!Array.isArray(input)) return []
  return input
    .map((entry: any) => ({
      offset: Number(entry?.offset ?? 0),
      label: String(entry?.label ?? ''),
      from: String(entry?.from ?? ''),
      to: String(entry?.to ?? ''),
      totalDays: Math.max(0, Number(entry?.totalDays ?? 0) || 0),
      daysOff: Math.max(0, Number(entry?.daysOff ?? 0) || 0),
      daysWorked: Math.max(0, Number(entry?.daysWorked ?? 0) || 0),
    }))
    .filter((entry) => entry.totalDays > 0)
}

function excludedCalendarIds(options: Record<string, any> | undefined, ctx: any): Set<string> {
  const excluded = new Set(parseIdList(options?.ignoreCalendarIds))
  const ignoredCategories = new Set(parseIdList(options?.ignoreCategoryIds))
  if (!ignoredCategories.size) return excluded

  const categoryByCalendar = ctx?.calendarCategoryMap || {}
  Object.entries(categoryByCalendar).forEach(([calendarId, categoryId]) => {
    if (ignoredCategories.has(String(categoryId))) excluded.add(calendarId)
  })
  return excluded
}

export function buildFilteredDayOffTrend(
  trend: any,
  seriesByOffset: any,
  excluded: Set<string>,
): DayOffTrendEntry[] {
  const baseline = normalizeTrend(trend)
  if (!excluded.size || !Array.isArray(seriesByOffset)) return baseline

  const seriesByPeriod = new Map(
    seriesByOffset
      .filter((period: any) => Number.isFinite(Number(period?.offset)))
      .map((period: any) => [Number(period.offset), period]),
  )

  return baseline.map((entry) => {
    const period = seriesByPeriod.get(entry.offset)
    // Keep only an unavailable period at its server value. Other periods must
    // still react to the widget's filters.
    if (!period) return entry
    const labels = Array.isArray(period?.labels) ? period.labels.map((value: any) => String(value)) : []
    const series = Array.isArray(period?.series) ? period.series : []
    const visibleIndexes = labels
      .map((date, index) => ({ date, index }))
      .filter(({ date }) => date >= entry.from && date <= entry.to)
      .map(({ index }) => index)

    if (visibleIndexes.length !== entry.totalDays) return entry

    const includedSeries = series.filter((row: any) => !excluded.has(String(row?.id ?? '')))
    const daysWorked = visibleIndexes.reduce((count, index) => {
      const total = includedSeries.reduce((sum: number, row: any) => sum + Math.max(0, Number(row?.data?.[index] ?? 0) || 0), 0)
      return total > 0.01 ? count + 1 : count
    }, 0)

    return {
      ...entry,
      daysWorked,
      daysOff: Math.max(0, entry.totalDays - daysWorked),
    }
  })
}

export const dayOffTrendEntry: RegistryEntry = {
  component: DayOffTrendCard,
  defaultLayout: { width: 'quarter', height: 's', order: 45 },
  heightMode: 'auto',
  label: 'Time Off Trend',
  category: 'Time' as const,
  baseTitle,
  configurable: true,
  defaultOptions: {
    reverseOrder: false,
    labelMode: 'period',
    interpretation: 'more_off_positive',
    toneLowColor: '#dc2626',
    toneHighColor: '#16a34a',
    ignoreCalendarIds: [],
    ignoreCategoryIds: [],
  },
  controls: [
    { key: 'reverseOrder', label: 'Newest first', type: 'toggle' },
    {
      key: 'labelMode',
      label: 'Trend label',
      type: 'select',
      options: [
        { value: 'date', label: 'Date range' },
        { value: 'period', label: 'Week/Month' },
        { value: 'offset', label: 'Offset only' },
      ],
    },
    {
      key: 'interpretation',
      label: 'Interpretation',
      type: 'select',
      options: [
        { value: 'more_off_positive', label: 'More off = positive' },
        { value: 'more_off_warning', label: 'More off = warning' },
      ],
    },
    { key: 'toneLowColor', label: 'Low % color', type: 'color' },
    { key: 'toneHighColor', label: 'High % color', type: 'color' },
  ],
  dynamicControls: (_options, ctx) => {
    const calendars = Array.isArray(ctx?.calendars)
      ? ctx.calendars.map((calendar: any) => ({
        value: String(calendar?.id ?? ''),
        label: String(calendar?.displayname || calendar?.name || calendar?.id || ''),
      })).filter((option) => option.value)
      : []
    const categories = Array.isArray(ctx?.calendarGroups)
      ? ctx.calendarGroups.map((category: any) => ({
        value: String(category?.id ?? ''),
        label: String(category?.label || category?.id || ''),
      })).filter((option) => option.value)
      : []
    return [
      { key: 'ignoreCalendarIds', label: 'Ignore calendars', type: 'multiselect', options: calendars },
      { key: 'ignoreCategoryIds', label: 'Ignore categories', type: 'multiselect', options: categories },
    ]
  },
  buildProps: (def, ctx) => ({
    trend: buildFilteredDayOffTrend(
      ctx.activityDayOffTrend,
      ctx.charts?.perDaySeriesByOffset,
      excludedCalendarIds(def.options, ctx),
    ),
    unit: ctx.activityTrendUnit ?? 'wk',
    lookback: ctx.activityDayOffLookback ?? 3,
    showHeader: def.options?.showHeader !== false,
    reverseOrder: def.options?.reverseOrder === true,
    labelMode: def.options?.labelMode,
    interpretation: def.options?.interpretation,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    toneLowColor: def.options?.toneLowColor,
    toneHighColor: def.options?.toneHighColor,
  }),
}
