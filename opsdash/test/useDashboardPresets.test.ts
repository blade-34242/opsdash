import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDashboardPresets } from '../composables/useDashboardPresets'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultDeckSettings, createDefaultReportingConfig } from '../src/services/reporting'
import { createDefaultWidgetTabs } from '../src/services/widgetsRegistry'
import type { OnboardingState } from '../composables/useDashboard'
import presetFixture from './fixtures-v2/preset-export.json'

function createPresetManager(overrides: Partial<Parameters<typeof useDashboardPresets>[0]> = {}) {
  const selected = ref<string[]>(['cal-1'])
  const groupsById = ref<Record<string, number>>({ 'cal-1': 2 })
  const targetsWeek = ref<Record<string, number>>({ 'cal-1': 10 })
  const targetsMonth = ref<Record<string, number>>({ 'cal-1': 40 })
  const targetsConfig = ref(createDefaultTargetsConfig())
  const widgetTabs = overrides.widgetTabs ?? ref(createDefaultWidgetTabs('standard'))
  const themePreference = overrides.themePreference ?? ref<'auto' | 'light' | 'dark'>('auto')
  const reportingConfig = overrides.reportingConfig ?? ref(createDefaultReportingConfig())
  const deckSettings = overrides.deckSettings ?? ref(createDefaultDeckSettings())
  const setThemePreference = overrides.setThemePreference ?? vi.fn()
  const onboardingState = overrides.onboardingState ?? ref<OnboardingState | null>({
    completed: true,
    version: 1,
    strategy: 'total_only',
    completed_at: '2026-01-01T00:00:00.000Z',
    dashboardMode: 'standard',
  })
  const setDashboardMode = overrides.setDashboardMode ?? vi.fn()
  const applyDashboardPreset = overrides.applyDashboardPreset ?? vi.fn()
  const userChangedSelection = ref(false)

  const route = vi.fn<(name: 'presetsList' | 'presetsSave' | 'presetsLoad' | 'presetsDelete', param?: string) => string>().mockImplementation((name, param?: string) => {
    switch (name) {
      case 'presetsList':
      case 'presetsSave':
        return '/presets'
      case 'presetsLoad':
      case 'presetsDelete':
        return `/presets/${param ?? ''}`
      default:
        return '/presets'
    }
  })

  const getJson = vi.fn().mockResolvedValue({ presets: [] })
  const postJson = vi.fn().mockResolvedValue({ presets: [] })
  const deleteJson = vi.fn().mockResolvedValue({ presets: [] })
  const notifyError = vi.fn()
  const notifySuccess = vi.fn()
  const queueSave = vi.fn()

  const manager = useDashboardPresets({
    route,
    getJson,
    postJson,
    deleteJson,
    notifyError,
    notifySuccess,
    queueSave,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    setThemePreference,
    reportingConfig,
    deckSettings,
    widgetTabs,
    onboardingState,
    setDashboardMode,
    applyDashboardPreset,
    userChangedSelection,
    ...overrides,
  })

  return {
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    reportingConfig,
    deckSettings,
    setThemePreference,
    widgetTabs,
    onboardingState,
    setDashboardMode,
    applyDashboardPreset,
    userChangedSelection,
    route,
    getJson,
    postJson,
    deleteJson,
    notifyError,
    notifySuccess,
    queueSave,
    ...manager,
  }
}

