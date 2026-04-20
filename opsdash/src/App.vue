<template>
  <div id="opsdash" class="opsdash" :class="[{ 'is-nav-collapsed': !navOpen }, opsdashThemeClass]">
    <OnboardingWizard
      :key="onboardingRunId"
      :visible="onboardingWizardVisible"
      :calendars="wizardCalendars"
      :initial-selection="wizardInitialSelection"
      :initial-strategy="wizardInitialStrategy"
      :onboarding-version="ONBOARDING_VERSION"
      :closable="!autoWizardNeeded"
      :initial-theme-preference="themePreference"
      :system-theme="systemTheme"
      :initial-all-day-hours="wizardInitialAllDayHours"
      :initial-total-hours="wizardInitialTotalHours"
      :initial-targets-config="wizardInitialTargetsConfig"
      :initial-targets-week="targetsWeek"
      :initial-deck-settings="wizardInitialDeckSettings"
      :initial-reporting-config="wizardInitialReportingConfig"
      :initial-dashboard-mode="wizardInitialDashboardMode"
      :initial-categories="wizardInitialCategories"
      :initial-assignments="wizardInitialAssignments"
      :start-step="wizardStartStep"
      :has-existing-config="hasExistingConfig"
      :saving="isOnboardingSaving"
      :snapshot-saving="isWizardSnapshotSaving"
      :snapshot-notice="wizardSnapshotNotice"
      :persist-step="handleWizardSaveStep"
      @close="handleWizardClose"
      @skip="handleWizardSkip"
      @complete="handleWizardComplete"
      @save-current-config="handleWizardSaveSnapshot"
    />
    <ProfilesOverlay
      :visible="profilesOverlayOpen"
      :theme="effectiveTheme"
      :presets="presets"
      :is-loading="presetsLoading"
      :is-saving="presetSaving"
      :is-applying="presetApplying"
      :warnings="presetWarnings"
      @close="profilesOverlayOpen = false"
      @save="savePreset"
      @load="loadPreset"
      @delete="deletePreset"
      @refresh="refreshPresets"
      @clear-warnings="clearPresetWarnings"
      @export-config="exportSidebarConfig"
      @import-config="importSidebarConfig"
    />
    <VersionNotesOverlay
      v-if="activeReleaseNotesEntry"
      :visible="releaseNotesOverlayOpen"
      :theme="effectiveTheme"
      :entry="activeReleaseNotesEntry"
      :history="releaseNotesHistory"
      :selected-version="selectedReleaseNotesVersion"
      :is-saving="isReleaseNotesSaving"
      @close="closeReleaseNotesOverlay"
      @select-version="openReleaseNotesVersion"
    />
    <NcAppContent app-name="Operational Dashboard" :show-navigation="navOpen">
      <template #navigation>
        <Sidebar
          id="opsdash-sidebar"
          :is-loading="isInitialLoading"
          :range="range"
          :offset="offset"
          :from="from"
          :to="to"
          :nav-toggle-label="navToggleLabel"
          :nav-toggle-icon="navToggleIcon"
          :dashboard-mode="dashboardMode"
          :guided-hints="guidedHints"
          :release-notes-available="releaseNotesAvailable"
          :release-notes-open="releaseNotesOverlayOpen"
          @load="performLoad"
          @update:range="(v)=>{ range=v as any; offset=0; performLoad() }"
          @update:offset="(v)=>{ offset=v as number; performLoad() }"
          @toggle-nav="toggleNav"
          @rerun-onboarding="openWizardFromSidebar"
          @open-profiles="profilesOverlayOpen = true"
          @open-release-notes="openCurrentReleaseNotes"
          @open-shortcuts="(el) => openShortcuts(el)"
        />
      </template>

      <template #sidebar-toggle>
        <NcAppSidebarToggle :open="navOpen" @toggle="toggleNav" />
      </template>

      <div class="app-shell">
        <div class="app-main">
          <div class="app-container">
            <div
              v-if="showCollapsedRangeControls"
              class="range-toolbar"
              role="toolbar"
              aria-label="Collapsed range controls"
            >
              <button
                class="range-toolbar__btn range-toolbar__btn--icon sidebar-action-btn--icon"
                type="button"
                @click="toggleNav"
                :aria-expanded="navOpen"
                aria-controls="opsdash-sidebar"
                :aria-label="navToggleLabel"
              >
                {{ navToggleIcon }}
              </button>
              <button
                class="range-toolbar__btn range-toolbar__btn--pill"
                type="button"
                :disabled="isInitialLoading"
                @click="toggleRangeCollapsed"
                :aria-pressed="range === 'month'"
              >
                {{ rangeToggleLabel }}
              </button>
              <div class="range-toolbar__group" role="group" aria-label="Navigate periods">
                <button
                  class="range-toolbar__btn sidebar-action-btn--icon"
                  type="button"
                  :disabled="isInitialLoading"
                  @click="goPrevious"
                >
                  ◀
                </button>
                <span class="range-toolbar__label range-toolbar__label--pill" :title="rangeDateLabel">
                  {{ rangeDateLabel }}
                </span>
                <button
                  class="range-toolbar__btn sidebar-action-btn--icon"
                  type="button"
                  :disabled="isInitialLoading"
                  @click="goNext"
                >
                  ▶
                </button>
              </div>
              <button
                class="range-toolbar__btn range-toolbar__btn--refresh sidebar-action-btn"
                type="button"
                :disabled="isInitialLoading"
                @click="loadCurrent"
              >
                Refresh
              </button>
            </div>

            <div class="banner warn" v-if="isTruncated" :title="truncTooltip">
              Showing partial data to keep things fast.
              <template v-if="truncLimits && truncLimits.totalProcessed != null">
                Processed {{ truncLimits.totalProcessed }} items.
              </template>
            </div>

            <div class="cards-toolbar" :class="{ 'cards-toolbar--editing': isLayoutEditing }">
              <div class="cards-toolbar__tabs" role="tablist" aria-label="Dashboard tabs">
                <div
                  v-for="tab in layoutTabs"
                  :key="tab.id"
                  class="tab-item"
                  :class="{ active: tab.id === activeTabId }"
                >
                  <button
                    type="button"
                    class="tab-btn"
                    :class="{
                      active: tab.id === activeTabId,
                      default: tab.id === defaultTabId,
                      'tab-btn--with-menu': isLayoutEditing,
                    }"
                    role="tab"
                    :aria-selected="tab.id === activeTabId"
                    @click="handleTabClick(tab.id)"
                    @contextmenu.prevent="openTabContextMenu($event, tab.id)"
                  >
                    <template v-if="isLayoutEditing && tabEditingId === tab.id">
                      <input
                        class="tab-input"
                        v-model="tabLabelDraft"
                        @blur="commitTabLabel"
                        @keydown.enter.prevent="commitTabLabel"
                        @keydown.esc.prevent="cancelTabLabel"
                        @click.stop
                      />
                    </template>
                    <template v-else>
                      <span class="tab-label">{{ tab.label }}</span>
                      <span v-if="tab.id === defaultTabId" class="tab-default">Default</span>
                    </template>
                  </button>
                  <button
                    v-if="isLayoutEditing"
                    type="button"
                    class="tab-menu-btn"
                    :class="{ active: tab.id === activeTabId }"
                    :aria-label="`Tab actions for ${tab.label}`"
                    @click.stop="openTabContextMenuFromButton($event, tab.id)"
                  >
                    ⋯
                  </button>
                </div>
                <button
                  v-if="isLayoutEditing"
                  type="button"
                  class="tab-btn tab-btn--add"
                  @click="addTab()"
                >
                  + Tab
                </button>
              </div>
              <div class="cards-toolbar__center" :class="{ 'cards-toolbar__center--editing': isLayoutEditing }">
                <div class="cards-toolbar__mode">
                  <button
                    type="button"
                    class="ghost-btn ghost-btn--edit"
                    @click="toggleLayoutEditing"
                  >
                    <span class="ghost-btn__icon" aria-hidden="true">✎</span>
                    {{ isLayoutEditing ? 'Done editing' : 'Edit layout' }}
                  </button>
                </div>
                <div class="cards-toolbar__tools">
                  <span class="range-badge" aria-label="Active range">
                    <span class="range-badge__mode" v-text="rangeBadgePrimary" />
                    <span class="range-badge__span" v-text="rangeBadgeSecondary" />
                  </span>
                  <span v-if="isRefreshing" class="refresh-indicator" role="status" aria-live="polite">
                    Updating...
                  </span>
                  <div v-if="isLayoutEditing" class="cards-toolbar__actions">
                    <select v-model="newWidgetType" @change="handleAddWidget">
                      <option value="" disabled>Add widget…</option>
                      <option v-for="entry in availableWidgetTypesForStrategy" :key="entry.type" :value="entry.type">
                        {{ entry.label }}
                      </option>
                    </select>
                    <button type="button" class="ghost-btn ghost-btn--tight" @click="resetWidgets">
                      Reset preset
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="tabContext.open"
              class="tab-context-menu"
              :style="{ top: `${tabContext.y}px`, left: `${tabContext.x}px` }"
              role="menu"
            >
              <button type="button" role="menuitem" @click="setDefaultTabFromMenu">Set as default</button>
              <button type="button" role="menuitem" @click="renameTabFromMenu">Rename</button>
              <button
                type="button"
                role="menuitem"
                :disabled="layoutTabs.length <= 1"
                @click="removeTabFromMenu"
              >
                Remove
              </button>
            </div>

            <div class="cards">
              <DashboardLayout
                ref="layoutRef"
                :widgets="widgets"
                :context="widgetContext"
                :editable="isLayoutEditing"
                :widget-types="availableWidgetTypesForStrategy"
                :preset-label="dashboardModeLabel"
                :tabs="layoutTabs.map((tab) => ({ id: tab.id, label: tab.label }))"
                :current-tab-id="activeTabId"
                @edit:width="cycleWidth"
                @edit:height="cycleHeight"
                @edit:remove="removeWidget"
                @edit:move="moveWidget"
                @edit:move-tab="handleMoveWidgetToTab"
                @edit:duplicate-tab="handleDuplicateWidgetToTab"
                @edit:options="updateWidgetOptions"
                @edit:add="addWidgetAt"
                @edit:reorder="reorderWidget"
                @open:onboarding="openOnboardingFromLayout"
                @reset:preset="applyDashboardPreset(dashboardMode.value)"
                @select:cell="setAddHint"
              />
            </div>

            <div class="hint footer">
              <template v-if="appVersion">
                Operational Dashboard • v{{ appVersion }} • Built by Blade34242 @ Gellert Innovation
              </template>
              <template v-else>
                Operational Dashboard • v{{ pkg?.version || '0.6.0' }} • Built by Blade34242 @ Gellert Innovation
              </template>
            </div>
          </div>
        </div>
      </div>
    </NcAppContent>
    <KeyboardShortcutsModal
      :visible="shortcutsOpen"
      :groups="shortcutGroups"
      :theme="effectiveTheme"
      @close="closeShortcuts"
    />
  </div>
