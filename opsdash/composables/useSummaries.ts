import { computed, type ComputedRef, type Ref } from 'vue'
import type { TargetsProgress } from '../src/services/targets'

export interface TimeSummary {
  rangeLabel: string
  rangeStart: string
  rangeEnd: string
  offset: number
  totalHours: number
  futureHours: number
  avgDay: number
  avgEvent: number
  medianDay: number
  todayActualHours: number
  todayPlannedHours: number
  busiest: { date?: string; hours?: number } | null
  workdayAvg: number
  workdayMedian: number
  weekendAvg: number
  weekendMedian: number
  weekendShare: number | null
  activeCalendars: number
  calendarSummary: string
  balanceIndex: number | null
  delta: {
    totalHours: number
    avgPerDay: number
    avgPerEvent: number
    events: number
  } | null
  topCategory: {
    label: string
    actualHours: number
    targetHours: number
    percent: number
    statusLabel: string
    status: TargetsProgress['status']
    color?: string
  } | null
}

export interface ActivitySummary {
  rangeLabel: string
  events: number
  activeDays: number | null
  typicalStart: string | null
  typicalEnd: string | null
  weekendShare: number | null
  eveningShare: number | null
  delta: {
    weekendShare: number | null
    eveningShare: number | null
  } | null
  earliestStart: string | null
  latestEnd: string | null
  overlapEvents: number | null
  longestSession: number | null
  lastDayOff: string | null
  lastHalfDayOff: string | null
}

export interface ActivityDayOffTrendEntry {
  offset: number
  label: string
  from: string
  to: string
  totalDays: number
  daysOff: number
  daysWorked: number
}

export interface TopSlice {
  name: string
  share: number
}

export function safeInt(value: any): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num)
}

