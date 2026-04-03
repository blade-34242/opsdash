import type { DashboardMode, WidgetDefinition, WidgetTabsState } from './widgetsRegistry/types'

export type WidgetPresets = Record<DashboardMode, WidgetDefinition[]>

let cachedPresets: WidgetPresets | null = null

const PRO_TABS: WidgetTabsState = {
  tabs: [
    {
      id: 'tab-1',
      label: 'Overview',
      widgets: [
        {
          id: 'widget-time_summary_overview-r87wbe',
          type: 'time_summary_overview',
          options: {
            showTotal: true,
            showAverage: true,
            showMedian: true,
            showBusiest: true,
            showWorkday: true,
            showWeekend: true,
            showWeekendShare: true,
            showCalendarSummary: true,
            showTopCategory: true,
            showBalance: true,
            mode: 'active',
            showActivityDetails: true,
            scale: 'md',
          },
          layout: { width: 'half', height: 'l', order: 20 },
          version: 1,
        },
        {
          id: 'widget-time_summary_lookback-4a5t8j',
          type: 'time_summary_lookback',
          options: {
            showTotal: true,
            showAverage: true,
            showMedian: true,
            showBusiest: true,
            showWorkday: true,
            showWeekend: true,
            showWeekendShare: true,
            showCalendarSummary: true,
            showTopCategory: true,
            showBalance: true,
            mode: 'active',
            historyView: 'pills',
            showHistoryCoreMetrics: true,
            showActivityDetails: true,
            showDelta: true,
            scale: 'md',
          },
          layout: { width: 'half', height: 'l', order: 25 },
          version: 1,
        },
        {
          id: 'widget-targets_v2-267r57',
          type: 'targets_v2',
          options: {
            showForecast: true,
            showPace: true,
            useLocalConfig: false,
            localConfig: null,
            showCategoryBlocks: true,
            scale: 'sm',
          },
          layout: { width: 'half', height: 'xl', order: 10 },
          version: 1,
        },
        {
          id: 'widget-balance_index-cjq27s',
          type: 'balance_index',
          options: {
            showTrend: true,
            showMessages: true,
            showConfig: false,
            indexBasis: 'both',
            noticeAbove: 0.15,
            noticeBelow: 0.15,
            warnAbove: 0.3,
            warnBelow: 0.3,
            warnIndex: 0.6,
            lookbackWeeks: 6,
            messageDensity: 'many',
            trendColor: '#2563EB',
            showCurrent: true,
            labelMode: 'period',
            reverseOrder: false,
            scale: 'xl',
          },
          layout: { width: 'full', height: 'l', order: 30 },
          version: 1,
        },
        {
          id: 'widget-dayoff_trend-y9iajc',
          type: 'dayoff_trend',
          options: {
            lookback: 6,
            showBadges: true,
            reverseOrder: false,
            labelMode: 'period',
            toneLowColor: '#dc2626',
            toneHighColor: '#16a34a',
            scale: 'xl',
            dense: true,
          },
          layout: { width: 'full', height: 'm', order: 40 },
          version: 1,
        },
        {
          id: 'widget-category_mix_trend-rhdcvh',
          type: 'category_mix_trend',
          options: {
            lookbackWeeks: 3,
            density: 'normal',
            labelMode: 'period',
            colorMode: 'hybrid',
            squareCells: false,
            reverseOrder: false,
            showHeader: true,
            showBadge: true,
          },
          layout: { width: 'full', height: 'l', order: 50 },
          version: 1,
        },
      ],
    },
    {
      id: 'tab-mjp2ziuq',
      label: 'Table',
      widgets: [
        {
          id: 'widget-calendar_table-1768128709761',
          type: 'calendar_table',
          options: {
            calendarFilter: [],
            compact: false,
            scale: 'xl',
          },
          layout: { width: 'full', height: 'xl', order: 20 },
          version: 1,
        },
      ],
    },
    {
      id: 'tab-mk4vuh6c',
      label: 'Charts',
      widgets: [
        {
          id: 'widget-chart_pie-112jzy',
          type: 'chart_pie',
          options: {
            filterMode: 'category',
            filterIds: [],
            showLegend: true,
            showLabels: true,
            compact: false,
          },
          layout: { width: 'half', height: 'xl', order: 58 },
          version: 1,
        },
        {
          id: 'widget-chart_pie-1768128829168',
          type: 'chart_pie',
          options: {
            filterMode: 'calendar',
            filterIds: [],
            showLegend: true,
            showLabels: true,
            compact: false,
          },
          layout: { width: 'half', height: 'xl', order: 57 },
          version: 1,
        },
        {
          id: 'widget-chart_stacked-2ttp7b',
          type: 'chart_stacked',
          options: {
            filterMode: 'calendar',
            filterIds: [],
            showLegend: true,
            showLabels: false,
            compact: false,
            forecastMode: 'total',
            reverseOrder: false,
          },
          layout: { width: 'full', height: 'xl', order: 59 },
          version: 1,
        },
        {
          id: 'widget-chart_per_day-5tpozm',
          type: 'chart_per_day',
          options: {
            filterMode: 'calendar',
            filterIds: [],
            showLabels: false,
            compact: false,
            forecastMode: 'total',
          },
          layout: { width: 'half', height: 'xl', order: 59.5 },
          version: 1,
        },
        {
          id: 'widget-chart_dow-za4squ',
          type: 'chart_dow',
          options: {
            filterMode: 'calendar',
            filterIds: [],
            showLabels: true,
            compact: false,
            forecastMode: 'total',
            reverseOrder: false,
          },
          layout: { width: 'half', height: 'xl', order: 59.8 },
          version: 1,
        },
        {
          id: 'widget-chart_hod-9rg0fn',
          type: 'chart_hod',
          options: {
            showHint: true,
            showLegend: true,
            lookbackMode: 'overlay',
            compact: true,
            reverseOrder: false,
          },
          layout: { width: 'full', height: 'l', order: 60 },
          version: 1,
        },
      ],
    },
    {
      id: 'tab-mk4w4rau',
      label: 'Workspace',
      widgets: [
        {
          id: 'widget-note_editor-1768297159393',
          type: 'note_editor',
          options: {},
          layout: { width: 'half', height: 'l', order: 69 },
          version: 1,
        },
        {
          id: 'widget-deck_stats-1768297160410',
          type: 'deck_stats',
          options: {
            includeArchived: true,
            includeCompleted: true,
            scope: 'all',
            mineMode: 'assignee',
            metrics: [
              'open_now',
              'overdue_now',
              'mine_open',
              'created_in_range',
              'completed_in_range',
              'due_in_range',
            ],
          },
          layout: { width: 'quarter', height: 'm', order: 78 },
          version: 1,
        },
        {
          id: 'widget-note_snippet-1768297161989',
          type: 'note_snippet',
          options: {},
          layout: { width: 'quarter', height: 'm', order: 79 },
          version: 1,
        },
        {
          id: 'widget-deck_cards-1768297173746',
          type: 'deck_cards',
          options: {
            allowMine: true,
            includeArchived: true,
            includeCompleted: true,
            autoScroll: true,
            intervalSeconds: 5,
            showCount: true,
            autoTagsEnabled: true,
            compactList: true,
            customFilters: [],
            filters: [
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
            ],
            defaultFilter: 'open_all',
            mineMode: 'assignee',
          },
          layout: { width: 'full', height: 'xl', order: 89 },
          version: 1,
        },
      ],
    },
  ],
  defaultTabId: 'tab-1',
}

