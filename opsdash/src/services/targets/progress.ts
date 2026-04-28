import { t } from '../i18n'
import { DAY_MS, clampPct, round2 } from './math'
import { computeForecast } from './forecast'
import {
  createDefaultTargetsConfig,
  normalizeTargetsConfig,
  type TargetsConfig,
  type TargetCategoryConfig,
  type TargetsMode,
} from './config'
import { formatDateKey, parseDateKey, startOfDayUtc, listDaysUtc, isWeekendUtc } from '../dateTime'

export interface TargetsProgress {
  id: string
  label: string
  actualHours: number
  plannedHours: number
  targetHours: number
  percent: number
  deltaHours: number
  remainingHours: number
  needPerDay: number
  daysLeft: number
  calendarPercent: number
  gap: number
  status: 'on_track' | 'at_risk' | 'behind' | 'done' | 'none'
  statusLabel: string
  includeWeekend: boolean
  paceMode: TargetsMode
}

export interface TargetsSummary {
  total: TargetsProgress
  categories: TargetsProgress[]
  forecast: {
    linear: number
    momentum: number
    low: number
    high: number
    text: string
    primaryMethod: 'linear' | 'momentum'
    primary: number
    bandLow: number
    bandHigh: number
  }
}

export interface BuildTargetsSummaryInput {
  config: TargetsConfig
  stats: any
  byDay: any[]
  byCal: any[]
  groupsById: Record<string, number>
  range: 'week' | 'month'
  from: string
  to: string
}

export interface PaceInfo {
  totalEligible: number
  elapsedEligible: number
  daysLeft: number
  calendarPercent: number
}

export function createEmptyTargetsSummary(config?: TargetsConfig): TargetsSummary {
  const cfg = config ? normalizeTargetsConfig(config) : createDefaultTargetsConfig()
  const totalTarget = cfg?.totalHours ?? 0
  const categories = cfg?.categories ?? []
  const baseProgress: TargetsProgress = {
    id: 'total',
    label: t('Total'),
    actualHours: 0,
    plannedHours: 0,
    targetHours: totalTarget,
    percent: 0,
    deltaHours: 0,
    remainingHours: totalTarget,
    needPerDay: 0,
    daysLeft: 0,
    calendarPercent: 0,
    gap: 0,
    status: 'none',
    statusLabel: '—',
    includeWeekend: true,
    paceMode: 'days_only',
  }

  return {
    total: baseProgress,
    categories: categories.map((cat) => ({
      ...baseProgress,
      id: cat.id,
      label: cat.label,
      targetHours: cat.targetHours,
      remainingHours: cat.targetHours,
    })),
    forecast: {
      linear: 0,
      momentum: 0,
      low: 0,
      high: 0,
      text: '~0–0 h',
      primaryMethod: cfg?.forecast.methodPrimary ?? 'linear',
      primary: 0,
      bandLow: 0,
      bandHigh: 0,
    },
  }
}

export function progressPercent(actual: number, target: number): number {
  const tgt = Number(target)
  if (!Number.isFinite(tgt) || tgt <= 0) return 0
  const act = Number(actual)
  if (!Number.isFinite(act)) return 0
  const ratio = (act / tgt) * 100
  if (!Number.isFinite(ratio)) return 0
  return clampPct(ratio)
}

