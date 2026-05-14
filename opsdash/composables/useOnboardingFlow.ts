import { computed, ref, watch, type Ref } from 'vue'

import { ONBOARDING_VERSION, type StrategyDefinition, type CalendarSummary, type CategoryDraft } from '../src/services/onboarding'
import { createDefaultTargetsConfig, normalizeTargetsConfig, type TargetsConfig } from '../src/services/targets'
import {
  type DeckFeatureSettings,
  type ReportingConfig,
} from '../src/services/reporting'

import { createOnboardingWizardState } from './useOnboardingWizard'
import type { OnboardingState } from './useDashboard'
import type { OnboardingActions, WizardSnapshotNotice, WizardCompletePayload } from './useOnboardingActions'

interface OnboardingFlowDeps {
  onboardingState: Ref<OnboardingState | null>
  calendars: Ref<Array<Record<string, any>>>
  selected: Ref<string[]>
  targetsWeek: Ref<Record<string, number>>
  groupsById: Ref<Record<string, number>>
  targetsConfig: Ref<TargetsConfig>
  deckSettings: Ref<DeckFeatureSettings>
  reportingConfig: Ref<ReportingConfig>
  hasInitialLoad: Ref<boolean>
  actions: OnboardingActions
}

const DEFAULT_TARGETS_CONFIG = normalizeTargetsConfig(createDefaultTargetsConfig())
const DEFAULT_CATEGORY_SIGNATURE = buildCategorySignature(DEFAULT_TARGETS_CONFIG.categories)

function isStrategyId(value: unknown): value is StrategyDefinition['id'] {
  return value === 'total_only' || value === 'total_plus_categories' || value === 'full_granular'
}

function buildCategorySignature(categories: unknown): string {
  if (!Array.isArray(categories)) return '[]'
  return JSON.stringify(categories.map((cat: any) => ({
    id: String(cat?.id ?? ''),
    label: String(cat?.label ?? ''),
    targetHours: Number.isFinite(Number(cat?.targetHours)) ? Number(cat.targetHours) : 0,
    includeWeekend: !!cat?.includeWeekend,
    paceMode: cat?.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
    color: typeof cat?.color === 'string' ? cat.color.toUpperCase() : null,
    groupIds: Array.isArray(cat?.groupIds)
      ? cat.groupIds
          .map((groupId: unknown) => Number(groupId))
          .filter((groupId: number) => Number.isFinite(groupId))
          .sort((a: number, b: number) => a - b)
      : [],
  })))
}