</template>

<script setup lang="ts">
import { NcAppContent, NcLoadingIcon } from '@nextcloud/vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import OnboardingWizard from './components/onboarding/OnboardingWizard.vue'
import ProfilesOverlay from './components/overlays/ProfilesOverlay.vue'
import KeyboardShortcutsModal from './components/modals/KeyboardShortcutsModal.vue'
import DashboardLayout from './components/layout/DashboardLayout.vue'
import { buildTargetsSummary, normalizeTargetsConfig, createEmptyTargetsSummary, createDefaultActivityCardConfig, createDefaultBalanceConfig, cloneTargetsConfig, convertWeekToMonth, type ActivityCardConfig, type BalanceConfig, type TargetsConfig } from './services/targets'
import { normalizeReportingConfig, normalizeDeckSettings, type DeckFilterMode } from './services/reporting'
import { ONBOARDING_VERSION, getStrategyDefinitions } from './services/onboarding'
import {
  createDashboardPreset,
  createDefaultWidgetTabs,
  filterWidgetDefinitionsForStrategy,
  filterWidgetTabsForStrategy,
  getRestrictedWidgetTypesForStrategy,
  normalizeWidgetTabs,
  widgetsRegistry,
} from './services/widgetsRegistry'
import { formatDateKey, getWeekNumber, parseDateKey } from './services/dateTime'
// Lightweight notifications without @nextcloud/dialogs
function notifySuccess(msg: string){
  const w:any = window as any
  if (w.OC?.Notification?.showTemporary) { w.OC.Notification.showTemporary(msg) }
  else { console.log('SUCCESS:', msg) }
}
function notifyError(msg: string){
  const w:any = window as any
  if (w.OC?.Notification?.showTemporary) { w.OC.Notification.showTemporary(msg) }
  else { console.error('ERROR:', msg); alert(msg) }
}

