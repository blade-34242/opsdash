<template>
  <div class="goals-step">
    <header class="goals-step__header">
      <div>
        <h3>Set your goals</h3>
        <p class="hint">This step changes shape based on your strategy, but all planning now lives here.</p>
      </div>
    </header>

    <template v-if="selectedStrategy === 'total_only'">
      <section class="goal-single">
        <article class="goal-info-card">
          <span class="state-chip">Single Goal</span>
          <h4>One weekly goal for the whole dashboard</h4>
          <p class="hint">Start simple now. You can switch later to Calendar Goals or Calendar + Category Goals.</p>
        </article>
        <article class="goal-single__editor">
          <label class="field">
            <span class="label">Weekly target</span>
            <div class="input-unit">
              <input
                type="number"
                min="0"
                max="1000"
                step="0.5"
                :value="totalHoursInput ?? ''"
                @input="onTotalHoursChange($event.target as HTMLInputElement)"
              />
              <span class="unit">h / week</span>
            </div>
          </label>
          <p class="hint" v-if="suggestedTotalTarget > 0">
            Suggested from recent activity:
            <button type="button" class="goal-suggestion-link" @click="onApplyTotalSuggestion">
              <strong>{{ suggestedTotalTarget.toFixed(1) }} h / week</strong>
            </button>
          </p>
        </article>
      </section>
    </template>

    <template v-else-if="selectedStrategy === 'total_plus_categories'">
      <section class="goal-calendar">
        <article class="goal-info-card">
          <span class="state-chip">Calendar Goals</span>
          <h4>Set weekly goals per selected calendar</h4>
          <p class="hint">Suggestions are based on the currently available lookback window. Leave rows empty if you only want a few calendars to carry goals.</p>
        </article>
        <div v-if="historySummary.available" class="goal-suggestion-toolbar">
          <div class="goal-suggestion-toolbar__cluster">
            <button
              type="button"
              class="goal-suggestion-toggle"
              :class="{ 'is-open': showSuggestionControls }"
              @click="showSuggestionControls = !showSuggestionControls"
            >
              <span class="goal-suggestion-toggle__icon" aria-hidden="true">◔</span>
              Suggestion window
            </button>
            <div v-if="showSuggestionControls" class="goal-suggestion-inline-editor">
              <span class="goal-suggestion-inline-editor__label">Lookback</span>
              <input
                type="number"
                min="1"
                :max="historySummary.available"
                :value="activeHistoryLookback"
                @input="onTrendLookbackChange($event.target as HTMLInputElement)"
              />
              <span class="goal-suggestion-inline-editor__meta">/ {{ historySummary.available }} weeks</span>
            </div>
          </div>
          <span class="goal-suggestion-toolbar__meta">Using last {{ activeHistoryLookback }} week{{ activeHistoryLookback === 1 ? '' : 's' }} for calendar suggestions</span>
        </div>
        <div class="goal-calendar-list">
          <div
            v-for="cal in selectedCalendars"
            :key="cal.id"
            class="goal-calendar-row"
          >
            <div class="goal-calendar-row__main">
              <span class="dot" :style="{ backgroundColor: cal.color || '#3B82F6' }"></span>
              <div>
                <strong>{{ cal.displayname }}</strong>
                <div class="goal-suggestion-inline">
                  <button
                    v-if="suggestedCalendarTargets[cal.id]"
                    type="button"
                    class="goal-suggestion-link"
                    @click="onApplyCalendarSuggestion(cal.id)"
                  >
                    Suggested {{ suggestedCalendarTargets[cal.id].toFixed(1) }} h
                  </button>
                  <span v-else>No recent suggestion</span>
                </div>
              </div>
            </div>
            <div class="input-unit">
              <input
                type="number"
                min="0"
                step="0.25"
                :value="getCalendarTarget(cal.id)"
                @input="setCalendarTarget(cal.id, ($event.target as HTMLInputElement).value)"
              />
              <span class="unit">h / week</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="goal-advanced goal-advanced--b26">
        <div class="goal-template-strip">
          <button
            v-for="(preset, index) in categoryPresets"
            :key="preset.id"
            type="button"
            class="goal-template-card"
            :class="[{ active: activeTemplateId === preset.id }, templateTone(index)]"
            @click="selectTemplate(preset)"
          >
            <strong>Example set {{ String.fromCharCode(65 + index) }}</strong>
            <p>{{ preset.colors.length }} categories · sample only</p>
            <div class="goal-preset-swatches">
              <span
                v-for="color in preset.colors"
                :key="`${preset.id}-${color}`"
                class="goal-preset-swatch"
                :style="{ backgroundColor: color }"
              />
            </div>
          </button>
        </div>

        <article class="goal-panel-card">
          <div class="goal-panel-card__head">
            <div class="goal-panel-card__title">
              <h4>Suggested category goals</h4>
              <p class="hint">Align category targets with assigned calendar hours, then tune pacing and color per row.</p>
            </div>
            <div class="goal-panel-pills">
              <span class="pill">{{ categories.length }} categories</span>
              <span class="pill">{{ selectedCalendars.length }} calendars selected</span>
              <span class="pill" :class="{ 'pill--warn': primaryMismatch }">{{ primaryMismatch ? '1 mismatch open' : 'All rows aligned' }}</span>
              <button type="button" class="ghost-btn" @click="addCategory">Add category</button>
            </div>
          </div>

          <div v-if="historySummary.available" class="goal-suggestion-toolbar goal-suggestion-toolbar--panel">
            <div class="goal-suggestion-toolbar__cluster">
              <button
                type="button"
                class="goal-suggestion-toggle"
                :class="{ 'is-open': showSuggestionControls }"
                @click="showSuggestionControls = !showSuggestionControls"
              >
                <span class="goal-suggestion-toggle__icon" aria-hidden="true">◔</span>
                Suggestion window
              </button>
              <div v-if="showSuggestionControls" class="goal-suggestion-inline-editor">
                <span class="goal-suggestion-inline-editor__label">Lookback</span>
                <input
                  type="number"
                  min="1"
                  :max="historySummary.available"
                  :value="activeHistoryLookback"
                  @input="onTrendLookbackChange($event.target as HTMLInputElement)"
                />
                <span class="goal-suggestion-inline-editor__meta">/ {{ historySummary.available }} weeks</span>
              </div>
            </div>
            <span class="goal-suggestion-toolbar__meta">Using last {{ activeHistoryLookback }} week{{ activeHistoryLookback === 1 ? '' : 's' }} for calendar and category suggestions</span>
          </div>

          <div v-if="primaryMismatch" class="goal-mismatch-box">
            <strong>{{ primaryMismatch.label }} needs attention first</strong>
            <p>
              {{ primaryMismatch.label }} is currently set to
              <strong>{{ primaryMismatch.target.toFixed(1) }} h</strong>,
              but the assigned calendar totals
              <strong>{{ primaryMismatch.assigned.toFixed(1) }} h</strong>.
              Open this row first so the mismatch is visible and easy to resolve.
            </p>
          </div>

          <div v-else class="goal-mismatch-box goal-mismatch-box--ok">
            <strong>All visible totals currently match</strong>
            <p>You can still reorder categories, add calendars, or fine-tune targets below.</p>
          </div>

          <div class="goal-category-list goal-category-list--accordion">
            <article
              v-for="cat in categories"
              :key="cat.id"
              class="goal-category-card goal-category-card--accordion"
              :class="{ 'is-open': activeCategoryId === cat.id }"
              draggable="true"
              @dragstart="startDrag(cat.id)"
              @dragover.prevent
              @drop.prevent="dropOn(cat.id)"
            >
              <div class="goal-category-top" :class="{ 'is-open': activeCategoryId === cat.id }">
                <template v-if="activeCategoryId === cat.id">
                  <div class="goal-category-titlebar">
                    <button
                      type="button"
                      class="goal-category-collapse"
                      aria-label="Collapse category"
                      title="Collapse category"
                      @click="activeCategoryId = ''"
                    >
                      ‹
                    </button>
                    <span class="color-dot" :style="{ backgroundColor: resolvedColor(cat) }"></span>
                    <input
                      class="goal-category-title-input"
                      type="text"
                      :value="cat.label"
                      placeholder="Category title"
                      @input="setCategoryLabel(cat.id, ($event.target as HTMLInputElement).value)"
                    />
                    <span class="value-pill">{{ Number(cat.targetHours || 0).toFixed(1) }} h / week</span>
                    <span
                      class="suggest-pill"
                      :class="{ 'suggest-pill--warn': categoryMismatch(cat).mismatch > 0.01 }"
                    >
                      {{ categoryStatusLabel(cat) }}
                    </span>
                  </div>

                  <div class="goal-category-action-card">
                    <span class="goal-card-corner-grip" title="Drag to reorder category" aria-hidden="true">⋮⋮</span>
                    <label class="field goal-field-stack goal-inline-target goal-action-block">
                      <span class="label">Weekly target</span>
                      <div class="input-unit input-unit--small">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          :value="cat.targetHours"
                          @input="setCategoryTarget(cat.id, ($event.target as HTMLInputElement).value)"
                        />
                        <span class="unit">h</span>
                      </div>
                    </label>

                    <div class="field goal-field-stack goal-color-stack goal-color-stack--inline goal-action-block">
                      <span class="label">Color</span>
                      <ColorPickerPopover
                        :model-value="resolvedColor(cat)"
                        @update:model-value="(color) => onColorInput(cat.id, color)"
                      />
                    </div>

                    <label class="field goal-checkbox goal-action-block">
                      <span class="label">Weekend</span>
                      <span class="goal-checkbox__control">
                        <input
                          type="checkbox"
                          :checked="cat.includeWeekend"
                          @change="toggleCategoryWeekend(cat.id, ($event.target as HTMLInputElement).checked)"
                        />
                      </span>
                    </label>

                    <label class="field goal-pace-field goal-action-block">
                      <span class="label">Pacing</span>
                      <select
                        :value="cat.paceMode"
                        @change="setCategoryPaceMode(cat.id, ($event.target as HTMLSelectElement).value as CategoryDraft['paceMode'])"
                      >
                        <option value="days_only">Days only</option>
                        <option value="time_aware">Time aware</option>
                      </select>
                    </label>

                    <div class="goal-suggestion-stack goal-suggestion-stack--inline goal-action-block">
                      <span class="label">Suggestion</span>
                      <button
                        v-if="suggestedCategoryTargets[cat.id]"
                        type="button"
                        class="goal-suggestion-pill goal-suggestion-pill--action"
                        @click="onApplyCategorySuggestion(cat.id)"
                      >
                        Suggested {{ suggestedCategoryTargets[cat.id].toFixed(1) }} h
                      </button>
                      <span v-else class="goal-suggestion-pill goal-suggestion-pill--muted">No recent suggestion</span>
                    </div>

                    <div class="goal-category-action-icons">
                      <label
                        class="goal-add-calendar-control"
                        :class="{ 'goal-add-calendar-control--empty': !assignableCalendars(cat.id).length }"
                        :title="assignableCalendars(cat.id).length ? `Add calendar to ${cat.label || 'category'}` : 'No calendars left to assign'"
                      >
                        <span class="goal-add-calendar-control__icon" aria-hidden="true">
                          <span class="goal-add-calendar-control__sheet"></span>
                          <span class="goal-add-calendar-control__plus">+</span>
                        </span>
                        <select
                          class="goal-add-calendar-control__native"
                          :aria-label="assignableCalendars(cat.id).length ? `Add calendar to ${cat.label || 'category'}` : 'No calendars left to assign'"
                          @change="handleAddCalendar(cat.id, $event.target as HTMLSelectElement)"
                        >
                          <option value="">{{ assignableCalendars(cat.id).length ? 'Add calendar' : 'No calendars left' }}</option>
                          <option
                            v-for="option in assignableCalendars(cat.id)"
                            :key="`${cat.id}-${option.id}`"
                            :value="option.id"
                          >
                            {{ option.displayname }}
                          </option>
                        </select>
                      </label>

                      <button
                        class="goal-row-icon-btn"
                        type="button"
                        :disabled="categories.length <= 1"
                        aria-label="Remove category"
                        title="Remove category"
                        @click="removeCategory(cat.id)"
                      >
                        ×
                      </button>

                      <div class="goal-reorder-tools goal-reorder-tools--surface goal-reorder-tools--compact" aria-label="Category reorder controls">
                        <button type="button" class="reorder-icon-btn" title="Move category up" aria-label="Move category up" @click.stop="moveCategory(cat.id, 'up')">↑</button>
                        <button type="button" class="reorder-icon-btn" title="Move category down" aria-label="Move category down" @click.stop="moveCategory(cat.id, 'down')">↓</button>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <button type="button" class="goal-category-summary" @click="activeCategoryId = cat.id">
                    <span class="mini-pills">
                      <span class="chevron-pill">{{ activeCategoryId === cat.id ? '⌄' : '›' }}</span>
                      <span class="color-dot" :style="{ backgroundColor: resolvedColor(cat) }"></span>
                      <strong class="row-name">{{ cat.label || 'Untitled category' }}</strong>
                    </span>
                    <span class="value-pill">{{ Number(cat.targetHours || 0).toFixed(1) }} h / week</span>
                    <span
                      class="suggest-pill"
                      :class="{ 'suggest-pill--warn': categoryMismatch(cat).mismatch > 0.01 }"
                    >
                      {{ categoryStatusLabel(cat) }}
                    </span>
                  </button>

                  <div
                    v-if="calendarsForCategory(cat.id).length"
                    class="goal-category-assigned-badges"
                    aria-label="Assigned calendars"
                  >
                    <span
                      v-for="cal in calendarsForCategory(cat.id)"
                      :key="`${cat.id}-${cal.id}-badge`"
                      class="goal-calendar-badge"
                    >
                      <span class="goal-calendar-color" :style="{ backgroundColor: cal.color || '#3B82F6' }"></span>
                      <span class="goal-calendar-badge__name">{{ cal.displayname }}</span>
                      <span class="goal-calendar-badge__hours">{{ calendarTargetLabel(cal.id) }}</span>
                    </span>
                  </div>
                </template>
              </div>

              <div v-if="activeCategoryId === cat.id" class="goal-category-editor">
                <div class="goal-category-row-bottom">
                  <div class="goal-category-row-bottom__head">
                    <div class="goal-section-copy">
                      <strong class="goal-section-label">Calendars in this category</strong>
                      <span class="row-inline-note">Use the handles below to reorder calendars inside this category.</span>
                    </div>
                  </div>
                  <div class="goal-nice-select">
                    <span
                      v-for="cal in calendarsForCategory(cat.id)"
                      :key="`${cat.id}-${cal.id}-token`"
                      class="select-pill"
                    >
                      <span class="goal-calendar-color" :style="{ backgroundColor: cal.color || '#3B82F6' }"></span>
                      {{ cal.displayname }}
                    </span>
                  </div>
                </div>

                <div v-if="calendarsForCategory(cat.id).length" class="goal-calendar-sublist">
                  <div
                    v-for="cal in calendarsForCategory(cat.id)"
                    :key="`${cat.id}-${cal.id}`"
                    class="goal-calendar-subrow"
                    draggable="true"
                    @dragstart="startCalendarDrag(cal.id)"
                    @dragover.prevent
                    @drop.prevent="dropCalendarOn(cal.id)"
                  >
                    <span class="goal-calendar-corner-grip" title="Drag to reorder calendar" aria-hidden="true">⋮⋮</span>
                    <div class="goal-calendar-subrow__main">
                      <span class="goal-calendar-color" :style="{ backgroundColor: cal.color || '#3B82F6' }"></span>
                      <strong class="row-name">{{ cal.displayname }}</strong>
                    </div>
                    <div class="input-unit input-unit--small">
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        :value="getCalendarTarget(cal.id)"
                        @input="setCalendarTarget(cal.id, ($event.target as HTMLInputElement).value)"
                      />
                      <span class="unit">h</span>
                    </div>
                    <div class="goal-calendar-subrow__status">
                      <span class="label">Suggestion</span>
                      <button
                        type="button"
                        class="suggest-pill"
                        :class="{
                          'suggest-pill--muted': !suggestedCalendarTargets[cal.id],
                          'suggest-pill--action': !!suggestedCalendarTargets[cal.id],
                        }"
                        :disabled="!suggestedCalendarTargets[cal.id]"
                        @click="onApplyCalendarSuggestion(cal.id)"
                      >
                        {{ calendarSuggestionLabel(cal.id) }}
                      </button>
                    </div>
                    <div class="goal-calendar-subrow__actions">
                      <div class="goal-reorder-tools goal-reorder-tools--calendar goal-reorder-tools--surface" aria-label="Calendar reorder controls">
                        <button type="button" class="reorder-icon-btn" title="Move calendar up" aria-label="Move calendar up" @click.stop="moveSelectedCalendar(cal.id, 'up')">↑</button>
                        <button type="button" class="reorder-icon-btn" title="Move calendar down" aria-label="Move calendar down" @click.stop="moveSelectedCalendar(cal.id, 'down')">↓</button>
                      </div>
                      <button
                        class="goal-row-icon-btn"
                        type="button"
                        :aria-label="`Unassign ${cal.displayname}`"
                        :title="`Unassign ${cal.displayname}`"
                        @click="assignCalendar(cal.id, '')"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                <p v-else class="hint">No calendars assigned yet.</p>
              </div>
            </article>
          </div>

          <p class="hint" v-if="unassignedSelectedCalendars.length">
            Unassigned:
            {{ unassignedSelectedCalendars.map((cal) => cal.displayname).join(', ') }}
          </p>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CalendarSummary, CategoryDraft, StrategyDefinition } from '../../services/onboarding'
