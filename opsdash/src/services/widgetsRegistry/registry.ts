export * from './types'

import type { DashboardMode, RegistryEntry, WidgetDefinition, WidgetHeight, WidgetRenderContext, WidgetSize, WidgetTab, WidgetTabsState } from './types'

import { balanceIndexEntry } from './widgets/balance_index'
import { categoryMixTrendEntry } from './widgets/category_mix_trend'
import { chartDowEntry } from './widgets/chart_dow'
import { chartHodEntry } from './widgets/chart_hod'
import { chartPerDayEntry } from './widgets/chart_per_day'
import { chartPieEntry } from './widgets/chart_pie'
import { chartStackedEntry } from './widgets/chart_stacked'
import { calendarTableEntry } from './widgets/calendar_table'
import { dayOffTrendEntry } from './widgets/dayoff_trend'
import { deckCardsEntry } from './widgets/deck_cards'
import { deckStatsEntry } from './widgets/deck_stats'
import { noteEditorEntry } from './widgets/note_editor'
import { noteSnippetEntry } from './widgets/note_snippet'
import { targetsV2Entry } from './widgets/targets_v2'
import { timeSummaryLookbackEntry, timeSummaryOverviewEntry } from './widgets/time_summary_v2'
import { createDefaultWidgetTabs as createDefaultWidgetTabsFromDefaults, getWidgetPreset } from '../widgetDefaults'

type StrategyId = 'total_only' | 'total_plus_categories' | 'full_granular'

const CHART_FILTER_WIDGETS = new Set(['chart_pie', 'chart_stacked', 'chart_per_day', 'chart_dow'])