describe('useDashboardPresets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('refreshes presets list', async () => {
    const getJson = vi.fn().mockResolvedValue({ presets: [{ name: 'Focus', selectedCount: 2, calendarCount: 3 }] })
    const manager = createPresetManager({ getJson })

    await manager.refreshPresets()

    expect(getJson).toHaveBeenCalledWith('/presets', {})
    expect(manager.presets.value).toEqual([{ name: 'Focus', selectedCount: 2, calendarCount: 3 }])
    expect(manager.notifyError).not.toHaveBeenCalled()
  })

  it('saves presets and records warnings', async () => {
    const postJson = vi.fn().mockResolvedValue({ presets: [], warnings: ['Calendar missing'] })
    const themePreference = ref<'auto' | 'light' | 'dark'>('dark')
    const manager = createPresetManager({ postJson, themePreference })

    await manager.savePreset(' Deep Work ')

    expect(postJson).toHaveBeenCalledWith('/presets', expect.objectContaining({
      name: 'Deep Work',
      widgets: manager.widgetTabs.value,
      onboarding: manager.onboardingState.value,
      theme_preference: 'dark',
      reporting_config: manager.reportingConfig.value,
      deck_settings: manager.deckSettings.value,
    }))
    expect(manager.presetWarnings.value).toEqual(['Calendar missing'])
    expect(manager.notifySuccess).toHaveBeenCalledWith('Profile "Deep Work" saved')
    expect(manager.notifyError).not.toHaveBeenCalled()
  })

  it('loads preset, applies data, queues save, and refreshes list', async () => {
    const presetWidgets = {
      tabs: [
        {
          id: 'tab-1',
          label: 'Overview',
          widgets: [
            { id: 'widget-deck', type: 'deck_cards', layout: { width: 'half', height: 'm', order: 1 }, options: {}, version: 1 },
          ],
        },
      ],
      defaultTabId: 'tab-1',
    }
    const presetReporting = { ...createDefaultReportingConfig(), enabled: true }
    const presetDeck = { ...createDefaultDeckSettings(), enabled: false, defaultFilter: 'open_all' }
    const presetPayload = {
      preset: {
        selected: ['cal-1', 'cal-2'],
        groups: { 'cal-1': 1 },
        targets_week: { 'cal-1': 5 },
        targets_month: { 'cal-1': 20 },
        targets_config: { ...createDefaultTargetsConfig(), totalHours: 120 },
        theme_preference: 'dark',
        reporting_config: presetReporting,
        deck_settings: presetDeck,
        widgets: presetWidgets,
        onboarding: {
          completed: true,
          version: 1,
          strategy: 'total_plus_categories',
          completed_at: '2026-02-20T00:00:00.000Z',
          dashboardMode: 'pro',
        },
      },
      presets: [],
    }
    const getJson = vi.fn().mockResolvedValueOnce(presetPayload).mockResolvedValueOnce({ presets: [] })
    const queueSave = vi.fn()
    const setThemePreference = vi.fn()
    const manager = createPresetManager({ getJson, queueSave, setThemePreference })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await manager.loadPreset('Focus')

    expect(getJson).toHaveBeenCalledWith('/presets/Focus', {})
    expect(manager.selected.value).toEqual(['cal-1', 'cal-2'])
    expect(manager.targetsWeek.value['cal-1']).toBe(5)
    expect(manager.targetsConfig.value.totalHours).toBe(120)
    expect(setThemePreference).toHaveBeenCalledWith('dark', { persist: false })
    expect(manager.reportingConfig.value.enabled).toBe(true)
    expect(manager.deckSettings.value.enabled).toBe(false)
    expect(manager.deckSettings.value.defaultFilter).toBe('open_all')
    expect(manager.widgetTabs.value.tabs[0].widgets[0].type).toBe('deck_cards')
    expect(manager.onboardingState.value?.strategy).toBe('total_plus_categories')
    expect(manager.onboardingState.value?.dashboardMode).toBe('pro')
    expect(manager.setDashboardMode).toHaveBeenCalledWith('pro')
    expect(queueSave).toHaveBeenCalledWith(true)
    expect(manager.notifySuccess).toHaveBeenCalledWith('Profile "Focus" applied')
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('aborts preset load when user declines warnings', async () => {
    const getJson = vi.fn().mockResolvedValue({ preset: { warnings: ['Missing cal'] } })
    const manager = createPresetManager({ getJson })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await manager.loadPreset('Focus')

    expect(manager.presetWarnings.value).toEqual(['Missing cal'])
    expect(manager.presetApplying.value).toBe(false)
    expect(manager.queueSave).not.toHaveBeenCalled()
    expect(manager.notifySuccess).not.toHaveBeenCalled()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('applies dashboard preset fallback when profile has onboarding mode but no widgets', async () => {
    const applyDashboardPreset = vi.fn()
    const setDashboardMode = vi.fn()
    const getJson = vi.fn().mockResolvedValueOnce({
      preset: {
        selected: ['cal-1'],
        onboarding: {
          completed: true,
          version: 1,
          strategy: 'total_only',
          completed_at: '2026-02-21T00:00:00.000Z',
          dashboardMode: 'quick',
        },
      },
    }).mockResolvedValueOnce({ presets: [] })
    const manager = createPresetManager({
      getJson,
      applyDashboardPreset,
      setDashboardMode,
    })

    await manager.loadPreset('Compact')

    expect(setDashboardMode).toHaveBeenCalledWith('quick')
    expect(applyDashboardPreset).toHaveBeenCalledWith('quick')
  })

  it('replays exported preset envelope fixture without warnings', async () => {
    const presetFromExport = {
      selected: presetFixture.payload.cals,
      groups: presetFixture.payload.groups,
      targets_week: presetFixture.payload.targets_week,
      targets_month: presetFixture.payload.targets_month,
      targets_config: presetFixture.payload.targets_config,
    }

    const getJson = vi
      .fn()
      .mockResolvedValueOnce({ preset: presetFromExport })
      .mockResolvedValueOnce({ presets: [] })
    const queueSave = vi.fn()
    const manager = createPresetManager({ getJson, queueSave })

    await manager.loadPreset('Opsdash Demo')

    expect(manager.selected.value).toEqual(presetFixture.payload.cals)
    expect(manager.groupsById.value).toEqual(presetFixture.payload.groups)
    expect(manager.targetsWeek.value).toEqual(presetFixture.payload.targets_week)
    expect(manager.targetsMonth.value).toEqual(presetFixture.payload.targets_month)
    expect(manager.targetsConfig.value.totalHours).toBe(presetFixture.payload.targets_config.totalHours)
    expect(manager.presetWarnings.value).toEqual([])
    expect(queueSave).toHaveBeenCalledWith(true)
    expect(manager.notifySuccess).toHaveBeenCalledWith('Profile "Opsdash Demo" applied')
  })
})