import ColorPickerPopover from '../ColorPickerPopover.vue'

const props = defineProps<{
  selectedStrategy: StrategyDefinition['id']
  selectedCalendars: CalendarSummary[]
  categories: CategoryDraft[]
  assignments: Record<string, string>
  categoryPresets: Array<{
    id: string
    title: string
    description: string
    colors: string[]
  }>
  totalHoursInput: number | null
  onTotalHoursChange: (el: HTMLInputElement) => void
  onApplyTotalSuggestion: () => void
  trendLookbackInput: number
  activeHistoryLookback: number
  historySummary: { enabled: boolean; available: number; label: string }
  suggestionsLoading: boolean
  suggestionsError: string
  onTrendLookbackChange: (el: HTMLInputElement) => void
  suggestedCalendarTargets: Record<string, number>
  suggestedCategoryTargets: Record<string, number>
  onApplyCalendarSuggestion: (id: string) => void
  onApplyCategorySuggestion: (id: string) => void
  addCategory: () => void
  removeCategory: (id: string) => void
  moveCategory: (id: string, direction: 'up' | 'down') => void
  reorderCategory: (sourceId: string, targetId: string) => void
  reorderSelectedCalendar: (sourceId: string, targetId: string) => void
  moveSelectedCalendar: (id: string, direction: 'up' | 'down') => void
  setCategoryLabel: (id: string, value: string) => void
  applyCategoryPreset: (preset: { id: string; title: string; description: string; colors: string[] }) => void
  setCategoryTarget: (id: string, value: string) => void
  setCategoryPaceMode: (id: string, value: CategoryDraft['paceMode']) => void
  toggleCategoryWeekend: (id: string, checked: boolean) => void
  assignCalendar: (calId: string, categoryId: string) => void
  setCalendarTarget: (id: string, value: string) => void
  getCalendarTarget: (id: string) => number | ''
  unassignedSelectedCalendars: CalendarSummary[]
  goalsHealth: {
    assigned: number
    unassigned: number
    calendarTotal: number
    categoryTotal: number
    delta: number
    totalsMatch: boolean
  }
  resolvedColor: (cat: { color?: string | null }) => string
  onColorInput: (id: string, value: string) => void
}>()

