export type ReportingMode = 'week' | 'month'
export type ReportingDelivery = 'final' | 'checkpoint_final'

export interface ReportingModeConfig {
  enabled: boolean
  delivery: ReportingDelivery
  sendTimeLocal: string
}

export interface ReportingConfig {
  enabled: boolean
  modes: Record<ReportingMode, ReportingModeConfig>
  alertOnRisk: boolean
  riskThreshold: number // 0-1
  notifyEmail: boolean
  notifyNotification: boolean
}

export type DeckFilterMode =
  | 'all'
  | 'mine'
  | 'focus_all'
  | 'focus_mine'
  | 'backlog_all'
  | 'backlog_mine'
  | 'open_all'
  | 'open_mine'
  | 'done_all'
  | 'done_mine'
  | 'archived_all'
  | 'archived_mine'
  | 'due_all'
  | 'due_mine'
  | 'due_today_all'
  | 'due_today_mine'
  | `custom_${string}`
  | 'created_today_all'
  | 'created_today_mine'
  | 'created_range_all'
  | 'created_range_mine'
  | `tag_${string}`

export type DeckMineMode = 'assignee' | 'creator' | 'both'

export interface DeckTickerSettings {
  autoScroll: boolean
  intervalSeconds: number
  showBoardBadges: boolean
}

export interface DeckFeatureSettings {
  enabled: boolean
  filtersEnabled: boolean
  defaultFilter: DeckFilterMode
  hiddenBoards: number[]
  mineMode: DeckMineMode
  solvedIncludesArchived: boolean
  ticker: DeckTickerSettings
}

export function createDefaultReportingConfig(): ReportingConfig {
  return {
    enabled: false,
    modes: {
      week: {
        enabled: true,
        delivery: 'final',
        sendTimeLocal: '06:00',
      },
      month: {
        enabled: false,
        delivery: 'checkpoint_final',
        sendTimeLocal: '18:00',
      },
    },
    alertOnRisk: true,
    riskThreshold: 0.85,
    notifyEmail: true,
    notifyNotification: true,
  }
}

function normalizeReportingModeConfig(input: any, fallback: ReportingModeConfig): ReportingModeConfig {
  if (!input || typeof input !== 'object') {
    return { ...fallback }
  }
  const delivery: ReportingDelivery =
    input.delivery === 'checkpoint_final'
      ? 'checkpoint_final'
      : input.cadence === 'mid'
        ? 'checkpoint_final'
        : 'final'
  const sendTimeLocal =
    typeof input.sendTimeLocal === 'string' && /^\d{2}:\d{2}$/.test(input.sendTimeLocal)
      ? input.sendTimeLocal
      : fallback.sendTimeLocal
  return {
    enabled: Boolean(input.enabled),
    delivery,
    sendTimeLocal,
  }
}

export function normalizeReportingConfig(input: any, fallback?: ReportingConfig): ReportingConfig {
  const base = fallback ?? createDefaultReportingConfig()
  if (!input || typeof input !== 'object') {
    return {
      ...base,
      modes: {
        week: { ...base.modes.week },
        month: { ...base.modes.month },
      },
    }
  }
  const thresholdRaw = Number(input.riskThreshold)
  const riskThreshold =
    Number.isFinite(thresholdRaw) && thresholdRaw >= 0 && thresholdRaw <= 1
      ? thresholdRaw
      : base.riskThreshold
  const legacySchedule = input.schedule === 'week' || input.schedule === 'month' ? input.schedule : 'both'
  const modes: Record<ReportingMode, ReportingModeConfig> = input.modes && typeof input.modes === 'object'
    ? {
        week: normalizeReportingModeConfig(input.modes.week, base.modes.week),
        month: normalizeReportingModeConfig(input.modes.month, base.modes.month),
      }
    : {
        week: {
          enabled: legacySchedule === 'week' || legacySchedule === 'both',
          delivery: input.interim === 'midweek' ? 'checkpoint_final' : 'final',
          sendTimeLocal: base.modes.week.sendTimeLocal,
        },
        month: {
          enabled: legacySchedule === 'month' || legacySchedule === 'both',
          delivery: input.interim === 'midweek' ? 'checkpoint_final' : 'final',
          sendTimeLocal: base.modes.month.sendTimeLocal,
        },
      }
  return {
    enabled: Boolean(input.enabled),
    modes,
    alertOnRisk: input.alertOnRisk !== false,
    riskThreshold,
    notifyEmail: input.notifyEmail !== false,
    notifyNotification: Boolean(input.notifyNotification),
  }
}

export function createDefaultDeckSettings(): DeckFeatureSettings {
  return {
    enabled: true,
    filtersEnabled: true,
    defaultFilter: 'all',
    hiddenBoards: [],
    mineMode: 'assignee',
    solvedIncludesArchived: true,
    ticker: {
      autoScroll: true,
      intervalSeconds: 5,
      showBoardBadges: true,
    },
  }
}

export function normalizeDeckSettings(input: any, fallback?: DeckFeatureSettings): DeckFeatureSettings {
  const base = fallback ?? createDefaultDeckSettings()
  if (!input || typeof input !== 'object') {
    return { ...base }
  }
  const normalizeBool = (value: unknown, fallbackValue: boolean) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') {
      if (value === 1) return true
      if (value === 0) return false
      return fallbackValue
    }
    if (typeof value === 'string') {
      const raw = value.trim().toLowerCase()
      if (['1', 'true', 'yes', 'on'].includes(raw)) return true
      if (['0', 'false', 'no', 'off', 'null', ''].includes(raw)) return false
    }
    return fallbackValue
  }
  const clampBoardId = (value: unknown): number | null => {
    const id = Number(value)
    if (!Number.isInteger(id) || id <= 0 || id > 100000) return null
    return id
  }
  const allowedFilters: DeckFilterMode[] = [
    'all',
    'mine',
    'focus_all',
    'focus_mine',
    'backlog_all',
    'backlog_mine',
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
  ]
  const defaultFilter: DeckFilterMode = allowedFilters.includes(input.defaultFilter)
    ? (input.defaultFilter as DeckFilterMode)
    : 'all'
  const mineMode: DeckMineMode =
    input.mineMode === 'creator' || input.mineMode === 'both' ? input.mineMode : 'assignee'
  const solvedIncludesArchived = normalizeBool(input.solvedIncludesArchived, base.solvedIncludesArchived)
  const ticker = {
    autoScroll: normalizeBool(input.ticker?.autoScroll, base.ticker.autoScroll),
    intervalSeconds: clampInterval(input.ticker?.intervalSeconds, base.ticker.intervalSeconds),
    showBoardBadges: normalizeBool(input.ticker?.showBoardBadges, base.ticker.showBoardBadges),
  }
  const hiddenBoards: number[] = Array.isArray(input.hiddenBoards)
    ? Array.from(
        new Set(
          input.hiddenBoards
            .map((value: any) => clampBoardId(value))
            .filter((value: number | null): value is number => Number.isInteger(value) && value > 0),
        ),
      )
    : base.hiddenBoards.slice()
  return {
    enabled: normalizeBool(input.enabled, base.enabled),
    filtersEnabled: normalizeBool(input.filtersEnabled, base.filtersEnabled),
    defaultFilter,
    hiddenBoards,
    mineMode,
    solvedIncludesArchived,
    ticker,
  }
}

function clampInterval(value: unknown, fallback: number): number {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(10, Math.max(3, Math.trunc(raw)))
}