import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useNotes } from '../composables/useNotes'
import { useDashboard, type OnboardingState } from '../composables/useDashboard'
import { useDashboardPersistence } from '../composables/useDashboardPersistence'
import { useDashboardSelection } from '../composables/useDashboardSelection'
import { useDashboardPresets } from '../composables/useDashboardPresets'
import { useChartScheduler } from '../composables/useChartScheduler'
import { useOcHttp } from '../composables/useOcHttp'
import { useAppMeta } from '../composables/useAppMeta'
import { useCalendarLinks } from '../composables/useCalendarLinks'
import { useCharts } from '../composables/useCharts'
import { useCategories } from '../composables/useCategories'
import { useSummaries } from '../composables/useSummaries'
import { useBalance } from '../composables/useBalance'
import { useThemeController } from '../composables/useThemeController'
import { useOnboardingFlow } from '../composables/useOnboardingFlow'
import { useVersionOverlay } from '../composables/useVersionOverlay'
import { useRangeToolbar } from '../composables/useRangeToolbar'
import { useConfigExportImport } from '../composables/useConfigExportImport'
import { useDetailsToggle } from '../composables/useDetailsToggle'
import { useNotesLabels } from '../composables/useNotesLabels'
import { useSidebarState } from '../composables/useSidebarState'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useOnboardingActions, type WizardStepSavePayload } from '../composables/useOnboardingActions'
import { useDeckCards } from '../composables/useDeckCards'
import { useDeckFiltering, sanitizeDeckFilter } from '../composables/useDeckFiltering'
import { useWidgetLayoutManager } from '../composables/useWidgetLayoutManager'
import { useDashboardBoot } from '../composables/useDashboardBoot'
import { useWidgetRenderContext } from '../composables/useWidgetRenderContext'
import { useLayoutTabsContext } from '../composables/useLayoutTabsContext'
import './styles/widgetTextScale.css'
import VersionNotesOverlay from './components/overlays/VersionNotesOverlay.vue'
// Ensure a visible version even if backend attrs are empty: use package.json as fallback
// @ts-ignore
import pkg from '../package.json'

type BalanceCategorySummary = {
  id: string
  label: string
  hours: number
  share: number
  prevShare: number
  delta: number
  color?: string
}

type BalanceOverviewSummary = {
  index: number
  categories: BalanceCategorySummary[]
  relations: { label: string; value: string }[]
  trend: { delta: Array<{ id: string; label: string; delta: number }>; badge: string }
  daily: Array<{ date: string; weekday: string; total_hours: number; categories: Array<{ id: string; label: string; hours: number; share: number }> }>
  warnings: string[]
} | null

const { navOpen, toggleNav, navToggleLabel, navToggleIcon } = useSidebarState()
const profilesOverlayOpen = ref(false)
function ensureSidebarVisible() {
  if (!navOpen.value) {
    toggleNav()
  }
}

watch(
  () => navOpen.value,
  (next) => {
    if (typeof document === 'undefined') return
    const offset = next ? 'var(--app-navigation-width, 300px)' : '0px'
    document.body.style.setProperty('--opsdash-nav-offset', offset)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.style.removeProperty('--opsdash-nav-offset')
})

const range = ref<'week'|'month'>('week')
const offset = ref<number>(0)

const truncTooltip = computed(()=>{
  const l:any = truncLimits.value
  if (!l) return 'Partial data due to caps'
  const parts = [] as string[]
  if (l.maxPerCal != null) parts.push(`cap per calendar: ${l.maxPerCal}`)
  if (l.maxTotal != null) parts.push(`cap total: ${l.maxTotal}`)
  if (l.totalProcessed != null) parts.push(`processed: ${l.totalProcessed}`)
  return parts.join(' · ')
})

const userChangedSelection = ref(false)

const { scheduleDraw } = useChartScheduler()

const { route, getJson, postJson, deleteJson, root } = useOcHttp()

const { calendarDayLink } = useCalendarLinks({ root })

const notes = useNotes({
  range,
  offset,
  route: (name) => route(name),
  getJson,
  postJson,
  notifySuccess,
  notifyError,
})
const { notesPrev, notesCurrDraft, notesHistory, isSavingNote, fetchNotes, saveNotes } = notes