const draggedCategoryId = ref('')
const draggedCalendarId = ref('')
const activeCategoryId = ref('')
const activeTemplateId = ref('')
const showSuggestionControls = ref(false)
let delayedHydration: ReturnType<typeof setTimeout> | null = null

const suggestedTotalTarget = computed(() =>
  props.selectedCalendars.reduce((sum, cal) => sum + Number(props.suggestedCalendarTargets[cal.id] ?? 0), 0),
)

const calendarsForCategory = computed(() => (categoryId: string) =>
  props.selectedCalendars.filter((cal) => props.assignments[cal.id] === categoryId),
)

const assignableCalendars = computed(() => (categoryId: string) =>
  props.selectedCalendars.filter((cal) => {
    const assigned = props.assignments[cal.id]
    return !assigned || assigned === categoryId
  }),
)

const categoryMeta = computed(() =>
  props.categories.map((cat) => {
    const assignedCalendars = props.selectedCalendars.filter((cal) => props.assignments[cal.id] === cat.id)
    const assigned = assignedCalendars.reduce((sum, cal) => sum + Number(props.getCalendarTarget(cal.id) || 0), 0)
    const target = Number(cat.targetHours || 0)
    const mismatch = Math.abs(target - assigned)
    return {
      id: cat.id,
      label: cat.label || 'Untitled category',
      assigned,
      target,
      mismatch,
      count: assignedCalendars.length,
    }
  }),
)