export function buildTargetsSummary(input: BuildTargetsSummaryInput): TargetsSummary {
  const cfg = input.config
  const start = parseDate(input.from)
  const end = parseDate(input.to)
  const dailyHours = buildDailyMap(input.byDay)

  const totalActual = (input.byCal || []).reduce((sum: number, row: any) => {
    const raw = Number(row?.total_hours ?? row?.hours ?? 0)
    return Number.isFinite(raw) ? sum + raw : sum
  }, 0)
  const totalPlanned = (input.byCal || []).reduce((sum: number, row: any) => {
    const raw = Number(row?.future_hours ?? row?.planned_hours ?? 0)
    return Number.isFinite(raw) ? sum + raw : sum
  }, 0)
  const totalTarget = cfg.totalHours || 0
  const totalPace = computePaceInfo({
    includeWeekend: cfg.pace.includeWeekendTotal,
    mode: cfg.pace.mode,
    includeZeroDays: cfg.includeZeroDaysInStats,
    start,
    end,
    dailyHours,
  })

  const totalProgress = makeProgress({
    id: 'total',
    label: t('Total'),
    actual: totalActual,
    planned: totalPlanned,
    target: totalTarget,
    pace: totalPace,
    thresholds: cfg.pace.thresholds,
    includeWeekend: cfg.pace.includeWeekendTotal,
    paceMode: cfg.pace.mode,
  })

  const categories = cfg.categories.map((cat) => {
    const actual = computeCategoryActual(cat, input.byCal, input.groupsById)
    const planned = computeCategoryHours(cat, input.byCal, input.groupsById, 'future_hours')
    const paceMode = cat.paceMode || cfg.pace.mode
    const pace = computePaceInfo({
      includeWeekend: cat.includeWeekend,
      mode: paceMode,
      includeZeroDays: cfg.includeZeroDaysInStats,
      start,
      end,
      dailyHours,
    })
    return makeProgress({
      id: cat.id,
      label: cat.label,
      actual,
      planned,
      target: cat.targetHours,
      pace,
      thresholds: cfg.pace.thresholds,
      includeWeekend: cat.includeWeekend,
      paceMode,
    })
  })

  const forecast = computeForecast({
    config: cfg,
    totalProgress,
    dailyHours,
    pace: totalPace,
  })

  return {
    total: totalProgress,
    categories,
    forecast,
  }
}

export function computePaceInfo(opts: {
  includeWeekend: boolean
  mode: TargetsMode
  includeZeroDays: boolean
  start: Date | null
  end: Date | null
  dailyHours: Map<string, number>
}): PaceInfo {
  const { start, end } = opts
  if (!start || !end) {
    return { totalEligible: 0, elapsedEligible: 0, daysLeft: 0, calendarPercent: 0 }
  }
  const today = startOfDayUtc(new Date())
  const startKey = dayKey(start)
  const endKey = dayKey(end)
  const totalEligibleDates = listDaysUtc(start, end).filter((date) => opts.includeWeekend || !isWeekendUtc(date))
  const totalEligible = totalEligibleDates.length

  if (totalEligible === 0) {
    return { totalEligible: 0, elapsedEligible: 0, daysLeft: 0, calendarPercent: 0 }
  }

  if (dayKey(today) > endKey) {
    return { totalEligible, elapsedEligible: totalEligible, daysLeft: 0, calendarPercent: 100 }
  }
  if (dayKey(today) < startKey) {
    return { totalEligible, elapsedEligible: 0, daysLeft: totalEligible, calendarPercent: 0 }
  }

  let elapsed = 0
  for (const date of totalEligibleDates) {
    const key = dayKey(date)
    const hours = opts.dailyHours.get(key) ?? 0
    if (!opts.includeZeroDays && hours <= 0 && key !== dayKey(today)) {
      continue
    }
    if (key < dayKey(today)) {
      elapsed += 1
    } else if (key === dayKey(today)) {
      if (opts.mode === 'time_aware') {
        const now = new Date()
        const msElapsed = Math.min(now.getTime(), date.getTime() + DAY_MS) - date.getTime()
        const frac = Math.max(0, Math.min(1, msElapsed / DAY_MS))
        if (opts.includeZeroDays || hours > 0 || frac > 0) {
          elapsed += frac
        }
      } else if (opts.includeZeroDays || hours > 0) {
        elapsed += 1
      }
    }
  }

  const calendarPercent = clampPct((elapsed / totalEligible) * 100)
  const daysLeft = Math.max(0, totalEligible - elapsed)
  return { totalEligible, elapsedEligible: elapsed, daysLeft, calendarPercent }
}

