import { describe, it, expect } from 'vitest'

import { createDefaultWidgetTabs } from '../src/services/widgetsRegistry'
import { setWidgetPresets } from '../src/services/widgetDefaults'

describe('widget defaults', () => {
  it('includes deck stats in the standard preset when server presets are loaded', () => {
    setWidgetPresets({
      quick: [],
      standard: [
        {
          id: 'widget-deck_stats-1',
          type: 'deck_stats',
          options: {},
          layout: { width: 'half', height: 'm', order: 45 },
          version: 1,
        },
      ],
      pro: [],
    })

    const tabs = createDefaultWidgetTabs('standard')

    expect(tabs.tabs).toHaveLength(1)
    expect(tabs.tabs[0].widgets.some((widget) => widget.type === 'deck_stats')).toBe(true)
  })

  it('uses the supplied Pro Workspace layout for Deck and Calendar stats', () => {
    const tabs = createDefaultWidgetTabs('pro')
    const overviewTab = tabs.tabs.find((tab) => tab.label === 'Overview')
    const workspaceTab = tabs.tabs.find((tab) => tab.label === 'Workspace')

    expect(workspaceTab).toBeTruthy()
    expect(overviewTab?.widgets.some((widget) => widget.type === 'deck_stats')).toBe(false)
    expect(workspaceTab?.widgets.map((widget) => widget.type)).toEqual([
      'deck_stats',
      'deck_cards',
      'calendar_stats',
    ])
    expect(workspaceTab?.widgets[2].layout).toEqual({ width: 'quarter', height: 'xl', order: 99 })
  })

  it('uses a focused Standard template for each goal strategy', () => {
    const singleGoal = createDefaultWidgetTabs('standard', 'total_only')
    const calendarGoals = createDefaultWidgetTabs('standard', 'total_plus_categories')
    const fullGoals = createDefaultWidgetTabs('standard', 'full_granular')

    const types = (tabs: typeof singleGoal) => tabs.tabs.flatMap((tab) => tab.widgets.map((widget) => widget.type))

    expect(types(singleGoal)).toEqual(['targets_v2', 'time_summary_overview', 'dayoff_trend', 'deck_stats'])
    expect(types(calendarGoals)).toContain('calendar_table')
    expect(types(calendarGoals)).not.toContain('balance_index')
    expect(types(calendarGoals)).not.toContain('category_mix_trend')
    expect(types(fullGoals)).toContain('balance_index')
    expect(types(fullGoals)).toContain('category_mix_trend')
  })

  it('aligns strategy-owned widget options when creating defaults for calendar goals', () => {
    const tabs = createDefaultWidgetTabs('pro', 'total_plus_categories')
    const overview = tabs.tabs.flatMap((tab) => tab.widgets).find((widget) => widget.type === 'time_summary_overview')

    expect(overview?.options?.defaultView ?? 'auto').toBe('auto')
    expect(overview?.options?.showWeekMiniChart).not.toBe(false)
  })
})