const primaryMismatch = computed(() => {
  const mismatched = categoryMeta.value
    .filter((item) => item.mismatch > 0.01)
    .sort((a, b) => b.mismatch - a.mismatch)
  return mismatched[0] ?? null
})

watch(
  () => [props.categories.map((cat) => cat.id).join(','), primaryMismatch.value?.id].join('::'),
  () => {
    if (primaryMismatch.value?.id) {
      activeCategoryId.value = primaryMismatch.value.id
      return
    }
    if (!props.categories.find((cat) => cat.id === activeCategoryId.value)) {
      activeCategoryId.value = props.categories[0]?.id ?? ''
    } else if (!activeCategoryId.value) {
      activeCategoryId.value = props.categories[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  () => [props.selectedStrategy, props.categories.length, props.categoryPresets.length].join('::'),
  () => {
    showSuggestionControls.value = false
    if (props.selectedStrategy === 'full_granular' && !props.categories.length && props.categoryPresets.length) {
      const fallback = props.categoryPresets[0]
      activeTemplateId.value = fallback.id
      if (delayedHydration) clearTimeout(delayedHydration)
      delayedHydration = setTimeout(() => {
        props.applyCategoryPreset(fallback)
      }, 0)
    }
  },
  { immediate: true },
)

function startDrag(categoryId: string) {
  draggedCategoryId.value = categoryId
}

function dropOn(categoryId: string) {
  if (!draggedCategoryId.value) return
  props.reorderCategory(draggedCategoryId.value, categoryId)
  draggedCategoryId.value = ''
}

function startCalendarDrag(calendarId: string) {
  draggedCalendarId.value = calendarId
}

function dropCalendarOn(calendarId: string) {
  if (!draggedCalendarId.value) return
  props.reorderSelectedCalendar(draggedCalendarId.value, calendarId)
  draggedCalendarId.value = ''
}

function handleAddCalendar(categoryId: string, select: HTMLSelectElement) {
  const calId = select.value
  if (!calId) return
  props.assignCalendar(calId, categoryId)
  select.value = ''
}

function categoryMismatch(cat: CategoryDraft) {
  return categoryMeta.value.find((item) => item.id === cat.id) ?? {
    id: cat.id,
    label: cat.label || 'Untitled category',
    assigned: 0,
    target: Number(cat.targetHours || 0),
    mismatch: Number(cat.targetHours || 0),
    count: 0,
  }
}

function categoryStatusLabel(cat: CategoryDraft) {
  const meta = categoryMismatch(cat)
  if (meta.mismatch <= 0.01) {
    return `${meta.count} calendar${meta.count === 1 ? '' : 's'} · matched`
  }
  return `${meta.count} calendar${meta.count === 1 ? '' : 's'} · ${meta.mismatch.toFixed(1)} h mismatch`
}

function calendarTargetLabel(calendarId: string) {
  return `${Number(props.getCalendarTarget(calendarId) || 0).toFixed(1)} h`
}

function calendarSuggestionLabel(calendarId: string) {
  const suggested = Number(props.suggestedCalendarTargets[calendarId] ?? 0)
  if (suggested > 0) {
    return `Suggested ${suggested.toFixed(1)} h`
  }
  return `Assigned ${calendarTargetLabel(calendarId)}`
}

function templateTone(index: number) {
  if (index === 0) return 'is-cool'
  if (index === 1) return 'is-warm'
  return 'is-forest'
}

function selectTemplate(preset: { id: string; title: string; description: string; colors: string[] }) {
  if (props.categories.length > 0 && activeTemplateId.value !== preset.id) {
    const shouldReplace = typeof window === 'undefined'
      ? true
      : window.confirm('Replace the current categories with this example set?')
    if (!shouldReplace) return
  }
  activeTemplateId.value = preset.id
  props.applyCategoryPreset(preset)
}
</script>
