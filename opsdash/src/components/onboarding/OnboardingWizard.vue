<template>
  <AppOverlayShell
    :visible="visible"
    :theme="previewTheme"
    :close-on-backdrop="isClosable"
    :close-on-esc="isClosable"
    @close="requestClose"
  >
        <header class="onboarding-header">
          <div class="onboarding-title">
            <h2>Welcome to Opsdash</h2>
            <p class="subtitle">Build a dashboard that matches your calendars, planning style, and review rhythm.</p>
          </div>
          <div class="onboarding-actions">
            <button
              v-if="isClosable"
              type="button"
              class="close-btn"
              :disabled="saving"
              @click="requestClose"
              aria-label="Close onboarding"
            >
              ×
            </button>
          </div>
        </header>

        <nav class="onboarding-step-nav" aria-label="Onboarding steps">
          <button
            v-for="(step, index) in enabledSteps"
            :key="step"
            type="button"
            class="step-arrow"
            :class="{
              done: isStepDone(step, index),
              current: step === currentStep,
              upcoming: isStepUpcoming(step, index),
              locked: isStepLocked(index),
            }"
            :disabled="saving"
            @click="handleStepArrowClick(step, index)"
          >
            <span class="step-arrow__inner">
              <span class="step-arrow__main">
                <span class="step-arrow__label">{{ stepLabel(step) }}</span>
                <span class="step-arrow__icon" aria-hidden="true">{{ step === currentStep ? '•' : isStepDone(step, index) ? '✓' : '•' }}</span>
              </span>
              <span class="step-arrow__action">
                {{ step === currentStep ? 'Open' : isStepDone(step, index) ? 'Edit' : '' }}
              </span>
            </span>
          </button>
        </nav>

        <main class="onboarding-body">
          <section v-if="currentStep === 'intro'" class="onboarding-step">
            <OnboardingIntroStep
              :has-existing-config="props.hasExistingConfig ?? false"
              :snapshot-saving="props.snapshotSaving ?? false"
              :saving="saving"
              :snapshot-notice="props.snapshotNotice ?? null"
              :intro-choice="introChoice"
              :profile-mode="profileMode"
              :set-intro-choice="setIntroChoice"
              :set-profile-mode="setProfileMode"
              :on-continue="handleContinue"
              :on-save-current-config="() => emit('save-current-config')"
            />
          </section>

          <section v-else-if="currentStep === 'strategy'" class="onboarding-step">
            <OnboardingStrategyStep
              :strategies="strategies"
              :selected-strategy="selectedStrategy"
              :set-selected-strategy="(id) => (selectedStrategy = id)"
              :on-continue="handleContinue"
            />
          </section>

          <section v-else-if="currentStep === 'calendars'" class="onboarding-step">
            <OnboardingCalendarsStep
              :calendars="calendars"
              :local-selection="localSelection"
              :toggle-calendar="toggleCalendar"
            />
          </section>

          <section v-else-if="currentStep === 'deck'" class="onboarding-step">
            <OnboardingDeckBoardsStep
              :deck-settings-draft="deckSettingsDraft"
              :set-deck-enabled="setDeckEnabled"
              :deck-boards="deckBoards"
              :deck-boards-loading="deckBoardsLoading"
              :deck-boards-error="deckBoardsError"
              :is-deck-board-visible="isDeckBoardVisible"
              :toggle-deck-board="toggleDeckBoard"
            />
          </section>

          <section v-else-if="currentStep === 'goals'" class="onboarding-step">
            <OnboardingGoalsStep
              :selected-strategy="selectedStrategy"
              :selected-calendars="selectedCalendars"
              :categories="categories"
              :assignments="assignments"
              :category-presets="categoryPresets"
              :total-hours-input="totalHoursInput"
              :on-total-hours-change="onTotalHoursChange"
              :on-apply-total-suggestion="applySuggestedTotalTarget"
              :trend-lookback-input="trendLookbackInput"
              :active-history-lookback="activeHistoryLookback"
              :history-summary="historySummary"
              :suggestions-loading="suggestionsLoading"
              :suggestions-error="suggestionsError"
              :on-trend-lookback-change="onTrendLookbackChange"
              :suggested-calendar-targets="suggestedCalendarTargets"
              :suggested-category-targets="suggestedCategoryTargets"
              :on-apply-calendar-suggestion="applySuggestedCalendarTarget"
              :on-apply-category-suggestion="applySuggestedCategoryTarget"
              :add-category="addCategory"
              :remove-category="removeCategory"
              :move-category="moveCategory"
              :reorder-category="reorderCategory"
              :reorder-selected-calendar="reorderSelectedCalendar"
              :move-selected-calendar="moveSelectedCalendar"
              :set-category-label="setCategoryLabel"
              :apply-category-preset="applyCategoryPreset"
              :set-category-target="setCategoryTarget"
              :set-category-pace-mode="setCategoryPaceMode"
              :toggle-category-weekend="toggleCategoryWeekend"
              :assign-calendar="assignCalendar"
              :set-calendar-target="setCalendarTarget"
              :get-calendar-target="getCalendarTarget"
              :unassigned-selected-calendars="unassignedSelectedCalendars"
              :goals-health="goalsHealth"
              :resolved-color="resolvedColor"
              :on-color-input="onColorInput"
            />
          </section>

          <section v-else-if="currentStep === 'preferences'" class="onboarding-step">
            <OnboardingPreferencesStep
              :theme-preference="themePreference"
              :system-theme-label="systemThemeLabel"
              :preview-theme="previewTheme"
              :set-theme-preference="(value) => (themePreference = value)"
              :total-hours-input="totalHoursInput"
              :category-total-hours="categoryTotalHours"
              :categories-enabled="categoriesEnabled"
              :on-total-hours-change="onTotalHoursChange"
              :all-day-hours-input="allDayHoursInput"
              :on-all-day-hours-change="onAllDayHoursChange"
              :trend-lookback-input="trendLookbackInput"
              :on-trend-lookback-change="onTrendLookbackChange"
              :reporting-draft="reportingDraft"
              :set-reporting-enabled="setReportingEnabled"
              :set-reporting-mode-enabled="setReportingModeEnabled"
              :set-reporting-mode-delivery="setReportingModeDelivery"
              :update-reporting="updateReporting"
              :update-reporting-mode="updateReportingMode"
              :send-test-report="handleTestReportSend"
            />
          </section>

          <section v-else-if="currentStep === 'dashboard'" class="onboarding-step">
            <OnboardingDashboardStep
              :dashboard-mode="dashboardMode"
              :set-dashboard-mode="(mode) => (dashboardMode = mode)"
              :on-continue="handleContinue"
              :dashboard-presets="dashboardPresets"
            />
          </section>

          <section v-else-if="currentStep === 'review'" class="onboarding-step">
            <OnboardingReviewStep
              :strategy-title="strategyTitle"
              :categories-enabled="categoriesEnabled"
              :calendar-targets-enabled="calendarTargetsEnabled"
              :selected-calendars="selectedCalendars"
              :draft-targets-categories="draft.targetsConfig.categories"
              :draft-total-hours="draft.targetsConfig.totalHours"
              :total-hours-input="totalHoursInput"
              :category-total-hours="categoryTotalHours"
              :deck-review-summary="deckReviewSummary"
              :deck-enabled="deckSettingsDraft.enabled"
              :deck-visible-boards="deckVisibleBoards"
              :reporting-enabled="reportingDraft.enabled"
              :reporting-summary="reportingSummary"
              :theme-preference="themePreference"
              :dashboard-mode="dashboardMode"
              :save-profile="saveProfile"
              :profile-name="profileName"
              :show-save-profile="props.hasExistingConfig ?? false"
              :set-save-profile="setSaveProfile"
              :set-profile-name="setProfileName"
              :go-to-step="goToStep"
            />
          </section>
        </main>

        <footer class="onboarding-footer">
          <template v-if="currentStep === 'intro'">
            <div class="onboarding-footer-spacer"></div>
            <NcButton type="primary" :disabled="saving || nextDisabled" @click="handleContinue">Continue</NcButton>
          </template>
          <template v-else>
            <NcButton v-if="canGoBack" type="tertiary" :disabled="saving" @click="handleBack">Back</NcButton>
            <NcButton v-if="canGoNext" type="primary" :disabled="nextDisabled || saving" @click="handleContinue">Continue</NcButton>
            <NcButton
              v-else
              type="primary"
              :disabled="saving || nextDisabled"
              @click="emitComplete"
            >
              Start dashboard
            </NcButton>
          </template>
        </footer>
  </AppOverlayShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NcButton } from '@nextcloud/vue'
import AppOverlayShell from '../overlays/AppOverlayShell.vue'
import OnboardingIntroStep from './OnboardingIntroStep.vue'
import OnboardingPreferencesStep from './OnboardingPreferencesStep.vue'
import OnboardingDeckBoardsStep from './OnboardingDeckBoardsStep.vue'
import OnboardingDashboardStep from './OnboardingDashboardStep.vue'
import OnboardingStrategyStep from './OnboardingStrategyStep.vue'
import OnboardingCalendarsStep from './OnboardingCalendarsStep.vue'
import OnboardingGoalsStep from './OnboardingGoalsStep.vue'
import OnboardingReviewStep from './OnboardingReviewStep.vue'
import type { CalendarSummary, CategoryDraft, StrategyDefinition } from '../../services/onboarding'
import type { DeckFeatureSettings, ReportingConfig } from '../../services/reporting'
import type { TargetsConfig } from '../../services/targets'
import { useOnboardingWizard } from '../../../composables/useOnboardingWizard'
import type { WizardStepSavePayload } from '../../../composables/useOnboardingActions'