// Widget layout storage must be declared before downstream composables consume it
const hasInitialLoad = ref(false)
const dashboardMode = ref<'quick' | 'standard' | 'pro'>('standard')
const widgetStrategy = ref<string | null>(null)
const widgetsQueueSaveRef = ref<null | ((silent?: boolean) => void)>(null)
const deckEnabledForWidgets = ref(true)

const {
  layoutTabs,
  defaultTabId,
  activeTabId,
  widgetsDirty,
  isLayoutEditing,
  newWidgetType,
  widgets,
  availableWidgetTypes,
  activeTab,
  setActiveTab,
  setDefaultTab,
  addTab,
  renameTab,
  removeTab,
  setTabsFromPayload,
  applyDashboardPreset,
  updateWidget,
  cycleWidth,
  cycleHeight,
  moveWidget,
  moveWidgetToTab,
  duplicateWidgetToTab,
  removeWidget,
  addWidgetAt,
  reorderWidget,
  updateWidgetOptions,
  resetWidgets,
} = useWidgetLayoutManager({
  storageKey: 'opsdash.widgets.v1',
  widgetsRegistry,
  createDefaultTabs: () => filterWidgetTabsForStrategy(createDefaultWidgetTabs(dashboardMode.value), widgetStrategy.value),
  normalizeWidgetTabs,
  createDashboardPreset: (mode) => filterWidgetDefinitionsForStrategy(createDashboardPreset(mode), widgetStrategy.value),
  dashboardMode,
  deckEnabled: deckEnabledForWidgets,
  hasInitialLoad,
  queueSaveRef: widgetsQueueSaveRef,
})

const widgetTabsState = computed(() => ({
  tabs: layoutTabs.value,
  defaultTabId: defaultTabId.value,
}))

const widgetTabsRef = computed({
  get: () => widgetTabsState.value,
  set: (value) => {
    if (!value) return
    setTabsFromPayload(value)
  },
})

const lookbackWidgetTypes = new Set(['chart_per_day', 'chart_dow', 'chart_hod', 'time_summary_lookback', 'time_summary_v2'])
const shouldIncludeLookback = () => {
  if (trendLookbackWeeks.value <= 1) return false
  for (const tab of layoutTabs.value || []) {
    const widgets = tab?.widgets || []
    for (const widget of widgets) {
      const type = String(widget?.type ?? '')
      if (!lookbackWidgetTypes.has(type)) continue
      if (type === 'time_summary_v2' && widget?.options?.showHistory === false) continue
      return true
    }
  }
  return false
}

const {
  tabLabelDraft,
  tabEditingId,
  tabContext,
  addOrderHint,
  handleTabClick,
  openTabContextMenu,
  openTabContextMenuFromButton,
  setDefaultTabFromMenu,
  removeTabFromMenu,
  renameTabFromMenu,
  commitTabLabel,
  cancelTabLabel,
  setAddHint,
  resetContext: resetTabEditContext,
} = useLayoutTabsContext({
  layoutTabs,
  activeTabId,
  activeTabLabel: computed(() => activeTab.value?.label || ''),
  isLayoutEditing,
  setActiveTab,
  setDefaultTab,
  removeTab,
  renameTab,
})

function handleAddWidget() {
  if (!newWidgetType.value) return
  const hint = Number.isFinite(addOrderHint.value ?? NaN) ? addOrderHint.value ?? undefined : undefined
  addWidgetAt(newWidgetType.value, hint)
  newWidgetType.value = ''
  addOrderHint.value = null
}

function handleMoveWidgetToTab(id: string, tabId: string) {
  const targetTab = layoutTabs.value.find((tab) => tab.id === tabId)
  if (!targetTab) return
  const moved = moveWidgetToTab(id, tabId)
  if (moved) {
    notifySuccess(`Moved widget to ${targetTab.label}`)
  }
}

function handleDuplicateWidgetToTab(id: string, tabId: string) {
  const targetTab = layoutTabs.value.find((tab) => tab.id === tabId)
  if (!targetTab) return
  const duplicated = duplicateWidgetToTab(id, tabId)
  if (duplicated) {
    notifySuccess(`Copied widget to ${targetTab.label}`)
  }
}

function toggleLayoutEditing() {
  isLayoutEditing.value = !isLayoutEditing.value
  if (!isLayoutEditing.value) {
    resetTabEditContext()
  }
}

const {
  calendars,
  colorsByName,
  colorsById,
  groupsById,
  selected,
  isInitialLoading,
  isRefreshing,
  isTruncated,
  truncLimits,
  uid,
  from,
  to,
  stats,
  byCal,
  byDay,
  longest,
  charts,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  onboarding,
  load,
  themePreference: dashboardThemePreference,
  reportingConfig,
  deckSettings,
} = useDashboard({
  range,
  offset,
  userChangedSelection,
  route: (name) => route(name),
  getJson,
  postJson,
  notifyError,
  scheduleDraw,
  fetchNotes,
  isDebug: isDbg,
  includeLookback: () => shouldIncludeLookback(),
  widgetTabs: widgetTabsRef,
  onCoreLoaded: (payload) => {
    if (!hasInitialLoad.value) {
      hasInitialLoad.value = true
    }
    evaluateOnboarding(payload?.onboarding ?? null)
  },
})

function handleReportingConfigSave(value: any) {
  reportingConfig.value = normalizeReportingConfig(value, reportingConfig.value)
  queueSave(false)
}

function handleDeckSettingsSave(value: any) {
  deckSettings.value = normalizeDeckSettings(value, deckSettings.value)
  const nextFilter = sanitizeDeckFilter(deckSettings.value.defaultFilter)
  deckFilter.value = nextFilter
  queueSave(false)
}

watch(
  () => deckSettings.value.enabled,
  (enabled) => {
    deckEnabledForWidgets.value = enabled
  },
  { immediate: true },
)

