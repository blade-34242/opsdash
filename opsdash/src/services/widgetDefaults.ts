import type { DashboardMode, WidgetDefinition, WidgetTabsState } from './widgetsRegistry/types'

export type WidgetPresets = Record<DashboardMode, WidgetDefinition[]>

let cachedPresets: WidgetPresets | null = null

const QUICK_TABS: WidgetTabsState = {
  tabs: [{ id: 'tab-1', label: 'Overview', widgets: [] }],
  defaultTabId: 'tab-1',
}

const STANDARD_TABS: WidgetTabsState = {
  tabs: [
    {
      id: 'tab-1',
      label: 'Overview',
      widgets: [
        {
          id: 'widget-targets_v2-1',
          type: 'targets_v2',
          options: {
            showLegend: true,
            showDelta: true,
            showForecast: true,
            showPace: true,
            neverFinishedMode: false,
            showToday: true,
            showTotalDelta: true,
            showNeedPerDay: true,
            showCategoryBlocks: true,
            badges: true,
            includeWeekendToggle: true,
            includeZeroDaysInStats: false,
            useLocalConfig: false,
            localConfig: null,
          },
          layout: { width: 'half', height: 'l', order: 10 },
          version: 1,
        },
        {
          id: 'widget-time_summary_overview-2',
          type: 'time_summary_overview',
          options: {
            defaultView: 'auto',
            showDailyKpis: true,
            showWeekMiniChart: true,
            showEmptyLanes: true,
            maxLanes: 4,
            showActivityNote: true,
            heightMode: 'auto',
          },
          layout: { width: 'half', height: 'l', order: 20 },
          version: 1,
        },
        {
          id: 'widget-balance_index-4',
          type: 'balance_index',
          options: {
            showTrend: true,
            showMessages: true,
            showConfig: false,
            indexBasis: 'category',
            noticeAbove: 0.15,
            noticeBelow: 0.15,
            warnAbove: 0.3,
            warnBelow: 0.3,
            warnIndex: 0.6,
            messageDensity: 'normal',
            trendColor: '#2563EB',
            showCurrent: true,
            labelMode: 'period',
            reverseOrder: false,
          },
          layout: { width: 'half', height: 'm', order: 30 },
          version: 1,
        },
        {
          id: 'widget-dayoff_trend-5',
          type: 'dayoff_trend',
          options: {
            reverseOrder: false,
            labelMode: 'period',
            interpretation: 'more_off_positive',
            toneLowColor: '#DC2626',
            toneHighColor: '#16A34A',
          },
          layout: { width: 'half', height: 's', order: 40 },
          version: 1,
        },
        {
          id: 'widget-chart_pie-7',
          type: 'chart_pie',
          options: {
            showLegend: true,
            showLabels: true,
            compact: false,
            heightMode: 'auto',
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'half', height: 'm', order: 45 },
          version: 1,
        },
        {
          id: 'widget-deck_stats-6',
          type: 'deck_stats',
          options: {
            scope: 'all',
            mineMode: 'assignee',
            includeArchived: true,
            includeCompleted: true,
            metrics: [
              'open_now',
              'overdue_now',
              'created_in_range',
              'completed_in_range',
              'due_in_range',
            ],
            heightMode: 'auto',
          },
          layout: { width: 'half', height: 'm', order: 55 },
          version: 1,
        },
        {
          id: 'widget-calendar_table-8',
          type: 'calendar_table',
          options: {
            calendarFilter: [],
            compact: false,
          },
          layout: { width: 'full', height: 'l', order: 56 },
          version: 1,
        },
        {
          id: 'widget-chart_stacked-9',
          type: 'chart_stacked',
          options: {
            showLegend: true,
            showLabels: false,
            compact: false,
            forecastMode: 'total',
            heightMode: 'auto',
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'full', height: 'l', order: 57 },
          version: 1,
        },
        {
          id: 'widget-chart_per_day-10',
          type: 'chart_per_day',
          options: {
            showLabels: false,
            compact: false,
            reverseOrder: false,
            forecastMode: 'total',
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'half', height: 'xl', order: 58 },
          version: 1,
        },
        {
          id: 'widget-chart_dow-11',
          type: 'chart_dow',
          options: {
            showLabels: true,
            compact: false,
            reverseOrder: false,
            forecastMode: 'total',
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'half', height: 'm', order: 58.5 },
          version: 1,
        },
        {
          id: 'widget-chart_hod-12',
          type: 'chart_hod',
          options: {
            showHint: false,
            showLegend: true,
            lookbackMode: 'overlay',
            compact: false,
            reverseOrder: false,
          },
          layout: { width: 'full', height: 'l', order: 59 },
          version: 1,
        },
        {
          id: 'widget-deck_cards-13',
          type: 'deck_cards',
          options: {
            allowMine: true,
            includeArchived: true,
            includeCompleted: true,
            autoScroll: true,
            intervalSeconds: 5,
            showCount: true,
            minFilterCount: 0,
            autoTagsEnabled: true,
            compactList: false,
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
            heightMode: 'fixed',
          },
          layout: { width: 'full', height: 'xl', order: 69 },
          version: 1,
        },
        {
          id: 'widget-calendar_table-1779236255213',
          type: 'calendar_table',
          options: {
            calendarFilter: [],
            compact: false,
          },
          layout: { width: 'full', height: 'l', order: 79 },
          version: 1,
        },
      ],
    },
  ],
  defaultTabId: 'tab-1',
}

