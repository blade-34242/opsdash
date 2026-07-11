import { computed, ref, watch, type Ref } from 'vue'

import type { WidgetDefinition, WidgetHeight, WidgetSize, WidgetTab, WidgetTabsState } from '../src/services/widgetsRegistry'

const DECK_WIDGET_TYPES = new Set(['deck_cards', 'deck_stats'])

export type WidgetRegistryEntry = {
  label?: string
  defaultLayout: WidgetDefinition['layout']
}

export function useWidgetLayoutManager(options: {
  storageKey: string
  widgetsRegistry: Record<string, WidgetRegistryEntry>
  createDefaultTabs: () => WidgetTabsState
  normalizeWidgetTabs: (input: any, fallback: WidgetTabsState) => WidgetTabsState
  createDashboardPreset: (mode: 'quick' | 'standard' | 'pro') => WidgetDefinition[]
  dashboardMode: Ref<'quick' | 'standard' | 'pro'>
  deckEnabled: Ref<boolean>
  hasInitialLoad: Ref<boolean>
  queueSaveRef: Ref<null | ((silent?: boolean) => void)>
}) {
  const {
    storageKey,
    widgetsRegistry,
    createDefaultTabs,
    normalizeWidgetTabs,
    createDashboardPreset,
    dashboardMode,
    deckEnabled,
    hasInitialLoad,
    queueSaveRef,
  } = options

  function loadWidgetTabs(): WidgetTabsState {
    return createDefaultTabs()
  }

  const layoutTabs = ref<WidgetTab[]>(loadWidgetTabs().tabs)
  const defaultTabId = ref(loadWidgetTabs().defaultTabId)
  const activeTabId = ref(defaultTabId.value)
  const widgetsDirty = ref(false)
  const isLayoutEditing = ref(false)
  const newWidgetType = ref('')

  function persistWidgets() {
    if (hasInitialLoad.value && widgetsDirty.value) {
      queueSaveRef.value?.(false)
      widgetsDirty.value = false
    }
  }

  watch(
    () => hasInitialLoad.value,
    (ready) => {
      if (ready && widgetsDirty.value) {
        persistWidgets()
      }
    },
  )

  void storageKey

  const activeTab = computed(() => {
    return layoutTabs.value.find((tab) => tab.id === activeTabId.value) || layoutTabs.value[0]
  })

  function setActiveTab(id: string) {
    if (layoutTabs.value.some((tab) => tab.id === id)) {
      activeTabId.value = id
    }
  }

  function setDefaultTab(id: string) {
    if (!layoutTabs.value.some((tab) => tab.id === id)) return
    defaultTabId.value = id
    activeTabId.value = id
    widgetsDirty.value = true
    persistWidgets()
  }

  const widgets = computed<WidgetDefinition[]>(() => {
    const defs = activeTab.value?.widgets || []
    if (!deckEnabled.value) {
      return defs.filter((w) => !DECK_WIDGET_TYPES.has(w.type))
    }
    return defs
  })

  const availableWidgetTypes = computed(() =>
    Object.keys(widgetsRegistry)
      .filter((type) => type !== 'time_summary_lookback')
      .map((type) => ({
        type,
        label: widgetsRegistry[type]?.label || type,
        category: widgetsRegistry[type]?.category,
      })),
  )

  function applyDashboardPreset(mode: 'quick' | 'standard' | 'pro') {
    dashboardMode.value = mode
    const tabId = activeTab.value?.id || 'tab-1'
    const nextTabs = layoutTabs.value.map((tab) =>
      tab.id === tabId ? { ...tab, widgets: createDashboardPreset(mode) } : tab,
    )
    layoutTabs.value = nextTabs
    widgetsDirty.value = true
    persistWidgets()
  }

  function updateTabWidgets(tabId: string, updater: (widgets: WidgetDefinition[]) => WidgetDefinition[]) {
    layoutTabs.value = layoutTabs.value.map((tab) =>
      tab.id === tabId ? { ...tab, widgets: updater([...tab.widgets]) } : tab,
    )
  }

  function updateWidget(id: string, updater: (w: WidgetDefinition) => WidgetDefinition) {
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, (items) =>
      items.map((w) => (w.id === id ? updater({ ...w, layout: { ...w.layout } }) : w)),
    )
    widgetsDirty.value = true
    persistWidgets()
  }

  function cycleWidth(id: string) {
    const order: WidgetSize[] = ['quarter', 'half', 'full']
    updateWidget(id, (w) => {
      const idx = order.indexOf(w.layout.width as WidgetSize)
      const next = order[(idx + 1) % order.length]
      return { ...w, layout: { ...w.layout, width: next } }
    })
  }

  function cycleHeight(id: string) {
    const order: WidgetHeight[] = ['s', 'm', 'l', 'xl']
    updateWidget(id, (w) => {
      const idx = order.indexOf(w.layout.height as WidgetHeight)
      const next = order[(idx + 1) % order.length]
      return { ...w, layout: { ...w.layout, height: next } }
    })
  }

  function moveWidget(id: string, dir: 'up' | 'down') {
    const ordered = [...widgets.value].sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    const idx = ordered.findIndex((w) => w.id === id)
    if (idx < 0) return
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= ordered.length) return
    const currentOrder = ordered[idx].layout.order
    ordered[idx].layout.order = ordered[targetIdx].layout.order
    ordered[targetIdx].layout.order = currentOrder
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, () => ordered)
    widgetsDirty.value = true
    persistWidgets()
  }

  function removeWidget(id: string) {
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, (items) => items.filter((w) => w.id !== id))
    widgetsDirty.value = true
    persistWidgets()
  }

  function nextWidgetOrder(tabId: string) {
    const tab = layoutTabs.value.find((entry) => entry.id === tabId)
    const maxOrder = (tab?.widgets || []).reduce((acc, widget) => Math.max(acc, widget.layout.order || 0), 0)
    return maxOrder + 10
  }

  function cloneWidgetDefinition(widget: WidgetDefinition, overrides: Partial<WidgetDefinition> = {}): WidgetDefinition {
    return {
      ...widget,
      ...overrides,
      layout: {
        ...widget.layout,
        ...(overrides.layout || {}),
      },
      options: widget.options ? JSON.parse(JSON.stringify(widget.options)) : {},
    }
  }

  function moveWidgetToTab(id: string, targetTabId: string) {
    const sourceTabId = activeTab.value?.id
    if (!sourceTabId || sourceTabId === targetTabId) return false
    const sourceTab = layoutTabs.value.find((tab) => tab.id === sourceTabId)
    const widget = sourceTab?.widgets.find((entry) => entry.id === id)
    if (!widget || !layoutTabs.value.some((tab) => tab.id === targetTabId)) return false

    const movedWidget = cloneWidgetDefinition(widget, {
      layout: {
        ...widget.layout,
        order: nextWidgetOrder(targetTabId),
      },
    })

    layoutTabs.value = layoutTabs.value.map((tab) => {
      if (tab.id === sourceTabId) {
        return { ...tab, widgets: tab.widgets.filter((entry) => entry.id !== id) }
      }
      if (tab.id === targetTabId) {
        return { ...tab, widgets: [...tab.widgets, movedWidget] }
      }
      return tab
    })
    activeTabId.value = targetTabId
    widgetsDirty.value = true
    persistWidgets()
    return true
  }

  function duplicateWidgetToTab(id: string, targetTabId: string) {
    const sourceTabId = activeTab.value?.id
    if (!sourceTabId || sourceTabId === targetTabId) return null
    const sourceTab = layoutTabs.value.find((tab) => tab.id === sourceTabId)
    const widget = sourceTab?.widgets.find((entry) => entry.id === id)
    if (!widget || !layoutTabs.value.some((tab) => tab.id === targetTabId)) return null

    const duplicatedWidget = cloneWidgetDefinition(widget, {
      id: `widget-${widget.type}-${Date.now().toString(36)}`,
      layout: {
        ...widget.layout,
        order: nextWidgetOrder(targetTabId),
      },
    })

    layoutTabs.value = layoutTabs.value.map((tab) =>
      tab.id === targetTabId ? { ...tab, widgets: [...tab.widgets, duplicatedWidget] } : tab,
    )
    widgetsDirty.value = true
    persistWidgets()
    return duplicatedWidget.id
  }

  function addWidget(type: string) {
    const entry = widgetsRegistry[type]
    if (!entry) return
    const maxOrder = widgets.value.reduce((acc, w) => Math.max(acc, w.layout.order || 0), 0)
    const def: WidgetDefinition = {
      id: `widget-${type}-${Date.now()}`,
      type,
      options: {},
      layout: { ...entry.defaultLayout, order: maxOrder + 10 },
      version: 1,
    }
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, (items) => [...items, def])
    newWidgetType.value = ''
    widgetsDirty.value = true
    persistWidgets()
  }

  function addWidgetAt(type: string, orderHint?: number) {
    const entry = widgetsRegistry[type]
    if (!entry) return
    const maxOrder = widgets.value.reduce((acc, w) => Math.max(acc, w.layout.order || 0), 0)
    let order = Number.isFinite(orderHint) ? Number(orderHint) : maxOrder + 10
    if (!Number.isFinite(order)) order = maxOrder + 10
    while (widgets.value.some((w) => w.layout.order === order)) {
      order += 0.1
    }
    const def: WidgetDefinition = {
      id: `widget-${type}-${Date.now()}`,
      type,
      options: {},
      layout: { ...entry.defaultLayout, order },
      version: 1,
    }
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, (items) => [...items, def])
    widgetsDirty.value = true
    persistWidgets()
  }

  function reorderWidget(id: string, orderHint?: number | null) {
    if (!Number.isFinite(orderHint ?? NaN)) return
    const nextOrder = Number(orderHint)
    const items = widgets.value.map((w) =>
      w.id === id ? { ...w, layout: { ...w.layout, order: nextOrder } } : { ...w },
    )
    items.sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, () =>
      items.map((w, idx) => ({
        ...w,
        layout: { ...w.layout, order: (idx + 1) * 10 },
      })),
    )
    widgetsDirty.value = true
    persistWidgets()
  }

  function updateWidgetOptions(id: string, key: string, value: any) {
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, (items) =>
      items.map((w) => {
        if (w.id !== id) return w
        const opts = { ...(w.options || {}) }
        if (key.includes('.')) {
          const parts = key.split('.')
          const next = { ...opts }
          let cursor: any = next
          for (let i = 0; i < parts.length - 1; i += 1) {
            const p = parts[i]
            cursor[p] = { ...(cursor[p] || {}) }
            cursor = cursor[p]
          }
          cursor[parts[parts.length - 1]] = value
          return { ...w, options: next }
        }
        if (key === 'scale') {
          opts.scale = value
          if ('textSize' in opts) {
            delete (opts as any).textSize
          }
          return { ...w, options: opts }
        }
        opts[key] = value
        return { ...w, options: opts }
      }),
    )
    widgetsDirty.value = true
    persistWidgets()
  }

  function resetWidgets() {
    const tabId = activeTab.value?.id
    if (!tabId) return
    updateTabWidgets(tabId, () => createDashboardPreset(dashboardMode.value))
    widgetsDirty.value = true
    persistWidgets()
  }

  function addTab(label?: string) {
    const nextId = `tab-${Date.now().toString(36)}`
    const baseLabel = String(label ?? '').trim() || `Tab ${layoutTabs.value.length + 1}`
    const tab: WidgetTab = {
      id: nextId,
      label: baseLabel.slice(0, 48),
      widgets: [],
    }
    layoutTabs.value = [...layoutTabs.value, tab]
    activeTabId.value = tab.id
    widgetsDirty.value = true
    persistWidgets()
  }

  function renameTab(id: string, label: string) {
    const nextLabel = String(label || '').trim().slice(0, 48)
    if (!nextLabel) return
    layoutTabs.value = layoutTabs.value.map((tab) =>
      tab.id === id ? { ...tab, label: nextLabel } : tab,
    )
    widgetsDirty.value = true
    persistWidgets()
  }

  function removeTab(id: string) {
    if (layoutTabs.value.length <= 1) return
    layoutTabs.value = layoutTabs.value.filter((tab) => tab.id !== id)
    if (defaultTabId.value === id) {
      defaultTabId.value = layoutTabs.value[0]?.id || ''
    }
    if (activeTabId.value === id) {
      activeTabId.value = layoutTabs.value[0]?.id || ''
    }
    widgetsDirty.value = true
    persistWidgets()
  }

  function setTabsFromPayload(payload: any) {
    const fallback = createDefaultTabs()
    const normalized = normalizeWidgetTabs(payload, fallback)
    layoutTabs.value = normalized.tabs
    defaultTabId.value = normalized.defaultTabId
    const currentActive = activeTabId.value
    if (currentActive && normalized.tabs.some((tab) => tab.id === currentActive)) {
      activeTabId.value = currentActive
    } else {
      activeTabId.value = normalized.defaultTabId
    }
  }

  return {
    layoutTabs,
    defaultTabId,
    activeTabId,
    widgetsDirty,
    isLayoutEditing,
    newWidgetType,
    widgets,
    availableWidgetTypes,
    persistWidgets,
    applyDashboardPreset,
    updateWidget,
    cycleWidth,
    cycleHeight,
    moveWidget,
    moveWidgetToTab,
    duplicateWidgetToTab,
    removeWidget,
    addWidget,
    addWidgetAt,
    reorderWidget,
    updateWidgetOptions,
    resetWidgets,
    activeTab,
    setActiveTab,
    setDefaultTab,
    addTab,
    renameTab,
    removeTab,
    setTabsFromPayload,
  }
}
