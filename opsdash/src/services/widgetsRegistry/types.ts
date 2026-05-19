export type WidgetSize = 'quarter' | 'half' | 'full'
export type WidgetHeight = 's' | 'm' | 'l' | 'xl'
export type WidgetHeightMode = 'fixed' | 'auto'
export type DashboardMode = 'quick' | 'standard' | 'pro'

export interface WidgetDefinition {
  id: string
  type: string
  props?: Record<string, any>
  options?: Record<string, any>
  layout: {
    width: WidgetSize
    height: WidgetHeight
    order: number
  }
  locked?: boolean
  version: number
}

export type WidgetTab = {
  id: string
  label: string
  widgets: WidgetDefinition[]
}

export type WidgetTabsState = {
  tabs: WidgetTab[]
  defaultTabId: string
}

export interface WidgetRenderContext {
  [key: string]: any
  summary?: any
  activeDayMode?: 'active' | 'all'
  targetsSummary?: any
  targetsConfig?: any
  stats?: any
  byDay?: any[]
  byCal?: any[]
  groupsById?: Record<string, number>
  groups?: any
  balanceOverview?: any
  balanceConfig?: any
  rangeLabel?: string
  rangeMode?: string
  offset?: number
  from?: string
  to?: string
  lookbackWeeks?: number
  balanceNote?: string
  activitySummary?: any
  activityConfig?: any
  activityDayOffTrend?: any
  activityTrendUnit?: string
  activityDayOffLookback?: number
  deckBuckets?: any
  deckRangeLabel?: string
  deckLoading?: boolean
  deckError?: string | null
  deckTicker?: any
  deckFilter?: any
  onDeckFilter?: (filter: any) => void
  deckShowBoardBadges?: boolean
  deckCards?: any[]
  deckBoards?: Array<{ id: number; title: string; color?: string }>
  uid?: string
  deckUrl?: string
  notesPrev?: string
  notesCurr?: string
  notesHistory?: Array<{ id: string; label: string; title: string; content: string }>
  notesLabelPrev?: string
  notesLabelCurr?: string
  notesLabelPrevTitle?: string
  notesLabelCurrTitle?: string
  isSavingNote?: boolean
  onSaveNote?: () => void
  onUpdateNotes?: (val: string) => void
  isLoading?: boolean
  isInitialLoading?: boolean
  isRefreshing?: boolean
  hasInitialLoad?: boolean
  isLayoutEditing?: boolean
  onUpdateWidgetOptions?: (id: string, key: string, value: any) => void
  charts?: any
  calendarChartData?: any
  categoryChartsById?: Record<string, { pie: any | null; stacked: any | null }>
  calendarGroups?: any[]
  calendars?: any[]
  calendarCategoryMap?: Record<string, string>
  categoryColorMap?: Record<string, string>
  colorsById?: Record<string, string>
  colorsByName?: Record<string, string>
  currentTargets?: Record<string, number>
  targetsWeek?: Record<string, number>
  selected?: string[]
  calendarTodayHours?: Record<string, number>
  onboardingStrategy?: string | null
  activePreset?: string | null
}

export type WidgetRenderer = (def: WidgetDefinition, ctx: WidgetRenderContext) => any

export interface RegistryEntry {
  component: any
  buildProps: WidgetRenderer
  resolveOptions?: (options: Record<string, any>, ctx?: WidgetRenderContext) => Record<string, any>
  defaultLayout: WidgetDefinition['layout']
  /**
   * How the widget's vertical size is determined.
   * - 'fixed' (default): uses the height bucket (s/m/l/xl) from defaultLayout.
   * - 'auto': ignores the height bucket and grows with content (height: fit-content).
   *   The layout grid reserves no fixed row span, and the widget will not scroll internally.
   */
  heightMode?: WidgetHeightMode
  label?: string
  category?: 'Time' | 'Charts' | 'Tasks' | 'Notes'
  baseTitle?: string
  supportsColors?: boolean
  defaultOptions?: Record<string, any>
  configurable?: boolean
  dynamicControls?: (options: Record<string, any>, ctx?: WidgetRenderContext) => Array<{
    key: string
    label: string
    type: string
    options?: ReadonlyArray<{ value: any; label: string; count?: number }>
    defaultAll?: boolean
    hint?: string
  }>
  controls?: Array<{
    key: string
    label: string
    type: string
    min?: number
    max?: number
    step?: number
    options?: ReadonlyArray<{ value: any; label: string; count?: number }>
    defaultAll?: boolean
    hint?: string
  }>
}
