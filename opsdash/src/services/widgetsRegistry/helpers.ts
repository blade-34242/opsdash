import { buildTargetsSummary, createEmptyTargetsSummary, convertWeekToMonth, type TargetsProgress, type TargetsSummary } from '../targets'

import type { WidgetRenderContext } from './types'

export const BASE_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']

export function copyConfigForRange(config: any, rangeMode?: string) {
  const cfg = JSON.parse(JSON.stringify(config || {}))
  if (rangeMode === 'month') {
    cfg.totalHours = convertWeekToMonth(cfg.totalHours ?? 0)
    cfg.categories = (cfg.categories || []).map((cat: any) => ({
      ...cat,
      targetHours: convertWeekToMonth(cat.targetHours ?? 0),
    }))
  }
  return cfg
}

export function attachUi(cfg: any) {
  return {
    ...cfg,
    ui: { ...(cfg?.ui ?? {}) },
  }
}

export function safeBuildTargetsSummary(config: any, ctx: WidgetRenderContext) {
  try {
    return buildTargetsSummary({
      config,
      stats: ctx.stats,
      byDay: ctx.byDay || [],
      byCal: ctx.byCal || [],
      groupsById: ctx.groupsById || {},
      range: ctx.rangeMode === 'month' ? 'month' : 'week',
      from: ctx.from || '',
      to: ctx.to || '',
    })
  } catch (err) {
    console.error('[opsdash] targets widget local summary failed', err)
    return createEmptyTargetsSummary(config)
  }
}

export function buildCategoryGroups(input: {
  config: any
  summary: TargetsSummary
  byCal: any[]
  calendars: any[]
  colorsById?: Record<string, string>
  groupsById: Record<string, number>
  currentTargets?: Record<string, number>
}) {
  const configCategories = Array.isArray(input.config?.categories) ? input.config.categories : []
  const summaryById = new Map<string, TargetsProgress>()
  ;(input.summary?.categories || []).forEach((category) => {
    summaryById.set(String(category.id), category)
  })

  const categoryByGroup = new Map<number, string>()
  const categoryLabelById: Record<string, string> = {}
  configCategories.forEach((category: any) => {
    const id = String(category?.id ?? '')
    if (!id) return
    categoryLabelById[id] = String(category?.label || id)
    ;(Array.isArray(category?.groupIds) ? category.groupIds : []).forEach((groupId: any) => {
      const normalized = normalizeGroupId(groupId)
      categoryByGroup.set(normalized, id)
    })
  })

  const categoryColors = new Map<string, string>()
  const calendarMeta = new Map<string, { name: string; color?: string }>()
  ;(Array.isArray(input.calendars) ? input.calendars : []).forEach((calendar: any) => {
    const id = String(calendar?.id ?? '')
    if (!id) return
    const color = input.colorsById?.[id] || String(calendar?.color || '')
    calendarMeta.set(id, {
      name: String(calendar?.displayname || calendar?.name || id),
      color: color || undefined,
    })
  })

  const assignmentByCalendar: Record<string, string> = {}
  Object.keys(input.groupsById || {}).forEach((calendarId) => {
    const normalized = normalizeGroupId(input.groupsById?.[calendarId])
    assignmentByCalendar[calendarId] = categoryByGroup.get(normalized) || '__uncategorized__'
  })

  const rowsByCategory = new Map<string, any[]>()
  ;(Array.isArray(input.byCal) ? input.byCal : []).forEach((row: any) => {
    const calendarId = String(row?.id ?? row?.calendar_id ?? row?.calendar ?? '')
    if (!calendarId) return
    const categoryId = assignmentByCalendar[calendarId] || '__uncategorized__'
    if (!rowsByCategory.has(categoryId)) rowsByCategory.set(categoryId, [])
    rowsByCategory.get(categoryId)!.push({ ...row, calendarId })
  })

  const resolveCategoryColor = (categoryId: string) => {
    if (categoryColors.has(categoryId)) return categoryColors.get(categoryId)
    const categoryConfig = configCategories.find((category: any) => String(category?.id ?? '') === categoryId)
    const direct = typeof categoryConfig?.color === 'string' && categoryConfig.color ? categoryConfig.color : ''
    if (direct) {
      categoryColors.set(categoryId, direct)
      return direct
    }
    const rows = rowsByCategory.get(categoryId) || []
    for (const row of rows) {
      const calendarColor = calendarMeta.get(String(row.calendarId))?.color
      if (calendarColor) {
        categoryColors.set(categoryId, calendarColor)
        return calendarColor
      }
    }
    return undefined
  }

  const currentTargets = input.currentTargets || {}
  const totalDaysLeft = Number(input.summary?.total?.daysLeft ?? 0)
  const pacePercent = Number(input.summary?.total?.calendarPercent ?? 0)
  const paceMode = input.summary?.total?.paceMode ?? input.config?.pace?.mode ?? 'days_only'

  const fallbackSummary = (categoryId: string, label: string, rows: any[]): TargetsProgress => {
    const targetHours = rows.reduce((sum, row) => {
      const value = Number(currentTargets[String(row.calendarId)] ?? 0)
      return Number.isFinite(value) ? sum + Math.max(0, value) : sum
    }, 0)
    const actualHours = rows.reduce((sum, row) => {
      const value = Number(row?.total_hours ?? row?.hours ?? 0)
      return Number.isFinite(value) ? sum + Math.max(0, value) : sum
    }, 0)
    const plannedHours = rows.reduce((sum, row) => {
      const value = Number(row?.future_hours ?? row?.planned_hours ?? 0)
      return Number.isFinite(value) ? sum + Math.max(0, value) : sum
    }, 0)
    const percent = targetHours > 0 ? clampTargetPercent((actualHours / targetHours) * 100) : 0
    const deltaHours = actualHours - targetHours
    const remainingHours = Math.max(0, targetHours - actualHours)
    const status: TargetsProgress['status'] =
      targetHours <= 0 ? 'none' : percent >= 100 ? 'done' : deltaHours >= 0 ? 'on_track' : 'behind'
    const statusLabel =
      status === 'done' ? 'Done' : status === 'on_track' ? 'On Track' : status === 'behind' ? 'Behind' : '—'
    const needPerDay = totalDaysLeft > 0 ? remainingHours / totalDaysLeft : 0

    return {
      id: categoryId,
      label,
      actualHours: round2(actualHours),
      plannedHours: round2(plannedHours),
      targetHours: round2(targetHours),
      percent: round2(percent),
      deltaHours: round2(deltaHours),
      remainingHours: round2(remainingHours),
      needPerDay: round2(needPerDay),
      daysLeft: totalDaysLeft,
      calendarPercent: round2(Math.max(0, Math.min(100, pacePercent))),
      gap: round2(percent - pacePercent),
      status,
      statusLabel,
      includeWeekend: true,
      paceMode,
    }
  }

  const result: Array<{
    id: string
    label: string
    rows: any[]
    summary: TargetsProgress
    color?: string
  }> = []

  configCategories.forEach((category: any) => {
    const categoryId = String(category?.id ?? '')
    if (!categoryId) return
    const rows = rowsByCategory.get(categoryId) || []
    result.push({
      id: categoryId,
      label: categoryLabelById[categoryId] || categoryId,
      rows,
      summary: summaryById.get(categoryId) || fallbackSummary(categoryId, categoryLabelById[categoryId] || categoryId, rows),
      color: resolveCategoryColor(categoryId),
    })
  })

  if (rowsByCategory.has('__uncategorized__')) {
    const uncategorizedRows = rowsByCategory.get('__uncategorized__') || []
    result.push({
      id: '__uncategorized__',
      label: 'Unassigned',
      rows: uncategorizedRows,
      summary: fallbackSummary('__uncategorized__', 'Unassigned', uncategorizedRows),
      color: resolveCategoryColor('__uncategorized__'),
    })
  }

  return result
}