export function setWidgetPresets(input: unknown): void {
  const normalized = normalizeWidgetPresets(input)
  if (normalized) {
    cachedPresets = normalized
  }
}

export function getWidgetPresets(): WidgetPresets | null {
  return cachedPresets
}

export function getWidgetPreset(mode: DashboardMode): WidgetDefinition[] {
  const presets = cachedPresets
  if (!presets) return []
  const list = presets[mode] || []
  return cloneWidgets(list)
}

export function createDefaultWidgetTabs(mode: DashboardMode): WidgetTabsState {
  if (mode === 'pro') {
    return cloneTabsState(PRO_TABS)
  }
  const widgets = getWidgetPreset(mode)
  return {
    tabs: [{ id: 'tab-1', label: 'Overview', widgets }],
    defaultTabId: 'tab-1',
  }
}

function normalizeWidgetPresets(input: unknown): WidgetPresets | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>
  const modes: DashboardMode[] = ['quick', 'standard', 'pro']
  const result = {} as WidgetPresets
  for (const mode of modes) {
    const list = obj[mode]
    result[mode] = Array.isArray(list) ? (list as WidgetDefinition[]) : []
  }
  return result
}

function cloneWidgets(list: WidgetDefinition[]): WidgetDefinition[] {
  return JSON.parse(JSON.stringify(list || [])) as WidgetDefinition[]
}

function cloneTabsState(state: WidgetTabsState): WidgetTabsState {
  return JSON.parse(JSON.stringify(state)) as WidgetTabsState
}
