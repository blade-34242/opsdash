import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

import { useOnboardingActions } from '../composables/useOnboardingActions'
import type { OnboardingState } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultDeckSettings, createDefaultReportingConfig } from '../src/services/reporting'
import { createDefaultWidgetTabs } from '../src/services/widgetsRegistry'

function setup(overrides: Partial<Parameters<typeof useOnboardingActions>[0]> = {}) {
  const onboardingState = ref<OnboardingState | null>({
    completed: false,
    version: 0,
    strategy: 'total_only',
    completed_at: '',
    releaseNotesSeenVersion: '0.7.5',
  })
  const route = vi.fn().mockReturnValue('/persist')
  const postJson = vi.fn().mockResolvedValue({})
  const notifySuccess = vi.fn()
  const notifyError = vi.fn()
  const setThemePreference = vi.fn()
  const savePreset = vi.fn().mockResolvedValue(undefined)
  const reloadAfterPersist = vi.fn().mockResolvedValue(undefined)
  const setSelected = vi.fn()
  const setTargetsWeek = vi.fn()
  const setTargetsMonth = vi.fn()
  const setTargetsConfig = vi.fn()
  const setGroupsById = vi.fn()
  const setOnboardingState = vi.fn()
  const setWidgetTabs = vi.fn()

  const actions = useOnboardingActions({
    onboardingState,
    route,
    postJson,
    notifySuccess,
    notifyError,
    setThemePreference,
    savePreset,
    reloadAfterPersist,
    setSelected,
    setTargetsWeek,
    setTargetsMonth,
    setTargetsConfig,
    setGroupsById,
    setOnboardingState,
    setWidgetTabs,
    ...overrides,
  })

  return {
    onboardingState,
    route,
    postJson,
    notifySuccess,
    notifyError,
    setThemePreference,
    savePreset,
    reloadAfterPersist,
    setWidgetTabs,
    ...actions,
  }
}

describe('useOnboardingActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists onboarding completion payload and reloads', async () => {
    const ctx = setup()
    await ctx.complete({
      strategy: 'total_only',
      selected: ['cal-1'],
      targetsConfig: createDefaultTargetsConfig(),
      groups: {},
      targetsWeek: {},
      targetsMonth: {},
      themePreference: 'auto',
      deckSettings: createDefaultDeckSettings(),
      reportingConfig: createDefaultReportingConfig(),
      activityCard: { showDayOffTrend: true },
      dashboardMode: 'standard',
    })

    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      theme_preference: 'auto',
      onboarding: expect.objectContaining({ completed: true, releaseNotesSeenVersion: '0.7.5' }),
    }))
    expect(ctx.reloadAfterPersist).toHaveBeenCalledTimes(1)
    expect(ctx.notifySuccess).toHaveBeenCalledWith('Onboarding saved')
  })

  it('persists widgets when provided', async () => {
    const ctx = setup()
    const widgets = createDefaultWidgetTabs('standard')
    await ctx.complete({
      strategy: 'total_only',
      selected: ['cal-1'],
      targetsConfig: createDefaultTargetsConfig(),
      groups: {},
      targetsWeek: {},
      targetsMonth: {},
      themePreference: 'auto',
      deckSettings: createDefaultDeckSettings(),
      reportingConfig: createDefaultReportingConfig(),
      activityCard: { showDayOffTrend: true },
      dashboardMode: 'standard',
      widgets,
    })

    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      widgets,
    }))
    expect(ctx.setWidgetTabs).toHaveBeenCalledWith(widgets)
  })

  it('saves a profile when requested', async () => {
    const ctx = setup()
    await ctx.complete({
      strategy: 'total_only',
      selected: ['cal-1'],
      targetsConfig: createDefaultTargetsConfig(),
      groups: {},
      targetsWeek: {},
      targetsMonth: {},
      themePreference: 'auto',
      deckSettings: createDefaultDeckSettings(),
      reportingConfig: createDefaultReportingConfig(),
      activityCard: { showDayOffTrend: true },
      dashboardMode: 'standard',
      saveProfile: true,
      profileName: 'My profile',
    })

    expect(ctx.savePreset).toHaveBeenCalledWith('My profile')
  })

  it('saves preset snapshots and surfaces a notice', async () => {
    const ctx = setup()
    await ctx.saveSnapshot()

    expect(ctx.savePreset).toHaveBeenCalledTimes(1)
    expect(ctx.snapshotNotice.value).not.toBeNull()
    expect(ctx.snapshotNotice.value?.type).toBe('success')
  })

  it('skips onboarding and reloads configuration', async () => {
    const ctx = setup()
    await ctx.skip()

    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      onboarding: expect.objectContaining({ completed: true, releaseNotesSeenVersion: '0.7.5' }),
    }))
    expect(ctx.reloadAfterPersist).toHaveBeenCalledTimes(1)
  })
})