const {
  deckCards,
  deckLoading,
  deckLastFetchedAt,
  deckError,
  refreshDeck,
} = useDeckCards({
  from,
  to,
  notifyError,
})

const {
  deckFilter,
  deckVisibleCards,
  deckFilteredCards,
  deckSummaryBuckets,
  deckTickerConfig,
  deckCanFilterMine,
  deckUrl,
  deckFilterOptions,
} = useDeckFiltering({
  deckSettings,
  deckCards,
  uid,
  root,
})
const setDeckFilter = (value: DeckFilterMode) => {
  deckFilter.value = sanitizeDeckFilter(value)
}

const onboardingState = onboarding
watch(
  () => onboardingState.value?.strategy ?? null,
  (strategy) => {
    widgetStrategy.value = strategy
  },
  { immediate: true },
)

const {
  themePreference,
  effectiveTheme,
  systemTheme,
  setThemePreference,
} = useThemeController({
  serverPreference: dashboardThemePreference,
  route: (name) => route(name),
  postJson,
  notifySuccess,
  notifyError,
})
const opsdashThemeClass = computed(() =>
  effectiveTheme.value === 'dark' ? 'opsdash-theme-dark' : 'opsdash-theme-light',
)

function openOnboardingFromLayout(step?: string) {
  openWizardFromSidebar((step as any) || 'goals')
}

const { exportSidebarConfig, importSidebarConfig } = useConfigExportImport({
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  themePreference,
  onboardingState,
  widgetTabs: widgetTabsRef,
  setThemePreference,
  postJson,
  route: (name) => route(name),
  performLoad: () => performLoad(),
  notifySuccess,
  notifyError,
})

const { queueSave, isSaving: reportingSaving } = useDashboardPersistence({
  route: (name) => route(name),
  postJson,
  notifyError,
  notifySuccess,
  onReload: () => performLoad(),
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  themePreference,
  reportingConfig,
  deckSettings,
  widgetTabs: widgetTabsRef,
  onboardingState,
})

widgetsQueueSaveRef.value = queueSave

const availableWidgetTypesForStrategy = computed(() => {
  const restricted = new Set(getRestrictedWidgetTypesForStrategy(onboardingState.value?.strategy))
  if (!restricted.size) return availableWidgetTypes.value
  return availableWidgetTypes.value.filter((entry) => !restricted.has(entry.type))
})

function enforceStrategyWidgetConstraints() {
  const next = filterWidgetTabsForStrategy(widgetTabsState.value as any, onboardingState.value?.strategy)
  const currentJson = JSON.stringify(widgetTabsState.value)
  const nextJson = JSON.stringify(next)
  if (currentJson === nextJson) return
  setTabsFromPayload(next)
  if (hasInitialLoad.value) {
    queueSave(false)
  }
}

watch(
  () => newWidgetType.value,
  (type) => {
    const restricted = new Set(getRestrictedWidgetTypesForStrategy(onboardingState.value?.strategy))
    if (restricted.has(type)) {
      newWidgetType.value = ''
    }
  },
)

watch(
  () => onboardingState.value?.strategy,
  () => {
    enforceStrategyWidgetConstraints()
  },
  { immediate: true },
)

watch(
  () => widgetTabsState.value,
  () => {
    enforceStrategyWidgetConstraints()
  },
  { deep: true },
)

const {
  isSelected,
  toggleCalendar,
  setGroup,
  setTarget,
  updateTargetsConfig,
  selectAll,
} = useDashboardSelection({
  calendars,
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  range,
  queueSave,
  userChangedSelection,
})

const {
  presets,
  presetsLoading,
  presetSaving,
  presetApplying,
  presetWarnings,
  refreshPresets,
  savePreset,
  loadPreset,
  deletePreset,
  clearPresetWarnings,
} = useDashboardPresets({
  route: (name, param) => route(name, param),
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
  widgetTabs: widgetTabsRef,
  onboardingState,
  setDashboardMode: (mode) => { dashboardMode.value = mode },
  applyDashboardPreset: (mode) => { applyDashboardPreset(mode) },
  userChangedSelection,
})

const onboardingActions = useOnboardingActions({
  onboardingState,
  route: (name) => route(name),
  postJson,
  notifySuccess,
  notifyError,
  setThemePreference,
  savePreset,
  reloadAfterPersist: () => performLoad(),
  setSelected: (val) => { selected.value = [...val] },
  setTargetsWeek: (val) => { targetsWeek.value = { ...val } },
  setTargetsMonth: (val) => { targetsMonth.value = { ...val } },
  setTargetsConfig: (val) => { targetsConfig.value = cloneTargetsConfig(val) },
  setGroupsById: (val) => { groupsById.value = { ...val } },
  setDeckSettings: (val) => { deckSettings.value = { ...val } },
  setReportingConfig: (val) => { reportingConfig.value = { ...val } },
  setOnboardingState: (val) => { onboarding.value = { ...(onboarding.value || {}), ...val } as any },
  setDashboardMode: (mode) => { dashboardMode.value = mode },
  setWidgetTabs: (val) => { setTabsFromPayload(val) },
})

const {
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
  wizardInitialAllDayHours,
  wizardInitialTotalHours,
  wizardInitialTargetsConfig,
  wizardInitialDeckSettings,
  wizardInitialReportingConfig,
  wizardInitialDashboardMode,
  wizardInitialCategories,
  wizardInitialAssignments,
  isOnboardingSaving,
  isSnapshotSaving: isWizardSnapshotSaving,
  snapshotNotice: wizardSnapshotNotice,
  evaluateOnboarding,
  handleWizardComplete: handleWizardCompleteFlow,
  handleWizardSkip,
  handleWizardClose,
  handleWizardSaveSnapshot,
} = useOnboardingFlow({
  onboardingState,
  calendars,
  selected,
  targetsWeek,
  groupsById,
  targetsConfig,
  deckSettings,
  reportingConfig,
  hasInitialLoad,
  actions: onboardingActions,
})

