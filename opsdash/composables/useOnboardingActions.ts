import { ref, type Ref } from 'vue'

import type { OnboardingState } from './useDashboard'
import type { ThemePreference } from './useThemePreference'
import type { TargetsConfig } from '../src/services/targets'
import type { DeckFeatureSettings, ReportingConfig } from '../src/services/reporting'
import { ONBOARDING_VERSION, type StrategyDefinition } from '../src/services/onboarding'

export type WizardSnapshotNotice = {
  type: 'success' | 'error'
  message: string
}

export interface WizardCompletePayload {
  strategy: StrategyDefinition['id']
  selected: string[]
  targetsConfig: TargetsConfig
  groups: Record<string, number>
  targetsWeek: Record<string, number>
  targetsMonth: Record<string, number>
  themePreference: ThemePreference
  deckSettings: DeckFeatureSettings
  reportingConfig: ReportingConfig
  dashboardMode: 'quick' | 'standard' | 'pro'
  widgets?: any
  saveProfile?: boolean
  profileName?: string
}

export interface WizardStepSavePayload {
  cals?: string[]
  groups?: Record<string, number>
  targets_week?: Record<string, number>
  targets_month?: Record<string, number>
  targets_config?: TargetsConfig
  theme_preference?: ThemePreference
  deck_settings?: DeckFeatureSettings
  reporting_config?: ReportingConfig
  widgets?: any
  onboarding?: {
    completed?: boolean
    version?: number
    strategy?: StrategyDefinition['id']
    completed_at?: string
    dashboardMode?: 'quick' | 'standard' | 'pro'
    releaseNotesSeenVersion?: string
  }
  dashboardMode?: 'quick' | 'standard' | 'pro'
}

interface OnboardingActionDeps {
  onboardingState: Ref<OnboardingState | null>
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
  setThemePreference: (value: ThemePreference, options?: { persist?: boolean }) => void
  savePreset: (name: string, options?: { notifySuccess?: boolean }) => Promise<void>
  reloadAfterPersist: () => Promise<void>
  setSelected: (val: string[]) => void
  setTargetsWeek: (val: Record<string, number>) => void
  setTargetsMonth: (val: Record<string, number>) => void
  setTargetsConfig: (val: TargetsConfig) => void
  setGroupsById: (val: Record<string, number>) => void
  setDeckSettings?: (val: DeckFeatureSettings) => void
  setReportingConfig?: (val: ReportingConfig) => void
  setOnboardingState?: (val: OnboardingState) => void
  setDashboardMode?: (mode: 'quick' | 'standard' | 'pro') => void
  setWidgetTabs?: (widgets: any) => void
}