const PRO_TABS: WidgetTabsState = {
  tabs: [
    {
      id: 'tab-1',
      label: 'Overview',
      widgets: [
        {
          id: 'widget-targets_v2-1',
          type: 'targets_v2',
          options: {
            showLegend: true,
            showDelta: true,
            showForecast: true,
            showPace: true,
            neverFinishedMode: false,
            showToday: true,
            showTotalDelta: true,
            showNeedPerDay: true,
            showCategoryBlocks: true,
            badges: true,
            includeWeekendToggle: true,
            includeZeroDaysInStats: false,
            useLocalConfig: false,
            localConfig: null,
            heightMode: 'auto',
            scale: 'md',
          },
          layout: { width: 'half', height: 'xl', order: 10 },
          version: 1,
        },
        {
          id: 'widget-time_summary_overview-2',
          type: 'time_summary_overview',
          options: {
            defaultView: 'auto',
            showDailyKpis: true,
            showWeekMiniChart: true,
            showEmptyLanes: true,
            maxLanes: 4,
            showActivityNote: true,
            heightMode: 'auto',
            scale: 'md',
          },
          layout: { width: 'half', height: 'xl', order: 20 },
          version: 1,
        },
        {
          id: 'widget-deck_stats-1768297160410',
          type: 'deck_stats',
          options: {
            scope: 'all',
            mineMode: 'assignee',
            includeArchived: true,
            includeCompleted: true,
            metrics: [
              'open_now',
              'overdue_now',
              'mine_open',
              'created_in_range',
              'completed_in_range',
              'due_in_range',
            ],
            heightMode: 'auto',
          },
          layout: { width: 'half', height: 'm', order: 30 },
          version: 1,
        },
        {
          id: 'widget-balance_index-4',
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
            messageDensity: 'many',
            trendColor: '#2563EB',
            showCurrent: true,
            labelMode: 'period',
            reverseOrder: false,
            scale: 'xl',
          },
          layout: { width: 'full', height: 'l', order: 40 },
          version: 1,
        },
        {
          id: 'widget-dayoff_trend-5',
          type: 'dayoff_trend',
          options: {
            reverseOrder: false,
            labelMode: 'period',
            interpretation: 'more_off_positive',
            toneLowColor: '#DC2626',
            toneHighColor: '#16A34A',
            scale: 'xl',
            dense: true,
          },
          layout: { width: 'full', height: 'm', order: 60 },
          version: 1,
        },
        {
          id: 'widget-category_mix_trend-1778323046609',
          type: 'category_mix_trend',
          options: {
            density: 'normal',
            labelMode: 'period',
            colorMode: 'hybrid',
            trendIndicator: 'none',
            squareCells: false,
            reverseOrder: false,
            showHeader: true,
            showBadge: true,
            shareLowColor: '#E2E8F0',
            shareHighColor: '#60A5FA',
            toneLowColor: '#E11D48',
            toneHighColor: '#10B981',
          },
          layout: { width: 'full', height: 'm', order: 70 },
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
            showLegend: true,
            showLabels: true,
            compact: false,
            filterMode: 'category',
            filterIds: [],
          },
          layout: { width: 'half', height: 'xl', order: 58 },
          version: 1,
        },
        {
          id: 'widget-chart_pie-1768128829168',
          type: 'chart_pie',
          options: {
            showLegend: true,
            showLabels: true,
            compact: false,
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'half', height: 'xl', order: 57 },
          version: 1,
        },
        {
          id: 'widget-chart_stacked-2ttp7b',
          type: 'chart_stacked',
          options: {
            showLegend: true,
            showLabels: false,
            compact: false,
            forecastMode: 'total',
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'full', height: 'xl', order: 59 },
          version: 1,
        },
        {
          id: 'widget-chart_per_day-5tpozm',
          type: 'chart_per_day',
          options: {
            showLabels: false,
            compact: false,
            reverseOrder: false,
            forecastMode: 'total',
            filterMode: 'calendar',
            filterIds: [],
          },
          layout: { width: 'half', height: 'xl', order: 59.5 },
          version: 1,
        },
        {
          id: 'widget-chart_dow-za4squ',
          type: 'chart_dow',
          options: {
            showLabels: true,
            compact: false,
            reverseOrder: false,
            forecastMode: 'total',
            filterMode: 'calendar',
            filterIds: [],
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
            scope: 'all',
            mineMode: 'assignee',
            includeArchived: true,
            includeCompleted: true,
            metrics: [
              'open_now',
              'overdue_now',
              'mine_open',
              'created_in_range',
              'completed_in_range',
              'due_in_range',
            ],
          },
          layout: { width: 'quarter', height: 'xl', order: 78 },
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
            minFilterCount: 1,
            autoTagsEnabled: true,
            compactList: false,
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
            heightMode: 'fixed',
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
  if (mode === 'quick') return cloneTabsState(QUICK_TABS)
  if (mode === 'standard') return cloneTabsState(STANDARD_TABS)
  if (mode === 'pro') return cloneTabsState(PRO_TABS)
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