const handleWizardComplete = async (payload: any) => {
  await handleWizardCompleteFlow(payload)
  if (payload?.dashboardMode) {
    applyDashboardPreset(payload.dashboardMode)
  }
}

const handleWizardSaveStep = async (payload: WizardStepSavePayload) => {
  if (payload?.dashboardMode) {
    applyDashboardPreset(payload.dashboardMode)
  }
  await onboardingActions.saveStep(payload)
}

async function performLoad() {
  await load()
  if (!hasInitialLoad.value) {
    hasInitialLoad.value = true
  }
  evaluateOnboarding()
}

const {
  showCollapsedRangeControls,
  rangeToggleLabel,
  rangeDateLabel,
  loadCurrent,
  toggleRangeCollapsed,
  goPrevious,
  goNext,
} = useRangeToolbar({
  navOpen,
  range,
  offset,
  from,
  to,
  isLoading: isInitialLoading,
  performLoad: () => performLoad(),
})

const {
  shortcutsOpen,
  openShortcuts,
  closeShortcuts,
  shortcutGroups,
} = useKeyboardShortcuts({
  goPrevious,
  goNext,
  toggleRange: toggleRangeCollapsed,
  saveNotes: () => saveNotes(),
  openConfigPanel: () => ensureSidebarVisible(),
  toggleEditLayout: () => {
    isLayoutEditing.value = !isLayoutEditing.value
  },
  openWidgetOptions: () => {
    if (!isLayoutEditing.value) return
    layoutRef.value?.openOptionsForSelected?.()
  },
  ensureSidebarVisible,
})

const { iconSrc, onIconError, appVersion } = useAppMeta({
  pingUrl: () => route('ping'),
  getJson,
  pkgVersion: pkg?.version ? String(pkg.version) : '',
  root,
})

const releaseNotesOverlayBlocked = computed(() =>
  onboardingWizardVisible.value || profilesOverlayOpen.value || shortcutsOpen.value,
)

const {
  isOpen: releaseNotesOverlayOpen,
  isSaving: isReleaseNotesSaving,
  entries: releaseNotesHistory,
  currentEntry: currentReleaseNotesEntry,
  activeEntry: activeReleaseNotesEntry,
  selectedVersion: selectedReleaseNotesVersion,
  openCurrent: openCurrentReleaseNotes,
  openVersion: openReleaseNotesVersion,
  closeOverlay: closeReleaseNotesOverlay,
} = useVersionOverlay({
  appVersion,
  onboardingState,
  hasInitialLoad,
  isBlocked: releaseNotesOverlayBlocked,
  route: (name) => route(name),
  postJson,
  notifyError,
})

const releaseNotesAvailable = computed(() => Boolean(currentReleaseNotesEntry.value))

const activeDayMode = ref<'active'|'all'>('active')
const rangeLabel = computed(()=> range.value === 'month' ? 'Month' : 'Week')
const layoutRef = ref<InstanceType<typeof DashboardLayout> | null>(null)

const rangeBadgePrimary = computed(() => {
  const date = parseDateKey(from.value)
  if (!date) return range.value.toUpperCase()
  if (range.value === 'month') {
    return `MONTH ${date.getUTCMonth() + 1}`
  }
  return `WEEK ${getWeekNumber(date)}`
})

const rangeBadgeSecondary = computed(() => rangeDateLabel.value)

const targetsConfigForRange = computed(() => {
  const base = cloneTargetsConfig(targetsConfig.value)
  if (range.value === 'month') {
    base.totalHours = convertWeekToMonth(base.totalHours)
    base.categories = base.categories.map((cat) => ({
      ...cat,
      targetHours: convertWeekToMonth(cat.targetHours),
    }))
  }
  return base
})

const targetsSummary = computed(() => {
  const cfg = targetsConfigForRange.value
  try {
    return buildTargetsSummary({
      config: cfg,
      stats,
      byDay: byDay.value || [],
      byCal: byCal.value || [],
      groupsById: groupsById.value || {},
      range: range.value,
      from: from.value,
      to: to.value,
    })
  } catch (e) {
    console.error('[opsdash] targets summary failed', e)
    return createEmptyTargetsSummary(cfg)
  }
})

const currentTargets = computed<Record<string, number>>(() => {
  if (range.value === 'month') {
    const monthMap = targetsMonth.value || {}
    if (monthMap && Object.keys(monthMap).length > 0) {
      return monthMap
    }
    const weekMap = targetsWeek.value || {}
    const converted: Record<string, number> = {}
    Object.entries(weekMap).forEach(([id, value]) => {
      const num = Number(value)
      if (Number.isFinite(num)) {
        converted[id] = convertWeekToMonth(num)
      }
    })
    return converted
  }
  return targetsWeek.value || {}
})

const activityCardConfig = computed<ActivityCardConfig>(() => {
  return { ...createDefaultActivityCardConfig(), ...(targetsConfig.value?.activityCard ?? {}) }
})

const balanceConfigFull = computed<BalanceConfig>(() => {
  const base = createDefaultBalanceConfig()
  const cfg = targetsConfig.value?.balance ?? base
  return {
    ...base,
    ...cfg,
    thresholds: { ...base.thresholds, ...(cfg.thresholds ?? {}) },
    relations: { ...base.relations, ...(cfg.relations ?? {}) },
    trend: { ...base.trend, ...(cfg.trend ?? {}) },
    dayparts: { ...base.dayparts, ...(cfg.dayparts ?? {}) },
    ui: { ...base.ui, ...(cfg.ui ?? {}) },
  }
})