export function useOnboardingActions(deps: OnboardingActionDeps) {
  const isOnboardingSaving = ref(false)
  const isSnapshotSaving = ref(false)
  const snapshotNotice = ref<WizardSnapshotNotice | null>(null)

  async function complete(payload: WizardCompletePayload) {
    try {
      isOnboardingSaving.value = true
      snapshotNotice.value = null
      deps.setThemePreference(payload.themePreference, { persist: false })
      const body: Record<string, unknown> = {
        cals: payload.selected,
        groups: payload.groups,
        targets_week: payload.targetsWeek,
        targets_month: payload.targetsMonth,
        targets_config: payload.targetsConfig,
        theme_preference: payload.themePreference,
        deck_settings: payload.deckSettings,
        reporting_config: payload.reportingConfig,
        onboarding: {
          completed: true,
          version: ONBOARDING_VERSION,
          strategy: payload.strategy,
          dashboardMode: payload.dashboardMode,
          completed_at: new Date().toISOString(),
          releaseNotesSeenVersion: deps.onboardingState.value?.releaseNotesSeenVersion ?? '',
        },
      }
      if (payload.widgets) {
        body.widgets = payload.widgets
      }
      await deps.postJson(deps.route('persist'), body)
      // Optimistically update local state so sidebar/widgets reflect the new config immediately
      deps.setSelected(payload.selected)
      deps.setTargetsWeek(payload.targetsWeek)
      deps.setTargetsMonth(payload.targetsMonth)
      deps.setTargetsConfig(payload.targetsConfig)
      deps.setGroupsById(payload.groups)
      deps.setDashboardMode?.(payload.dashboardMode)
      if (payload.widgets) {
        deps.setWidgetTabs?.(payload.widgets)
      }
      deps.setOnboardingState?.({
        completed: true,
        version: ONBOARDING_VERSION,
        strategy: payload.strategy,
        dashboardMode: payload.dashboardMode,
        version_required: ONBOARDING_VERSION,
        resetRequested: false,
        releaseNotesSeenVersion: deps.onboardingState.value?.releaseNotesSeenVersion ?? '',
      } as any)
      const profileName = payload.profileName?.trim()
      if (payload.saveProfile && profileName) {
        await deps.savePreset(profileName)
      }
      await deps.reloadAfterPersist()
      deps.notifySuccess('Onboarding saved')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to save onboarding')
      throw error
    } finally {
      isOnboardingSaving.value = false
    }
  }

  async function saveStep(payload: WizardStepSavePayload) {
    try {
      isOnboardingSaving.value = true
      snapshotNotice.value = null
      if (payload.theme_preference) {
        deps.setThemePreference(payload.theme_preference, { persist: false })
      }
      await deps.postJson(deps.route('persist'), payload as Record<string, unknown>)
      if (payload.cals) {
        deps.setSelected(payload.cals)
      }
      if (payload.targets_week) {
        deps.setTargetsWeek(payload.targets_week)
      }
      if (payload.targets_month) {
        deps.setTargetsMonth(payload.targets_month)
      }
      if (payload.targets_config) {
        deps.setTargetsConfig(payload.targets_config)
      }
      if (payload.groups) {
        deps.setGroupsById(payload.groups)
      }
      if (payload.deck_settings) {
        deps.setDeckSettings?.(payload.deck_settings)
      }
      if (payload.reporting_config) {
        deps.setReportingConfig?.(payload.reporting_config)
      }
      if (payload.onboarding) {
        deps.setOnboardingState?.({
          completed: payload.onboarding.completed ?? false,
          version: payload.onboarding.version ?? ONBOARDING_VERSION,
          strategy: payload.onboarding.strategy ?? deps.onboardingState.value?.strategy ?? 'total_only',
          completed_at: payload.onboarding.completed_at ?? '',
          dashboardMode: payload.onboarding.dashboardMode ?? deps.onboardingState.value?.dashboardMode,
          version_required: ONBOARDING_VERSION,
          resetRequested: false,
          releaseNotesSeenVersion: payload.onboarding.releaseNotesSeenVersion ?? deps.onboardingState.value?.releaseNotesSeenVersion ?? '',
        } as any)
      }
      if (payload.dashboardMode) {
        deps.setDashboardMode?.(payload.dashboardMode)
      }
      if (payload.widgets) {
        deps.setWidgetTabs?.(payload.widgets)
      }
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to save step')
      throw error
    } finally {
      isOnboardingSaving.value = false
    }
  }

  async function skip() {
    try {
      isOnboardingSaving.value = true
      snapshotNotice.value = null
      await deps.postJson(deps.route('persist'), {
        onboarding: {
          completed: true,
          version: ONBOARDING_VERSION,
          strategy: deps.onboardingState.value?.strategy ?? 'total_only',
          completed_at: new Date().toISOString(),
          releaseNotesSeenVersion: deps.onboardingState.value?.releaseNotesSeenVersion ?? '',
        },
      })
      await deps.reloadAfterPersist()
      deps.notifySuccess('You can revisit the setup wizard any time from Guided Setup.')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to update onboarding state')
      throw error
    } finally {
      isOnboardingSaving.value = false
    }
  }

  async function saveSnapshot() {
    try {
      isSnapshotSaving.value = true
      snapshotNotice.value = null
      const stamp = new Date()
      const name = `Before onboarding ${stamp.toISOString().slice(0, 16).replace('T', ' ')}`
      await deps.savePreset(name, { notifySuccess: false })
      snapshotNotice.value = {
        type: 'success',
        message: `Profile "${name}" saved — find it under Config & Setup.`,
      }
    } catch (error) {
      console.error('[opsdash] profile backup failed', error)
      snapshotNotice.value = {
        type: 'error',
        message: 'Failed to save profile backup. Please try again.',
      }
      throw error
    } finally {
      isSnapshotSaving.value = false
    }
  }

  return {
    isOnboardingSaving,
    isSnapshotSaving,
    snapshotNotice,
    complete,
    saveStep,
    skip,
    saveSnapshot,
  }
}

export type OnboardingActions = ReturnType<typeof useOnboardingActions>
export type { WizardStepSavePayload }