function makeProgress(opts: {
  id: string
  label: string
  actual: number
  planned: number
  target: number
  pace: PaceInfo
  thresholds: { onTrack: number; atRisk: number }
  includeWeekend: boolean
  paceMode: TargetsMode
}): TargetsProgress {
  const target = Math.max(0, opts.target || 0)
  const actual = Math.max(0, opts.actual || 0)
  const planned = Math.max(0, opts.planned || 0)
  const percent = target > 0 ? clampPct((actual / target) * 100) : 0
  const remaining = target - actual
  const delta = actual - target
  const needPerDay = opts.pace.daysLeft > 0 ? Math.max(0, remaining) / opts.pace.daysLeft : 0
  const gap = percent - opts.pace.calendarPercent
  const status = resolveStatus({ percent, target, gap, thresholds: opts.thresholds })
  return {
    id: opts.id,
    label: opts.label,
    actualHours: round2(actual),
    plannedHours: round2(planned),
    targetHours: round2(target),
    percent,
    deltaHours: round2(delta),
    remainingHours: round2(Math.max(0, remaining)),
    needPerDay: round2(needPerDay),
    daysLeft: Math.max(0, Math.ceil(opts.pace.daysLeft)),
    calendarPercent: clampPct(opts.pace.calendarPercent),
    gap: round2(gap),
    status,
    statusLabel: statusLabel(status),
    includeWeekend: opts.includeWeekend,
    paceMode: opts.paceMode,
  }
}

function resolveStatus(args: { percent: number; target: number; gap: number; thresholds: { onTrack: number; atRisk: number } }): TargetsProgress['status'] {
  if (args.target <= 0) return 'none'
  if (args.percent >= 100) return 'done'
  if (args.gap >= args.thresholds.onTrack) return 'on_track'
  if (args.gap >= args.thresholds.atRisk) return 'at_risk'
  return 'behind'
}

function statusLabel(status: TargetsProgress['status']): string {
  switch (status) {
    case 'on_track': return t('On Track')
    case 'at_risk': return t('At Risk')
    case 'behind': return t('Behind')
    case 'done': return t('Done')
    default: return '—'
  }
}

function computeCategoryActual(cat: TargetCategoryConfig, byCal: any[], groupsById: Record<string, number>): number {
  return computeCategoryHours(cat, byCal, groupsById, 'total_hours')
}

function computeCategoryHours(
  cat: TargetCategoryConfig,
  byCal: any[],
  groupsById: Record<string, number>,
  field: 'total_hours' | 'future_hours',
): number {
  if (!Array.isArray(byCal)) return 0
  const groups = Array.isArray(cat.groupIds) && cat.groupIds.length ? new Set(cat.groupIds) : null
  let sum = 0
  for (const row of byCal) {
    const hours = Number(row?.[field] ?? 0)
    if (!Number.isFinite(hours) || hours <= 0) continue
    const id = String(row?.id ?? row?.calendar ?? '')
    const group = Number(row?.group ?? row?.group_id ?? groupsById?.[id] ?? 0)
    if (groups && !groups.has(group)) continue
    sum += hours
  }
  return sum
}

export function buildDailyMap(rows: any[]): Map<string, number> {
  const map = new Map<string, number>()
  if (!Array.isArray(rows)) return map
  for (const row of rows) {
    const key = String(row?.date ?? row?.day ?? '')
    if (!key) continue
    const hours = Number(row?.total_hours ?? row?.hours ?? 0)
    if (!Number.isFinite(hours)) continue
    map.set(key, hours)
  }
  return map
}

function parseDate(str: string): Date | null {
  if (!str) return null
  const parsed = parseDateKey(str)
  return parsed ? startOfDayUtc(parsed) : null
}

function dayKey(date: Date): string {
  return formatDateKey(date, 'UTC')
}
