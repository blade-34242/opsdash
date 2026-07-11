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

  it('includes deck stats in the advanced Workspace tab', () => {
    const tabs = createDefaultWidgetTabs('pro')
    const workspaceTab = tabs.tabs.find((tab) => tab.label === 'Workspace')

    expect(workspaceTab).toBeTruthy()
    expect(workspaceTab?.widgets.some((widget) => widget.type === 'deck_stats')).toBe(true)
  })

  it('aligns strategy-owned widget options when creating defaults for calendar goals', () => {
    const tabs = createDefaultWidgetTabs('pro', 'total_plus_categories')
    const overview = tabs.tabs.flatMap((tab) => tab.widgets).find((widget) => widget.type === 'time_summary_overview')

    expect(overview?.options?.defaultView ?? 'auto').toBe('auto')
    expect(overview?.options?.showWeekMiniChart).not.toBe(false)
  })
})