export function buildCalendarGroups(input: {
  config: any
  summary: TargetsSummary
  byCal: any[]
  calendars: any[]
  colorsById?: Record<string, string>
  currentTargets?: Record<string, number>
  todayHoursByCalendar?: Record<string, number>
}) {
  const currentTargets = input.currentTargets || {}
  const byCalRows = Array.isArray(input.byCal) ? input.byCal : []
  const todayHoursByCalendar = input.todayHoursByCalendar || {}
  const paceThresholds = input.config?.pace?.thresholds ?? { onTrack: -2, atRisk: -10 }
  const includeWeekend = !!(input.config?.pace?.includeWeekendTotal ?? true)
  const paceMode = input.summary?.total?.paceMode ?? input.config?.pace?.mode ?? 'days_only'
  const totalDaysLeft = Number(input.summary?.total?.daysLeft ?? 0)
  const pacePercent = Number(input.summary?.total?.calendarPercent ?? 0)

  const calendarMeta = new Map<string, { label: string; color?: string }>()
  ;(Array.isArray(input.calendars) ? input.calendars : []).forEach((calendar: any) => {
    const id = String(calendar?.id ?? '')
    if (!id) return
    const color = input.colorsById?.[id] || String(calendar?.color || '')
    calendarMeta.set(id, {
      label: String(calendar?.displayname || calendar?.name || id),
      color: color || undefined,
    })
  })

  const rowsById = new Map<string, any>()
  byCalRows.forEach((row: any) => {
    const calendarId = String(row?.id ?? row?.calendar_id ?? row?.calendar ?? '')
    if (!calendarId) return
    rowsById.set(calendarId, { ...row, calendarId })
  })

  const orderedIds: string[] = []
  const pushId = (calendarId: string) => {
    if (!calendarId || orderedIds.includes(calendarId)) return
    orderedIds.push(calendarId)
  }

  ;(Array.isArray(input.calendars) ? input.calendars : []).forEach((calendar: any) => {
    const calendarId = String(calendar?.id ?? '')
    if (!calendarId) return
    if (Object.prototype.hasOwnProperty.call(currentTargets, calendarId) || rowsById.has(calendarId)) {
      pushId(calendarId)
    }
  })
  Object.keys(currentTargets).forEach(pushId)
  Array.from(rowsById.keys()).forEach(pushId)

  return orderedIds.map((calendarId) => {
    const row = rowsById.get(calendarId) || { id: calendarId, calendarId, total_hours: 0, future_hours: 0 }
    const label = calendarMeta.get(calendarId)?.label || String(row?.calendar ?? row?.name ?? calendarId)
    const color = calendarMeta.get(calendarId)?.color || input.colorsById?.[calendarId]
    const targetHours = Number(currentTargets[calendarId] ?? 0)
    const actualHours = Number(row?.total_hours ?? row?.hours ?? 0)
    const plannedHours = Number(row?.future_hours ?? row?.planned_hours ?? 0)
    const safeTarget = Number.isFinite(targetHours) ? Math.max(0, targetHours) : 0
    const safeActual = Number.isFinite(actualHours) ? Math.max(0, actualHours) : 0
    const safePlanned = Number.isFinite(plannedHours) ? Math.max(0, plannedHours) : 0
    const percent = safeTarget > 0 ? round2(clampTargetPercent((safeActual / safeTarget) * 100)) : 0
    const deltaHours = round2(safeActual - safeTarget)
    const remainingHours = round2(Math.max(0, safeTarget - safeActual))
    const gap = round2(percent - pacePercent)
    const status: TargetsProgress['status'] =
      safeTarget <= 0
        ? 'none'
        : percent >= 100
          ? 'done'
          : gap >= Number(paceThresholds.onTrack ?? -2)
            ? 'on_track'
            : gap >= Number(paceThresholds.atRisk ?? -10)
              ? 'at_risk'
              : 'behind'
    const statusLabel =
      status === 'done'
        ? 'Done'
        : status === 'on_track'
          ? 'On Track'
          : status === 'at_risk'
            ? 'At Risk'
            : status === 'behind'
              ? 'Behind'
              : '—'

    return {
      id: calendarId,
      label,
      rows: [row],
      color,
      todayHours: Number(todayHoursByCalendar[calendarId] ?? 0),
      summary: {
        id: calendarId,
        label,
        actualHours: round2(safeActual),
        plannedHours: round2(safePlanned),
        targetHours: round2(safeTarget),
        percent,
        deltaHours,
        remainingHours,
        needPerDay: totalDaysLeft > 0 ? round2(remainingHours / totalDaysLeft) : 0,
        daysLeft: totalDaysLeft,
        calendarPercent: round2(Math.max(0, Math.min(100, pacePercent))),
        gap,
        status,
        statusLabel,
        includeWeekend,
        paceMode,
      } satisfies TargetsProgress,
    }
  })
}