export function numOrNull(value: any): number | null {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function stringOrNull(value: any): string | null {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

interface UseSummariesInput {
  stats: any
  byDay: Ref<any[]>
  charts: Ref<any>
  calendars: Ref<any[]>
  selected: Ref<string[]>
  rangeLabel: ComputedRef<string>
  rangeStart: Ref<string>
  rangeEnd: Ref<string>
  offset: Ref<number>
  activeDayMode: Ref<'active' | 'all'>
  topCategory: ComputedRef<{
    id: string
    label: string
    summary: TargetsProgress
    color?: string
  } | null>
}

export function useSummaries(input: UseSummariesInput) {
  const topThree = computed<TopSlice[]>(() => {
    const pie: any = input.charts.value?.pie
    if (!pie || !Array.isArray(pie.data) || !Array.isArray(pie.labels)) return []
    const data = pie.data.map((v: any) => Number(v) || 0)
    const labels = pie.labels.map((s: any) => String(s || ''))
    const total = data.reduce((a: number, b: number) => a + Math.max(0, b), 0)
    if (total <= 0) return []
    const items = data.map((v: number, i: number) => ({ name: labels[i] || '', value: Math.max(0, v) }))
    items.sort((a, b) => b.value - a.value)
    return items.slice(0, 3).map((it) => ({ name: it.name, share: (it.value / total) * 100 }))
  })

  const calendarSummary = computed(() => {
    if (topThree.value.length) {
      return topThree.value.map((slice) => `${slice.name} ${formatPercent(slice.share)}`).join(', ')
    }
    const top = (input.stats as any)?.top_calendar
    if (top && top.calendar) {
      const share = Number(top.share ?? 0)
      return `${top.calendar} ${formatPercent(share)}`
    }
    return ''
  })

  const activeCalendarsCount = computed(
    () => input.selected.value.length || (input.calendars.value?.length ?? 0),
  )

  const visibleByDayRows = computed(() => {
    const rows = Array.isArray(input.byDay.value) ? input.byDay.value : []
    const clipped = Boolean((input.stats as any)?.current_period_clipped)
    const cutoffRaw = String((input.stats as any)?.current_cutoff ?? '').trim()
    const cutoffDate = cutoffRaw ? cutoffRaw.slice(0, 10) : ''
    if (!clipped || !cutoffDate) return rows
    return rows.filter((row: any) => String(row?.date ?? '') <= cutoffDate)
  })

  const dailyTotals = computed(() =>
    visibleByDayRows.value.map((d: any) => Number(d?.total_hours ?? d?.hours ?? 0)),
  )

  const filteredDailyTotals = computed(() => {
    const values = dailyTotals.value.map((v) => Number(v) || 0)
    if (input.activeDayMode.value === 'active') {
      return values.filter((v) => v > 0)
    }
    return values
  })

  const workdayTotals = computed(() =>
    visibleByDayRows.value
      .filter((d: any) => {
        const dow = dayOfWeek(String(d?.date))
        return dow >= 1 && dow <= 5
      })
      .map((d: any) => Number(d?.total_hours ?? d?.hours ?? 0)),
  )

  const weekendTotals = computed(() =>
    visibleByDayRows.value
      .filter((d: any) => {
        const dow = dayOfWeek(String(d?.date))
        return dow === 0 || dow === 6
      })
      .map((d: any) => Number(d?.total_hours ?? d?.hours ?? 0)),
  )

  const workdayValues = computed(() =>
    input.activeDayMode.value === 'active'
      ? workdayTotals.value.filter((v) => v > 0)
      : workdayTotals.value,
  )
  const weekendValues = computed(() =>
    input.activeDayMode.value === 'active'
      ? weekendTotals.value.filter((v) => v > 0)
      : weekendTotals.value,
  )

  const balanceIndex = computed(() => {
    const raw =
      (input.stats as any)?.balance_index ??
      (input.stats as any)?.balanceIndex ??
      (input.stats as any)?.balance_overview?.index
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  })

  const timeSummary = computed<TimeSummary>(() => ({
    rangeLabel: input.rangeLabel.value,
    rangeStart: input.rangeStart.value,
    rangeEnd: input.rangeEnd.value,
    offset: input.offset.value,
    totalHours: Number((input.stats as any)?.total_hours ?? 0),
    futureHours: Number((input.stats as any)?.future_hours ?? 0),
    avgDay: avg(filteredDailyTotals.value),
    avgEvent: Number((input.stats as any)?.avg_per_event ?? 0),
    medianDay: median(filteredDailyTotals.value),
    todayActualHours: Number((input.stats as any)?.today_actual_hours ?? 0),
    todayPlannedHours: Number((input.stats as any)?.today_future_hours ?? 0),
    busiest: (input.stats as any)?.busiest_day ?? null,
    workdayAvg: avg(workdayValues.value),
    workdayMedian: median(workdayValues.value),
    weekendAvg: avg(weekendValues.value),
    weekendMedian: median(weekendValues.value),
    weekendShare: (input.stats as any)?.weekend_share ?? null,
    activeCalendars: activeCalendarsCount.value,
    calendarSummary: calendarSummary.value,
    balanceIndex: balanceIndex.value,
    delta: (() => {
      const raw: any = (input.stats as any)?.delta
      if (!raw || typeof raw !== 'object') return null
      return {
        totalHours: numOrNull(raw.total_hours) ?? 0,
        avgPerDay: numOrNull(raw.avg_per_day) ?? 0,
        avgPerEvent: numOrNull(raw.avg_per_event) ?? 0,
        events: safeInt(raw.events),
      }
    })(),
    topCategory: input.topCategory.value
      ? {
          label: input.topCategory.value.label,
          actualHours: input.topCategory.value.summary.actualHours,
          targetHours: input.topCategory.value.summary.targetHours,
          percent: input.topCategory.value.summary.percent,
          statusLabel: input.topCategory.value.summary.statusLabel,
          status: input.topCategory.value.summary.status,
          color: input.topCategory.value.color,
        }
      : null,
  }))

  const activitySummary = computed<ActivitySummary>(() => {
    const raw: any = input.stats
    const deltaRaw: any = raw?.delta
    const weekendDelta = numOrNull(deltaRaw?.weekend_share ?? deltaRaw?.weekendShare)
    const eveningDelta = numOrNull(deltaRaw?.evening_share ?? deltaRaw?.eveningShare)
    const delta =
      weekendDelta != null || eveningDelta != null
        ? {
            weekendShare: weekendDelta,
            eveningShare: eveningDelta,
          }
        : null
    return {
      rangeLabel: input.rangeLabel.value,
      events: safeInt(raw.events),
      activeDays: numOrNull(raw.active_days),
      typicalStart: stringOrNull(raw.typical_start),
      typicalEnd: stringOrNull(raw.typical_end),
      weekendShare: numOrNull(raw.weekend_share),
      eveningShare: numOrNull(raw.evening_share),
      delta,
      earliestStart: stringOrNull(raw.earliest_start),
      latestEnd: stringOrNull(raw.latest_end),
      overlapEvents: numOrNull(raw.overlap_events),
      longestSession: numOrNull(raw.longest_session),
      lastDayOff: stringOrNull(raw.last_day_off),
      lastHalfDayOff: stringOrNull(raw.last_half_day_off),
    }
  })

  const activityDayOffTrend = computed<ActivityDayOffTrendEntry[]>(() => {
    const trendRaw: any = (input.stats as any)?.day_off_trend
    if (!Array.isArray(trendRaw)) {
      return []
    }
    return trendRaw
      .map((entry: any) => {
        const total = Number(entry?.totalDays ?? entry?.total_days ?? 0)
        const daysOff = Number(entry?.daysOff ?? entry?.days_off ?? 0)
        const daysWorked = Number(entry?.daysWorked ?? entry?.days_worked ?? 0)
        return {
          offset: Number(entry?.offset ?? 0) || 0,
          label: String(entry?.label ?? ''),
          from: String(entry?.from ?? ''),
          to: String(entry?.to ?? ''),
          totalDays: Number.isFinite(total) ? Math.max(0, total) : 0,
          daysOff: Number.isFinite(daysOff) ? Math.max(0, daysOff) : 0,
          daysWorked: Number.isFinite(daysWorked) ? Math.max(0, daysWorked) : 0,
        }
      })
      .filter((entry) => entry.totalDays > 0)
  })

  return {
    topThree,
    topCalendarsSummary: calendarSummary,
    timeSummary,
    activitySummary,
    activityDayOffTrend,
  }
}

function avg(values: number[]): number {
  if (!values.length) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function dayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return d.getUTCDay()
}

function formatPercent(value: number): string {
  return `${Number(value || 0).toFixed(1)}%`
}
