import { describe, it, expect, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { useWidgetLayoutManager } from '../composables/useWidgetLayoutManager'

describe('useWidgetLayoutManager', () => {
  const registry = {
    test_widget: {
      label: 'Test Widget',
      defaultLayout: { width: 'half', height: 'm', order: 10 },
    },
  }

  function makeManager() {
    return useWidgetLayoutManager({
      storageKey: 'opsdash.widgets.test',
      widgetsRegistry: registry,
      createDefaultTabs: () => ({
        tabs: [{ id: 'tab-1', label: 'Overview', widgets: [] }],
        defaultTabId: 'tab-1',
      }),
      normalizeWidgetTabs: (input, fallback) => (input ? input : fallback),
      createDashboardPreset: () => [],
      dashboardMode: ref('standard'),
      deckEnabled: ref(true),
      hasInitialLoad: ref(true),
      queueSaveRef: ref(vi.fn()),
    })
  }

  it('persists dirty widgets after initial load completes', async () => {
    const queueSave = vi.fn()
    const hasInitialLoad = ref(false)

    const manager = useWidgetLayoutManager({
      storageKey: 'opsdash.widgets.test',
      widgetsRegistry: {
        test_widget: {
          label: 'Test Widget',
          defaultLayout: { width: 'half', height: 'm', order: 10 },
        },
      },
      createDefaultTabs: () => ({
        tabs: [{ id: 'tab-1', label: 'Overview', widgets: [] }],
        defaultTabId: 'tab-1',
      }),
      normalizeWidgetTabs: (input, fallback) => (input ? input : fallback),
      createDashboardPreset: () => [],
      dashboardMode: ref('standard'),
      deckEnabled: ref(true),
      hasInitialLoad,
      queueSaveRef: ref(queueSave),
    })

    manager.addWidget('test_widget')
    expect(queueSave).not.toHaveBeenCalled()

    hasInitialLoad.value = true
    await nextTick()

    expect(queueSave).toHaveBeenCalledWith(false)
  })

  it('adds and renames tabs without mutating other tabs', () => {
    const manager = makeManager()

    manager.addTab('Reports')
    expect(manager.layoutTabs.value).toHaveLength(2)
    expect(manager.activeTabId.value).toBe(manager.layoutTabs.value[1].id)

    manager.renameTab(manager.layoutTabs.value[1].id, 'Weekly')
    expect(manager.layoutTabs.value[1].label).toBe('Weekly')
    expect(manager.layoutTabs.value[0].label).toBe('Overview')
  })

  it('switches active widgets per tab', () => {
    const manager = makeManager()

    manager.addWidget('test_widget')
    const firstTabId = manager.activeTabId.value
    const firstTabWidgets = manager.widgets.value
    expect(firstTabWidgets).toHaveLength(1)

    manager.addTab('Secondary')
    expect(manager.widgets.value).toHaveLength(0)

    manager.setActiveTab(firstTabId)
    expect(manager.widgets.value).toHaveLength(1)
  })

  it('removes tabs and keeps a valid default', () => {
    const manager = makeManager()

    manager.addTab('Secondary')
    const firstTabId = manager.layoutTabs.value[0].id
    const secondTabId = manager.layoutTabs.value[1].id

    manager.setDefaultTab(secondTabId)
    expect(manager.defaultTabId.value).toBe(secondTabId)

    manager.removeTab(secondTabId)
    expect(manager.layoutTabs.value).toHaveLength(1)
    expect(manager.defaultTabId.value).toBe(firstTabId)
    expect(manager.activeTabId.value).toBe(firstTabId)
  })

  it('moves widgets to another tab and activates the destination tab', () => {
    const manager = makeManager()

    manager.addWidget('test_widget')
    manager.addTab('Secondary')
    const sourceTabId = manager.layoutTabs.value[0].id
    const targetTabId = manager.layoutTabs.value[1].id
    const widgetId = manager.layoutTabs.value[0].widgets[0].id

    manager.setActiveTab(sourceTabId)
    const moved = manager.moveWidgetToTab(widgetId, targetTabId)

    expect(moved).toBe(true)
    expect(manager.activeTabId.value).toBe(targetTabId)
    expect(manager.layoutTabs.value[0].widgets).toHaveLength(0)
    expect(manager.layoutTabs.value[1].widgets).toHaveLength(1)
    expect(manager.layoutTabs.value[1].widgets[0].id).toBe(widgetId)
  })

  it('duplicates widgets into another tab without removing the source widget', () => {
    const manager = makeManager()

    manager.addWidget('test_widget')
    manager.addTab('Secondary')
    const sourceTabId = manager.layoutTabs.value[0].id
    const targetTabId = manager.layoutTabs.value[1].id
    const widgetId = manager.layoutTabs.value[0].widgets[0].id

    manager.setActiveTab(sourceTabId)
    const duplicateId = manager.duplicateWidgetToTab(widgetId, targetTabId)

    expect(duplicateId).toBeTruthy()
    expect(manager.layoutTabs.value[0].widgets).toHaveLength(1)
    expect(manager.layoutTabs.value[1].widgets).toHaveLength(1)
    expect(manager.layoutTabs.value[1].widgets[0].id).not.toBe(widgetId)
    expect(manager.layoutTabs.value[1].widgets[0].type).toBe('test_widget')
  })
})
