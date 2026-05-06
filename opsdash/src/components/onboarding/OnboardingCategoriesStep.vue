<template>
  <h3>Configure categories &amp; targets</h3>
  <p v-if="!categoriesEnabled" class="hint">This strategy does not require categories.</p>
  <template v-else>
    <div class="category-presets">
      <h4>Quick start presets</h4>
      <p class="hint">Pick a preset to create categories fast. You can edit everything after.</p>
      <div class="preset-grid">
        <button
          v-for="preset in categoryPresets"
          :key="preset.id"
          type="button"
          class="preset-card"
          @click="applyCategoryPreset(preset)"
        >
          <div class="preset-title">{{ preset.title }}</div>
          <div class="preset-desc">{{ preset.description }}</div>
          <div class="preset-swatches">
            <span
              v-for="color in preset.colors"
              :key="`${preset.id}-${color}`"
              class="preset-swatch"
              :style="{ backgroundColor: color }"
              aria-hidden="true"
            />
          </div>
        </button>
      </div>
    </div>
    <div class="categories-editor">
      <div v-if="!categories.length" class="empty-state">
        <p>No categories yet. Add at least one to continue.</p>
      </div>
      <article v-for="cat in categories" :key="cat.id" class="category-card">
        <header class="category-card__header">
          <ColorPickerPopover
            :model-value="resolvedColor(cat)"
            :palette="categoryColorPalette"
            :aria-label="`Choose color for ${cat.label}`"
            @update:model-value="(color) => applyColor(cat.id, color)"
          />
          <input
            class="category-name"
            type="text"
            :value="cat.label"
            placeholder="Category name"
            @input="setCategoryLabel(cat.id, ($event.target as HTMLInputElement).value)"
          />
          <div class="category-actions">
            <button
              class="remove-category"
              type="button"
              :disabled="categories.length <= 1"
              title="Remove category"
              @click="removeCategory(cat.id)"
            >
              ✕
            </button>
          </div>
        </header>
        <div class="category-card__fields">
          <label class="field">
            <span class="label">Target</span>
            <div class="input-unit">
              <input
                type="number"
                :value="cat.targetHours"
                min="0"
                step="0.5"
                @input="setCategoryTarget(cat.id, ($event.target as HTMLInputElement).value)"
              />
              <span class="unit">h / week</span>
            </div>
          </label>
          <label class="field">
            <span class="label">Pacing</span>
            <select
              :value="cat.paceMode"
              @change="setCategoryPaceMode(cat.id, ($event.target as HTMLSelectElement).value as CategoryDraft['paceMode'])"
            >
              <option value="days_only">Days only</option>
              <option value="time_aware">Time aware</option>
            </select>
            <span class="field-hint">Time aware adjusts for time already logged.</span>
          </label>
          <label class="field checkbox">
            <input
              type="checkbox"
              :checked="cat.includeWeekend"
              @change="toggleCategoryWeekend(cat.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>Include weekend</span>
          </label>
        </div>
      </article>
      <NcButton type="tertiary" class="add-category" @click="addCategory">Add category</NcButton>
      <div v-if="categories.length" class="category-total">Total weekly target: {{ categoryTotalHours.toFixed(1) }} h</div>
    </div>

    <div v-if="selectedCalendars.length" class="calendar-assignments">
      <h4>Assign calendars (optional)</h4>
      <p class="hint">Use assignments to group calendars in category charts.</p>
      <div v-for="cal in selectedCalendars" :key="cal.id" class="assignment-row">
        <span class="cal-name">{{ cal.displayname }}</span>
        <select :value="assignments[cal.id]" @change="assignCalendar(cal.id, ($event.target as HTMLSelectElement).value)">
          <option value="">Unassigned</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
      </div>
      <p v-if="!categories.length" class="warning">Add at least one category to assign calendars.</p>
    </div>
    <div v-if="selectedCalendars.length && showCalendarTargets" class="calendar-targets">
      <h4>Calendar targets (h / week)</h4>
      <div v-for="cal in selectedCalendars" :key="`targets-${cal.id}`" class="target-row">
        <span class="cal-name">{{ cal.displayname }}</span>
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
    <p v-if="!selectedCalendars.length" class="hint">Select at least one calendar to continue.</p>
  </template>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import type { CalendarSummary, CategoryDraft } from '../../services/onboarding'
import ColorPickerPopover from '../ColorPickerPopover.vue'

defineProps<{
  categoriesEnabled: boolean
  categories: CategoryDraft[]
  categoryTotalHours: number
  selectedCalendars: CalendarSummary[]
  assignments: Record<string, string>
  showCalendarTargets: boolean
  calendarTargets: Record<string, number>
  getCalendarTarget: (id: string) => number | ''
  setCalendarTarget: (id: string, value: string) => void
  addCategory: () => void
  removeCategory: (id: string) => void
  setCategoryLabel: (id: string, value: string) => void
  categoryPresets: Array<{
    id: string
    title: string
    description: string
    colors: string[]
    categories: Array<Pick<CategoryDraft, 'id' | 'label' | 'targetHours' | 'includeWeekend' | 'paceMode' | 'color'>>
  }>
  applyCategoryPreset: (preset: {
    id: string
    title: string
    description: string
    colors: string[]
    categories: Array<Pick<CategoryDraft, 'id' | 'label' | 'targetHours' | 'includeWeekend' | 'paceMode' | 'color'>>
  }) => void
  setCategoryTarget: (id: string, value: string) => void
  setCategoryPaceMode: (id: string, value: CategoryDraft['paceMode']) => void
  toggleCategoryWeekend: (id: string, checked: boolean) => void
  assignCalendar: (calId: string, categoryId: string) => void
  categoryColorPalette: string[]
  resolvedColor: (cat: { color?: string | null }) => string
  applyColor: (id: string, value: string) => void
}>()
</script>
