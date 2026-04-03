<template>
  <div
    v-if="widgetId && baseConfig"
    class="advanced-overlay onboarding-overlay"
    role="dialog"
    aria-modal="false"
    aria-label="Targets configuration"
  >
    <div class="advanced-panel onboarding-panel" :class="panelThemeClass()">
      <button type="button" class="close-btn" @click="close" aria-label="Close">×</button>
      <main class="advanced-panel__body advanced-panel__body--goals onboarding-body">
        <section class="onboarding-step">
          <OnboardingGoalsStep
            :selected-strategy="selectedStrategy"
            :selected-calendars="selectedCalendars"
            :categories="categories"
            :assignments="assignments"
            :category-presets="categoryPresets"
            :total-hours-input="totalHoursInput"
            :on-total-hours-change="onTotalHoursChange"
            :on-apply-total-suggestion="noop"
            :trend-lookback-input="trendLookbackInput"
            :active-history-lookback="trendLookbackInput"
            :history-summary="historySummary"
            :suggestions-loading="false"
            :suggestions-error="''"
            :on-trend-lookback-change="onTrendLookbackChange"
            :suggested-calendar-targets="emptySuggestions"
            :suggested-category-targets="emptySuggestions"
            :on-apply-calendar-suggestion="noop"
            :on-apply-category-suggestion="noop"
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
      </main>

      <footer class="overlay-actions onboarding-footer">
        <div class="overlay-actions__left">
          <div class="overlay-actions__hint">This editor only overrides this widget.</div>
          <button type="button" class="ghost" @click="resetToGlobalTargets">Use global targets</button>
        </div>
        <div class="overlay-actions__right">
          <button type="button" class="ghost" @click="close">Cancel</button>
          <button type="button" class="ghost primary" @click="save">Save</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OnboardingGoalsStep from '../onboarding/OnboardingGoalsStep.vue'
import {
  buildStrategyResult,
  type CalendarSummary,
  type CategoryDraft,
  type StrategyDefinition,
} from '../../services/onboarding'
import { clampTarget, cloneTargetsConfig, normalizeTargetsConfig, type TargetsConfig } from '../../services/targets'
import type { WidgetDefinition } from '../../services/widgetsRegistry'

type CategoryPreset = {
  id: string
  title: string
  description: string
  colors: string[]
  categories: CategoryDraft[]
}

const props = defineProps<{
  widgetId: string | null
  widgets: WidgetDefinition[]
  contextTargetsConfig: any
  contextTargetsWeek?: Record<string, number>
  contextGroupsById?: Record<string, number>
  contextCalendars?: CalendarSummary[]
  contextSelected?: string[]
  strategy?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', widgetId: string, payload: { localConfig: TargetsConfig; localTargetsWeek: Record<string, number>; localGroupsById: Record<string, number> }): void
  (e: 'use-global', widgetId: string): void
  (e: 'open-onboarding', step?: string): void
}>()

const BASE_CATEGORY_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']

const categoryPresets: CategoryPreset[] = [
  {
    id: 'work_hobby_sport',
    title: 'Work / Hobby / Sport',
    description: 'Simple split for work, play, and fitness.',
    colors: ['#2563EB', '#F97316', '#10B981'],
    categories: [
      { id: 'work', label: 'Work', targetHours: 32, includeWeekend: false, paceMode: 'days_only', color: '#2563EB' },
      { id: 'hobby', label: 'Hobby', targetHours: 6, includeWeekend: true, paceMode: 'days_only', color: '#F97316' },
      { id: 'sport', label: 'Sport', targetHours: 4, includeWeekend: true, paceMode: 'days_only', color: '#10B981' },
    ],
  },
  {
    id: 'focus_personal_recovery',
    title: 'Focus / Personal / Recovery',
    description: 'Balance deep work, personal time, and rest.',
    colors: ['#6366F1', '#EC4899', '#14B8A6'],
    categories: [
      { id: 'focus', label: 'Focus', targetHours: 30, includeWeekend: false, paceMode: 'days_only', color: '#6366F1' },
      { id: 'personal', label: 'Personal', targetHours: 8, includeWeekend: true, paceMode: 'days_only', color: '#EC4899' },
      { id: 'recovery', label: 'Recovery', targetHours: 6, includeWeekend: true, paceMode: 'days_only', color: '#14B8A6' },
    ],
  },
  {
    id: 'client_internal_learning',
    title: 'Client / Internal / Learning',
    description: 'A fuller split for client work, internal work, learning, admin, and recovery.',
    colors: ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899'],
    categories: [
      { id: 'client', label: 'Client', targetHours: 24, includeWeekend: false, paceMode: 'days_only', color: '#2563EB' },
      { id: 'internal', label: 'Internal', targetHours: 8, includeWeekend: false, paceMode: 'days_only', color: '#F97316' },
      { id: 'learning', label: 'Learning', targetHours: 4, includeWeekend: true, paceMode: 'days_only', color: '#10B981' },
      { id: 'admin', label: 'Admin', targetHours: 2, includeWeekend: true, paceMode: 'days_only', color: '#A855F7' },
      { id: 'recovery', label: 'Recovery', targetHours: 4, includeWeekend: true, paceMode: 'days_only', color: '#EC4899' },
    ],
  },
]