const balanceCardConfig = computed(() => ({
  showNotes: !!balanceConfigFull.value.ui.showNotes,
}))
const trendLookbackWeeks = computed(() =>
  Math.max(1, Math.min(6, balanceConfigFull.value.trend?.lookbackWeeks ?? 1)),
)

const balanceNote = computed(() => {
  if (!balanceConfigFull.value.ui.showNotes) {
    return ''
  }
  const current = (notesCurrDraft.value ?? '').trim()
  if (current) {
    return current
  }
  const previousNote = (notesPrev.value ?? '').trim()
  return previousNote
})

const { categoryLabelById, categoryColorMap, calendarCategoryMap, calendarGroups } = useCategories({
  calendars,
  selected,
  groupsById,
  colorsById,
  targetsConfig: targetsConfigForRange,
  targetsSummary,
  byCal,
  currentTargets,
  isDebug: isDbg,
})

const { balanceOverview } = useBalance({
  stats,
  categoryColorMap,
  balanceCardConfig,
})

const categoryMappingHint = computed(() => {
  if (!activityCardConfig.value.showHint) return ''
  const order: any[] = Array.isArray(targetsConfig.value?.balance?.categories)
    ? targetsConfig.value.balance.categories
    : []
  const labels = order
    .map((raw) => {
      const id = String(raw ?? '').trim()
      if (!id) return ''
      const label = categoryLabelById.value[id]
      return label ? label : id.toUpperCase()
    })
    .filter((label) => label)
  if (!labels.length) return ''
  return `Mapping via Sidebar – ${labels.join(' / ')}`
})

const { calendarChartData, categoryChartsById } = useCharts({
  charts,
  colorsById,
  colorsByName,
  calendarGroups,
  calendarCategoryMap,
  targetsConfig: targetsConfigForRange,
  currentTargets,
  activityCardConfig,
})

const calendarTodayHours = computed<Record<string, number>>(() => {
  const stacked = calendarChartData.value?.stacked
  if (!stacked || !Array.isArray(stacked.labels) || !Array.isArray(stacked.series)) return {}
  const todayKey = formatDateKey(new Date())
  const idx = stacked.labels.findIndex((label: any) => String(label ?? '') === todayKey)
  if (idx < 0) return {}
  const map: Record<string, number> = {}
  stacked.series.forEach((row: any) => {
    const id = String(row?.id ?? '')
    const raw = Number(row?.data?.[idx] ?? 0)
    const val = Number.isFinite(raw) ? Math.max(0, raw) : 0
    if (!id) return
    map[id] = (map[id] || 0) + val
  })
  return map
})

const categoryTodayHours = computed<Record<string, number>>(() => {
  const stacked = calendarChartData.value?.stacked
  const labels = stacked?.labels
  const series = stacked?.series
  if (!stacked || !Array.isArray(labels) || !Array.isArray(series)) return {}
  const todayKey = formatDateKey(new Date())
  const idx = labels.findIndex((label: any) => String(label ?? '') === todayKey)
  if (idx < 0) return {}
  const map: Record<string, number> = {}
  series.forEach((row: any) => {
    const calId = String(row?.id ?? '')
    const catId = calendarCategoryMap.value?.[calId]
    if (!catId) return
    const raw = Number(row?.data?.[idx] ?? 0)
    const val = Number.isFinite(raw) ? Math.max(0, raw) : 0
    map[catId] = (map[catId] || 0) + val
  })
  return map
})

const calendarGroupsWithToday = computed(() =>
  calendarGroups.value.map((group) => ({
    ...group,
    todayHours: categoryTodayHours.value[group.id] || 0,
  })),
)

const topCategory = computed(() => {
  const groups = calendarGroups.value || []
  if (!groups.length) return null
  const ranked = [...groups].sort((a, b) => (b.summary.actualHours || 0) - (a.summary.actualHours || 0))
  return ranked[0] || null
})

const { timeSummary, activitySummary, activityDayOffTrend } = useSummaries({
  stats,
  byDay,
  charts,
  calendars,
  selected,
  rangeLabel,
  rangeStart: from,
  rangeEnd: to,
  offset,
  activeDayMode,
  topCategory,
})

const { detailsIndex, toggle: toggleDetails } = useDetailsToggle()
function isDbg(){ return false }

const {
  notesLabelPrev,
  notesLabelCurr,
  notesLabelPrevTitle,
  notesLabelCurrTitle,
} = useNotesLabels(range)

const { widgetContext } = useWidgetRenderContext({
  timeSummary,
  activeDayMode,
  targetsSummary,
  targetsConfig,
  stats,
  byDay,
  byCal,
  groupsById,
  calendarGroupsWithToday,
  balanceOverview,
  balanceCardConfig,
  rangeLabel,
  range,
  offset,
  from,
  to,
  trendLookbackWeeks,
  balanceNote,
  activitySummary,
  activityCardConfig,
  activityDayOffTrend,
  deckSummaryBuckets,
  deckLoading,
  deckError,
  deckTickerConfig,
  deckFilter,
  setDeckFilter,
  deckSettings,
  deckUrl,
  deckCards,
  uid,
  notesPrev,
  notesCurrDraft,
  notesHistory,
  notesLabelPrev,
  notesLabelCurr,
  notesLabelPrevTitle,
  notesLabelCurrTitle,
  isSavingNote,
  saveNotes,
  isLoading: isInitialLoading,
  isInitialLoading,
  isRefreshing,
  hasInitialLoad,
  isLayoutEditing,
  updateWidgetOptions,
  charts,
  calendarChartData,
  categoryChartsById,
  calendarGroups,
  calendars,
  calendarCategoryMap,
  categoryColorMap,
  colorsById,
  colorsByName,
  currentTargets,
  targetsWeek,
  selected,
  calendarTodayHours,
  onboardingStrategy: computed(() => onboardingState.value?.strategy ?? null),
})