export function buildTitle(base: string, prefix?: string | null) {
  if (!prefix) return base
  const trimmed = String(prefix).trim()
  if (!trimmed) return base
  return `${trimmed} · ${base}`
}

export function numberOr(primary?: any, override?: any) {
  if (override !== undefined && override !== null && override !== '') {
    const num = Number(override)
    if (Number.isFinite(num)) return num
  }
  const num = Number(primary)
  return Number.isFinite(num) ? num : undefined
}


export function parseBoardIds(input: any): Array<number> {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    )
  }
  if (typeof input === 'string') {
    return parseBoardIds(input.split(','))
  }
  return []
}

export function parseFilters(input: any): string[] {
  if (Array.isArray(input)) {
    return input.map((f) => String(f).trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
  }
  return [
    'open_all',
    'open_mine',
    'done_all',
    'done_mine',
    'archived_all',
    'archived_mine',
    'due_all',
    'due_mine',
    'due_today_all',
    'due_today_mine',
    'created_today_all',
    'created_today_mine',
  ]
}

export function prettyFilterLabel(key: string): string {
  switch (key) {
    case 'all': return 'All cards'
    case 'mine': return 'Mine (any status)'
    case 'open_all': return 'Open · All'
    case 'open_mine': return 'Open · Mine'
    case 'done_all': return 'Done · All'
    case 'done_mine': return 'Done · Mine'
    case 'archived_all': return 'Archived · All'
    case 'archived_mine': return 'Archived · Mine'
    case 'due_all': return 'Due · All'
    case 'due_mine': return 'Due · Mine'
    case 'due_today_all': return 'Due today · All'
    case 'due_today_mine': return 'Due today · Mine'
    case 'created_today_all': return 'Created today · All'
    case 'created_today_mine': return 'Created today · Mine'
    case 'created_range_all': return 'Created this range · All'
    case 'created_range_mine': return 'Created this range · Mine'
    default: return key
  }
}

function normalizeGroupId(value: any): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(9, Math.trunc(numeric)))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function clampTargetPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(999, value))
}
