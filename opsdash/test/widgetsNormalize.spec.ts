import { describe, expect, it } from 'vitest'

import { createDefaultWidgetTabs, normalizeWidgetTabs } from '../src/services/widgetsRegistry'

describe('normalizeWidgetTabs', () => {
  it('cleans and clamps incoming widget payloads', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs([
      { type: 'note_editor', layout: { width: 'giant', height: 'x', order: 'oops' }, options: 'not-an-object' },
      { type: '', layout: {} },
    ], fallback)

    expect(result.tabs).toHaveLength(1)
    const widget = result.tabs[0].widgets[0]
    expect(widget.type).toBe('note_editor')
    expect(widget.layout.width).toBe('full')
    expect(widget.layout.height).toBe('m')
    expect(widget.layout.order).toBe(0)
    expect(widget.options).toEqual({})
    expect(widget.id).toBeTruthy()
  })

  it('normalizes tabbed layouts with a valid default', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs({
      tabs: [
        {
          id: 'tab-a',
          label: 'Alpha',
          widgets: [
            { type: 'note_editor', layout: { width: 'half', height: 'm', order: 1 }, options: {} },
          ],
        },
      ],
      defaultTabId: 'tab-a',
    }, fallback)

    expect(result.defaultTabId).toBe('tab-a')
    expect(result.tabs).toHaveLength(1)
    expect(result.tabs[0].id).toBe('tab-a')
    expect(result.tabs[0].widgets[0].type).toBe('note_editor')
  })

  it('migrates chart filter options to the new selector', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs({
      tabs: [
        {
          id: 'tab-a',
          label: 'Alpha',
          widgets: [
            {
              type: 'chart_pie',
              layout: { width: 'half', height: 'm', order: 1 },
              options: { scope: 'calendar', calendarFilter: ['cal-1'] },
            },
          ],
        },
      ],
      defaultTabId: 'tab-a',
    }, fallback)

    const widget = result.tabs[0].widgets[0]
    expect(widget.options.filterMode).toBe('calendar')
    expect(widget.options.filterIds).toEqual(['cal-1'])
    expect(widget.options.scope).toBeUndefined()
  })

  it('keeps empty tab widgets instead of falling back to presets', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs({
      tabs: [
        { id: 'tab-a', label: 'Alpha', widgets: [] },
        { id: 'tab-b', label: 'Beta', widgets: [
          { type: 'note_editor', layout: { width: 'half', height: 'm', order: 1 }, options: {} },
        ] },
      ],
      defaultTabId: 'tab-a',
    }, fallback)

    expect(result.defaultTabId).toBe('tab-a')
    expect(result.tabs).toHaveLength(2)
    expect(result.tabs[0].id).toBe('tab-a')
    expect(result.tabs[0].widgets).toEqual([])
    expect(result.tabs[1].widgets[0].type).toBe('note_editor')
  })

  it('migrates legacy time_summary_v2 into the overview widget only', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs({
      tabs: [
        {
          id: 'tab-a',
          label: 'Alpha',
          widgets: [
            {
              id: 'legacy-time',
              type: 'time_summary_v2',
              layout: { width: 'half', height: 'l', order: 20 },
              options: { mode: 'all', historyView: 'pills' },
            },
          ],
        },
      ],
      defaultTabId: 'tab-a',
    }, fallback)

    expect(result.tabs[0].widgets).toHaveLength(1)
    expect(result.tabs[0].widgets[0].type).toBe('time_summary_overview')
    expect(result.tabs[0].widgets[0].id).toBe('legacy-time')
  })
})