const baseConfig = ref<TargetsConfig | null>(null)
const selectedStrategy = ref<StrategyDefinition['id']>('total_only')
const totalHoursInput = ref<number | null>(null)
const trendLookbackInput = ref(3)
const categories = ref<CategoryDraft[]>([])
const assignments = ref<Record<string, string>>({})
const calendarTargets = ref<Record<string, number>>({})
const calendarOrder = ref<string[]>([])

const emptySuggestions = Object.freeze({}) as Record<string, number>
const historySummary = Object.freeze({ enabled: false, available: 0, label: 'No lookback suggestions in widget-local mode.' })

const allCalendars = computed<CalendarSummary[]>(() =>
  Array.isArray(props.contextCalendars) ? props.contextCalendars : [],
)

const selectedIds = computed(() => {
  const allowed = new Set(allCalendars.value.map((calendar) => calendar.id))
  return calendarOrder.value.filter((calendarId) => allowed.has(calendarId))
})

const calendarById = computed(() => new Map(allCalendars.value.map((calendar) => [calendar.id, calendar])))
const selectedCalendars = computed(() =>
  selectedIds.value
    .map((calendarId) => calendarById.value.get(calendarId))
    .filter((calendar): calendar is CalendarSummary => Boolean(calendar)),
)

const categoryTotalHours = computed(() =>
  categories.value.reduce((sum, category) => sum + (Number(category.targetHours) || 0), 0),
)

const totalCalendarTargetHours = computed(() =>
  selectedCalendars.value.reduce((sum, calendar) => sum + (Number(getCalendarTarget(calendar.id)) || 0), 0),
)

const unassignedSelectedCalendars = computed(() =>
  selectedCalendars.value.filter((calendar) => !assignments.value[calendar.id]),
)

const goalsHealth = computed(() => {
  const assigned = selectedCalendars.value.filter((calendar) => assignments.value[calendar.id]).length
  const unassigned = Math.max(0, selectedCalendars.value.length - assigned)
  const calendarTotal = roundGoal(totalCalendarTargetHours.value)
  const categoryTotal = roundGoal(categoryTotalHours.value)
  const delta = roundGoal(categoryTotal - calendarTotal)
  return {
    assigned,
    unassigned,
    calendarTotal,
    categoryTotal,
    delta,
    totalsMatch: Math.abs(delta) <= 0.01,
  }
})

watch(
  () => [
    props.widgetId,
    props.strategy,
    JSON.stringify(props.contextTargetsConfig || {}),
    JSON.stringify(props.contextTargetsWeek || {}),
    JSON.stringify(props.contextGroupsById || {}),
    JSON.stringify(props.contextSelected || []),
    JSON.stringify(props.contextCalendars || []),
  ],
  () => {
    hydrateDraft()
  },
  { immediate: true },
)

