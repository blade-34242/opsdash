import {
  createDefaultTargetsConfig,
  normalizeTargetsConfig,
  cloneTargetsConfig,
  type TargetsConfig,
} from './targets'

export const ONBOARDING_VERSION = 1

export interface CalendarSummary {
  id: string
  displayname: string
  color?: string
}

export interface StrategyDefinition {
  id: 'total_only' | 'total_plus_categories' | 'full_granular'
  title: string
  subtitle: string
  highlights: string[]
  layers: {
    total: boolean
    categories: boolean
    calendars: boolean
  }
  recommendedFor: string
}

export interface CategoryDraft {
  id: string
  label: string
  targetHours: number
  includeWeekend: boolean
  paceMode: 'days_only' | 'time_aware'
  color?: string | null
}

export interface StrategyBuildResult {
  selected: string[]
  targetsConfig: TargetsConfig
  groups: Record<string, number>
  targetsWeek: Record<string, number>
  targetsMonth: Record<string, number>
}

const STRATEGIES: StrategyDefinition[] = [
  {
    id: 'total_only',
    title: 'Single Goal',
    subtitle: 'Keep one overall weekly goal',
    highlights: ['One weekly target', 'Lightest setup', 'Can be expanded later'],
    layers: { total: true, categories: false, calendars: false },
    recommendedFor: 'Individuals tracking a single workload',
  },
  {
    id: 'total_plus_categories',
    title: 'Calendar Goals',
    subtitle: 'Track weekly goals per selected calendar',
    highlights: ['Per-calendar weekly targets', 'No category setup required', 'Best default for most setups'],
    layers: { total: true, categories: false, calendars: true },
    recommendedFor: 'Users who track work by calendar without categories',
  },
  {
    id: 'full_granular',
    title: 'Calendar + Category Goals',
    subtitle: 'Plan by calendar and focus area together',
    highlights: ['Calendar goals + category goals', 'Category dashboards & pacing', 'Calendar-to-category assignments'],
    layers: { total: true, categories: true, calendars: true },
    recommendedFor: 'Users planning both calendar and category goals',
  },
]

const CATEGORY_COLOR_PALETTE = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1']

function deriveMonthTargets(targetsWeek: Record<string, number>): Record<string, number> {
  const month: Record<string, number> = {}
  Object.entries(targetsWeek).forEach(([id, hours]) => {
    month[id] = Number((hours * 4).toFixed(2))
  })
  return month
}

function sanitizeHexColor(value: any): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return null
  }
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return trimmed.toUpperCase()
}

function sanitizeCategories(input: CategoryDraft[]): CategoryDraft[] {
  const seen = new Set<string>()
  const cleaned: CategoryDraft[] = []
  input.forEach((cat, index) => {
    const id = (cat?.id || `cat_${index}`).trim() || `cat_${index}`
    if (seen.has(id)) return
    seen.add(id)
    cleaned.push({
      id,
      label: (cat?.label || id).trim() || `Category ${index + 1}`,
      targetHours: Number.isFinite(cat?.targetHours) ? Number(cat.targetHours) : 0,
      includeWeekend: !!cat?.includeWeekend,
      paceMode: cat?.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
      color: sanitizeHexColor(cat?.color) ?? null,
    })
  })
  return cleaned
}

function sanitizeAssignments(
  selected: string[],
  categories: CategoryDraft[],
  assignments: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  if (!categories.length) {
    return result
  }
  const categoryIds = new Set(categories.map((cat) => cat.id))
  selected.forEach((calId) => {
    const claimed = assignments[calId]
    if (categoryIds.has(claimed)) {
      result[calId] = claimed
    }
  })
  return result
}

export function getStrategyDefinitions(): StrategyDefinition[] {
  return STRATEGIES
}

export type DashboardMode = 'quick' | 'standard' | 'pro'

export function createStrategyDraft(
  strategyId: StrategyDefinition['id'],
  calendars: CalendarSummary[],
  selectedInput: string[],
): { categories: CategoryDraft[]; assignments: Record<string, string> } {
  const selected = [...new Set(selectedInput.filter((id) => calendars.some((cal) => cal.id === id)))]

  if (strategyId === 'total_only' || strategyId === 'total_plus_categories') {
    return {
      categories: [],
      assignments: {},
    }
  }

  return {
    categories: [],
    assignments: Object.fromEntries(selected.map((id) => [id, ''])),
  }
}

