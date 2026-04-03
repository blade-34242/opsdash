import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

export { createOnboardingWizardState, type StepId } from './useOnboardingWizardState'
import type { StepId } from './useOnboardingWizardState'

import {
  buildStrategyResult,
  createStrategyDraft,
  getStrategyDefinitions,
  type CalendarSummary,
  type CategoryDraft,
  type StrategyDefinition,
} from '../src/services/onboarding'
import {
  createDefaultDeckSettings,
  createDefaultReportingConfig,
  type DeckFeatureSettings,
  type ReportingConfig,
} from '../src/services/reporting'
import { clampTarget, convertWeekToMonth } from '../src/services/targets'
import { createDefaultWidgetTabs, filterWidgetTabsForStrategy } from '../src/services/widgetsRegistry'
import { fetchDeckBoardsMeta } from '../src/services/deck'
import { useOcHttp } from './useOcHttp'

type WizardProps = {
  visible: boolean
  calendars: CalendarSummary[]
  initialSelection: string[]
  initialStrategy?: StrategyDefinition['id']
  startStep?: StepId | null
  onboardingVersion: number
  saving?: boolean
  closable?: boolean
  hasExistingConfig?: boolean
  initialCategories?: CategoryDraft[]
  initialAssignments?: Record<string, string>
  initialThemePreference?: 'auto' | 'light' | 'dark'
  systemTheme?: 'light' | 'dark'
  initialAllDayHours?: number
  initialTotalHours?: number
  initialDeckSettings?: DeckFeatureSettings
  initialReportingConfig?: ReportingConfig
  initialDashboardMode?: 'quick' | 'standard' | 'pro'
  initialTargetsWeek?: Record<string, number>
  snapshotSaving?: boolean
  snapshotNotice?: { type: 'success' | 'error'; message: string } | null
  // legacy/optional
  initialTargetsConfig?: {
    balanceTrendLookback?: number
  } | null
}

type WizardEmit = (event: string, payload?: any) => void

type ProfileMode = 'existing' | 'new'
type IntroChoice = 'quick' | 'existing' | 'new'
type CategoryPreset = {
  id: string
  title: string
  description: string
  categories: Array<Pick<CategoryDraft, 'id' | 'label' | 'targetHours' | 'includeWeekend' | 'paceMode' | 'color'>>
  colors: string[]
}

type CalendarHistorySlot = {
  offset: number
  totals: Record<string, number>
}

function isStrategyId(value: unknown): value is StrategyDefinition['id'] {
  return value === 'total_only' || value === 'total_plus_categories' || value === 'full_granular'
}

type ExistingWizardSeed = {
  strategy: StrategyDefinition['id']
  selection: string[]
  themePreference: 'auto' | 'light' | 'dark'
  allDayHours: number
  totalHours: number | null
  trendLookback: number
  deckSettings: DeckFeatureSettings
  reportingConfig: ReportingConfig
  dashboardMode: 'quick' | 'standard' | 'pro'
  targetsWeek: Record<string, number>
  categories: CategoryDraft[]
  assignments: Record<string, string>
}