function hydrateDraft() {
  if (!props.widgetId) {
    baseConfig.value = null
    return
  }

  const widget = props.widgets.find((entry) => entry.id === props.widgetId)
  const options: any = widget?.options || {}
  const useLocal = options.useLocalConfig === true
  const currentConfig = normalizeTargetsConfig(
    useLocal && options.localConfig ? options.localConfig : props.contextTargetsConfig,
  )
  baseConfig.value = cloneTargetsConfig(currentConfig)
  selectedStrategy.value = resolveStrategy(currentConfig, props.strategy)
  totalHoursInput.value = clampTotalHours(currentConfig.totalHours)
  trendLookbackInput.value = clampLookback(currentConfig?.balance?.trend?.lookbackWeeks ?? 3)
  categories.value = cloneCategoryDrafts(currentConfig.categories)
  const selected = sanitizeSelected(props.contextSelected, allCalendars.value)
  calendarOrder.value = selected

  const sourceTargets = normalizeTargetMap(useLocal ? options.localTargetsWeek : props.contextTargetsWeek)
  const nextTargets: Record<string, number> = {}
  selected.forEach((calendarId) => {
    if (Number.isFinite(sourceTargets[calendarId])) {
      nextTargets[calendarId] = sourceTargets[calendarId]
    }
  })
  calendarTargets.value = nextTargets

  const sourceGroups = normalizeGroupMap(useLocal ? options.localGroupsById : props.contextGroupsById)
  assignments.value = selectedStrategy.value === 'full_granular'
    ? buildAssignments(selected, categories.value, sourceGroups)
    : {}
}

function close() {
  emit('close')
}

function save() {
  if (!props.widgetId || !baseConfig.value) return

  const result = buildStrategyResult(
    selectedStrategy.value,
    allCalendars.value,
    selectedIds.value,
    selectedStrategy.value === 'full_granular'
      ? { categories: categories.value.map((category) => ({ ...category })), assignments: { ...assignments.value } }
      : undefined,
  )

  const nextConfig = mergeGoalConfig(baseConfig.value, result.targetsConfig)
  nextConfig.balance.trend.lookbackWeeks = trendLookbackInput.value
  if (selectedStrategy.value === 'total_only') {
    const total = clampTotalHours(totalHoursInput.value)
    if (total != null) nextConfig.totalHours = total
  } else if (selectedStrategy.value === 'total_plus_categories') {
    nextConfig.totalHours = roundGoal(totalCalendarTargetHours.value || nextConfig.totalHours)
  } else {
    nextConfig.totalHours = roundGoal(categoryTotalHours.value || nextConfig.totalHours)
  }

  const localTargetsWeek: Record<string, number> = {}
  selectedIds.value.forEach((calendarId) => {
    const target = Number(calendarTargets.value[calendarId])
    if (Number.isFinite(target)) {
      localTargetsWeek[calendarId] = clampTarget(target)
    }
  })

  emit('save', props.widgetId, {
    localConfig: nextConfig,
    localTargetsWeek,
    localGroupsById: result.groups,
  })
}

function resetToGlobalTargets() {
  if (!props.widgetId) return
  emit('use-global', props.widgetId)
}

function noop() {}

function panelThemeClass() {
  if (typeof document === 'undefined') return 'theme-light'
  const root = document.querySelector('#opsdash')
  return root?.classList.contains('opsdash-theme-dark') ? 'theme-dark' : 'theme-light'
}

function onTotalHoursChange(input: HTMLInputElement) {
  const parsed = Number(input.value)
  totalHoursInput.value = Number.isFinite(parsed) ? clampTotalHours(parsed) : null
}

function onTrendLookbackChange(input: HTMLInputElement) {
  const parsed = Number(input.value)
  if (!Number.isFinite(parsed)) return
  trendLookbackInput.value = clampLookback(parsed)
}