export function buildStrategyResult(
  strategyId: StrategyDefinition['id'],
  calendars: CalendarSummary[],
  selectedInput: string[],
  overrides?: {
    categories?: CategoryDraft[]
    assignments?: Record<string, string>
  },
): StrategyBuildResult {
  const selected = [...new Set(selectedInput.filter((id) => calendars.some((cal) => cal.id === id)))]
  const baseConfig = normalizeTargetsConfig(createDefaultTargetsConfig())
  const groups: Record<string, number> = {}
  const targetsWeek: Record<string, number> = {}

  if (strategyId === 'total_only') {
    const cfg = cloneTargetsConfig(baseConfig)
    cfg.totalHours = cfg.totalHours || 40
    cfg.categories = []
    cfg.ui.showCategoryBlocks = false
    cfg.ui.showCategoryCharts = false
    cfg.ui.showCalendarCharts = false
    return {
      selected,
      targetsConfig: normalizeTargetsConfig(cfg),
      groups,
      targetsWeek,
      targetsMonth: {},
    }
  }

  if (strategyId === 'total_plus_categories') {
    const cfg = cloneTargetsConfig(baseConfig)
    cfg.totalHours = cfg.totalHours || 40
    cfg.categories = []
    cfg.ui.showCategoryBlocks = false
    cfg.ui.showCategoryCharts = false
    cfg.ui.showCalendarCharts = true
    cfg.balance.categories = []
    cfg.balance.useCategoryMapping = false
    cfg.balance.index.basis = 'calendar'
    return {
      selected,
      targetsConfig: normalizeTargetsConfig(cfg),
      groups,
      targetsWeek,
      targetsMonth: {},
    }
  }

  const defaults = createStrategyDraft(strategyId, calendars, selected)
  const categories = sanitizeCategories(overrides?.categories?.length ? overrides.categories : defaults.categories)
  const assignments = sanitizeAssignments(
    selected,
    categories.length ? categories : defaults.categories,
    overrides?.assignments ?? defaults.assignments,
  )

  const cfg = cloneTargetsConfig(baseConfig)
  const categoryGroupMap = new Map<string, number>()
  let paletteIndex = 0
  const pickCategoryColor = (cat: CategoryDraft): string | null => {
    const explicit = sanitizeHexColor(cat.color)
    if (explicit) return explicit
    const assignedCal = calendars.find((cal) => assignments[cal.id] === cat.id && sanitizeHexColor(cal.color))
    if (assignedCal) {
      return sanitizeHexColor(assignedCal.color) ?? null
    }
    const paletteColor = CATEGORY_COLOR_PALETTE[paletteIndex % CATEGORY_COLOR_PALETTE.length]
    paletteIndex += 1
    return paletteColor ?? null
  }

  cfg.categories = categories.map((cat, index) => {
    const groupId = index + 1
    categoryGroupMap.set(cat.id, groupId)
    return {
      id: cat.id,
      label: cat.label,
      targetHours: Number(cat.targetHours.toFixed(2)),
      includeWeekend: cat.includeWeekend,
      paceMode: cat.paceMode,
      color: pickCategoryColor(cat),
      groupIds: [groupId],
    }
  })

  cfg.totalHours = cfg.categories.reduce((sum, cat) => sum + cat.targetHours, 0)
  if (cfg.totalHours <= 0) {
    cfg.totalHours = strategyId === 'full_granular' ? 40 : 40
  }
  cfg.ui.showCategoryBlocks = cfg.categories.length > 0
  cfg.ui.showCategoryCharts = cfg.categories.length > 0
  cfg.ui.showCalendarCharts = strategyId === 'full_granular'
  cfg.includeZeroDaysInStats = false
  cfg.balance.categories = cfg.categories.map((cat) => cat.id)
  cfg.balance.useCategoryMapping = true

  const counts: Record<string, number> = {}
  Object.values(assignments).forEach((catId) => {
    counts[catId] = (counts[catId] ?? 0) + 1
  })

  Object.entries(assignments).forEach(([calId, catId]) => {
    const groupId = categoryGroupMap.get(catId)
    if (!groupId) return
    groups[calId] = groupId
    if (strategyId === 'full_granular') {
      const category = cfg.categories.find((c) => c.id === catId)
      if (!category) return
      const divisor = counts[catId] || 1
      const perCal = Number((category.targetHours / divisor).toFixed(2))
      targetsWeek[calId] = perCal
    }
  })

  return {
    selected,
    targetsConfig: normalizeTargetsConfig(cfg),
    groups,
    targetsWeek,
    targetsMonth: deriveMonthTargets(targetsWeek),
  }
}