export function useOnboardingFlow(deps: OnboardingFlowDeps) {
  const {
    autoWizardNeeded,
    manualWizardOpen,
    onboardingRunId,
    onboardingWizardVisible,
    openWizardFromSidebar,
    wizardStartStep,
  } = createOnboardingWizardState()

  const hasPositiveTargetsWeek = computed(() =>
    Object.values(deps.targetsWeek.value || {}).some((hours) => Number(hours) > 0),
  )
  const hasSelectedSubset = computed(() => {
    const calendarCount = (deps.calendars.value || []).length
    const selectedCount = new Set((deps.selected.value || []).filter(Boolean)).size
    return calendarCount > 0 && selectedCount > 0 && selectedCount < calendarCount
  })
  const hasAssignedGroups = computed(() => {
    const selectedSet = new Set(deps.selected.value || [])
    return Object.entries(deps.groupsById.value || {}).some(([calId, groupId]) =>
      selectedSet.has(calId) && Number(groupId) > 0,
    )
  })
  const hasCustomCategories = computed(() => {
    const categories = deps.targetsConfig.value?.categories
    return Array.isArray(categories)
      && categories.length > 0
      && buildCategorySignature(categories) !== DEFAULT_CATEGORY_SIGNATURE
  })
  const hasExistingConfig = computed(() =>
    Boolean(deps.onboardingState.value?.completed)
    || isStrategyId(deps.onboardingState.value?.strategy)
    || hasPositiveTargetsWeek.value
    || hasAssignedGroups.value
    || hasSelectedSubset.value
    || hasCustomCategories.value,
  )
  const isOnboardingSaving = deps.actions.isOnboardingSaving
  const isSnapshotSaving = deps.actions.isSnapshotSaving
  const snapshotNotice = deps.actions.snapshotNotice

  const wizardCalendars = computed<CalendarSummary[]>(() =>
    (deps.calendars.value || [])
      .map((cal: any) => ({
        id: String(cal?.id ?? ''),
        displayname: String(cal?.displayname ?? cal?.name ?? cal?.id ?? ''),
        color: typeof cal?.color === 'string' ? cal.color : '',
      }))
      .filter((cal) => cal.id),
  )

  const wizardInitialSelection = computed(() => [...deps.selected.value])
  const wizardInitialStrategy = computed<StrategyDefinition['id']>(() => {
    const persisted = deps.onboardingState.value?.strategy
    if (isStrategyId(persisted)) {
      return persisted
    }

    if (hasCustomCategories.value || hasAssignedGroups.value) {
      return 'full_granular'
    }

    if (hasPositiveTargetsWeek.value) {
      return 'total_plus_categories'
    }

    return 'total_only'
  })

  const wizardInitialAllDayHours = computed(() => deps.targetsConfig.value?.allDayHours ?? 8)
  const wizardInitialTotalHours = computed(() => deps.targetsConfig.value?.totalHours ?? 40)
  const wizardInitialTargetsConfig = computed(() => ({
    balanceTrendLookback: deps.targetsConfig.value?.balance?.trend?.lookbackWeeks ?? 3,
  }))
  const sanitizeHexColor = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
      return null
    }
    if (trimmed.length === 4) {
      const [, r, g, b] = trimmed
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
    }
    return trimmed.toUpperCase()
  }
  const wizardInitialCategories = computed<CategoryDraft[]>(() => {
    const raw = Array.isArray(deps.targetsConfig.value?.categories) ? deps.targetsConfig.value.categories : []
    return raw.map((cat: any, index: number) => ({
      id: String(cat?.id ?? `cat_${index}`),
      label: String(cat?.label ?? `Category ${index + 1}`),
      targetHours: Number.isFinite(cat?.targetHours) ? Number(cat.targetHours) : 0,
      includeWeekend: !!cat?.includeWeekend,
      paceMode: cat?.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
      color: sanitizeHexColor(cat?.color) ?? null,
    }))
  })
  const wizardInitialAssignments = computed<Record<string, string>>(() => {
    const assignments: Record<string, string> = {}
    const groupToCategory = new Map<number, string>()
    const raw = Array.isArray(deps.targetsConfig.value?.categories) ? deps.targetsConfig.value.categories : []
    raw.forEach((cat: any) => {
      const groupId = Array.isArray(cat?.groupIds) ? Number(cat.groupIds[0]) : Number(cat?.groupId)
      if (Number.isFinite(groupId)) {
        groupToCategory.set(groupId, String(cat?.id ?? ''))
      }
    })
    const selectedSet = new Set(deps.selected.value || [])
    Object.entries(deps.groupsById.value || {}).forEach(([calId, groupId]) => {
      if (!selectedSet.has(calId)) return
      const catId = groupToCategory.get(Number(groupId))
      if (catId) {
        assignments[calId] = catId
      }
    })
    return assignments
  })
  const wizardInitialDeckSettings = computed(() => ({ ...(deps.deckSettings.value || {}) }))
  const wizardInitialReportingConfig = computed(() => ({ ...(deps.reportingConfig.value || {}) }))
  const wizardInitialDashboardMode = computed(() => (deps.onboardingState.value?.dashboardMode as any) || 'standard')

  function shouldRequireOnboarding(state: OnboardingState | null): boolean {
    if (!state) return true
    const required = state.version_required ?? ONBOARDING_VERSION
    if (!state.completed) return true
    if ((state.version ?? 0) < required) return true
    return false
  }

  function shouldAutoOpenWizard(state: OnboardingState | null): boolean {
    if (state?.resetRequested) return true
    if (hasExistingConfig.value) return false
    return shouldRequireOnboarding(state)
  }

  function evaluateOnboarding(state?: OnboardingState | null) {
    const next = state ?? deps.onboardingState.value
    if (!deps.hasInitialLoad.value && !next) return
    const needs = shouldRequireOnboarding(next)
    autoWizardNeeded.value = shouldAutoOpenWizard(next)
    if (needs || next?.resetRequested) {
      wizardStartStep.value = null
    }
    if (next?.resetRequested) {
      manualWizardOpen.value = true
    }
  }

  watch(
    () => deps.onboardingState.value,
    (state) => {
      if (!deps.hasInitialLoad.value) return
      evaluateOnboarding(state)
    },
  )

  async function handleWizardComplete(payload: WizardCompletePayload) {
    try {
      await deps.actions.complete(payload)
      manualWizardOpen.value = false
      autoWizardNeeded.value = false
    } catch (error) {
      console.error('[opsdash] onboarding complete failed', error)
    }
  }

  async function handleWizardSkip() {
    const wasAuto = autoWizardNeeded.value
    const wasManual = manualWizardOpen.value
    try {
      manualWizardOpen.value = false
      autoWizardNeeded.value = false
      await deps.actions.skip()
    } catch (error) {
      manualWizardOpen.value = wasManual
      autoWizardNeeded.value = wasAuto
      console.error('[opsdash] onboarding skip failed', error)
    }
  }

  function handleWizardClose() {
    if (autoWizardNeeded.value) return
    autoWizardNeeded.value = false
    manualWizardOpen.value = false
  }

  async function handleWizardSaveSnapshot() {
    try {
      await deps.actions.saveSnapshot()
    } catch (error) {
      console.error('[opsdash] onboarding snapshot failed', error)
    }
  }

  return {
    autoWizardNeeded,
    manualWizardOpen,
    onboardingRunId,
    onboardingWizardVisible,
    openWizardFromSidebar,
    wizardStartStep,
    hasExistingConfig,
    wizardCalendars,
    wizardInitialSelection,
    wizardInitialStrategy,
    wizardInitialCategories,
    wizardInitialAssignments,
    wizardInitialAllDayHours,
    wizardInitialTotalHours,
    wizardInitialTargetsConfig,
    wizardInitialDeckSettings,
    wizardInitialReportingConfig,
    wizardInitialDashboardMode,
    isOnboardingSaving,
    isSnapshotSaving,
    snapshotNotice,
    evaluateOnboarding,
    handleWizardComplete,
    handleWizardSkip,
    handleWizardClose,
    handleWizardSaveSnapshot,
  }
}

export type { WizardSnapshotNotice, WizardCompletePayload } from './useOnboardingActions'
