import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDashboardPersistence } from '../composables/useDashboardPersistence'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultDeckSettings, createDefaultReportingConfig } from '../src/services/reporting'
import persistFixture from './fixtures-v2/persist-response.json'
import persistQaFixture from './fixtures-v2/persist-qa.json'
import persistWeekOffset from './fixtures-v2/persist-week-offset1.json'
import persistReportingDeck from './fixtures-v2/persist-reporting-deck.json'
import { createDefaultWidgetTabs } from '../src/services/widgetsRegistry'

function createPersistence(overrides: Partial<Parameters<typeof useDashboardPersistence>[0]> = {}) {
  const selected = ref<string[]>([])
  const groupsById = ref<Record<string, number>>({})
  const targetsWeek = ref<Record<string, number>>({})
  const targetsMonth = ref<Record<string, number>>({})
  const targetsConfig = ref(createDefaultTargetsConfig())
  const themePreference =
    overrides.themePreference ?? ref<'auto' | 'light' | 'dark'>('auto')
  const onboardingState = overrides.onboardingState ?? ref<any>(null)

  const route = vi.fn<(name: 'persist') => string>().mockReturnValue('/persist')
  const postJson = vi.fn().mockResolvedValue({})
  const notifyError = vi.fn()
  const notifySuccess = vi.fn()
  const onReload = vi.fn().mockResolvedValue(undefined)

  const persistence = useDashboardPersistence({
    route,
    postJson,
    notifyError,
    notifySuccess,
    onReload,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    onboardingState,
    ...overrides,
  })

  return {
    route,
    postJson,
    notifyError,
    notifySuccess,
    onReload,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    onboardingState,
    ...persistence,
  }
}