export function useOnboardingWizard(options: { props: WizardProps; emit: WizardEmit }) {
  const { props, emit } = options
  const { route, postJson } = useOcHttp()

  const stepOrder = ['intro', 'strategy', 'calendars', 'deck', 'goals', 'preferences', 'dashboard', 'review'] as const

  const stepIndex = ref(0)
  const selectedStrategy = ref<StrategyDefinition['id']>('total_plus_categories')
  const dashboardMode = ref<'quick' | 'standard' | 'pro'>(props.initialDashboardMode || 'standard')
  const profileMode = ref<ProfileMode>(props.hasExistingConfig ? 'existing' : 'new')
  const introChoice = ref<IntroChoice>(props.hasExistingConfig ? 'existing' : 'quick')
  const saveProfile = ref(false)
  const profileName = ref('')
  const localSelection = ref<string[]>([])
  const categories = ref<CategoryDraft[]>([])
  const assignments = ref<Record<string, string>>({})
  const calendarTargets = ref<Record<string, number>>({})
  const themePreference = ref<'auto' | 'light' | 'dark'>('auto')
  const allDayHoursInput = ref(8)
  const totalHoursInput = ref<number | null>(null)
  const trendLookbackInput = ref(3)
  const deckSettingsDraft = ref<DeckFeatureSettings>(cloneDeckSettings(props.initialDeckSettings ?? createDefaultDeckSettings()))
  const reportingDraft = ref<ReportingConfig>({ ...(props.initialReportingConfig ?? createDefaultReportingConfig()) })
  const deckBoards = ref<Array<{ id: number; title: string }>>([])
  const deckBoardsLoading = ref(false)
  const deckBoardsError = ref('')
  const suggestionsLoading = ref(false)
  const suggestionsError = ref('')
  const historyWindows = ref<CalendarHistorySlot[]>([])
  const existingSeed = ref<ExistingWizardSeed | null>(null)
  const dashboardPresets = [
    {
      id: 'quick' as const,
      title: 'Empty',
      subtitle: 'Start from a mostly blank dashboard and grow it later.',
      description: 'Start from a mostly blank dashboard and grow it later.',
      badge: 'manual build',
      widgets: '0 widgets',
    },
    {
      id: 'standard' as const,
      title: 'Standard',
      subtitle: 'Balanced default with enough structure to be useful immediately.',
      description: 'Balanced default with enough structure to be useful immediately.',
      badge: 'recommended',
      widgets: '12 widgets',
    },
    {
      id: 'pro' as const,
      title: 'Advanced',
      subtitle: 'Show more widgets and analysis from the first load.',
      description: 'Show more widgets and analysis from the first load.',
      badge: 'power users',
      widgets: '16 widgets',
    },
  ]
  const categoryPresets: CategoryPreset[] = [
    {
      id: 'work_hobby_sport',
      title: 'Work / Hobby / Sport',
      description: 'Simple split for work, play, and fitness.',
      categories: [
        { id: 'work', label: 'Work', targetHours: 32, includeWeekend: false, paceMode: 'days_only', color: '#2563EB' },
        { id: 'hobby', label: 'Hobby', targetHours: 6, includeWeekend: true, paceMode: 'days_only', color: '#F97316' },
        { id: 'sport', label: 'Sport', targetHours: 4, includeWeekend: true, paceMode: 'days_only', color: '#10B981' },
      ],
      colors: ['#2563EB', '#F97316', '#10B981'],
    },
    {
      id: 'focus_personal_recovery',
      title: 'Focus / Personal / Recovery',
      description: 'Balance deep work, personal time, and rest.',
      categories: [
        { id: 'focus', label: 'Focus', targetHours: 30, includeWeekend: false, paceMode: 'days_only', color: '#6366F1' },
        { id: 'personal', label: 'Personal', targetHours: 8, includeWeekend: true, paceMode: 'days_only', color: '#EC4899' },
        { id: 'recovery', label: 'Recovery', targetHours: 6, includeWeekend: true, paceMode: 'days_only', color: '#14B8A6' },
      ],
      colors: ['#6366F1', '#EC4899', '#14B8A6'],
    },
    {
      id: 'client_internal_learning',
      title: 'Client / Internal / Learning / Admin / Recovery',
      description: 'A broader split for delivery, upkeep, admin work, and recovery.',
      categories: [
        { id: 'client', label: 'Client', targetHours: 28, includeWeekend: false, paceMode: 'days_only', color: '#0EA5E9' },
        { id: 'internal', label: 'Internal', targetHours: 8, includeWeekend: false, paceMode: 'days_only', color: '#F59E0B' },
        { id: 'learning', label: 'Learning', targetHours: 4, includeWeekend: true, paceMode: 'days_only', color: '#22C55E' },
        { id: 'admin', label: 'Admin', targetHours: 3, includeWeekend: false, paceMode: 'days_only', color: '#A855F7' },
        { id: 'recovery', label: 'Recovery', targetHours: 3, includeWeekend: true, paceMode: 'days_only', color: '#EC4899' },
      ],
      colors: ['#0EA5E9', '#F59E0B', '#22C55E', '#A855F7', '#EC4899'],
    },
  ]

  const deckVisibleBoards = computed(() => {
    if (!deckSettingsDraft.value.enabled) return []
    const hidden = new Set(deckSettingsDraft.value.hiddenBoards || [])
    return deckBoards.value.filter((board) => !hidden.has(board.id))
  })

  const deckReviewSummary = computed(() => {
    if (!deckSettingsDraft.value.enabled) return 'Deck tab disabled'
    if (deckBoardsLoading.value) return 'Deck tab enabled — loading boards…'
    if (deckBoardsError.value) return 'Deck tab enabled — open Deck to finish setup.'
    if (!deckBoards.value.length) return 'Deck tab enabled — create a Deck board to see cards.'
    if (!deckVisibleBoards.value.length) return 'Deck tab enabled — all boards hidden'
    if (deckVisibleBoards.value.length === deckBoards.value.length) {
      const total = deckVisibleBoards.value.length
      return total === 1 ? 'Showing 1 board' : `Showing all ${total} boards`
    }
    if (deckVisibleBoards.value.length === 1) {
      return `Showing ${deckVisibleBoards.value[0].title}`
    }
    if (deckVisibleBoards.value.length === 2) {
      return `Showing ${deckVisibleBoards.value[0].title} and ${deckVisibleBoards.value[1].title}`
    }
    return `Showing ${deckVisibleBoards.value.length} boards`
  })

  const reportingSummary = computed(() => {
    if (!reportingDraft.value.enabled) return 'Recap disabled'
    const schedule =
      reportingDraft.value.schedule === 'both'
        ? 'Weekly + monthly recap'
        : reportingDraft.value.schedule === 'week'
          ? 'Weekly recap'
          : 'Monthly recap'
    const interim =
      reportingDraft.value.interim === 'daily'
        ? 'Daily reminder'
        : reportingDraft.value.interim === 'midweek'
          ? 'Mid-range reminder'
          : 'No interim reminder'
    return `${schedule} • ${interim}`
  })

  const openColorId = ref<string | null>(null)
  const previewTheme = computed(() => {
    if (themePreference.value === 'auto') {
      return props.systemTheme === 'dark' ? 'dark' : 'light'
    }
    return themePreference.value
  })
  const systemThemeLabel = computed(() => (props.systemTheme === 'dark' ? 'dark' : 'light'))
  const BASE_CATEGORY_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']
  const calendarById = computed(() => new Map(props.calendars.map((cal) => [cal.id, cal])))
  const selectedCalendars = computed(() =>
    localSelection.value
      .map((id) => calendarById.value.get(id))
      .filter((cal): cal is CalendarSummary => Boolean(cal)),
  )
  const selectedCalendarIds = computed(() => selectedCalendars.value.map((cal) => cal.id))
  const categoryTotalHours = computed(() =>
    categories.value.reduce((sum, cat) => sum + (Number.isFinite(cat.targetHours) ? cat.targetHours : 0), 0),
  )
  const totalCalendarTargetHours = computed(() =>
    selectedCalendars.value.reduce((sum, cal) => sum + (Number(getCalendarTarget(cal.id)) || 0), 0),
  )

  const categoryColorPalette = computed(() => {
    const palette = new Set<string>()
    const push = (value?: string | null) => {
      const color = sanitizeColor(value)
      if (color) palette.add(color)
    }
    props.calendars.forEach((cal) => push(cal.color))
    categories.value.forEach((cat) => push(cat.color))
    BASE_CATEGORY_COLORS.forEach((color) => palette.add(color))
    return Array.from(palette)
  })

  const strategies = getStrategyDefinitions()
  const selectedStrategyDef = computed(() => strategies.find((s) => s.id === selectedStrategy.value) ?? strategies[0])
  const categoriesEnabled = computed(() => selectedStrategyDef.value.layers.categories)
  const calendarTargetsEnabled = computed(() => selectedStrategyDef.value.layers.calendars)
  const isClosable = computed(() => props.closable !== false)

  const dashboardWidgets = computed(() =>
    filterWidgetTabsForStrategy(createDefaultWidgetTabs(dashboardMode.value), selectedStrategy.value),
  )

  const enabledSteps = computed(() => [...stepOrder])
  const currentStep = computed<StepId>(() => enabledSteps.value[Math.min(stepIndex.value, enabledSteps.value.length - 1)])
  const stepNumber = computed(() => stepIndex.value + 1)
  const totalSteps = computed(() => enabledSteps.value.length)
  const saving = computed(() => props.saving === true)
  const snapshotSaving = computed(() => props.snapshotSaving === true)
  const snapshotNotice = computed(() => props.snapshotNotice ?? null)

  const BODY_SCROLL_CLASS = 'opsdash-onboarding-lock'

  function setScrollLocked(locked: boolean) {
    if (typeof document === 'undefined') return
    const body = document.body
    if (!body) return
    if (locked) {
      body.classList.add(BODY_SCROLL_CLASS)
      body.dataset.opsdashOnboarding = '1'
    } else {
      body.classList.remove(BODY_SCROLL_CLASS)
      delete body.dataset.opsdashOnboarding
    }
  }

  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        resetWizard()
        closeColorPopover()
        loadHistoryWindows().catch((error) => {
          console.error('[opsdash] onboarding history load failed', error)
        })
      }
      setScrollLocked(visible)
    },
    { immediate: true },
  )

  onMounted(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleDocumentClick)
    }
    loadDeckBoards().catch((error) => {
      console.error('[opsdash] deck board load failed', error)
    })
    loadHistoryWindows().catch((error) => {
      console.error('[opsdash] onboarding history load failed', error)
    })
  })

  onUnmounted(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleDocumentClick)
    }
    setScrollLocked(false)
  })

  function resetWizard(mode?: ProfileMode) {
    captureExistingSeed()
    const resolvedMode: ProfileMode = mode ?? (props.hasExistingConfig ? 'existing' : 'new')
    profileMode.value = resolvedMode
    introChoice.value = props.hasExistingConfig ? resolvedMode : 'quick'
    const useExisting = resolvedMode === 'existing'
    const seed = existingSeed.value
    stepIndex.value = 0
    selectedStrategy.value = useExisting ? (seed?.strategy ?? 'total_plus_categories') : 'total_plus_categories'
    dashboardMode.value = useExisting ? (seed?.dashboardMode ?? 'standard') : 'standard'
    const initial = useExisting ? [...(seed?.selection ?? [])] : []
    localSelection.value = Array.from(new Set(initial.filter((id) => props.calendars.some((cal) => cal.id === id))))
    themePreference.value = useExisting ? (seed?.themePreference ?? 'auto') : 'auto'
    allDayHoursInput.value = clampAllDayHours(useExisting ? (seed?.allDayHours ?? 8) : 8)
    totalHoursInput.value = clampTotalHours(useExisting ? (seed?.totalHours ?? null) : null)
    trendLookbackInput.value = clampLookback(useExisting ? (seed?.trendLookback ?? 3) : 3)
    calendarTargets.value = {}
    if (useExisting) {
      Object.entries(seed?.targetsWeek ?? {}).forEach(([id, hours]) => {
        if (props.calendars.some((cal) => cal.id === id)) {
          calendarTargets.value[id] = clampTarget(hours)
        }
      })
    }
    deckSettingsDraft.value = cloneDeckSettings(
      useExisting ? (seed?.deckSettings ?? createDefaultDeckSettings()) : createDefaultDeckSettings(),
    )
    reportingDraft.value = {
      ...(useExisting ? (seed?.reportingConfig ?? createDefaultReportingConfig()) : createDefaultReportingConfig()),
    }
    if (props.hasExistingConfig) {
      saveProfile.value = resolvedMode === 'new'
      profileName.value = ''
    } else {
      saveProfile.value = false
      profileName.value = ''
    }
    initializeStrategyState()
    if (categoriesEnabled.value) {
      if (categories.value.length) {
        totalHoursInput.value = clampTotalHours(categoryTotalHours.value)
      } else {
        totalHoursInput.value = null
      }
    } else if (selectedStrategy.value === 'total_only') {
      totalHoursInput.value = clampTotalHours(useExisting ? (seed?.totalHours ?? 40) : 40)
    } else if (totalHoursInput.value === null && useExisting) {
      totalHoursInput.value = clampTotalHours(seed?.totalHours ?? 40)
    }
    applyStartStep()
  }

  function setProfileMode(mode: ProfileMode) {
    if (profileMode.value === mode) return
    resetWizard(mode)
  }

  function setIntroChoice(choice: IntroChoice) {
    introChoice.value = choice
    if (choice === 'existing') {
      if (profileMode.value !== 'existing') resetWizard('existing')
      return
    }
    if (choice === 'new') {
      if (profileMode.value !== 'new') resetWizard('new')
      return
    }
  }

  function setSaveProfile(enabled: boolean) {
    saveProfile.value = enabled
    if (!enabled) {
      profileName.value = ''
    }
  }

  function setProfileName(value: string) {
    profileName.value = value
  }

  function initializeStrategyState() {
    const seed = existingSeed.value
    if (!categoriesEnabled.value) {
      categories.value = []
      assignments.value = {}
      syncTotalsWithStrategy()
      return
    }
    if (profileMode.value === 'existing' && seed?.categories?.length) {
      categories.value = cloneCategoryDrafts(seed.categories)
      assignments.value = { ...(seed.assignments ?? {}) }
    } else {
      const draft = createStrategyDraft(selectedStrategy.value, props.calendars, localSelection.value)
      if (selectedStrategy.value === 'full_granular') {
        categories.value = categoryPresets[0].categories.map((cat, index) => ({
          id: String(cat.id || `cat_${index}`),
          label: cat.label,
          targetHours: cat.targetHours,
          includeWeekend: cat.includeWeekend,
          paceMode: cat.paceMode,
          color: cat.color ?? null,
        }))
      } else {
        categories.value = draft.categories.map((cat) => ({ ...cat }))
      }
      assignments.value = { ...draft.assignments }
    }
    if (selectedStrategy.value === 'full_granular' && categories.value.length === 0) {
      categories.value = categoryPresets[0].categories.map((cat, index) => ({
        id: String(cat.id || `cat_${index}`),
        label: cat.label,
        targetHours: cat.targetHours,
        includeWeekend: cat.includeWeekend,
        paceMode: cat.paceMode,
        color: cat.color ?? null,
      }))
      if (profileMode.value !== 'existing') {
        assignments.value = {}
      }
    }
    ensureAssignments()
    syncTotalsWithStrategy()
  }

  function ensureAssignments() {
    if (!categoriesEnabled.value || !categories.value.length) {
      assignments.value = {}
      return
    }
    const available = new Set(categories.value.map((cat) => cat.id))
    const next: Record<string, string> = {}
    localSelection.value.forEach((calId) => {
      const wanted = assignments.value[calId]
      next[calId] = available.has(wanted) ? wanted : ''
    })
    assignments.value = next
  }

  const availableHistoryLookback = computed(() => Math.max(0, Math.min(6, historyWindows.value.length)))
  const activeHistoryLookback = computed(() => {
    const available = availableHistoryLookback.value
    if (available <= 0) return 0
    return Math.max(1, Math.min(available, trendLookbackInput.value))
  })
  const historySummary = computed(() => {
    const lookback = activeHistoryLookback.value
    if (lookback <= 0) {
      return {
        enabled: false,
        available: 0,
        label: 'No recent history available',
      }
    }
    return {
      enabled: true,
      available: availableHistoryLookback.value,
      label: `Suggestions use the last ${lookback} ${lookback === 1 ? 'week' : 'weeks'} of available history.`,
    }
  })
  const suggestedCalendarTargets = computed<Record<string, number>>(() => {
    const lookback = activeHistoryLookback.value
    if (lookback <= 0) return {}
    const next: Record<string, number> = {}
    const windows = historyWindows.value.slice(0, lookback)
    props.calendars.forEach((cal) => {
      const values = windows.map((slot) => Number(slot.totals[cal.id] ?? 0))
      if (!values.length) return
      const average = values.reduce((sum, value) => sum + value, 0) / values.length
      if (average <= 0) return
      next[cal.id] = roundGoal(average)
    })
    return next
  })
  const suggestedCategoryTargets = computed<Record<string, number>>(() => {
    const next: Record<string, number> = {}
    categories.value.forEach((cat) => {
      const total = selectedCalendarIds.value.reduce((sum, calId) => {
        if (assignments.value[calId] !== cat.id) return sum
        return sum + Number(suggestedCalendarTargets.value[calId] ?? 0)
      }, 0)
      if (total > 0) next[cat.id] = roundGoal(total)
    })
    return next
  })
  const suggestedTotalTarget = computed(() =>
    selectedCalendarIds.value.reduce((sum, calId) => sum + Number(suggestedCalendarTargets.value[calId] ?? 0), 0),
  )
  const unassignedSelectedCalendars = computed(() =>
    selectedCalendars.value.filter((cal) => categoriesEnabled.value && !assignments.value[cal.id]),
  )
  const goalsHealth = computed(() => {
    const assigned = selectedCalendarIds.value.filter((id) => assignments.value[id]).length
    const unassigned = selectedCalendarIds.value.length - assigned
    const categoryTotal = categoryTotalHours.value
    const calendarTotal = totalCalendarTargetHours.value
    const delta = roundGoal(calendarTotal - categoryTotal)
    return {
      assigned,
      unassigned,
      calendarTotal,
      categoryTotal,
      delta,
      totalsMatch: Math.abs(delta) < 0.01,
    }
  })

  const draft = computed(() =>
    buildStrategyResult(
      selectedStrategy.value,
      props.calendars,
      localSelection.value,
      categoriesEnabled.value ? { categories: categories.value, assignments: assignments.value } : undefined,
    ),
  )

  const strategyTitle = computed(() => selectedStrategyDef.value.title)

  function syncTotalsWithStrategy() {
    if (categoriesEnabled.value) {
      totalHoursInput.value = clampTotalHours(categoryTotalHours.value)
      return
    }
    if (selectedStrategy.value === 'total_plus_categories') {
      const derived = totalCalendarTargetHours.value
      totalHoursInput.value = derived > 0 ? clampTotalHours(derived) : totalHoursInput.value
      return
    }
    if (totalHoursInput.value === null) {
      totalHoursInput.value =
        profileMode.value === 'existing'
          ? clampTotalHours(existingSeed.value?.totalHours ?? 40)
          : null
    }
  }

  function captureExistingSeed() {
    existingSeed.value = {
      strategy: isStrategyId(props.initialStrategy) ? props.initialStrategy : 'total_plus_categories',
      selection: [...(props.initialSelection ?? [])],
      themePreference: props.initialThemePreference ?? 'auto',
      allDayHours: clampAllDayHours(props.initialAllDayHours ?? 8),
      totalHours: clampTotalHours(props.initialTotalHours ?? null),
      trendLookback: clampLookback(props.initialTargetsConfig?.balanceTrendLookback ?? 3),
      deckSettings: cloneDeckSettings(props.initialDeckSettings ?? createDefaultDeckSettings()),
      reportingConfig: { ...(props.initialReportingConfig ?? createDefaultReportingConfig()) },
      dashboardMode: props.initialDashboardMode || 'standard',
      targetsWeek: { ...(props.initialTargetsWeek ?? {}) },
      categories: cloneCategoryDrafts(props.initialCategories),
      assignments: { ...(props.initialAssignments ?? {}) },
    }
  }

  function applyStartStep() {
    if (!props.startStep) return
    const idx = enabledSteps.value.indexOf(props.startStep)
    if (idx >= 0) {
      stepIndex.value = idx
    }
  }

  function goToStep(step: StepId) {
    const idx = enabledSteps.value.indexOf(step)
    if (idx >= 0) {
      stepIndex.value = idx
    }
  }

  function stepLabel(step: StepId): string {
    switch (step) {
      case 'intro':
        return 'Intro'
      case 'strategy':
        return 'Strategy'
      case 'calendars':
        return 'Calendars'
      case 'deck':
        return 'Deck'
      case 'goals':
        return 'Goals'
      case 'preferences':
        return 'Preferences'
      case 'dashboard':
        return 'Dashboard'
      case 'review':
        return 'Review'
      default:
        return step
    }
  }

  watch(selectedStrategy, () => {
    initializeStrategyState()
    stepIndex.value = Math.min(stepIndex.value, enabledSteps.value.length - 1)
  })

  watch(enabledSteps, (steps) => {
    if (stepIndex.value >= steps.length) {
      stepIndex.value = Math.max(steps.length - 1, 0)
    }
  })
  watch(() => props.startStep, applyStartStep)

  watch(categoriesEnabled, () => {
    syncTotalsWithStrategy()
  })

  watch(categoryTotalHours, (total) => {
    if (categoriesEnabled.value) {
      totalHoursInput.value = clampTotalHours(total)
    }
  })

  watch(totalCalendarTargetHours, (total) => {
    if (!categoriesEnabled.value && selectedStrategy.value === 'total_plus_categories' && total > 0) {
      totalHoursInput.value = clampTotalHours(total)
    }
  })

  watch(currentStep, (step) => {
    if (step !== 'goals') {
      closeColorPopover()
    }
    if (step === 'goals' && categoriesEnabled.value && categories.value.length === 0) {
      initializeStrategyState()
      if (!categories.value.length) {
        applyCategoryPreset(categoryPresets[0])
      }
    }
  })

  watch(
    () => props.visible,
    (visible) => {
      if (!visible) {
        closeColorPopover()
      }
    },
  )

  watch(
    localSelection,
    () => {
      const allowed = new Set(localSelection.value)
      const next: Record<string, number> = {}
      Object.entries(calendarTargets.value).forEach(([id, hours]) => {
        if (allowed.has(id)) next[id] = hours
      })
      calendarTargets.value = next
      ensureAssignments()
    },
    { deep: true },
  )

  watch(
    categories,
    () => {
      ensureAssignments()
    },
    { deep: true },
  )

  function addCategory() {
    const id = `cat_${Date.now().toString(36)}_${categories.value.length}`
    categories.value = [
      ...categories.value,
      {
        id,
        label: `Category ${categories.value.length + 1}`,
        targetHours: 8,
        includeWeekend: false,
        paceMode: 'days_only',
      },
    ]
    ensureAssignments()
  }

  function removeCategory(id: string) {
    if (categories.value.length <= 1) return
    categories.value = categories.value.filter((cat) => cat.id !== id)
    ensureAssignments()
  }

  function setCategoryLabel(id: string, value: string) {
    categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, label: value } : cat))
  }

  function moveCategory(id: string, direction: 'up' | 'down') {
    const index = categories.value.findIndex((cat) => cat.id === id)
    if (index < 0) return
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= categories.value.length) return
    const next = [...categories.value]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    categories.value = next
  }

  function reorderCategory(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const sourceIndex = categories.value.findIndex((cat) => cat.id === sourceId)
    const targetIndex = categories.value.findIndex((cat) => cat.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const next = [...categories.value]
    const [item] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, item)
    categories.value = next
  }

  function reorderSelectedCalendar(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const sourceIndex = localSelection.value.findIndex((id) => id === sourceId)
    const targetIndex = localSelection.value.findIndex((id) => id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const next = [...localSelection.value]
    const [item] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, item)
    localSelection.value = next
  }

  function moveSelectedCalendar(id: string, direction: 'up' | 'down') {
    const index = localSelection.value.findIndex((calId) => calId === id)
    if (index < 0) return
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= localSelection.value.length) return
    const next = [...localSelection.value]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    localSelection.value = next
  }

  function applyCategoryPreset(preset: CategoryPreset) {
    categories.value = preset.categories.map((cat, index) => ({
      id: String(cat.id || `cat_${index}`),
      label: cat.label || `Category ${index + 1}`,
      targetHours: Number.isFinite(cat.targetHours) ? Number(cat.targetHours) : 0,
      includeWeekend: !!cat.includeWeekend,
      paceMode: cat.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
      color: sanitizeColor(cat.color) ?? null,
    }))
    assignments.value = {}
    ensureAssignments()
    syncTotalsWithStrategy()
  }

  function setCategoryTarget(id: string, value: string) {
    const parsed = Number(value)
    const sanitized = Number.isFinite(parsed) ? Math.max(0, Math.min(1000, parsed)) : undefined
    categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, targetHours: sanitized ?? cat.targetHours } : cat))
  }

  function toggleCategoryWeekend(id: string, checked: boolean) {
    categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, includeWeekend: checked } : cat))
  }

  function assignCalendar(calId: string, categoryId: string) {
    assignments.value = {
      ...assignments.value,
      [calId]: categoryId,
    }
  }

  function addCalendarToCategory(categoryId: string, calId: string) {
    if (!localSelection.value.includes(calId)) return
    assignCalendar(calId, categoryId)
  }

  function toggleColorPopover(id: string) {
    if (openColorId.value === id) {
      closeColorPopover()
      return
    }
    openColorId.value = id
    nextTick(() => {
      const el = document.getElementById(`onboarding-color-popover-${id}`)
      el?.focus()
    })
  }

  function closeColorPopover() {
    openColorId.value = null
  }

  function handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null
    if (!target?.closest('[data-color-popover]')) {
      closeColorPopover()
    }
  }

  function sanitizeColor(value: unknown): string | null {
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

  function cloneCategoryDrafts(input: CategoryDraft[] | undefined): CategoryDraft[] {
    if (!Array.isArray(input)) return []
    return input.map((cat, index) => ({
      id: String(cat?.id ?? `cat_${index}`).trim() || `cat_${index}`,
      label: String(cat?.label ?? `Category ${index + 1}`).trim() || `Category ${index + 1}`,
      targetHours: Number.isFinite(cat?.targetHours) ? Number(cat.targetHours) : 0,
      includeWeekend: !!cat?.includeWeekend,
      paceMode: cat?.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
      color: sanitizeColor(cat?.color) ?? null,
    }))
  }

  function resolvedColor(cat: { color?: string | null }): string {
    return sanitizeColor(cat?.color) ?? defaultColor.value
  }

  const defaultColor = computed(() => categoryColorPalette.value[0] ?? '#2563EB')

  function setCategoryColor(id: string, color: string) {
    categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, color } : cat))
  }

  function onColorInput(id: string, value: string) {
    const color = sanitizeColor(value)
    setCategoryColor(id, color ?? defaultColor.value)
  }

  function applyColor(id: string, value: string) {
    const color = sanitizeColor(value)
    setCategoryColor(id, color ?? defaultColor.value)
    closeColorPopover()
  }

  function clampAllDayHours(value: number): number {
    if (!Number.isFinite(value)) return 8
    const clamped = Math.max(0, Math.min(24, value))
    return Math.round(clamped * 100) / 100
  }

  function clampTotalHours(value: number | null): number | null {
    if (!Number.isFinite(value)) return null
    const clamped = Math.max(0, Math.min(1000, Number(value)))
    return Math.round(clamped * 100) / 100
  }

  function clampLookback(value: number): number {
    if (!Number.isFinite(value)) return 3
    return Math.max(1, Math.min(6, Math.round(value)))
  }

  function cloneDeckSettings(value: DeckFeatureSettings): DeckFeatureSettings {
    return JSON.parse(JSON.stringify(value))
  }

  function roundGoal(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.round(Math.max(0, value) * 2) / 2
  }

  async function loadDeckBoards() {
    deckBoardsLoading.value = true
    deckBoardsError.value = ''
    const hasOcGlobal = typeof window !== 'undefined' && typeof (window as any).OC !== 'undefined'
    if (!hasOcGlobal) {
      deckBoardsLoading.value = false
      deckBoards.value = []
      return
    }
    try {
      const list = await fetchDeckBoardsMeta()
      deckBoards.value = list
      deckBoardsError.value = ''
    } catch (error) {
      deckBoardsError.value = 'Unable to load Deck boards. Open Deck to create one.'
      deckBoards.value = []
    } finally {
      deckBoardsLoading.value = false
    }
  }

  async function loadHistoryWindows() {
    suggestionsLoading.value = true
    suggestionsError.value = ''
    const calendarIds = props.calendars.map((cal) => cal.id).filter(Boolean)
    if (!calendarIds.length) {
      historyWindows.value = []
      suggestionsLoading.value = false
      return
    }
    try {
      const slots: CalendarHistorySlot[] = []
      for (let step = 1; step <= 6; step += 1) {
        const historyOffset = -step
        const payload = await postJson(route('loadData'), {
          range: 'week',
          offset: historyOffset,
          cals: calendarIds,
          include: ['data'],
        })
        const series = Array.isArray(payload?.charts?.perDaySeries?.series)
          ? payload.charts.perDaySeries.series
          : []
        const totals: Record<string, number> = {}
        series.forEach((entry: any) => {
          const id = String(entry?.id ?? '')
          if (!id) return
          const data = Array.isArray(entry?.data) ? entry.data : []
          totals[id] = roundGoal(data.reduce((sum: number, value: any) => sum + Number(value || 0), 0))
        })
        if (!Object.keys(totals).length) {
          const byCal = Array.isArray(payload?.byCal) ? payload.byCal : []
          byCal.forEach((entry: any) => {
            const id = String(entry?.id ?? entry?.calendarId ?? '')
            if (!id) return
            totals[id] = roundGoal(Number(entry?.hours ?? entry?.total ?? 0))
          })
        }
        slots.push({ offset: historyOffset, totals })
      }
      historyWindows.value = slots
    } catch (error) {
      suggestionsError.value = 'Recent activity could not be loaded.'
      historyWindows.value = []
    } finally {
      suggestionsLoading.value = false
    }
  }

  function setDeckEnabled(checked: boolean) {
    deckSettingsDraft.value = {
      ...deckSettingsDraft.value,
      enabled: checked,
    }
  }

  function isDeckBoardVisible(boardId: number) {
    const hidden = deckSettingsDraft.value.hiddenBoards || []
    return !hidden.includes(boardId)
  }

  function toggleDeckBoard(boardId: number, visible: boolean) {
    const current = new Set(deckSettingsDraft.value.hiddenBoards || [])
    if (visible) {
      current.delete(boardId)
    } else {
      current.add(boardId)
    }
    deckSettingsDraft.value = {
      ...deckSettingsDraft.value,
      hiddenBoards: Array.from(current).sort((a, b) => a - b),
    }
  }

  function setCategoryPaceMode(id: string, value: CategoryDraft['paceMode']) {
    categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, paceMode: value } : cat))
  }

  function onTotalHoursChange(input: HTMLInputElement) {
    if (categoriesEnabled.value) return
    const parsed = Number(input.value)
    if (!Number.isFinite(parsed)) {
      totalHoursInput.value = null
      return
    }
    totalHoursInput.value = clampTotalHours(parsed)
  }

  function onAllDayHoursChange(input: HTMLInputElement) {
    const parsed = Number(input.value)
    allDayHoursInput.value = clampAllDayHours(Number.isFinite(parsed) ? parsed : allDayHoursInput.value)
  }

  function onTrendLookbackChange(input: HTMLInputElement) {
    const parsed = Number(input.value)
    if (!Number.isFinite(parsed)) return
    trendLookbackInput.value = clampLookback(parsed)
  }

  function applySuggestedTotalTarget() {
    if (suggestedTotalTarget.value <= 0) return
    totalHoursInput.value = clampTotalHours(roundGoal(suggestedTotalTarget.value))
  }

  function applySuggestedCalendarTarget(id: string) {
    const suggested = Number(suggestedCalendarTargets.value[id] ?? 0)
    if (suggested <= 0) return
    setCalendarTarget(id, String(roundGoal(suggested)))
  }

  function applySuggestedCategoryTarget(id: string) {
    const suggested = Number(suggestedCategoryTargets.value[id] ?? 0)
    if (suggested <= 0) return
    setCategoryTarget(id, String(roundGoal(suggested)))
  }

  function setReportingEnabled(enabled: boolean) {
    reportingDraft.value = { ...reportingDraft.value, enabled }
  }

  function setReportingSchedule(value: ReportingConfig['schedule']) {
    reportingDraft.value = { ...reportingDraft.value, schedule: value }
  }

  function setReportingInterim(value: ReportingConfig['interim']) {
    reportingDraft.value = { ...reportingDraft.value, interim: value }
  }

  function updateReporting(patch: Partial<ReportingConfig>) {
    reportingDraft.value = { ...reportingDraft.value, ...patch }
  }

  function createFallbackQuickTargets(selection: string[]) {
    const noisePattern = /(birthday|holiday|feiertag|urlaub|contacts?)/i
    const values = [4, 5, 6]
    const next: Record<string, number> = {}
    let valueIndex = 0
    selection.forEach((id) => {
      const cal = calendarById.value.get(id)
      const label = cal?.displayname ?? ''
      if (noisePattern.test(label)) return
      next[id] = values[valueIndex % values.length]
      valueIndex += 1
    })
    return next
  }

  function runQuickSetup() {
    const allCalendarIds = props.calendars.map((cal) => cal.id).filter(Boolean)
    localSelection.value = allCalendarIds
    selectedStrategy.value = 'total_plus_categories'
    dashboardMode.value = 'standard'
    themePreference.value = 'auto'
    allDayHoursInput.value = 8
    reportingDraft.value = { ...createDefaultReportingConfig(), enabled: false }
    trendLookbackInput.value = clampLookback(activeHistoryLookback.value || 3)
    deckSettingsDraft.value = cloneDeckSettings(createDefaultDeckSettings())
    if (deckBoards.value.length) {
      deckSettingsDraft.value.enabled = true
      deckSettingsDraft.value.hiddenBoards = []
    } else {
      deckSettingsDraft.value.enabled = false
      deckSettingsDraft.value.hiddenBoards = []
    }
    categories.value = []
    assignments.value = {}
    const suggested = Object.fromEntries(
      Object.entries(suggestedCalendarTargets.value).filter(([id]) => allCalendarIds.includes(id)),
    )
    calendarTargets.value = Object.keys(suggested).length ? suggested : createFallbackQuickTargets(allCalendarIds)
    totalHoursInput.value = clampTotalHours(
      Object.values(calendarTargets.value).reduce((sum, hours) => sum + Number(hours || 0), 0) || 40,
    )
    emitComplete()
  }

  const canGoBack = computed(() => stepIndex.value > 0)
  const canGoNext = computed(() => stepIndex.value < enabledSteps.value.length - 1)

  const nextDisabled = computed(() => {
    if (currentStep.value === 'intro') {
      return !introChoice.value
    }
    if (currentStep.value === 'strategy') {
      return !selectedStrategy.value
    }
    if (currentStep.value === 'calendars') {
      return localSelection.value.length === 0
    }
    if (currentStep.value === 'goals') {
      if (selectedStrategy.value === 'total_only') {
        return totalHoursInput.value === null || totalHoursInput.value <= 0
      }
      if (categoriesEnabled.value) {
        if (!localSelection.value.length) return true
        if (!categories.value.length) return true
      }
    }
    if (currentStep.value === 'preferences') {
      if (allDayHoursInput.value < 0 || allDayHoursInput.value > 24) return true
    }
    if (currentStep.value === 'review') {
      if (saveProfile.value && profileName.value.trim() === '') return true
    }
    return false
  })

  function nextStep() {
    if (currentStep.value === 'intro') {
      if (introChoice.value === 'quick') {
        runQuickSetup()
        return
      }
    }
    if (canGoNext.value && !nextDisabled.value) {
      stepIndex.value++
    }
  }

  function prevStep() {
    if (canGoBack.value) {
      stepIndex.value--
    }
  }

  function handleSkip() {
    emit('skip')
  }

  function handleClose() {
    if (!isClosable.value) return
    emit('close')
  }

  function emitComplete() {
    const result = buildStrategyResult(
      selectedStrategy.value,
      props.calendars,
      localSelection.value,
      categoriesEnabled.value
        ? { categories: categories.value.map((cat) => ({ ...cat })), assignments: { ...assignments.value } }
        : undefined,
    )
    const config = result.targetsConfig
    config.allDayHours = clampAllDayHours(allDayHoursInput.value)
    if (!config.balance) config.balance = { basis: 'events', trend: { lookbackWeeks: trendLookbackInput.value } } as any
    if (!config.balance.trend) config.balance.trend = { lookbackWeeks: trendLookbackInput.value }
    config.balance.trend.lookbackWeeks = clampLookback(trendLookbackInput.value)
    if (categoriesEnabled.value) {
      const total = clampTotalHours(categoryTotalHours.value)
      if (total != null) config.totalHours = total
    } else if (selectedStrategy.value === 'total_plus_categories') {
      const total = clampTotalHours(totalCalendarTargetHours.value)
      if (total != null) config.totalHours = total
    } else if (totalHoursInput.value != null) {
      const total = clampTotalHours(totalHoursInput.value)
      if (total != null) config.totalHours = total
    }
    const targetsWeek = { ...result.targetsWeek }
    Object.entries(calendarTargets.value).forEach(([id, hours]) => {
      if (localSelection.value.includes(id)) {
        targetsWeek[id] = clampTarget(hours)
      }
    })
    const targetsMonth = Object.fromEntries(
      Object.entries(targetsWeek).map(([id, hours]) => [id, convertWeekToMonth(hours)]),
    )
    if (Object.keys(targetsWeek).length) {
      config.ui.showCalendarCharts = true
    }

    emit('complete', {
      strategy: selectedStrategy.value,
      selected: [...localSelection.value],
      targetsConfig: config,
      groups: result.groups,
      targetsWeek,
      targetsMonth,
      themePreference: themePreference.value,
      deckSettings: cloneDeckSettings(deckSettingsDraft.value),
      reportingConfig: { ...reportingDraft.value },
      dashboardMode: dashboardMode.value,
      widgets: dashboardWidgets.value,
      saveProfile: saveProfile.value,
      profileName: saveProfile.value ? profileName.value.trim() : '',
    })
  }

  function buildTargetsPayload() {
    const result = buildStrategyResult(
      selectedStrategy.value,
      props.calendars,
      localSelection.value,
      categoriesEnabled.value
        ? { categories: categories.value.map((cat) => ({ ...cat })), assignments: { ...assignments.value } }
        : undefined,
    )
    const config = result.targetsConfig
    config.allDayHours = clampAllDayHours(allDayHoursInput.value)
    if (!config.balance) config.balance = { basis: 'events', trend: { lookbackWeeks: trendLookbackInput.value } } as any
    if (!config.balance.trend) config.balance.trend = { lookbackWeeks: trendLookbackInput.value }
    config.balance.trend.lookbackWeeks = clampLookback(trendLookbackInput.value)
    if (categoriesEnabled.value) {
      const total = clampTotalHours(categoryTotalHours.value)
      if (total != null) config.totalHours = total
    } else if (selectedStrategy.value === 'total_plus_categories') {
      const total = clampTotalHours(totalCalendarTargetHours.value)
      if (total != null) config.totalHours = total
    } else if (totalHoursInput.value != null) {
      const total = clampTotalHours(totalHoursInput.value)
      if (total != null) config.totalHours = total
    }
    const targetsWeek = { ...result.targetsWeek }
    Object.entries(calendarTargets.value).forEach(([id, hours]) => {
      if (localSelection.value.includes(id)) {
        targetsWeek[id] = clampTarget(hours)
      }
    })
    const targetsMonth = Object.fromEntries(
      Object.entries(targetsWeek).map(([id, hours]) => [id, convertWeekToMonth(hours)]),
    )
    if (Object.keys(targetsWeek).length) {
      config.ui.showCalendarCharts = true
    }
    return {
      targetsConfig: config,
      groups: result.groups,
      targetsWeek,
      targetsMonth,
      selected: [...localSelection.value],
    }
  }

  function buildOnboardingDraft() {
    return {
      completed: false,
      version: props.onboardingVersion,
      strategy: selectedStrategy.value,
      completed_at: '',
      dashboardMode: dashboardMode.value,
    }
  }

  function buildStepPayload(step: StepId) {
    const targetsPayload = buildTargetsPayload()
    const onboardingDraft = buildOnboardingDraft()
    if (step === 'intro') {
      return { onboarding: onboardingDraft }
    }
    if (step === 'strategy') {
      return {
        onboarding: onboardingDraft,
        targets_config: targetsPayload.targetsConfig,
        groups: targetsPayload.groups,
        targets_week: targetsPayload.targetsWeek,
        targets_month: targetsPayload.targetsMonth,
      }
    }
    if (step === 'calendars') {
      return { cals: targetsPayload.selected }
    }
    if (step === 'deck') {
      return {
        deck_settings: cloneDeckSettings(deckSettingsDraft.value),
      }
    }
    if (step === 'goals') {
      return {
        targets_config: targetsPayload.targetsConfig,
        groups: targetsPayload.groups,
        targets_week: targetsPayload.targetsWeek,
        targets_month: targetsPayload.targetsMonth,
      }
    }
    if (step === 'preferences') {
      return {
        targets_config: targetsPayload.targetsConfig,
        theme_preference: themePreference.value,
        reporting_config: { ...reportingDraft.value },
      }
    }
    if (step === 'dashboard') {
      return { onboarding: onboardingDraft, dashboardMode: dashboardMode.value, widgets: dashboardWidgets.value }
    }
    return {
      cals: targetsPayload.selected,
      targets_config: targetsPayload.targetsConfig,
      groups: targetsPayload.groups,
      targets_week: targetsPayload.targetsWeek,
      targets_month: targetsPayload.targetsMonth,
      theme_preference: themePreference.value,
      deck_settings: cloneDeckSettings(deckSettingsDraft.value),
      reporting_config: { ...reportingDraft.value },
      onboarding: onboardingDraft,
    }
  }

  function toggleCalendar(id: string, input: HTMLInputElement) {
    if (input.checked) {
      if (!localSelection.value.includes(id)) {
        localSelection.value = [...localSelection.value, id]
      }
      return
    }
    localSelection.value = localSelection.value.filter((cid) => cid !== id)
  }

  function setCalendarTarget(id: string, value: string) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      const next = { ...calendarTargets.value }
      delete next[id]
      calendarTargets.value = next
      return
    }
    calendarTargets.value = {
      ...calendarTargets.value,
      [id]: clampTarget(parsed),
    }
  }

  function getCalendarTarget(id: string): number | '' {
    return Number.isFinite(calendarTargets.value[id]) ? calendarTargets.value[id] : ''
  }

  return {
    stepOrder,
    stepIndex,
    selectedStrategy,
    dashboardMode,
    profileMode,
    introChoice,
    saveProfile,
    profileName,
    localSelection,
    categories,
    assignments,
    calendarTargets,
    themePreference,
    allDayHoursInput,
    totalHoursInput,
    trendLookbackInput,
    deckSettingsDraft,
    reportingDraft,
    deckBoards,
    deckBoardsLoading,
    deckBoardsError,
    suggestionsLoading,
    suggestionsError,
    dashboardPresets,
    deckVisibleBoards,
    deckReviewSummary,
    reportingSummary,
    openColorId,
    previewTheme,
    systemThemeLabel,
    categoryTotalHours,
    categoryColorPalette,
    categoryPresets,
    strategies,
    categoriesEnabled,
    calendarTargetsEnabled,
    isClosable,
    enabledSteps,
    currentStep,
    stepNumber,
    totalSteps,
    saving,
    snapshotSaving,
    snapshotNotice,
    selectedCalendars,
    selectedCalendarIds,
    suggestedCalendarTargets,
    suggestedCategoryTargets,
    availableHistoryLookback,
    activeHistoryLookback,
    historySummary,
    unassignedSelectedCalendars,
    goalsHealth,
    draft,
    strategyTitle,
    setProfileMode,
    setIntroChoice,
    setSaveProfile,
    setProfileName,
    applyStartStep,
    goToStep,
    stepLabel,
    addCategory,
    removeCategory,
    moveCategory,
    reorderCategory,
    reorderSelectedCalendar,
    moveSelectedCalendar,
    setCategoryLabel,
    applyCategoryPreset,
    setCategoryTarget,
    toggleCategoryWeekend,
    assignCalendar,
    addCalendarToCategory,
    setCalendarTarget,
    getCalendarTarget,
    toggleColorPopover,
    closeColorPopover,
    resolvedColor,
    applyColor,
    onColorInput,
    setDeckEnabled,
    isDeckBoardVisible,
    toggleDeckBoard,
    setCategoryPaceMode,
    onTotalHoursChange,
    onAllDayHoursChange,
    onTrendLookbackChange,
    applySuggestedTotalTarget,
    applySuggestedCalendarTarget,
    applySuggestedCategoryTarget,
    setReportingEnabled,
    setReportingSchedule,
    setReportingInterim,
    updateReporting,
    canGoBack,
    canGoNext,
    nextDisabled,
    nextStep,
    prevStep,
    handleSkip,
    handleClose,
    emitComplete,
    runQuickSetup,
    toggleCalendar,
    resetWizard,
    buildStepPayload,
  }
}