const props = defineProps<{
  visible: boolean
  calendars: CalendarSummary[]
  initialSelection: string[]
  initialStrategy?: StrategyDefinition['id']
  startStep?: 'intro' | 'strategy' | 'calendars' | 'deck' | 'goals' | 'preferences' | 'dashboard' | 'review' | null
  onboardingVersion: number
  saving?: boolean
  closable?: boolean
  initialThemePreference?: 'auto' | 'light' | 'dark'
  systemTheme?: 'light' | 'dark'
  initialAllDayHours?: number
  initialTotalHours?: number
  initialDeckSettings?: DeckFeatureSettings
  initialReportingConfig?: ReportingConfig
  hasExistingConfig?: boolean
  initialCategories?: CategoryDraft[]
  initialAssignments?: Record<string, string>
  snapshotSaving?: boolean
  snapshotNotice?: { type: 'success' | 'error'; message: string } | null
  initialDashboardMode?: 'quick' | 'standard' | 'pro'
  initialTargetsWeek?: Record<string, number>
  initialTargetsConfig?: {
    balanceTrendLookback?: number
  } | null
  persistStep?: (payload: WizardStepSavePayload) => Promise<void>
  sendTestReport?: (payload: {
    selected: string[]
    groups: Record<string, number>
    targetsConfig: TargetsConfig
    reportingConfig: ReportingConfig
  }) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skip'): void
  (e: 'complete', payload: {
    strategy: StrategyDefinition['id']
    selected: string[]
    targetsConfig: TargetsConfig
    groups: Record<string, number>
    targetsWeek: Record<string, number>
    targetsMonth: Record<string, number>
    themePreference: 'auto' | 'light' | 'dark'
    deckSettings: DeckFeatureSettings
    reportingConfig: ReportingConfig
    dashboardMode: 'quick' | 'standard' | 'pro'
    saveProfile?: boolean
    profileName?: string
  }): void
  (e: 'save-step', payload: Record<string, unknown>): void
  (e: 'save-current-config'): void
}>()

const {
  stepIndex,
  stepNumber,
  totalSteps,
  enabledSteps,
  currentStep,
  isClosable,
  saving: baseSaving,
  stepLabel,
  goToStep,
  handleClose,
  canGoBack,
  canGoNext,
  nextDisabled,
  prevStep,
  nextStep,
  emitComplete,
  runQuickSetup,
  profileMode,
  introChoice,
  saveProfile,
  profileName,
  themePreference,
  systemThemeLabel,
  previewTheme,
  totalHoursInput,
  categoryTotalHours,
  categoriesEnabled,
  calendarTargetsEnabled,
  onTotalHoursChange,
  applySuggestedTotalTarget,
  allDayHoursInput,
  onAllDayHoursChange,
  trendLookbackInput,
  onTrendLookbackChange,
  deckSettingsDraft,
  setDeckEnabled,
  deckBoards,
  deckBoardsLoading,
  deckBoardsError,
  isDeckBoardVisible,
  toggleDeckBoard,
  reportingDraft,
  setReportingEnabled,
  setReportingModeEnabled,
  setReportingModeDelivery,
  updateReporting,
  updateReportingMode,
  dashboardMode,
  dashboardPresets,
  strategies,
  selectedStrategy,
  localSelection,
  toggleCalendar,
  categories,
  selectedCalendars,
  suggestedCalendarTargets,
  suggestedCategoryTargets,
  applySuggestedCalendarTarget,
  applySuggestedCategoryTarget,
  suggestionsLoading,
  suggestionsError,
  activeHistoryLookback,
  historySummary,
  unassignedSelectedCalendars,
  goalsHealth,
  assignments,
  calendarTargets,
  addCategory,
  removeCategory,
  moveCategory,
  reorderCategory,
  reorderSelectedCalendar,
  moveSelectedCalendar,
  setCategoryLabel,
  setCategoryTarget,
  setCategoryPaceMode,
  toggleCategoryWeekend,
  assignCalendar,
  setCalendarTarget,
  getCalendarTarget,
  categoryColorPalette,
  categoryPresets,
  resolvedColor,
  applyColor,
  onColorInput,
  draft,
  strategyTitle,
  applyCategoryPreset,
  deckReviewSummary,
  deckVisibleBoards,
  reportingSummary,
  setIntroChoice,
  setProfileMode,
  setSaveProfile,
  setProfileName,
  buildStepPayload,
} = useOnboardingWizard({ props, emit })

const isPersistingStep = ref(false)
const saving = computed(() => baseSaving.value || isPersistingStep.value)

async function persistPayload(payload: WizardStepSavePayload) {
  if (!props.persistStep) {
    emit('save-step', payload)
    return true
  }
  try {
    isPersistingStep.value = true
    await props.persistStep(payload)
    return true
  } catch {
    return false
  } finally {
    isPersistingStep.value = false
  }
}

async function persistCurrentStep() {
  if (saving.value) return false
  return persistPayload(buildStepPayload(currentStep.value) as WizardStepSavePayload)
}

async function handleStepArrowClick(step: typeof currentStep.value, index: number) {
  if (saving.value || isStepLocked(index) || step === currentStep.value) return
  const saved = await persistCurrentStep()
  if (!saved) return
  goToStep(step)
}

async function handleContinue() {
  if (saving.value || nextDisabled.value) return
  if (currentStep.value === 'intro' && introChoice.value === 'quick') {
    nextStep()
    return
  }
  const saved = await persistCurrentStep()
  if (!saved) return
  nextStep()
}

async function handleBack() {
  if (saving.value || !canGoBack.value) return
  const saved = await persistCurrentStep()
  if (!saved) return
  prevStep()
}

async function requestClose() {
  if (saving.value || !isClosable.value) return
  const saved = await persistCurrentStep()
  if (!saved) return
  handleClose()
}

async function handleTestReportSend() {
  if (!props.sendTestReport) return
  const targetsPayload = buildStepPayload('review') as {
    cals?: string[]
    groups?: Record<string, number>
    targets_config?: TargetsConfig
    reporting_config?: ReportingConfig
  }
  await props.sendTestReport({
    selected: [...(targetsPayload.cals ?? [])],
    groups: { ...(targetsPayload.groups ?? {}) },
    targetsConfig: targetsPayload.targets_config ?? ({} as TargetsConfig),
    reportingConfig: targetsPayload.reporting_config ?? { ...reportingDraft.value },
  })
}

function isStepDone(step: typeof currentStep.value, index: number) {
  if (step === currentStep.value) return false
  if (props.hasExistingConfig) return true
  return index < stepIndex.value
}

function isStepUpcoming(step: typeof currentStep.value, index: number) {
  if (step === currentStep.value) return false
  if (props.hasExistingConfig) return false
  return index > stepIndex.value
}

function isStepLocked(index: number) {
  if (props.hasExistingConfig) return false
  return index > stepIndex.value
}

</script>

<style>
.onboarding-fade-enter-active,
.onboarding-fade-leave-active {
  transition: opacity 0.2s ease;
}

.onboarding-fade-enter-from,
.onboarding-fade-leave-to {
  opacity: 0;
}

.onboarding-overlay {
  position: fixed;
  top: calc(var(--header-height, 50px) + 8px);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px 24px 24px;
}