function parseIdList(input: any): string[] {
  if (Array.isArray(input)) {
    return input.map((val) => String(val ?? '').trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    return input.split(',').map((val) => val.trim()).filter(Boolean)
  }
  return []
}

function migrateChartFilters(type: string, options: Record<string, any>): Record<string, any> {
  if (!CHART_FILTER_WIDGETS.has(type)) return options
  const hasOld =
    options.scope != null ||
    options.calendarFilter != null ||
    options.categoryFilter != null
  const hasNewMode = options.filterMode != null
  const hasNewIds = options.filterIds != null
  if (!hasOld && !hasNewMode && !hasNewIds) return options

  const next = { ...options }
  const mode = next.filterMode === 'calendar' || next.scope === 'calendar' ? 'calendar' : 'category'
  if (!hasNewMode) {
    next.filterMode = mode
  }
  if (!hasNewIds) {
    const raw = mode === 'calendar' ? next.calendarFilter : next.categoryFilter
    next.filterIds = parseIdList(raw)
  }
  delete next.scope
  delete next.calendarFilter
  delete next.categoryFilter
  return next
}

export const widgetsRegistry: Record<string, RegistryEntry> = {
  time_summary_overview: timeSummaryOverviewEntry,
  time_summary_lookback: timeSummaryLookbackEntry,
  targets_v2: targetsV2Entry,
  balance_index: balanceIndexEntry,
  dayoff_trend: dayOffTrendEntry,
  category_mix_trend: categoryMixTrendEntry,
  chart_pie: chartPieEntry,
  chart_stacked: chartStackedEntry,
  chart_per_day: chartPerDayEntry,
  chart_dow: chartDowEntry,
  chart_hod: chartHodEntry,
  calendar_table: calendarTableEntry,
  deck_cards: deckCardsEntry,
  deck_stats: deckStatsEntry,
  note_snippet: noteSnippetEntry,
  note_editor: noteEditorEntry,
}

/**
 * Normalizes a raw widgets payload coming from storage or server.
 */
export function normalizeWidgetLayout(raw: any, fallback: WidgetDefinition[], allowEmpty = false): WidgetDefinition[] {
  if (!Array.isArray(raw)) return fallback
  const cleaned: WidgetDefinition[] = []

  const pushWidget = (type: string, source: any, idx: number, optionOverrides?: Record<string, any>, orderOverride?: number) => {
    const entry = widgetsRegistry[type]
    if (!entry) return
    const id = String(source?.id ?? '') || `widget-${type}-${idx + 1}`
    const layout = source?.layout ?? {}
    const width: WidgetSize =
      layout.width === 'quarter' || layout.width === 'half' ? layout.width : 'full'
    const height: WidgetHeight =
      layout.height === 's' || layout.height === 'l' || layout.height === 'xl' ? layout.height : 'm'
    const orderRaw = orderOverride ?? Number(layout.order ?? 0)
    const order = Number.isFinite(orderRaw) ? orderRaw : 0
    const baseOptions = entry.defaultOptions || {}
    let options = {
      ...baseOptions,
      ...(source?.options && typeof source.options === 'object' ? source.options : {}),
      ...(optionOverrides && typeof optionOverrides === 'object' ? optionOverrides : {}),
    }
    if (options.scale == null && options.textSize != null) {
      options.scale = options.textSize
      delete options.textSize
    }
    options = migrateChartFilters(type, options)
    cleaned.push({
      id,
      type,
      options,
      layout: { width, height, order },
      version: Number(source?.version ?? 1) || 1,
    })
  }

  raw.forEach((item: any, idx: number) => {
    const type = String(item?.type ?? '')
    if (!type) return
    if (type === 'time_summary_v2') {
      const baseId = String(item?.id ?? '') || `widget-time_summary_overview-${idx + 1}`
      const layout = item?.layout ?? {}
      const baseOrder = Number(layout.order ?? 0)
      const safeOrder = Number.isFinite(baseOrder) ? baseOrder : 0
      pushWidget('time_summary_overview', { ...item, id: baseId }, idx)
      pushWidget(
        'time_summary_lookback',
        { ...item, id: `${baseId}-lookback` },
        idx,
        undefined,
        safeOrder + 0.1,
      )
      return
    }
    pushWidget(type, item, idx)
  })
  if (cleaned.length) return cleaned
  return allowEmpty ? [] : fallback
}

export function createDefaultWidgets(): WidgetDefinition[] {
  return createDashboardPreset('standard')
}

export function createDefaultWidgetTabs(mode: DashboardMode): WidgetTabsState {
  return createDefaultWidgetTabsFromDefaults(mode)
}

export function getRestrictedWidgetTypesForStrategy(strategy?: string | null): string[] {
  if (strategy === 'total_only') {
    return ['category_mix_trend']
  }
  if (strategy === 'total_plus_categories') {
    return ['category_mix_trend']
  }
  return []
}

export function filterWidgetDefinitionsForStrategy(
  widgets: WidgetDefinition[],
  strategy?: StrategyId | string | null,
): WidgetDefinition[] {
  const restricted = new Set(getRestrictedWidgetTypesForStrategy(strategy))
  if (!restricted.size) return widgets
  return widgets.filter((widget) => !restricted.has(String(widget?.type ?? '')))
}

export function filterWidgetTabsForStrategy(
  state: WidgetTabsState,
  strategy?: StrategyId | string | null,
): WidgetTabsState {
  const restricted = new Set(getRestrictedWidgetTypesForStrategy(strategy))
  if (!restricted.size) return state

  const tabs = (state?.tabs || []).map((tab) => ({
    ...tab,
    widgets: (tab.widgets || []).filter((widget) => !restricted.has(String(widget?.type ?? ''))),
  }))

  const defaultTabId = tabs.some((tab) => tab.id === state.defaultTabId)
    ? state.defaultTabId
    : (tabs[0]?.id || 'tab-1')

  return { tabs, defaultTabId }
}

export function normalizeWidgetTabs(raw: any, fallback: WidgetTabsState): WidgetTabsState {
  if (Array.isArray(raw)) {
    const widgets = normalizeWidgetLayout(raw, fallback.tabs[0]?.widgets || createDefaultWidgets())
    const tabId = fallback.tabs[0]?.id || 'tab-1'
    return {
      tabs: [{ id: tabId, label: fallback.tabs[0]?.label || 'Overview', widgets }],
      defaultTabId: tabId,
    }
  }
  if (!raw || typeof raw !== 'object') return fallback

  const inputTabs = Array.isArray((raw as any).tabs) ? (raw as any).tabs : []
  const fallbackTabs = fallback.tabs || []
  const cleanedTabs: WidgetTab[] = inputTabs.map((tab: any, idx: number) => {
    const id = String(tab?.id ?? '').trim() || `tab-${idx + 1}`
    const labelRaw = String(tab?.label ?? '').trim()
    const label = labelRaw ? labelRaw.slice(0, 48) : `Tab ${idx + 1}`
    const fallbackWidgets = fallbackTabs[idx]?.widgets || fallbackTabs[0]?.widgets || createDefaultWidgets()
    const widgets = normalizeWidgetLayout(tab?.widgets, fallbackWidgets, true)
    return { id, label, widgets }
  })

  const tabs = cleanedTabs.length ? cleanedTabs : fallbackTabs
  const defaultTabIdRaw = String((raw as any).defaultTabId ?? (raw as any).defaultTab ?? (raw as any).active ?? '')
  const defaultTabId = tabs.some((tab) => tab.id === defaultTabIdRaw)
    ? defaultTabIdRaw
    : (tabs[0]?.id || 'tab-1')
  return { tabs, defaultTabId }
}

function resolveWidgetLoading(def: WidgetDefinition, ctx: WidgetRenderContext) {
  // Keep full widget loading overlays for first paint only.
  return !!ctx.isInitialLoading
}

export function mapWidgetToComponent(def: WidgetDefinition, ctx: WidgetRenderContext) {
  const entry = widgetsRegistry[def.type]
  if (!entry) return null
  const props = entry.buildProps(def, ctx) || {}
  const loading = resolveWidgetLoading(def, ctx)
  return { component: entry.component, props, loading }
}

export function createDashboardPreset(mode: DashboardMode): WidgetDefinition[] {
  return getWidgetPreset(mode)
}