const dashboardModeLabel = computed(() => {
  if (dashboardMode.value === 'quick') return 'Empty preset'
  if (dashboardMode.value === 'pro') return 'Advanced preset'
  return 'Standard preset'
})

function n1(v:any){ return Number(v ?? 0).toFixed(1) }
function n2(v:any){ return Number(v ?? 0).toFixed(2) }
function arrow(v:number){ return v>0?'▲':(v<0?'▼':'—') }
function fmtHours(v:any){
  const num = Number(v ?? 0)
  if (!Number.isFinite(num)) return '0'
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}

const strategyTitle = computed(() => {
  const strategyId = onboardingState.value?.strategy
  if (!strategyId) return '—'
  const match = getStrategyDefinitions().find((def) => def.id === strategyId)
  return match?.title ?? String(strategyId)
})

const selectedCalendarLabels = computed(() => {
  const map = new Map(
    (calendars.value || []).map((cal: any) => [
      String(cal?.id ?? ''),
      String(cal?.displayname ?? cal?.name ?? cal?.calendar ?? cal?.id ?? 'Calendar'),
    ]),
  )
  const labels = (selected.value || [])
    .map((id) => map.get(String(id)))
    .filter((value): value is string => !!value)
  return labels.length ? labels : ['None selected']
})

function compactList(items: string[], maxItems: number, separator = ', '): string {
  const filtered = items.filter((item) => item && item !== 'None selected')
  const shown = filtered.slice(0, maxItems)
  const extra = filtered.length - shown.length
  if (!shown.length) return 'None selected'
  return extra > 0 ? `${shown.join(separator)} +${extra}` : shown.join(separator)
}

function compactJoin(items: string[], maxItems: number, separator = ' · '): string {
  const filtered = items.filter(Boolean)
  const shown = filtered.slice(0, maxItems)
  const extra = filtered.length - shown.length
  if (!shown.length) return ''
  return extra > 0 ? `${shown.join(separator)} +${extra}` : shown.join(separator)
}

function compactTargetLine(line: string): string {
  return line.replace(/\s+—\s+/g, ' ').replace(/\s+h$/, 'h')
}

const targetsPreviewLines = computed(() => {
  const categories = targetsConfig.value?.categories ?? []
  if (!categories.length) return ['No category targets']
  return categories.map((cat) => `${cat.label || cat.id} — ${fmtHours(cat.targetHours)} h`)
})

const totalWeeklyTargetLine = computed(() => `${n1(targetsConfig.value?.totalHours ?? 0)} h`)

const dashboardLayoutLine = computed(() => {
  if (dashboardMode.value === 'pro') return 'Advanced layout'
  if (dashboardMode.value === 'quick') return 'Empty layout'
  return 'Standard layout'
})

const themeShort = computed(() =>
  effectiveTheme.value === 'dark' ? 'Dark' : 'Light',
)

const deckSummary = computed(() => {
  if (!deckSettings.value?.enabled) {
    return { status: 'Deck tab disabled', boards: [] as string[] }
  }
  const hidden = new Set((deckSettings.value.hiddenBoards || []).map((id: any) => Number(id)))
  const boardMap = new Map<number, string>()
  ;(deckCards.value || []).forEach((card: any) => {
    const boardId = Number(card?.boardId)
    if (!Number.isFinite(boardId) || hidden.has(boardId)) return
    const title = String(card?.boardTitle ?? `Board ${boardId}`)
    if (!boardMap.has(boardId)) boardMap.set(boardId, title)
  })
  const boards = Array.from(boardMap.values())
  const status = `Showing ${boards.length} board${boards.length === 1 ? '' : 's'}`
  return { status, boards }
})

const deckLine = computed(() => {
  if (!deckSettings.value?.enabled) return 'Deck — off'
  if (deckSummary.value.boards.length === 1) {
    return `Deck — ${deckSummary.value.boards[0]}`
  }
  return `Deck — ${deckSummary.value.boards.length} boards`
})

const targetsLine = computed(() => {
  const lines = targetsPreviewLines.value
  if (!lines.length) return ''
  if (lines.length === 1 && lines[0] === 'No category targets') return 'No targets'
  const compact = compactJoin(lines.map(compactTargetLine), 3)
  if (!compact) return ''
  return `${compact} · Total ${totalWeeklyTargetLine.value}`
})

const dashboardHint = computed(() =>
  compactJoin(
    [
      dashboardLayoutLine.value,
    ],
    2,
  ),
)

const strategyHint = computed(() => strategyTitle.value && strategyTitle.value !== '—' ? strategyTitle.value : 'Choose a planning model')

const calendarsHint = computed(() => compactList(selectedCalendarLabels.value, 2))

const deckHint = computed(() => deckLine.value)

const preferencesHint = computed(() =>
  compactJoin([`Theme — ${themeShort.value}`, reportingConfig.value?.enabled ? 'Recap on' : 'Recap off'], 2),
)

const reviewHint = computed(() =>
  compactJoin(
    [
      totalWeeklyTargetLine.value ? `Total ${totalWeeklyTargetLine.value}` : '',
    ],
    2,
  ),
)

const guidedHints = computed(() => ({
  strategy: strategyHint.value,
  deck: deckHint.value,
  goals: targetsLine.value,
  dashboard: dashboardHint.value,
  calendars: calendarsHint.value,
  preferences: preferencesHint.value,
  review: reviewHint.value,
}))

useDashboardBoot({
  performLoad,
  refreshPresets,
  onboardingState,
  hasInitialLoad,
  evaluateOnboarding,
  dashboardMode,
})
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