.onboarding-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.onboarding-panel {
  position: relative;
  z-index: 1;
  width: min(1080px, 100%);
  height: min(840px, calc(100vh - var(--header-height, 50px) - 56px));
  max-height: calc(100vh - var(--header-height, 50px) - 56px);
  background: var(--color-main-background, #fff);
  border: 1px solid color-mix(in oklab, var(--brand, #2563eb), var(--line, #e2e8f0) 70%);
  border-radius: 14px;
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.35),
    inset 0 0 0 1px color-mix(in oklab, var(--brand, #2563eb), transparent 82%);
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
}

.onboarding-panel.theme-light {
  --color-main-background: #ffffff;
  --color-background-contrast: #f8fafc;
  --color-text: #0f172a;
  --color-text-maxcontrast: #020617;
  --color-text-light: #334155;
  --color-border: #cbd5e1;
  --color-primary: #1d4ed8;
  --color-primary-element: #1d4ed8;
  --color-error: #b91c1c;
  --color-warning: #b45309;
  color: #0f172a;
  background: #ffffff;
}

.onboarding-panel.theme-light .step-arrow {
  color: #1e293b;
  --step-surface: #f8fafc;
  --step-outline: #cbd5e1;
}

.onboarding-panel.theme-light .step-arrow.done {
  color: #14532d;
  --step-surface: linear-gradient(180deg, rgba(34, 197, 94, 0.11), rgba(34, 197, 94, 0.04));
  --step-outline: rgba(34, 197, 94, 0.44);
}

.onboarding-panel.theme-light .step-arrow.current {
  color: #111827;
  --step-outline: rgba(194, 65, 12, 0.82);
  --step-surface: linear-gradient(180deg, rgba(251, 146, 60, 0.18), rgba(251, 146, 60, 0.06));
}

.onboarding-panel.theme-light .subtitle,
.onboarding-panel.theme-light .hint,
.onboarding-panel.theme-light .pref-desc,
.onboarding-panel.theme-light .pref-hint,
.onboarding-panel.theme-light .field .label,
.onboarding-panel.theme-light .field-hint,
.onboarding-panel.theme-light .strategy-route-card .subtitle,
.onboarding-panel.theme-light .strategy-route-card footer,
.onboarding-panel.theme-light .theme-option__desc,
.onboarding-panel.theme-light .theme-preview,
.onboarding-panel.theme-light .preset-desc,
.onboarding-panel.theme-light .empty-state,
.onboarding-panel.theme-light .category-total,
.onboarding-panel.theme-light .deck-status,
.onboarding-panel.theme-light .review-section h4,
.onboarding-panel.theme-light .review-card__meta,
.onboarding-panel.theme-light .review-status,
.onboarding-panel.theme-light .remove-category,
.onboarding-panel.theme-light .mode-card span,
.onboarding-panel.theme-light .input-unit .unit,
.onboarding-panel.theme-light .custom-color {
  color: #334155 !important;
}

.onboarding-panel.theme-light h2,
.onboarding-panel.theme-light h3,
.onboarding-panel.theme-light h4,
.onboarding-panel.theme-light h5,
.onboarding-panel.theme-light .theme-option__title,
.onboarding-panel.theme-light .preset-title {
  color: #020617 !important;
}

.onboarding-panel.theme-light .onboarding-title h2,
.onboarding-panel.theme-light .onboarding-step h3,
.onboarding-panel.theme-light .onboarding-step h4,
.onboarding-panel.theme-light .strategy-route-card h4,
.onboarding-panel.theme-light .mode-card strong {
  color: #000000 !important;
}

.onboarding-panel.theme-light input,
.onboarding-panel.theme-light select,
.onboarding-panel.theme-light textarea {
  color: #0f172a;
  border-color: #cbd5e1;
}

.onboarding-panel.theme-dark {
  --color-main-background: #0f172a;
  --color-background-contrast: #111827;
  --color-text: #e5e7eb;
  --color-text-maxcontrast: #e5e7eb;
  --color-text-light: #94a3b8;
  --color-border: #1f2937;
  --color-primary-element: #60a5fa;
  --color-primary: #60a5fa;
  color: #e5e7eb;
  background: #0f172a;
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px color-mix(in oklab, var(--brand, #60a5fa), transparent 82%);
}

.onboarding-panel.theme-dark .hint,
.onboarding-panel.theme-dark .subtitle,
.onboarding-panel.theme-dark h2,
.onboarding-panel.theme-dark h3,
.onboarding-panel.theme-dark h4,
.onboarding-panel.theme-dark p,
.onboarding-panel.theme-dark li {
  color: #e5e7eb;
}

.onboarding-panel.theme-dark .step-arrow {
  --step-surface: #111827;
  --step-outline: #1f2937;
  color: #cbd5e1;
}

.onboarding-panel.theme-dark .step-arrow.done {
  color: #dcfce7;
  --step-surface: linear-gradient(180deg, rgba(34, 197, 94, 0.16), rgba(21, 128, 61, 0.08));
  --step-outline: rgba(34, 197, 94, 0.46);
}

.onboarding-panel.theme-dark .step-arrow.current {
  color: #fde7cf;
  --step-outline: rgba(251, 146, 60, 0.88);
  --step-surface: linear-gradient(180deg, rgba(249, 115, 22, 0.26), rgba(249, 115, 22, 0.1));
}

.onboarding-panel.theme-dark input,
.onboarding-panel.theme-dark select,
.onboarding-panel.theme-dark textarea {
  background: #111827;
  color: #e5e7eb;
  border: 1px solid #1f2937;
}

.onboarding-panel.theme-dark .calendar-item {
  background: #0b1220;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .goal-side-card,
.onboarding-panel.theme-dark .goal-category-card,
.onboarding-panel.theme-dark .goal-info-card,
.onboarding-panel.theme-dark .review-row,
.onboarding-panel.theme-dark .deck-step-card,
.onboarding-panel.theme-dark .pref-card,
.onboarding-panel.theme-dark .strategy-route-card {
  background: #111827;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .goal-panel-card,
.onboarding-panel.theme-dark .goal-category-action-card,
.onboarding-panel.theme-dark .goal-category-row-bottom,
.onboarding-panel.theme-dark .goal-calendar-subrow {
  border-color: #2c3a4f;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(17, 24, 39, 0.96));
  box-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.18);
}

.onboarding-panel.theme-dark .goal-category-title-input,
.onboarding-panel.theme-dark .goal-color-input,
.onboarding-panel.theme-dark .goal-category-card select,
.onboarding-panel.theme-dark .goal-category-card input[type="number"],
.onboarding-panel.theme-dark .goal-category-card input[type="text"] {
  border-color: #314257;
  background: #0f172a;
}

.onboarding-panel.theme-dark .goal-add-calendar-control,
.onboarding-panel.theme-dark .goal-row-icon-btn,
.onboarding-panel.theme-dark .reorder-icon-btn,
.onboarding-panel.theme-dark .drag-pill,
.onboarding-panel.theme-dark .goal-category-action-icons,
.onboarding-panel.theme-dark .goal-calendar-subrow__actions {
  border-color: #35506e;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(19, 31, 52, 0.96));
}

.onboarding-panel.theme-dark .goal-section-label,
.onboarding-panel.theme-dark .goal-category-title-edit__eyebrow,
.onboarding-panel.theme-dark .row-inline-note {
  color: #93a7c4;
}

.onboarding-panel.theme-dark .mode-card,
.onboarding-panel.theme-dark .input-unit,
.onboarding-panel.theme-dark .empty-state {
  background: linear-gradient(135deg, #0b1220 0%, #111827 70%);
  border-color: #223046;
}
.onboarding-panel.theme-dark .mode-card {
  color: #e5e7eb;
}

.onboarding-panel.theme-dark .mode-card.active {
  border-color: rgba(96, 165, 250, 0.9);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.55);
  background: linear-gradient(135deg, #0f172a 0%, #1f2937 70%);
}

.onboarding-panel.theme-dark .mode-card::before {
  opacity: 0.6;
}

.onboarding-panel.theme-dark .mode-card span {
  color: #cbd5f5;
}

.onboarding-panel.theme-dark .mode-card:hover {
  border-color: rgba(96, 165, 250, 0.75);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.5);
}

.onboarding-panel.theme-dark .input-unit .unit {
  background: #0b1220;
  color: #94a3b8;
}

.onboarding-panel.theme-dark .config-warning {
  border-color: rgba(251, 146, 60, 0.5);
  background: rgba(251, 146, 60, 0.12);
}

.onboarding-panel.theme-dark .config-warning p {
  color: #fde68a;
}

.onboarding-panel.theme-dark .snapshot-notice--success {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.onboarding-panel.theme-dark .snapshot-notice--error {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.onboarding-panel.theme-dark .close-btn {
  color: #cbd5f5;
}

.onboarding-panel.theme-dark .close-btn:hover {
  color: #93c5fd;
}

.onboarding-panel.theme-dark .color-popover {
  background: #0b1220;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .color-link {
  color: #93c5fd;
}

.onboarding-panel.theme-dark .review-card,
.onboarding-panel.theme-dark .review-section {
  background: #111827;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .review-status {
  background: #0b1220;
  border-color: #334155;
  color: #bfdbfe;
}

.onboarding-panel.theme-dark .review-checklist li.is-ok {
  border-left-color: #16a34a;
}

.onboarding-panel.theme-dark .review-checklist li.is-warn {
  border-left-color: #f59e0b;
}

.onboarding-panel.theme-dark .review-action-btn,
.onboarding-panel.theme-dark .review-inline-btn,
.onboarding-panel.theme-dark .review-edit-link {
  border-color: #334155;
  background: #0b1220;
  color: #93c5fd;
}

.onboarding-panel.theme-dark .warning {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fecaca;
}

.onboarding-panel.theme-dark .goal-suggestion-toggle {
  color: #fdba74;
  border-color: rgba(249, 115, 22, 0.42);
  background: linear-gradient(180deg, rgba(154, 52, 18, 0.38), rgba(124, 45, 18, 0.28));
}

.onboarding-panel.theme-dark .goal-suggestion-toggle__icon {
  background: rgba(15, 23, 42, 0.42);
}

.onboarding-panel.theme-dark .goal-suggestion-inline-editor {
  border-color: rgba(249, 115, 22, 0.34);
  background: linear-gradient(180deg, rgba(67, 20, 7, 0.76), rgba(30, 41, 59, 0.9));
}

.onboarding-panel.theme-dark .goal-suggestion-inline-editor input {
  border-color: #35506e;
  background: #0f172a;
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.onboarding-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.onboarding-title h2 {
  margin: 0;
  font-size: 1.6rem;
}

.onboarding-title .subtitle {
  margin: 4px 0 0;
  color: var(--color-text-light);
}

.onboarding-overlay .skip-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.95rem;
}

.onboarding-overlay .close-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-light);
}

.onboarding-overlay .close-btn:hover {
  color: var(--color-primary);
}

.onboarding-step-nav{
  display:grid;
  grid-template-columns:repeat(8, minmax(0, 1fr));
  gap:0;
  width:calc(100% + 12px);
  margin:0 -6px 12px;
  padding-bottom:4px;
}
.onboarding-overlay .step-arrow{
  position:relative;
  min-height:58px;
  --step-clip: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%);
  --step-surface: var(--color-background-contrast);
  --step-outline: var(--color-border);
  background:transparent;
  border:none;
  clip-path:var(--step-clip);
  padding:4px 0;
  cursor:pointer;
  isolation:isolate;
  transition:transform 0.16s ease, filter 0.18s ease;
  filter:
    drop-shadow(0 6px 12px rgba(15, 23, 42, 0.06))
    drop-shadow(0 0 0 rgba(249, 115, 22, 0));
}
.onboarding-overlay .step-arrow::before,
.onboarding-overlay .step-arrow::after{
  content:'';
  position:absolute;
  inset:0;
  clip-path:var(--step-clip);
  pointer-events:none;
}
.onboarding-overlay .step-arrow::before{
  z-index:0;
  background:var(--step-outline);
}
.onboarding-overlay .step-arrow::after{
  z-index:1;
  inset:1px;
  background:var(--step-surface);
}
.onboarding-overlay .step-arrow:first-child{
  --step-clip: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);
}
.onboarding-overlay .step-arrow:last-child{
  --step-clip: polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%);
}
.onboarding-overlay .step-arrow__inner{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  min-height:48px;
  padding:0 10px;
  text-align:center;
}
.onboarding-overlay .step-arrow__main{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  width:100%;
  min-width:0;
}
.onboarding-overlay .step-arrow__label{
  font-size:12px;
  font-weight:800;
  line-height:1.05;
  text-align:center;
}
.onboarding-overlay .step-arrow__icon{
  width:20px;
  height:20px;
  display:inline-grid;
  place-items:center;
  border-radius:999px;
  border:1px solid var(--color-border);
  background:color-mix(in oklab, var(--color-main-background, #fff), var(--color-border) 18%);
  font-size:11.5px;
  line-height:1;
  flex-shrink:0;
}
.onboarding-overlay .step-arrow__action{
  position:absolute;
  bottom:0;
  left:50%;
  transform:translateX(-50%);
  min-width:28px;
  height:16px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:0 7px;
  border-radius:999px;
  border:1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
  background:color-mix(in srgb, var(--color-main-background, #fff) 88%, transparent);
  color:inherit;
  font-size:6.8px;
  line-height:1;
  letter-spacing:0.02em;
  text-transform:uppercase;
  opacity:0;
  pointer-events:none;
  visibility:hidden;
}
.onboarding-overlay .step-arrow.current .step-arrow__action{
  opacity:1;
  visibility:visible;
  border-color:color-mix(in srgb, var(--nav-current, #c05a31) 40%, var(--color-border));
  background:color-mix(in srgb, rgba(192, 90, 49, 0.14) 44%, var(--color-main-background, #fff));
}
.onboarding-overlay .step-arrow.done:hover .step-arrow__action,
.onboarding-overlay .step-arrow.done:focus-visible .step-arrow__action,
.onboarding-overlay .step-arrow.current:hover .step-arrow__action{
  opacity:1;
  visibility:visible;
}
.onboarding-overlay .step-arrow.upcoming .step-arrow__action{
  display:none;
}
.onboarding-overlay .step-arrow.locked{
  cursor:default;
}
.onboarding-overlay .step-arrow:hover{
  transform:translateY(-1px);
  filter:
    drop-shadow(0 12px 22px rgba(15, 23, 42, 0.14))
    drop-shadow(0 0 14px rgba(249, 115, 22, 0.14));
}
.onboarding-overlay .step-arrow.locked:hover{
  transform:none;
  filter:
    drop-shadow(0 6px 12px rgba(15, 23, 42, 0.06))
    drop-shadow(0 0 0 rgba(249, 115, 22, 0));
}
.onboarding-overlay .step-arrow:disabled{
  opacity:0.6;
  cursor:default;
}
.onboarding-overlay .step-arrow.current{
  filter:
    drop-shadow(0 12px 24px rgba(15, 23, 42, 0.14))
    drop-shadow(0 0 18px rgba(249, 115, 22, 0.24));
}
.onboarding-overlay .step-arrow.current:hover{
  filter:
    drop-shadow(0 16px 28px rgba(15, 23, 42, 0.18))
    drop-shadow(0 0 24px rgba(249, 115, 22, 0.32));
}
.onboarding-overlay .step-arrow.done .step-arrow__icon{
  color:var(--color-success, #15803d);
  border-color:color-mix(in srgb, var(--color-success, #15803d) 30%, var(--color-border));
  background:color-mix(in srgb, rgba(34, 197, 94, 0.14) 72%, var(--color-main-background, #fff));
}
.onboarding-overlay .step-arrow.current .step-arrow__icon{
  color:var(--nav-current, #c05a31);
  border-color:color-mix(in srgb, var(--nav-current, #c05a31) 48%, var(--color-border));
  background:color-mix(in srgb, rgba(192, 90, 49, 0.14) 80%, var(--color-main-background, #fff));
}

.onboarding-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 10px;
  margin-right: -10px;
  padding-bottom: 8px;
}

@media (max-width: 960px) {
  .onboarding-overlay {
    padding: 12px;
  }

  .onboarding-panel {
    width: 100%;
    height: calc(100vh - var(--header-height, 50px) - 32px);
    max-height: calc(100vh - var(--header-height, 50px) - 32px);
    padding: 16px;
  }
}

.onboarding-step h3 {
  margin-top: 0;
}

.onboarding-step {
  min-height: 100%;
  display: grid;
  align-content: start;
}

.onboarding-overlay .highlights {
  padding-left: 18px;
}

.onboarding-overlay .config-warning {
  border: 1px solid color-mix(in srgb, var(--color-warning, #f97316) 35%, transparent);
  background: color-mix(in srgb, var(--color-warning, #f97316) 12%, transparent);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.onboarding-overlay .config-warning p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.onboarding-overlay .config-warning__actions {
  display: flex;
  justify-content: flex-end;
}

.onboarding-overlay .config-warning .snapshot-notice {
  grid-column: 1 / -1;
  margin-top: 0;
}

.onboarding-overlay .hint {
  color: var(--color-text-light, #334155);
  margin-top: 12px;
}

.onboarding-overlay .selection-step-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  flex-wrap: wrap;
}

.onboarding-overlay .selection-step-toolbar__meta {
  font-size: 0.92rem;
  color: var(--color-text-light, #475569);
}

.onboarding-overlay .selection-step-toolbar__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.onboarding-overlay .snapshot-notice {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.onboarding-overlay .snapshot-notice--success {
  background: color-mix(in srgb, #22c55e 15%, transparent);
  color: #14532d;
}

.onboarding-overlay .snapshot-notice--error {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #7f1d1d;
}

.onboarding-overlay .strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.onboarding-overlay .strategy-route-card {
  height: 100%;
}

.onboarding-overlay .strategy-route-card .subtitle {
  margin: 0;
}

.onboarding-overlay .strategy-route-card ul {
  margin: 0;
  padding-left: 18px;
}

.onboarding-overlay .strategy-route-card footer {
  margin-top: auto;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .calendar-list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.onboarding-overlay .calendar-list--scroll {
  max-height: 460px;
  overflow: auto;
  padding-right: 4px;
}

.onboarding-overlay .calendar-item {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 7px 12px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 24%);
  border-radius: 10px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.onboarding-overlay .calendar-item.checked {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-main-background, #fff));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.onboarding-overlay .list-checkbox {
  appearance: none;
  width: 17px;
  height: 17px;
  margin: 0;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--color-border) 92%, transparent);
  background: color-mix(in oklab, var(--color-main-background, #fff), var(--color-border) 8%);
  display: inline-block;
  position: relative;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
  vertical-align: middle;
}

.onboarding-overlay .list-checkbox::after {
  content: '';
  width: 10px;
  height: 6px;
  position: absolute;
  top: 50%;
  left: 50%;
  border-left: 2.25px solid currentColor;
  border-bottom: 2.25px solid currentColor;
  transform: translate(-50%, -58%) rotate(-45deg) scale(0.78);
  transform-origin: center center;
  opacity: 0;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.onboarding-overlay .list-checkbox:checked {
  color: color-mix(in srgb, var(--color-primary) 86%, white 10%);
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-main-background, #fff));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 14%, transparent),
    0 0 0 2px color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.onboarding-overlay .list-checkbox:checked::after {
  opacity: 1;
  transform: translate(-50%, -58%) rotate(-45deg) scale(1);
}

.onboarding-overlay .calendar-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.onboarding-overlay .warning {
  color: var(--color-error);
  margin-top: 12px;
}

.onboarding-overlay .review-layout {
  margin-top: 10px;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  align-items: start;
}

.onboarding-overlay .review-main {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .review-section {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 34%);
  border-radius: 12px;
  padding: 12px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
  display: grid;
  gap: 10px;
}

.onboarding-overlay .review-section h4 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--color-text-light);
}

.onboarding-overlay .review-card-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}

.onboarding-overlay .review-card {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 34%);
  border-radius: 10px;
  padding: 12px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
  display: grid;
  gap: 10px;
}

.onboarding-overlay .review-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.onboarding-overlay .review-card__head h5 {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.onboarding-overlay .review-card__value {
  margin: 0;
  font-size: 1.06rem;
  line-height: 1.3;
  font-weight: 700;
  color: var(--color-text);
}

.onboarding-overlay .review-card__meta {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--color-text-light);
}

.onboarding-overlay .review-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 0.88rem;
  line-height: 1.4;
}

.onboarding-overlay .review-checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.onboarding-overlay .review-checklist li {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 26%);
  border-left: 4px solid transparent;
  border-radius: 8px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: flex-start;
}

.onboarding-overlay .review-checklist li.is-ok {
  border-left-color: #22c55e;
}

.onboarding-overlay .review-checklist li.is-warn {
  border-left-color: #f59e0b;
}

.onboarding-overlay .review-status {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-light);
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 24%);
  border-radius: 999px;
  padding: 3px 8px;
  white-space: nowrap;
  line-height: 1.2;
}

.onboarding-overlay .review-checklist__copy {
  display: grid;
  gap: 4px;
}

.onboarding-overlay .review-checklist__copy strong {
  font-size: 0.91rem;
  line-height: 1.3;
}

.onboarding-overlay .review-checklist__copy p {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--color-text-light);
}

.onboarding-overlay .review-side {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .review-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.onboarding-overlay .review-action-btn,
.onboarding-overlay .review-inline-btn,
.onboarding-overlay .review-edit-link {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 20%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 2%);
  color: var(--color-primary, #2563eb);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.81rem;
  line-height: 1.2;
  cursor: pointer;
  font-weight: 600;
}

.onboarding-overlay .review-edit-link {
  padding: 4px 9px;
  border-radius: 6px;
}

.onboarding-overlay .review-action-btn:hover,
.onboarding-overlay .review-inline-btn:hover,
.onboarding-overlay .review-edit-link:hover {
  border-color: color-mix(in oklab, var(--color-primary, #2563eb), var(--color-border) 35%);
}

.onboarding-overlay .review-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.onboarding-overlay .review-profile {
  display: grid;
  gap: 10px;
}

@media (max-width: 980px) {
  .onboarding-overlay .review-layout {
    grid-template-columns: 1fr;
  }
}

.onboarding-overlay .onboarding-mode {
  margin: 16px 0;
}

.onboarding-overlay .mode-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.onboarding-overlay .mode-card {
  position: relative;
  border: 1px solid var(--color-border);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-background-contrast, #ffffff), #ffffff 92%),
    color-mix(in oklab, var(--color-background-contrast, #ffffff), var(--color-primary, #2563eb) 8%)
  );
  border-radius: 10px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.onboarding-overlay .mode-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 35%),
    color-mix(in oklab, var(--color-primary, #2563eb), #000000 15%)
  );
  opacity: 0.35;
}

.onboarding-overlay .mode-card strong {
  font-size: 0.98rem;
}

.onboarding-overlay .mode-card span {
  font-size: 0.85rem;
  color: var(--color-text-light, #475569);
}

.onboarding-overlay .mode-card:hover {
  border-color: color-mix(in oklab, var(--color-primary, #2563eb), transparent 35%) !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
  transform: translateY(-1px);
}

.onboarding-overlay .mode-card.active {
  border-color: var(--color-primary, #2563eb) !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.15);
  transform: translateY(-1px);
}

.onboarding-overlay .mode-card.active::before {
  opacity: 0.9;
  width: 6px;
}

.onboarding-overlay .mode-card:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .categories-editor {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .category-presets {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.onboarding-overlay .preset-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.onboarding-overlay .preset-card {
  text-align: left;
  border: 1px solid var(--color-border);
  background: var(--color-background-contrast);
  border-radius: 12px;
  padding: 12px 14px;
  display: grid;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.onboarding-overlay .preset-card:hover {
  border-color: color-mix(in oklab, var(--color-primary), transparent 40%);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.onboarding-overlay .preset-card:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .preset-title {
  font-weight: 600;
}

.onboarding-overlay .preset-desc {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .preset-swatches {
  display: flex;
  gap: 6px;
  align-items: center;
}

.onboarding-overlay .preset-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
}

.onboarding-overlay .empty-state {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in oklab, var(--color-border), transparent 30%);
  background: color-mix(in oklab, var(--color-background-contrast), transparent 20%);
  color: var(--color-text-light);
}

.onboarding-overlay .category-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-main-background, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onboarding-overlay .category-card__header {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.onboarding-overlay .category-color-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  flex-shrink: 0;
}

.onboarding-overlay .category-name {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  min-width: 180px;
}

.onboarding-overlay .category-actions {
  display: flex;
  gap: 8px;
}

.onboarding-overlay .remove-category {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 1.1rem;
}

.onboarding-overlay .remove-category:disabled {
  opacity: 0.4;
  cursor: default;
}

.onboarding-overlay .remove-category:not(:disabled):hover {
  color: var(--color-error);
}

.onboarding-overlay .category-card__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.onboarding-overlay .color-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.onboarding-overlay .color-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-background-contrast);
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

.onboarding-overlay .color-button:hover {
  border-color: color-mix(in oklab, var(--color-primary), transparent 35%);
}

.onboarding-overlay .color-button:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .color-button .category-color-indicator {
  width: 12px;
  height: 12px;
}

.onboarding-overlay .color-link {
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--brand, #2563eb);
  text-decoration: underline;
  cursor: pointer;
}

.onboarding-overlay .color-link:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .color-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  min-width: 160px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
  background: var(--color-main-background, #fff);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .color-popover:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 20px));
  justify-content: flex-start;
  gap: 6px;
}

.onboarding-overlay .color-swatch {
  width: 18px;
  height: 18px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, #000, transparent 80%);
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.onboarding-overlay .color-swatch.active {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--brand, #2563eb), transparent 55%);
}

.onboarding-overlay .color-swatch:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 1px;
}

.onboarding-overlay .custom-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .color-input {
  width: 44px;
  height: 26px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  background: transparent;
}

.onboarding-overlay .add-category {
  justify-self: flex-start;
}

.onboarding-overlay .category-total {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.onboarding-overlay .input-unit {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-background-contrast);
}

.onboarding-overlay .input-unit input {
  border: none;
  padding: 7px 10px;
  background: transparent;
}

.onboarding-overlay .input-unit .unit {
  padding: 6px 10px;
  font-size: 0.75rem;
  color: var(--color-text-light);
  background: color-mix(in oklab, var(--color-border), transparent 70%);
  white-space: nowrap;
}

.onboarding-overlay .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.onboarding-overlay .field .label {
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.onboarding-overlay .field-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.onboarding-overlay .calendar-assignments {
  margin-top: 24px;
  display: grid;
  gap: 12px;
}

.onboarding-overlay .calendar-targets {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.onboarding-overlay .assignment-row {
  display: grid;
  grid-template-columns: 1fr minmax(160px, 220px) auto;
  gap: 12px;
  align-items: center;
}

.onboarding-overlay .target-row {
  display: grid;
  grid-template-columns: 1fr minmax(150px, 200px);
  gap: 12px;
  align-items: center;
}

.onboarding-overlay .assignment-row select {
  padding: 6px 8px;
}

.onboarding-overlay .cal-name {
  font-size: 0.95rem;
}

.onboarding-overlay .assignment-warning {
  font-size: 0.75rem;
  color: var(--color-error);
}

.onboarding-overlay .assignment-row.is-unassigned select {
  border-color: color-mix(in oklab, var(--color-error), transparent 50%);
}

.onboarding-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in oklab, var(--color-border), transparent 28%);
  flex-shrink: 0;
}

.onboarding-overlay .preferences-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.onboarding-overlay .pref-card {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
  border-radius: 10px;
  padding: 12px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onboarding-overlay .pref-card--stack {
  gap: 14px;
}

.onboarding-overlay .pref-card h4 {
  margin: 0;
}

.onboarding-overlay .toggle-row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.95rem;
}

.onboarding-overlay .toggle-row input[type="checkbox"] {
  transform: scale(1.05);
}

.onboarding-overlay .pref-card--deck .toggle-row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.95rem;
}

.onboarding-overlay .pref-card--deck input[type="checkbox"] {
  transform: scale(1.05);
}

.onboarding-overlay .deck-board-list {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 24%);
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .deck-board-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.onboarding-overlay .deck-board-option {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
}

.onboarding-overlay .deck-status {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .deck-status--error {
  color: var(--color-error);
}

.onboarding-overlay .pref-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.onboarding-overlay .pref-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .theme-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 8%);
}

.onboarding-overlay .theme-option input[type="radio"] {
  margin-top: 4px;
}

.onboarding-overlay .theme-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9rem;
}

.onboarding-overlay .theme-option__title {
  font-weight: 600;
  color: var(--color-text);
}

.onboarding-overlay .theme-option__desc {
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.onboarding-overlay .theme-preview {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .preferences-step {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .field-row,
.onboarding-overlay .editor-card,
.onboarding-overlay .module-card {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 22%);
  border-radius: 14px;
}

.onboarding-overlay .field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 2%);
}

.onboarding-overlay .field-copy {
  display: grid;
  gap: 4px;
}

.onboarding-overlay .field-copy strong {
  font-size: 0.92rem;
}

.onboarding-overlay .field-copy p {
  margin: 0;
  font-size: 0.86rem;
  color: var(--color-text-light);
}

.onboarding-overlay .field-actions,
.onboarding-overlay .row,
.onboarding-overlay .choice-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.onboarding-overlay .field-actions {
  justify-content: flex-end;
}

.onboarding-overlay .field-actions--wrap {
  max-width: 360px;
}

.onboarding-overlay .editor-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), transparent), var(--color-main-background, #fff);
}

.onboarding-overlay .module-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-style: dashed;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), transparent), var(--color-main-background, #fff);
}

.onboarding-overlay .choice-strip.compact {
  gap: 6px;
}

.onboarding-overlay .choice-pill,
.onboarding-overlay .value-chip,
.onboarding-overlay .action-chip,
.onboarding-overlay .soft-pill,
.onboarding-overlay .toggle-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
  color: var(--color-text);
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
}

.onboarding-overlay .choice-pill.active {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
}

.onboarding-overlay .action-chip {
  color: var(--color-primary);
  cursor: pointer;
}

.onboarding-overlay .toggle-chip.on {
  border-color: color-mix(in srgb, #15803d 45%, var(--color-border));
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.onboarding-overlay .soft-pill {
  color: var(--color-text-light);
}

.onboarding-overlay .inline-input {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  background: var(--color-main-background, #fff);
  color: var(--color-text);
  padding: 8px 12px;
  min-width: 190px;
}

.onboarding-overlay .inline-input input {
  width: 68px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.onboarding-overlay .inline-input .slot {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
  font-weight: 700;
}

.onboarding-overlay .intro-step,
.onboarding-overlay .goals-step {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.onboarding-overlay .intro-stage {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
}

.onboarding-overlay .intro-stage__state {
  font-size:0.78rem;
  color:var(--color-text-light);
}

.onboarding-overlay .intro-hero {
  display: grid;
  gap: 12px;
}

.onboarding-overlay .intro-visual {
  position:relative;
  display:grid;
  gap:18px;
  min-height:300px;
  padding:28px;
  border-radius:18px;
  overflow:hidden;
  background:
    linear-gradient(135deg, #111827, #1f2937),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.22), transparent 40%),
    radial-gradient(circle at bottom left, rgba(192, 90, 49, 0.18), transparent 35%);
  color:#f8fafc;
}

.onboarding-overlay .intro-visual::before {
  content:'';
  position:absolute;
  inset:auto 0 0 0;
  height:38%;
  background:linear-gradient(180deg, transparent, rgba(192, 90, 49, 0.14));
}

.onboarding-overlay .intro-visual__tabs,
.onboarding-overlay .intro-visual__stats {
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.onboarding-overlay .intro-visual__tabs {
  position:relative;
  z-index:1;
}

.onboarding-overlay .intro-visual__tabs span {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:74px;
  height:28px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid rgba(148, 163, 184, 0.35);
  background:rgba(15, 23, 42, 0.48);
  color:#cbd5e1;
  text-transform:uppercase;
  letter-spacing:0.12em;
  font-size:0.72rem;
  font-weight:700;
}

.onboarding-overlay .intro-visual__tabs .is-active {
  background:rgba(37, 99, 235, 0.16);
  border-color:rgba(96, 165, 250, 0.55);
  color:#f8fafc;
}

.onboarding-overlay .intro-visual__copy {
  position:relative;
  z-index:1;
  display:grid;
  gap:2px;
  max-width:520px;
  font-size:2.7rem;
  line-height:0.96;
  letter-spacing:-0.06em;
  font-weight:700;
}

.onboarding-overlay .intro-visual__copy .accent {
  color:#93c5fd;
  font-size:3.4rem;
  font-weight:800;
}

.onboarding-overlay .intro-visual__card {
  position:absolute;
  right:28px;
  top:28px;
  z-index:1;
  width:min(280px, 42%);
  display:grid;
  gap:12px;
  padding:18px;
  border-radius:18px;
  background:rgba(11, 18, 32, 0.92);
  border:1px solid #334155;
  box-shadow:0 18px 36px rgba(0, 0, 0, 0.28);
}

.onboarding-overlay .intro-visual__eyebrow {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  font-size:0.72rem;
  text-transform:uppercase;
  letter-spacing:0.1em;
  color:#dbe7f5;
}

.onboarding-overlay .intro-visual__status {
  padding:6px 10px;
  border-radius:999px;
  background:#0d2618;
  border:1px solid #1f7a47;
  color:#dcfce7;
}

.onboarding-overlay .intro-visual__score {
  display:flex;
  align-items:flex-end;
  gap:8px;
}

.onboarding-overlay .intro-visual__score strong {
  font-size:2.8rem;
  line-height:1;
}

.onboarding-overlay .intro-visual__score span {
  color:#93c5fd;
  font-weight:700;
}

.onboarding-overlay .intro-visual__card p {
  margin:0;
  color:#94a3b8;
}

.onboarding-overlay .intro-visual__bar {
  height:10px;
  border-radius:999px;
  background:#172033;
  overflow:hidden;
}

.onboarding-overlay .intro-visual__bar span {
  display:block;
  width:74%;
  height:100%;
  border-radius:inherit;
  background:#1d4ed8;
}

.onboarding-overlay .intro-visual__stats > div {
  flex:1 1 70px;
  display:grid;
  gap:4px;
  padding:10px 12px;
  border-radius:14px;
  background:#111827;
  border:1px solid #223046;
}

.onboarding-overlay .intro-visual__stats span {
  color:#94a3b8;
  text-transform:uppercase;
  letter-spacing:0.1em;
  font-size:0.62rem;
  font-weight:700;
}

.onboarding-overlay .intro-visual__stats strong {
  color:#f8fafc;
}

.onboarding-overlay .intro-route-grid {
  display:grid;
  gap:14px;
}

.onboarding-overlay .intro-route-grid--three {
  grid-template-columns:repeat(3, minmax(0, 1fr));
}

.onboarding-overlay .intro-route-grid--two {
  grid-template-columns:repeat(2, minmax(0, 1fr));
}

.onboarding-overlay .intro-route-card {
  display:grid;
  gap:8px;
  padding:18px;
  text-align:left;
  border-radius:14px;
  border:1px solid color-mix(in oklab, var(--color-border), transparent 16%);
  background:color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
}

.onboarding-overlay .intro-route-card--button {
  cursor:pointer;
}

.onboarding-overlay .intro-route-card.active {
  border-color:color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
  background:linear-gradient(180deg, rgba(37, 99, 235, 0.1), transparent), var(--color-main-background, #fff);
  box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.onboarding-overlay .intro-route-card h4 {
  margin:0;
}

.onboarding-overlay .calendar-item__label {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.onboarding-overlay .calendar-item__state {
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 3px 8px;
  white-space: nowrap;
  background: color-mix(in oklab, var(--color-main-background, #fff), var(--color-border) 20%);
  color: var(--color-text-light);
}

.onboarding-overlay .deck-step-card,
.onboarding-overlay .goal-info-card,
.onboarding-overlay .goal-side-card {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  border-radius: 12px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
}

.onboarding-overlay .deck-board-list--scroll {
  max-height: 420px;
  overflow: auto;
}

.onboarding-overlay .deck-board-options--list {
  gap: 6px;
}

.onboarding-overlay .deck-board-option--row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 7px 12px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 24%);
  border-radius: 10px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
}

.onboarding-overlay .deck-board-option--row .dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--brand, #2563eb), white 20%);
}

.onboarding-overlay .dashboard-preset-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.onboarding-overlay .dashboard-preset-card {
  gap: 12px;
  text-align:left;
  min-height: 320px;
  align-items: start;
  border-radius: 14px;
}

.onboarding-overlay .dashboard-preset-card h4 {
  margin: 0;
  min-height: 28px;
  font-size: 1rem;
  line-height: 1.15;
}

.onboarding-overlay .dashboard-preset-card .subtitle {
  margin: 0;
  min-height: 54px;
  line-height: 1.45;
}

.onboarding-overlay .dashboard-preset-card .mini-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  align-items: center;
}

.onboarding-overlay .dashboard-preview,
.onboarding-overlay .dashboard-thumb {
  display: grid;
  gap: 6px;
  min-height: 112px;
  padding: 10px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 16%);
  border-radius: 16px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 2%);
  width: 100%;
  align-content: start;
}

.onboarding-overlay .dashboard-thumb-row {
  display: grid;
  gap: 8px;
}

.onboarding-overlay .dashboard-thumb-row--1 {
  grid-template-columns: 1fr;
}

.onboarding-overlay .dashboard-thumb-row--2 {
  grid-template-columns: 1.2fr 0.8fr;
}

.onboarding-overlay .dashboard-thumb-row--3 {
  grid-template-columns: 1.1fr 1.1fr 0.8fr;
}

.onboarding-overlay .dashboard-preview span,
.onboarding-overlay .dashboard-block {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(148, 163, 184, 0.24);
  min-height: 38px;
}

.onboarding-overlay .dashboard-tab-strip {
  display:flex;
  gap:6px;
  grid-column:1 / -1;
  margin-bottom:2px;
}

.onboarding-overlay .dashboard-tab {
  height:12px;
  border-radius:999px;
  background:rgba(148, 163, 184, 0.24);
  border:1px solid rgba(148, 163, 184, 0.18);
}

.onboarding-overlay .dashboard-tab.is-active {
  background:rgba(37, 99, 235, 0.18);
  border-color:rgba(37, 99, 235, 0.28);
}

.onboarding-overlay .dashboard-tab--wide { width:44px; }
.onboarding-overlay .dashboard-tab--medium { width:34px; }
.onboarding-overlay .dashboard-tab--short { width:28px; }
.onboarding-overlay .dashboard-tab--tiny { width:22px; }

.onboarding-overlay .dashboard-block--tall {
  min-height:44px;
}

.onboarding-overlay .dashboard-block--soft {
  background: rgba(37, 99, 235, 0.14);
}

.onboarding-overlay .dashboard-block--warm {
  background: rgba(192, 90, 49, 0.15);
}

.onboarding-overlay .dashboard-block--ok {
  background: rgba(34, 197, 94, 0.16);
}

.onboarding-overlay .dashboard-preview--quick {
  grid-template-columns: 1fr;
}

.onboarding-overlay .dashboard-preview--quick span:first-child {
  min-height: 86px;
}

.onboarding-overlay .preferences-grid--core-optional {
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.9fr);
}

.onboarding-overlay .pref-card--module {
  align-self: start;
}

.onboarding-overlay .goals-step__header,
.onboarding-overlay .goal-single,
.onboarding-overlay .goal-advanced,
.onboarding-overlay .goal-calendar {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .goals-step__header {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.onboarding-overlay .goals-lookback__label,
.onboarding-overlay .goal-suggestion-inline {
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.onboarding-overlay .goal-suggestion-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.onboarding-overlay .goal-suggestion-toolbar--panel {
  margin-top: -2px;
}

.onboarding-overlay .goal-suggestion-toolbar__cluster {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.onboarding-overlay .goal-suggestion-toolbar__meta {
  font-size: 0.84rem;
  color: var(--color-text-light);
}

.onboarding-overlay .goal-suggestion-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(194, 65, 12, 0.45);
  background: linear-gradient(180deg, rgba(251, 146, 60, 0.22), rgba(249, 115, 22, 0.16));
  color: #9a3412;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(194, 65, 12, 0.14);
}

.onboarding-overlay .goal-suggestion-toggle.is-open {
  background: linear-gradient(180deg, rgba(251, 146, 60, 0.28), rgba(249, 115, 22, 0.22));
  border-color: rgba(194, 65, 12, 0.6);
}

.onboarding-overlay .goal-suggestion-toggle__icon {
  width: 18px;
  height: 18px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  color: inherit;
  font-size: 12px;
  line-height: 1;
}

.onboarding-overlay .goal-suggestion-inline-editor {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194, 65, 12, 0.28);
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(255, 237, 213, 0.74));
}

.onboarding-overlay .goal-suggestion-inline-editor__label,
.onboarding-overlay .goal-suggestion-inline-editor__meta {
  font-size: 0.76rem;
  color: var(--color-text-light);
  white-space: nowrap;
}

.onboarding-overlay .goal-suggestion-inline-editor input {
  width: 64px;
  min-width: 64px;
  border: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--color-main-background, #fff);
  color: var(--color-text);
}

.onboarding-overlay .goal-info-card {
  padding: 16px;
}

.onboarding-overlay .goal-info-card--compact {
  padding-bottom: 12px;
}

.onboarding-overlay .goal-single {
  grid-template-columns: minmax(0, 0.9fr) minmax(260px, 0.7fr);
}

.onboarding-overlay .goal-single__editor,
.onboarding-overlay .goal-calendar-list,
.onboarding-overlay .goal-main-panel,
.onboarding-overlay .goal-side-panel {
  display: grid;
  gap: 12px;
}

.onboarding-overlay .goal-calendar-row,
.onboarding-overlay .goal-calendar-subrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 20%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
}

.onboarding-overlay .goal-calendar-row__main,
.onboarding-overlay .goal-calendar-subrow__main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.onboarding-overlay .goal-advanced {
  grid-template-columns: minmax(300px, 0.88fr) minmax(0, 1.45fr);
  align-items: start;
}

.onboarding-overlay .goal-advanced--b26 {
  grid-template-columns:1fr;
}

.onboarding-overlay .goal-side-panel {
  position: sticky;
  top: 0;
}

.onboarding-overlay .goal-side-card {
  padding: 16px;
}

.onboarding-overlay .goal-side-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.onboarding-overlay .goal-side-stat {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 7%);
}

.onboarding-overlay .goal-side-stat__label {
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.onboarding-overlay .goal-health-chip-row,
.onboarding-overlay .goal-preset-swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.onboarding-overlay .state-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  line-height: 1;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
}

.onboarding-overlay .state-chip.ok {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.onboarding-overlay .state-chip.warn {
  background: rgba(245, 158, 11, 0.14);
  color: #92400e;
}

.onboarding-overlay .goal-preset-grid {
  display: grid;
  gap: 10px;
}

.onboarding-overlay .goal-template-strip {
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.onboarding-overlay .goal-template-card {
  min-width:0;
  flex:1 1 180px;
  display:grid;
  gap:6px;
  padding:14px;
  border-radius:14px;
  border:1px solid color-mix(in oklab, var(--color-border), transparent 18%);
  background:var(--color-main-background, #fff);
  text-align:left;
}

.onboarding-overlay .goal-template-card p {
  margin: 0;
}

.onboarding-overlay .goal-template-card.active {
  border-color:color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  background:linear-gradient(180deg, rgba(37, 99, 235, 0.1), transparent), var(--color-main-background, #fff);
  box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.onboarding-overlay .goal-template-card.is-cool {
  background:linear-gradient(180deg, rgba(37, 99, 235, 0.08), transparent), var(--color-main-background, #fff);
}

.onboarding-overlay .goal-template-card.is-warm {
  background:linear-gradient(180deg, rgba(234, 88, 12, 0.08), transparent), var(--color-main-background, #fff);
}

.onboarding-overlay .goal-template-card.is-forest {
  background:linear-gradient(180deg, rgba(22, 163, 74, 0.08), transparent), var(--color-main-background, #fff);
}

.onboarding-overlay .goal-preset-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 24%);
  text-align: left;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
}

.onboarding-overlay .goal-preset-swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.onboarding-overlay .goal-category-list {
  display: grid;
  gap: 12px;
  max-height: 460px;
  overflow: auto;
  padding-right: 4px;
}

.onboarding-overlay .goal-category-list--accordion {
  max-height:520px;
}

.onboarding-overlay .goal-panel-card {
  display:grid;
  gap:14px;
  padding:16px;
  border-radius:14px;
  border:1px solid color-mix(in oklab, var(--color-border), transparent 16%);
  background:color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
}

.onboarding-overlay .goal-panel-card__head,
.onboarding-overlay .goal-panel-pills,
.onboarding-overlay .goal-category-row-bottom,
.onboarding-overlay .goal-category-options {
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

.onboarding-overlay .goal-panel-card__head {
  justify-content:space-between;
}

.onboarding-overlay .goal-panel-card__title {
  display: grid;
  gap: 4px;
}

.onboarding-overlay .goal-panel-card__title h4,
.onboarding-overlay .goal-panel-card__title .hint {
  margin: 0;
}

.onboarding-overlay .goal-mismatch-box {
  display:grid;
  gap:6px;
  padding:14px;
  border-radius:12px;
  border:1px solid color-mix(in srgb, #b45309 40%, transparent);
  background:rgba(245, 158, 11, 0.12);
}

.onboarding-overlay .goal-mismatch-box--ok {
  border-color:color-mix(in srgb, #15803d 40%, transparent);
  background:rgba(34, 197, 94, 0.12);
}

.onboarding-overlay .pill {
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  background:color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
  color:var(--color-text-light);
  font-size:0.8rem;
  white-space:nowrap;
}

.onboarding-overlay .pill--warn {
  border-color:color-mix(in srgb, #b45309 40%, transparent);
  color:#92400e;
}

.onboarding-overlay .goal-category-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 16%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
}

.onboarding-overlay .goal-category-card--accordion {
  gap:10px;
}

.onboarding-overlay .goal-category-editor {
  display: grid;
  gap: 12px;
}

.onboarding-overlay .goal-category-editor__primary,
.onboarding-overlay .goal-category-editor__secondary {
  display: grid;
  gap: 10px;
}

.onboarding-overlay .goal-category-editor__primary {
  grid-template-columns: minmax(180px, 0.95fr) minmax(124px, auto) minmax(120px, auto);
  align-items: end;
}

.onboarding-overlay .goal-category-editor__secondary {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.onboarding-overlay .goal-field-stack {
  display: grid;
  gap: 6px;
}

.onboarding-overlay .goal-field-stack .label {
  margin: 0;
}

.onboarding-overlay .goal-category-summary {
  display:grid;
  grid-template-columns:minmax(0, 1fr) auto auto;
  align-items:center;
  gap:10px;
  width:100%;
  padding:0;
  border:0;
  background:transparent;
  color:inherit;
  text-align:left;
}

.onboarding-overlay .goal-category-top {
  display:grid;
  grid-template-columns:minmax(0, 1fr);
  gap:10px;
  align-items:stretch;
}

.onboarding-overlay .goal-category-top.is-open {
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
}

.onboarding-overlay .goal-category-titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.onboarding-overlay .goal-category-collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  min-width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 12%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 5%);
  color: var(--color-text-light);
  font-size: 1rem;
  line-height: 1;
}

.onboarding-overlay .goal-category-card__header,
.onboarding-overlay .goal-category-card__toolbar,
.onboarding-overlay .goal-footer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.onboarding-overlay .goal-category-name {
  width: 100%;
  min-width: 0;
  max-width: 260px;
}

.onboarding-overlay .goal-category-title-input {
  flex: 0 1 220px;
  width: 220px;
  min-width: 140px;
  max-width: 240px;
  font-size: 1.04rem;
  font-weight: 700;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: var(--color-text);
}

.onboarding-overlay .goal-category-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.onboarding-overlay .drag-handle,
.onboarding-overlay .ghost-btn {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 12%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
  color: var(--color-text);
  border-radius: 10px;
  padding: 8px 10px;
}

.onboarding-overlay .goal-remove-btn {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}

.onboarding-overlay .goal-suggestion-stack {
  display: grid;
  gap: 6px;
  min-width: 120px;
  justify-self: end;
}

.onboarding-overlay .goal-suggestion-stack--inline {
  min-width: 132px;
  justify-self: auto;
}

.onboarding-overlay .goal-action-block {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 6px;
  min-height: 78px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 14%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
  text-align: center;
}

.onboarding-overlay .goal-action-block .label {
  margin: 0;
  line-height: 1;
}

.onboarding-overlay .goal-action-block .input-unit {
  justify-content: center;
}

.onboarding-overlay .goal-action-block .input-unit--small {
  grid-template-columns: minmax(0, 38px) auto;
}

.onboarding-overlay .goal-action-block .input-unit--small .unit {
  padding: 6px 8px;
}

.onboarding-overlay .goal-suggestion-stack .label {
  margin: 0;
}

.onboarding-overlay .goal-category-options--inline {
  gap: 8px;
  flex-wrap: nowrap;
}

.onboarding-overlay .goal-checkbox {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin: 0;
  white-space: nowrap;
  font-size: 0.8rem;
}

.onboarding-overlay .goal-checkbox__control {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.onboarding-overlay .goal-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
}

.onboarding-overlay .goal-pace-field {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin: 0;
  white-space: nowrap;
}

.onboarding-overlay .goal-pace-field .label {
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.onboarding-overlay .goal-pace-field select {
  min-width: 118px;
  padding: 6px 8px;
}

.onboarding-overlay .goal-category-tone-controls {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
}

.onboarding-overlay .goal-color-stack {
  min-width: 72px;
}

.onboarding-overlay .goal-color-stack--inline {
  min-width: 62px;
}

.onboarding-overlay .goal-color-stack--inline .goal-color-input {
  margin: 0 auto;
}

.onboarding-overlay .drag-handle {
  cursor: grab;
}

.onboarding-overlay .goal-reorder-tools {
  display:inline-flex;
  align-items:center;
  gap:6px;
}

.onboarding-overlay .goal-reorder-tools--surface {
  padding: 4px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
}

.onboarding-overlay .goal-reorder-tools--calendar {
  align-self:stretch;
}

.onboarding-overlay .drag-pill,
.onboarding-overlay .chevron-pill,
.onboarding-overlay .suggest-pill,
.onboarding-overlay .value-pill {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:6px 10px;
  border-radius:999px;
  white-space:nowrap;
  font-size:0.8rem;
}

.onboarding-overlay .drag-pill,
.onboarding-overlay .chevron-pill {
  border:1px solid color-mix(in oklab, var(--color-border), transparent 12%);
  background:color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
  color:var(--color-text);
}

.onboarding-overlay .drag-pill {
  justify-content:flex-start;
  font-weight:600;
}

.onboarding-overlay .drag-pill__glyph {
  font-size:0.95rem;
  line-height:1;
  letter-spacing:-0.08em;
}

.onboarding-overlay .drag-pill__label {
  font-size:0.76rem;
  color:var(--color-text-light);
}

.onboarding-overlay .drag-pill--calendar {
  min-width:128px;
}

.onboarding-overlay .reorder-icon-btn {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:28px;
  min-width:28px;
  height:28px;
  padding:0;
  border-radius:999px;
  border:1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  background:color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
  color:var(--color-text-light);
  font-size:0.9rem;
  font-weight:700;
  line-height:1;
}

.onboarding-overlay .reorder-icon-btn:hover {
  color:var(--color-text);
  border-color:color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
  box-shadow:0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.onboarding-overlay .value-pill {
  border:1px solid color-mix(in srgb, var(--color-primary) 36%, var(--color-border));
  background:color-mix(in srgb, rgba(37, 99, 235, 0.1) 78%, var(--color-main-background, #fff));
  color:var(--color-text);
}

.onboarding-overlay .suggest-pill {
  border:1px solid color-mix(in srgb, var(--color-success, #15803d) 24%, var(--color-border));
  background:rgba(34, 197, 94, 0.08);
  color:var(--color-text-light);
}

.onboarding-overlay .suggest-pill--action,
.onboarding-overlay .goal-suggestion-pill--action,
.onboarding-overlay .goal-suggestion-link {
  cursor:pointer;
  transition:border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease;
}

.onboarding-overlay .suggest-pill--action:hover,
.onboarding-overlay .goal-suggestion-pill--action:hover,
.onboarding-overlay .goal-suggestion-link:hover {
  border-color:color-mix(in srgb, var(--color-primary) 42%, var(--color-border));
  color:var(--color-primary);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.onboarding-overlay .goal-suggestion-link {
  appearance:none;
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:0;
  border:0;
  background:transparent;
  color:var(--color-primary);
  text-decoration:none;
}

.onboarding-overlay .suggest-pill--warn {
  border-color:color-mix(in srgb, #b45309 36%, var(--color-border));
  background:rgba(245, 158, 11, 0.12);
  color:#92400e;
}

.onboarding-overlay .goal-nice-select {
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}

.onboarding-overlay .goal-category-row-bottom {
  align-items: stretch;
  justify-content: space-between;
  padding: 12px 0 0;
  border-top: 1px solid color-mix(in oklab, var(--color-border), transparent 26%);
}

.onboarding-overlay .goal-category-assigned-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 42px;
}

.onboarding-overlay .goal-calendar-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 16%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
  color: var(--color-text);
}

.onboarding-overlay .goal-calendar-badge__name {
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onboarding-overlay .goal-calendar-badge__hours {
  padding-left: 8px;
  border-left: 1px solid color-mix(in oklab, var(--color-border), transparent 18%);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-text-light);
  white-space: nowrap;
}

.onboarding-overlay .goal-category-row-bottom__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.onboarding-overlay .goal-section-copy {
  display: grid;
  gap: 4px;
}

.onboarding-overlay .goal-calendar-color {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
  border: 1px solid color-mix(in oklab, #000, transparent 78%);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-main-background, #fff), transparent 12%);
}

.onboarding-overlay .row-inline-note {
  color:var(--color-text-light);
  font-size:0.8rem;
}

.onboarding-overlay .goal-section-label {
  font-size:0.8rem;
  font-weight:700;
  color:var(--color-text-light);
  text-transform:uppercase;
  letter-spacing:0.04em;
}

.onboarding-overlay .goal-add-select,
.onboarding-overlay .goal-category-name,
.onboarding-overlay .goal-color-input {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--color-main-background, #fff);
}

.onboarding-overlay .goal-add-select--inline {
  flex: 1 1 auto;
  min-width: 0;
  max-width: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  box-shadow: none;
  appearance: none;
  cursor: pointer;
}

.onboarding-overlay .goal-add-calendar-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--color-border));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-main-background, #fff)), color-mix(in srgb, var(--color-primary) 3%, var(--color-main-background, #fff)));
  color: var(--color-text);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.onboarding-overlay .goal-category-action-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 12px 10px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 12%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
}

.onboarding-overlay .goal-card-corner-grip {
  position: absolute;
  top: -1px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 18px;
  padding: 0 8px;
  border-radius: 0 0 10px 10px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  border-top: 0;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 1%);
  color: var(--color-text-light);
  font-size: 0.82rem;
  line-height: 1;
  letter-spacing: -0.08em;
  cursor: grab;
}

.onboarding-overlay .goal-inline-target {
  min-width: 72px;
}

.onboarding-overlay .goal-category-action-icons {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
}

.onboarding-overlay .goal-reorder-tools--compact {
  gap: 6px;
}

.onboarding-overlay .goal-add-calendar-control__native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.onboarding-overlay .goal-add-calendar-control__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-primary);
}

.onboarding-overlay .goal-add-calendar-control__sheet {
  position: relative;
  width: 18px;
  height: 16px;
  border-radius: 5px;
  border: 1.5px solid currentColor;
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-main-background, #fff));
}

.onboarding-overlay .goal-add-calendar-control__sheet::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 2px;
  right: 2px;
  height: 1.5px;
  background: currentColor;
  opacity: 0.85;
}

.onboarding-overlay .goal-add-calendar-control__plus {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 11px;
  height: 11px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-main-background, #fff));
  border: 1px solid color-mix(in srgb, var(--color-primary) 32%, transparent);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.onboarding-overlay .goal-add-calendar-control--empty {
  opacity: 0.55;
}

.onboarding-overlay .goal-color-input {
  width: 48px;
  padding: 4px;
}

.onboarding-overlay .goal-calendar-sublist {
  display: grid;
  gap: 8px;
  padding-left: 16px;
}

.onboarding-overlay .goal-calendar-subrow {
  position: relative;
  margin-left: 12px;
  border-style: dashed;
  display:grid;
  grid-template-columns:minmax(0, 1fr) auto auto auto;
  align-items:center;
  gap:10px;
  padding:14px 12px 10px;
  border-radius:12px;
  border:1px dashed color-mix(in oklab, var(--color-border), transparent 12%);
  background:color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
}

.onboarding-overlay .goal-calendar-corner-grip {
  position: absolute;
  top: -1px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 18px;
  padding: 0 7px;
  border-radius: 0 0 10px 10px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  border-top: 0;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 1%);
  color: var(--color-text-light);
  font-size: 0.82rem;
  line-height: 1;
  letter-spacing: -0.08em;
  cursor: grab;
}

.onboarding-overlay .goal-row-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #ef4444 24%, var(--color-border));
  background: color-mix(in srgb, #ef4444 8%, var(--color-main-background, #fff));
  color: color-mix(in srgb, #b91c1c 82%, var(--color-text));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
}

.onboarding-overlay .goal-row-icon-btn:hover {
  border-color: color-mix(in srgb, #ef4444 40%, var(--color-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, #ef4444 10%, transparent);
}

.onboarding-overlay .goal-calendar-subrow__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 4px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 10%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 3%);
}

.onboarding-overlay .goal-calendar-subrow__status {
  display: grid;
  gap: 4px;
  justify-items: start;
  min-width: 154px;
}

.onboarding-overlay .goal-calendar-subrow__status .label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text-light);
}

.onboarding-overlay .goal-calendar-subrow .input-unit--small {
  grid-template-columns: 38px auto;
  width: max-content;
  justify-self: start;
}

.onboarding-overlay .goal-calendar-subrow .row-name,
.onboarding-overlay .goal-nice-select .select-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.onboarding-overlay .input-unit--small input {
  width: 38px;
  min-width: 38px;
  padding: 6px 4px;
  text-align: center;
}

.onboarding-overlay .goal-suggestion-pill {
  font-size: 0.76rem;
  border-radius: 999px;
  padding: 3px 8px;
  border: 1px solid transparent;
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

.onboarding-overlay .goal-suggestion-pill--muted {
  border-color: color-mix(in srgb, var(--color-border) 92%, transparent);
  background: color-mix(in srgb, var(--color-border) 12%, transparent);
  color: var(--color-text-light);
}

.onboarding-panel.theme-dark .goal-calendar-badge {
  border-color: #35506e;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(19, 31, 52, 0.96));
  box-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.16);
}

.onboarding-panel.theme-dark .goal-calendar-badge__hours,
.onboarding-panel.theme-dark .goal-calendar-subrow__status .label {
  color: #93a7c4;
}

.onboarding-panel.theme-dark .goal-calendar-corner-grip {
  border-color: #35506e;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(19, 31, 52, 0.96));
}

.onboarding-overlay .review-row-list {
  display: grid;
  gap: 12px;
}

.onboarding-overlay .review-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 18%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 4%);
}

.onboarding-overlay .review-row strong {
  display: block;
  margin-bottom: 4px;
}

.onboarding-overlay .review-row p {
  margin: 0;
  color: var(--color-text-light);
}

@media (max-width: 1180px) {
  .onboarding-step-nav {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .onboarding-overlay .goal-advanced,
  .onboarding-overlay .goal-single,
  .onboarding-overlay .preferences-grid--core-optional {
    grid-template-columns: 1fr;
  }

  .onboarding-overlay .intro-route-grid--three,
  .onboarding-overlay .intro-route-grid--two {
    grid-template-columns:1fr;
  }

  .onboarding-overlay .config-warning {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .onboarding-overlay .goal-side-panel {
    position: static;
  }

  .onboarding-overlay .field-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .onboarding-overlay .field-actions {
    justify-content: flex-start;
  }

  .onboarding-overlay .goal-category-editor__primary,
  .onboarding-overlay .goal-category-editor__secondary {
    grid-template-columns: 1fr;
  }

  .onboarding-overlay .goal-category-row-bottom__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .onboarding-overlay .goal-calendar-subrow__status {
    min-width: 132px;
  }
}

@media (max-width: 760px) {
  .onboarding-step-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .onboarding-overlay .goal-calendar-row,
  .onboarding-overlay .goal-calendar-subrow,
  .onboarding-overlay .review-row,
  .onboarding-overlay .goal-category-summary,
  .onboarding-overlay .intro-stage {
    flex-direction: column;
    align-items: stretch;
  }

  .onboarding-overlay .intro-visual {
    padding:18px;
  }

  .onboarding-overlay .intro-visual__card {
    position:static;
    width:100%;
  }

  .onboarding-overlay .intro-visual__copy {
    font-size:2.1rem;
  }

  .onboarding-overlay .intro-visual__copy .accent {
    font-size:2.7rem;
  }

  .onboarding-overlay .goal-calendar-subrow {
    grid-template-columns: 1fr;
  }

  .onboarding-overlay .goal-category-assigned-badges {
    padding-left: 0;
  }

  .onboarding-overlay .goal-calendar-subrow__actions {
    margin-left: 0;
    justify-self: start;
  }
}

:global(body.opsdash-onboarding-lock) {
  overflow: hidden;
}
</style>