describe('useDashboardPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('posts current payload and updates selection + config', async () => {
    const persistedConfig = createDefaultTargetsConfig()
    persistedConfig.totalHours = 99

    const postJson = vi.fn().mockResolvedValue({
      read: ['cal-1', 'cal-2'],
      targets_config_read: persistedConfig,
    })
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()
    const onReload = vi.fn().mockResolvedValue(undefined)

    const {
      queueSave,
      selected,
      groupsById,
      targetsWeek,
      targetsMonth,
      targetsConfig,
      isSaving,
    } = createPersistence({
      postJson,
      notifySuccess,
      notifyError,
      onReload,
    })

    selected.value = ['cal-1']
    groupsById.value = { 'cal-1': 2 }
    targetsWeek.value = { 'cal-1': 12 }
    targetsMonth.value = { 'cal-1': 48 }
    targetsConfig.value.totalHours = 64
    const configSnapshot = targetsConfig.value

    queueSave(true)
    expect(isSaving.value).toBe(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      cals: ['cal-1'],
      groups: { 'cal-1': 2 },
      targets_week: { 'cal-1': 12 },
      targets_month: { 'cal-1': 48 },
    }))
    const sentConfig = postJson.mock.calls[0][1]?.targets_config
    expect(sentConfig).toMatchObject(configSnapshot)
    expect(sentConfig).not.toBe(configSnapshot)

    expect(selected.value).toEqual(['cal-1', 'cal-2'])
    expect(targetsConfig.value.totalHours).toBe(99)
    expect(isSaving.value).toBe(false)
    expect(notifySuccess).toHaveBeenCalledWith('Selection saved')
    expect(notifyError).not.toHaveBeenCalled()
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid queueSave calls', async () => {
    const postJson = vi.fn().mockResolvedValue({})
    const notifySuccess = vi.fn()

    const { queueSave } = createPersistence({
      postJson,
      notifySuccess,
    })

    queueSave(false)
    vi.advanceTimersByTime(200)
    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledTimes(1)
    expect(notifySuccess).toHaveBeenCalledTimes(1)
  })

  it('applies server-provided balance UI toggles', async () => {
    const serverConfig = createDefaultTargetsConfig()
    serverConfig.balance.ui.showNotes = false

    const postJson = vi.fn().mockResolvedValue({
      targets_config_read: serverConfig,
    })

    const { queueSave, targetsConfig } = createPersistence({
      postJson,
      notifySuccess: vi.fn(),
    })

    targetsConfig.value.balance.ui.showNotes = true

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledTimes(1)
    expect(targetsConfig.value.balance.ui.showNotes).toBe(false)
  })

  it('applies balance index basis from server config', async () => {
    const serverConfig = createDefaultTargetsConfig()
    serverConfig.balance.index.basis = 'calendar'

    const postJson = vi.fn().mockResolvedValue({
      targets_config_read: serverConfig,
    })

    const { queueSave, targetsConfig } = createPersistence({
      postJson,
      notifySuccess: vi.fn(),
    })

    targetsConfig.value.balance.index.basis = 'category'

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledTimes(1)
    expect(targetsConfig.value.balance.index.basis).toBe('calendar')
  })

  it('persists theme preference when provided', async () => {
    const postJson = vi.fn().mockResolvedValue({
      theme_preference_read: 'dark',
    })

    const { queueSave, themePreference } = createPersistence({
      postJson,
      themePreference: ref<'auto' | 'light' | 'dark'>('light'),
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      theme_preference: 'light',
    }))
    expect(themePreference.value).toBe('dark')
  })

  it('persists onboarding state and applies server read-back', async () => {
    const onboardingState = ref<any>({
      completed: true,
      version: 1,
      strategy: 'full_granular',
      completed_at: '2026-02-21T00:00:00.000Z',
      dashboardMode: 'pro',
    })
    const postJson = vi.fn().mockResolvedValue({
      onboarding_read: {
        completed: true,
        version: 1,
        strategy: 'total_plus_categories',
        completed_at: '2026-02-21T00:00:00.000Z',
        dashboardMode: 'quick',
      },
    })

    const { queueSave } = createPersistence({
      postJson,
      onboardingState,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      onboarding: expect.objectContaining({
        strategy: 'full_granular',
        dashboardMode: 'pro',
      }),
    }))
    expect(onboardingState.value.strategy).toBe('total_plus_categories')
    expect(onboardingState.value.dashboardMode).toBe('quick')
  })

  it('does not downgrade release notes seen version from stale save read-back', async () => {
    const onboardingState = ref<any>({
      completed: true,
      version: 1,
      strategy: 'total_only',
      completed_at: '2026-04-01T00:00:00.000Z',
      dashboardMode: 'standard',
      releaseNotesSeenVersion: '0.7.5',
    })
    const postJson = vi.fn().mockResolvedValue({
      onboarding_read: {
        completed: true,
        version: 1,
        strategy: 'total_only',
        completed_at: '2026-04-01T00:00:00.000Z',
        dashboardMode: 'standard',
        releaseNotesSeenVersion: '0.7.4',
      },
    })

    const { queueSave } = createPersistence({
      postJson,
      onboardingState,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(onboardingState.value.releaseNotesSeenVersion).toBe('0.7.5')
  })

  it('replays persist response fixture without dropping UI flags', async () => {
    const postJson = vi.fn().mockResolvedValue(persistFixture)
    const themePref = ref<'auto' | 'light' | 'dark'>('auto')

    const { queueSave, selected, targetsConfig, themePreference } = createPersistence({
      postJson,
      themePreference: themePref,
    })

    targetsConfig.value.balance.ui.showNotes = true

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(selected.value).toEqual(persistFixture.saved)
    expect(themePreference.value).toBe('dark')
    expect(targetsConfig.value.categories).toHaveLength(
      persistFixture.targets_config_read.categories.length,
    )
    expect(targetsConfig.value.balance.ui.showNotes).toBe(true)
  })

  it('handles minimal QA persist fixture', async () => {
    const postJson = vi.fn().mockResolvedValue(persistQaFixture)
    const { queueSave, selected } = createPersistence({ postJson })
    queueSave(false)
    await vi.runOnlyPendingTimersAsync()
    expect(selected.value).toEqual(['opsdash-focus'])
  })

  it('replays week offset persist fixture', async () => {
    const postJson = vi.fn().mockResolvedValue(persistWeekOffset)
    const initialWeek = { ...persistWeekOffset.targets_week_read }
    const targetsWeek = ref<Record<string, number>>({ ...initialWeek })

    const { queueSave, selected } = createPersistence({
      postJson,
      targetsWeek,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(selected.value).toEqual(persistWeekOffset.saved)
    expect(targetsWeek.value).toEqual(initialWeek)
  })

  it('applies reporting + Deck settings from persist fixture', async () => {
    const postJson = vi.fn().mockResolvedValue(persistReportingDeck)
    const reportingConfig = ref(createDefaultReportingConfig())
    reportingConfig.value.enabled = false
    const deckSettings = ref(createDefaultDeckSettings())
    deckSettings.value.defaultFilter = 'all'
    deckSettings.value.hiddenBoards = []

    const { queueSave } = createPersistence({
      postJson,
      reportingConfig,
      deckSettings,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(reportingConfig.value.modes.week).toEqual({
      enabled: true,
      delivery: 'checkpoint_final',
      sendTimeLocal: '06:00',
    })
    expect(reportingConfig.value.modes.month).toEqual({
      enabled: false,
      delivery: 'final',
      sendTimeLocal: '18:00',
    })
    expect(reportingConfig.value.notifyEmail).toBe(false)
    expect(reportingConfig.value.notifyNotification).toBe(true)
    expect(deckSettings.value.enabled).toBe(false)
    expect(deckSettings.value.defaultFilter).toBe('mine')
    expect(deckSettings.value.hiddenBoards).toEqual([42])
  })

  it('persists and normalizes widget layout', async () => {
    const initialTabs = createDefaultWidgetTabs('standard')
    const widgetTabs = ref(initialTabs)

    const postJson = vi.fn().mockResolvedValue({
      widgets_read: [
        {
          type: 'notes',
          layout: { width: 'half', height: 'l', order: 5 },
          options: { mode: 'month' },
        },
      ],
    })

    const { queueSave } = createPersistence({
      postJson,
      widgetTabs,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      widgets: initialTabs,
    }))
    expect(widgetTabs.value.tabs).toHaveLength(1)
    expect(widgetTabs.value.tabs[0].widgets).toEqual(initialTabs.tabs[0].widgets)
  })

  it('keeps empty tab widgets from persistence payloads', async () => {
    const initialTabs = createDefaultWidgetTabs('standard')
    const widgetTabs = ref(initialTabs)

    const postJson = vi.fn().mockResolvedValue({
      widgets_read: {
        tabs: [
          { id: 'tab-empty', label: 'Empty', widgets: [] },
          { id: 'tab-full', label: 'Full', widgets: [
            { type: 'note_editor', layout: { width: 'half', height: 'm', order: 1 }, options: {} },
          ] },
        ],
        defaultTabId: 'tab-empty',
      },
    })

    const { queueSave } = createPersistence({
      postJson,
      widgetTabs,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(widgetTabs.value.tabs).toHaveLength(2)
    expect(widgetTabs.value.defaultTabId).toBe('tab-empty')
    expect(widgetTabs.value.tabs[0].widgets).toEqual([])
    expect(widgetTabs.value.tabs[1].widgets[0].type).toBe('note_editor')
  })

  it('migrates chart filters from persisted widget tabs', async () => {
    const initialTabs = createDefaultWidgetTabs('standard')
    const widgetTabs = ref(initialTabs)

    const postJson = vi.fn().mockResolvedValue({
      widgets_read: {
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
      },
    })

    const { queueSave } = createPersistence({
      postJson,
      widgetTabs,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    const widget = widgetTabs.value.tabs[0].widgets[0]
    expect(widget.options.filterMode).toBe('calendar')
    expect(widget.options.filterIds).toEqual(['cal-1'])
  })
})