function addCategory() {
  const nextIndex = categories.value.length + 1
  const fallbackColor = BASE_CATEGORY_COLORS[(nextIndex - 1) % BASE_CATEGORY_COLORS.length] || '#2563EB'
  categories.value = [
    ...categories.value,
    {
      id: `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      label: `Category ${nextIndex}`,
      targetHours: 0,
      includeWeekend: true,
      paceMode: 'days_only',
      color: fallbackColor,
    },
  ]
}

function removeCategory(id: string) {
  categories.value = categories.value.filter((category) => category.id !== id)
  const nextAssignments = { ...assignments.value }
  Object.keys(nextAssignments).forEach((calendarId) => {
    if (nextAssignments[calendarId] === id) {
      nextAssignments[calendarId] = ''
    }
  })
  assignments.value = nextAssignments
}

function moveCategory(id: string, direction: 'up' | 'down') {
  const index = categories.value.findIndex((category) => category.id === id)
  if (index < 0) return
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= categories.value.length) return
  const next = [...categories.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  categories.value = next
}

function reorderCategory(sourceId: string, targetId: string) {
  categories.value = reorderByIds(categories.value, sourceId, targetId)
}

function reorderSelectedCalendar(sourceId: string, targetId: string) {
  calendarOrder.value = reorderByIds(calendarOrder.value, sourceId, targetId)
}

function moveSelectedCalendar(id: string, direction: 'up' | 'down') {
  const index = calendarOrder.value.findIndex((calendarId) => calendarId === id)
  if (index < 0) return
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= calendarOrder.value.length) return
  const next = [...calendarOrder.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  calendarOrder.value = next
}

function setCategoryLabel(id: string, value: string) {
  categories.value = categories.value.map((category) =>
    category.id === id ? { ...category, label: value.trim() || category.label } : category,
  )
}

function applyCategoryPreset(preset: CategoryPreset) {
  categories.value = preset.categories.map((category) => ({ ...category }))
  const nextAssignments: Record<string, string> = {}
  selectedIds.value.forEach((calendarId, index) => {
    const category = preset.categories[index % preset.categories.length]
    nextAssignments[calendarId] = category?.id || ''
  })
  assignments.value = nextAssignments
}

function setCategoryTarget(id: string, value: string) {
  const parsed = Number(value)
  categories.value = categories.value.map((category) =>
    category.id === id
      ? { ...category, targetHours: Number.isFinite(parsed) ? clampTarget(parsed) : 0 }
      : category,
  )
}

function setCategoryPaceMode(id: string, value: CategoryDraft['paceMode']) {
  categories.value = categories.value.map((category) =>
    category.id === id ? { ...category, paceMode: value === 'time_aware' ? 'time_aware' : 'days_only' } : category,
  )
}

function toggleCategoryWeekend(id: string, checked: boolean) {
  categories.value = categories.value.map((category) =>
    category.id === id ? { ...category, includeWeekend: checked } : category,
  )
}

function assignCalendar(calendarId: string, categoryId: string) {
  assignments.value = {
    ...assignments.value,
    [calendarId]: categoryId,
  }
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

function resolvedColor(category: { color?: string | null }) {
  return sanitizeColor(category?.color) ?? BASE_CATEGORY_COLORS[0]
}

function onColorInput(id: string, value: string) {
  const color = sanitizeColor(value)
  categories.value = categories.value.map((category) =>
    category.id === id ? { ...category, color: color ?? resolvedColor(category) } : category,
  )
}

function normalizeGroupMap(input: any): Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const next: Record<string, number> = {}
  Object.entries(input).forEach(([calendarId, value]) => {
    const normalizedId = String(calendarId || '').trim()
    if (!normalizedId) return
    next[normalizedId] = Math.max(0, Math.min(9, Math.trunc(Number(value) || 0)))
  })
  return next
}

function normalizeTargetMap(input: any): Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const next: Record<string, number> = {}
  Object.entries(input).forEach(([calendarId, value]) => {
    const normalizedId = String(calendarId || '').trim()
    const target = Number(value)
    if (!normalizedId || !Number.isFinite(target)) return
    next[normalizedId] = clampTarget(target)
  })
  return next
}

function sanitizeSelected(input: any, calendars: CalendarSummary[]) {
  const allowed = new Set(calendars.map((calendar) => calendar.id))
  return Array.isArray(input)
    ? input.map((calendarId) => String(calendarId || '')).filter((calendarId) => allowed.has(calendarId))
    : []
}

function cloneCategoryDrafts(input: any): CategoryDraft[] {
  if (!Array.isArray(input)) return []
  return input.map((category: any, index: number) => ({
    id: String(category?.id ?? `cat_${index}`).trim() || `cat_${index}`,
    label: String(category?.label ?? `Category ${index + 1}`).trim() || `Category ${index + 1}`,
    targetHours: Number.isFinite(category?.targetHours) ? Number(category.targetHours) : 0,
    includeWeekend: category?.includeWeekend !== false,
    paceMode: category?.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
    color: sanitizeColor(category?.color) ?? null,
  }))
}

function buildAssignments(selected: string[], categoriesInput: CategoryDraft[], groupsById: Record<string, number>) {
  const groupToCategory = new Map<number, string>()
  categoriesInput.forEach((category, index) => {
    const normalizedGroup = index + 1
    groupToCategory.set(normalizedGroup, category.id)
  })

  const next: Record<string, string> = {}
  selected.forEach((calendarId) => {
    const explicitGroup = Math.max(0, Math.min(9, Math.trunc(Number(groupsById[calendarId]) || 0)))
    next[calendarId] = groupToCategory.get(explicitGroup) || ''
  })
  return next
}

function mergeGoalConfig(base: TargetsConfig, goal: TargetsConfig): TargetsConfig {
  const next = cloneTargetsConfig(base)
  next.totalHours = goal.totalHours
  next.categories = goal.categories
  next.ui.showCategoryBlocks = goal.ui.showCategoryBlocks
  next.ui.showCategoryCharts = goal.ui.showCategoryCharts
  next.ui.showCalendarCharts = goal.ui.showCalendarCharts
  next.balance.categories = [...(goal.balance?.categories || [])]
  next.balance.useCategoryMapping = goal.balance?.useCategoryMapping === true
  return next
}

function resolveStrategy(config: TargetsConfig, rawStrategy?: string | null): StrategyDefinition['id'] {
  if (rawStrategy === 'full_granular' || rawStrategy === 'total_plus_categories' || rawStrategy === 'total_only') {
    return rawStrategy
  }
  if (Array.isArray(config?.categories) && config.categories.length > 0) {
    return 'full_granular'
  }
  return 'total_plus_categories'
}

function clampTotalHours(value: number | null | undefined): number | null {
  if (!Number.isFinite(value ?? NaN)) return null
  const clamped = Math.max(0, Math.min(1000, Number(value)))
  return Math.round(clamped * 100) / 100
}

function clampLookback(value: number): number {
  if (!Number.isFinite(value)) return 3
  return Math.max(1, Math.min(6, Math.round(value)))
}

function roundGoal(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(0, value) * 2) / 2
}

function sanitizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return null
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return trimmed.toUpperCase()
}

function reorderByIds<T extends { id: string } | string>(items: T[], sourceId: string, targetId: string): T[] {
  const getId = (item: T) => typeof item === 'string' ? item : item.id
  const sourceIndex = items.findIndex((item) => getId(item) === sourceId)
  const targetIndex = items.findIndex((item) => getId(item) === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return [...items]
  const next = [...items]
  const [item] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, item)
  return next
}
</script>

<style scoped>
.ghost{
  border:1px solid var(--adv-button-border, var(--color-border, #d1d5db));
  background:var(--adv-button-bg, color-mix(in oklab, #ffffff, #f8fafc 45%));
  color:var(--adv-button-fg, var(--color-main-text, #0f172a));
  padding:2px 6px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.ghost:hover{
  border-color:var(--adv-button-hover-border, color-mix(in oklab, var(--color-primary, #2563eb), transparent 45%));
  background:var(--adv-button-hover-bg, color-mix(in oklab, #dbeafe, #ffffff 62%));
}
.ghost.primary{
  border-color:var(--adv-primary-border, var(--color-primary, #2563EB));
  color:var(--adv-primary-fg, var(--color-primary, #2563EB));
  background:var(--adv-primary-bg, color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 94%));
}
.ghost.primary:hover{
  border-color:var(--adv-primary-hover-border, var(--color-primary, #2563EB));
  background:var(--adv-primary-hover-bg, color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 88%));
}
.advanced-overlay{
  position:fixed;
  inset:auto 24px 84px calc(24px + var(--opsdash-nav-offset, 0px));
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding:0;
  z-index:2147480002;
  pointer-events:none;
}
.advanced-panel{
  --adv-surface: #ffffff;
  --adv-text: #0f172a;
  --adv-border-base: #e2e8f0;
  --adv-surface-alt: var(--color-background-hover, #f8fafc);
  --adv-surface-muted: var(--color-background-contrast, #f8fafc);
  --adv-border: color-mix(in oklab, var(--color-border, #d1d5db), transparent 20%);
  --adv-muted: var(--muted, #64748b);
  --adv-warn-border: color-mix(in oklab, #dc2626, var(--color-border, #d1d5db) 45%);
  --adv-warn-bg: color-mix(in oklab, #fff1f2, var(--color-main-background, #fff) 40%);
  --adv-button-bg: color-mix(in oklab, #ffffff, #f8fafc 35%);
  --adv-button-border: color-mix(in oklab, var(--color-border, #d1d5db), transparent 15%);
  --adv-button-fg: var(--color-main-text, #0f172a);
  --adv-button-hover-bg: color-mix(in oklab, #dbeafe, #ffffff 64%);
  --adv-button-hover-border: color-mix(in oklab, var(--color-primary, #2563eb), transparent 46%);
  --adv-primary-bg: color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 92%);
  --adv-primary-fg: var(--color-primary, #2563eb);
  --adv-primary-border: color-mix(in oklab, var(--color-primary, #2563eb), transparent 24%);
  --adv-primary-hover-bg: color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 84%);
  --adv-primary-hover-border: var(--color-primary, #2563eb);
  background:var(--adv-surface);
  color:var(--adv-text);
  pointer-events:auto;
  width:min(1180px, 100%);
  max-height:min(82vh, 940px);
  border-radius:14px;
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.32),
    inset 0 0 0 1px color-mix(in oklab, var(--color-primary, #2563eb), transparent 82%);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  border:1px solid color-mix(in oklab, var(--color-primary, #2563eb), var(--adv-border-base) 70%);
}
.advanced-panel__body{
  flex:1 1 auto;
  overflow:auto;
  padding:18px 18px 10px;
}
.advanced-panel__body--goals{
  padding-top:18px;
}
.close-btn{
  position:absolute;
  top:12px;
  right:12px;
  z-index:2;
  background:color-mix(in oklab, var(--adv-surface, #ffffff), transparent 12%);
  border:1px solid var(--adv-border);
  border-radius:999px;
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  font-size:1.15rem;
  line-height:1;
  cursor:pointer;
  color:var(--adv-muted);
  padding:0;
}
.close-btn:hover{
  color:var(--color-primary, #2563eb);
  background:color-mix(in oklab, var(--color-primary, #2563eb), var(--adv-surface, #ffffff) 88%);
  border-color:color-mix(in oklab, var(--color-primary, #2563eb), transparent 52%);
}
.overlay-actions{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
  padding:12px 18px 14px;
  border-top:1px solid var(--color-border, #e5e7eb);
  background:var(--adv-surface-alt);
}
.overlay-actions__left{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.overlay-actions__hint{
  font-size:0.82rem;
  color:var(--adv-muted);
}
.overlay-actions__left,
.overlay-actions__right{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
:global(#opsdash.opsdash-theme-dark .advanced-panel){
  --adv-surface: #0f172a;
  --adv-text: #e2e8f0;
  --adv-border-base: #1f2937;
  --adv-surface-alt: color-mix(in oklab, var(--color-main-background, #0f172a), #1f2937 35%);
  --adv-surface-muted: color-mix(in oklab, var(--color-main-background, #0f172a), #111827 52%);
  --adv-border: color-mix(in oklab, var(--color-border, #334155), #000000 10%);
  --adv-muted: #94a3b8;
  --adv-warn-border: color-mix(in oklab, #ef4444, var(--color-border, #334155) 58%);
  --adv-warn-bg: color-mix(in oklab, #7f1d1d, var(--color-main-background, #0f172a) 75%);
  --adv-button-bg: color-mix(in oklab, #111827, #0b1220 68%);
  --adv-button-border: color-mix(in oklab, #475569, transparent 22%);
  --adv-button-fg: #e2e8f0;
  --adv-button-hover-bg: color-mix(in oklab, #1e293b, #0b1220 62%);
  --adv-button-hover-border: color-mix(in oklab, #3b82f6, transparent 32%);
  --adv-primary-bg: color-mix(in oklab, #1d4ed8, #0b1220 78%);
  --adv-primary-fg: #bfdbfe;
  --adv-primary-border: color-mix(in oklab, #3b82f6, transparent 36%);
  --adv-primary-hover-bg: color-mix(in oklab, #2563eb, #0b1220 70%);
  --adv-primary-hover-border: color-mix(in oklab, #60a5fa, transparent 28%);
}

@media (max-width: 960px){
  .advanced-overlay{
    inset:0;
    padding:16px;
    background:rgba(15, 23, 42, 0.45);
    pointer-events:auto;
    align-items:center;
  }
  .advanced-panel{
    width:min(1080px, 100%);
    max-height:calc(100vh - 32px);
  }
}

@media (max-width: 640px){
  .advanced-overlay{
    padding:16px;
    align-items:flex-start;
  }
  .overlay-metrics{
    grid-template-columns:1fr;
    padding-top:10px;
  }
}
</style>
