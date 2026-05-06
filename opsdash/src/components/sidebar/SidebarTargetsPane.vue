<template>
  <div
    id="opsdash-sidebar-pane-targets"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-targets"
  >
    <div class="sb-title">Target Settings</div>
    <div class="target-config">
      <div class="field">
        <span class="label">Total target (h)</span>
        <div class="input-unit">
          <input
            type="number"
            :value="targets.totalHours"
            min="0"
            max="1000"
            step="0.5"
            :aria-invalid="!!totalTargetMessage"
            @input="$emit('total-target-input', ($event.target as HTMLInputElement).value)"
          />
          <span class="unit">h / week</span>
        </div>
        <div v-if="totalTargetMessage" :class="['input-message', totalTargetMessage?.tone]">
          {{ totalTargetMessage?.text }}
        </div>
      </div>
      <div class="field">
        <span class="label">All-day event (h per day)</span>
        <div class="input-unit">
          <input
            type="number"
            :value="targets.allDayHours"
            min="0"
            max="24"
            step="0.25"
            :aria-invalid="!!allDayHoursMessage"
            @input="$emit('set-all-day-hours', ($event.target as HTMLInputElement).value)"
          />
          <span class="unit">h / day</span>
        </div>
        <div v-if="allDayHoursMessage" :class="['input-message', allDayHoursMessage?.tone]">
          {{ allDayHoursMessage?.text }}
        </div>
      </div>
      <div class="target-category" v-for="cat in categoryOptions" :key="cat.id">
        <div class="cat-header">
          <span
            class="cat-color-indicator"
            :style="{ backgroundColor: resolvedColor(cat) }"
            aria-hidden="true"
          />
          <input
            class="cat-name"
            type="text"
            :value="cat.label"
            placeholder="Category name"
            @input="$emit('set-category-label', { id: cat.id, label: ($event.target as HTMLInputElement).value })"
          />
          <button
            class="remove-cat"
            type="button"
            :disabled="categoryOptions.length <= 1"
            title="Remove category"
            @click="$emit('remove-category', cat.id)"
          >
            ✕
          </button>
        </div>
        <div class="cat-fields">
          <label class="field">
            <span class="label">Target (h)</span>
            <div class="input-unit">
              <input
                type="number"
                :value="cat.targetHours"
                min="0"
                max="1000"
                step="0.5"
                :aria-invalid="!!categoryTargetMessages[cat.id]"
                @input="$emit('set-category-target', { id: cat.id, value: ($event.target as HTMLInputElement).value })"
              />
              <span class="unit">h / week</span>
            </div>
            <div v-if="categoryTargetMessages[cat.id]" :class="['input-message', categoryTargetMessages[cat.id]?.tone]">
              {{ categoryTargetMessages[cat.id]?.text }}
            </div>
          </label>
          <label class="field">
            <span class="label">Category pace method</span>
            <select
              :value="cat.paceMode || targets.pace.mode"
              @change="$emit('set-category-pace', { id: cat.id, mode: ($event.target as HTMLSelectElement).value })"
            >
              <option value="days_only">Days only</option>
              <option value="time_aware">Time aware</option>
            </select>
            <span class="field-hint">Time aware adapts pacing based on hours already logged.</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="cat.includeWeekend"
            @change="$emit('set-category-weekend', { id: cat.id, value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Weekend</span>
        </label>
        <div class="field color-field">
          <ColorPickerPopover
            :model-value="resolvedColor(cat)"
            :palette="colorPalette"
            :aria-label="`Choose color for ${cat.label}`"
            @update:model-value="(color) => emit('set-category-color', { id: cat.id, color })"
          />
        </div>
      </div>
    </div>
      <NcButton
        type="tertiary"
        class="add-category"
        :disabled="!canAddCategory"
        @click="$emit('add-category')"
      >
        Add category
      </NcButton>

      <div class="target-section">
        <div class="section-title">Pace</div>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.pace.includeWeekendTotal"
            @change="$emit('set-include-weekend-total', ($event.target as HTMLInputElement).checked)"
          />
          <span>Count weekend in total pace</span>
        </label>
        <label class="field">
          <span class="label">Total pace method</span>
          <select
            :value="targets.pace.mode"
            @change="$emit('set-pace-mode', ($event.target as HTMLSelectElement).value)"
          >
            <option value="days_only">Days only</option>
            <option value="time_aware">Time aware</option>
          </select>
        </label>
        <label class="field">
          <span class="label">On track ≥ gap (%)</span>
          <input
            type="number"
            :value="targets.pace.thresholds.onTrack"
            step="0.1"
            :aria-invalid="!!paceThresholdMessages.onTrack"
            @input="$emit('set-threshold', { key: 'onTrack', value: ($event.target as HTMLInputElement).value })"
          />
          <div v-if="paceThresholdMessages.onTrack" :class="['input-message', paceThresholdMessages.onTrack?.tone]">
            {{ paceThresholdMessages.onTrack?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">At risk ≥ gap (%)</span>
          <input
            type="number"
            :value="targets.pace.thresholds.atRisk"
            step="0.1"
            :aria-invalid="!!paceThresholdMessages.atRisk"
            @input="$emit('set-threshold', { key: 'atRisk', value: ($event.target as HTMLInputElement).value })"
          />
          <div v-if="paceThresholdMessages.atRisk" :class="['input-message', paceThresholdMessages.atRisk?.tone]">
            {{ paceThresholdMessages.atRisk?.text }}
          </div>
        </label>
      </div>

      <div class="target-section">
        <div class="section-title">Forecast</div>
        <label class="field">
          <span class="label">Forecast method</span>
          <select
            :value="targets.forecast.methodPrimary"
            @change="$emit('set-forecast-method', ($event.target as HTMLSelectElement).value)"
          >
            <option value="linear">Linear</option>
            <option value="momentum">Momentum</option>
          </select>
        </label>
        <label class="field">
          <span class="label">Momentum window (days)</span>
          <input
            type="number"
            :value="targets.forecast.momentumLastNDays"
            min="1"
            max="14"
            step="1"
            :aria-invalid="!!forecastMomentumMessage"
            @input="$emit('set-forecast-momentum', ($event.target as HTMLInputElement).value)"
          />
          <div v-if="forecastMomentumMessage" :class="['input-message', forecastMomentumMessage?.tone]">
            {{ forecastMomentumMessage?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Padding (±h)</span>
          <input
            type="number"
            :value="targets.forecast.padding"
            min="0"
            step="0.1"
            :aria-invalid="!!forecastPaddingMessage"
            @input="$emit('set-forecast-padding', ($event.target as HTMLInputElement).value)"
          />
          <div v-if="forecastPaddingMessage" :class="['input-message', forecastPaddingMessage?.tone]">
            {{ forecastPaddingMessage?.text }}
          </div>
        </label>
      </div>

      <div class="target-section">
        <div class="section-title">Display</div>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showCalendarCharts"
            @change="$emit('set-ui-option', { key: 'showCalendarCharts', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show calendar charts</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showCategoryCharts"
            @change="$emit('set-ui-option', { key: 'showCategoryCharts', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show category charts</span>
        </label>
      </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { NcButton } from '@nextcloud/vue'
import ColorPickerPopover from '../ColorPickerPopover.vue'
import type { TargetsConfig } from '../../services/targets'

type InputMessage = { text: string; tone: 'error' | 'warning' }

const props = defineProps<{
  targets: TargetsConfig
  categoryOptions: Array<{
    id: string
    label: string
    targetHours: number
    includeWeekend: boolean
    paceMode?: string
    color?: string | null
  }>
  totalTargetMessage: InputMessage | null
  allDayHoursMessage: InputMessage | null
  categoryTargetMessages: Record<string, InputMessage | null>
  paceThresholdMessages: { onTrack: InputMessage | null; atRisk: InputMessage | null }
  forecastMomentumMessage: InputMessage | null
  forecastPaddingMessage: InputMessage | null
  canAddCategory: boolean
  colorPalette: string[]
}>()

const {
  targets,
  categoryOptions,
  totalTargetMessage,
  allDayHoursMessage,
  categoryTargetMessages,
  paceThresholdMessages,
  forecastMomentumMessage,
  forecastPaddingMessage,
  canAddCategory,
  colorPalette,
} = toRefs(props)

const emit = defineEmits<{
  (e: 'total-target-input', value: string): void
  (e: 'set-all-day-hours', value: string): void
  (e: 'set-category-label', payload: { id: string; label: string }): void
  (e: 'remove-category', id: string): void
  (e: 'set-category-target', payload: { id: string; value: string }): void
  (e: 'set-category-pace', payload: { id: string; mode: string }): void
  (e: 'set-category-weekend', payload: { id: string; value: boolean }): void
  (e: 'set-category-color', payload: { id: string; color: string }): void
  (e: 'add-category'): void
  (e: 'set-include-weekend-total', value: boolean): void
  (e: 'set-pace-mode', mode: string): void
  (e: 'set-threshold', payload: { key: 'onTrack' | 'atRisk'; value: string }): void
  (e: 'set-forecast-method', method: string): void
  (e: 'set-forecast-momentum', value: string): void
  (e: 'set-forecast-padding', value: string): void
  (e: 'set-ui-option', payload: { key: string; value: boolean }): void
}>()

const defaultColor = computed(() => sanitizeColor(colorPalette.value?.[0]) ?? '#2563EB')

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

function resolvedColor(cat: { color?: string | null }): string {
  return sanitizeColor(cat?.color) ?? defaultColor.value
}

function applyColor(id: string, value: string) {
  const color = sanitizeColor(value) ?? defaultColor.value
  emit('set-category-color', { id, color })
  closeColorPopover()
}
</script>

<style scoped>
.cat-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--fg), transparent 80%);
  flex-shrink: 0;
}

.cat-header .cat-name {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: color-mix(in oklab, var(--card), transparent 5%);
  color: var(--fg);
}

.color-trigger-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.color-button{
  display:inline-flex;
  align-items:center;
  gap:6px;
  border:1px solid color-mix(in oklab, var(--line), transparent 20%);
  background:var(--card, #fff);
  border-radius:999px;
  padding:4px 9px;
  font-size:12px;
  color:var(--fg);
  cursor: pointer;
}

.color-button:hover{
  border-color:color-mix(in oklab, var(--brand, #2563eb), transparent 40%);
}

.color-button:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 40%);
  outline-offset: 2px;
}

.input-unit{
  display:grid;
  grid-template-columns:1fr auto;
  align-items:center;
  border:1px solid color-mix(in oklab, var(--line), transparent 10%);
  border-radius:8px;
  overflow:hidden;
  background:color-mix(in oklab, var(--card, #fff), transparent 8%);
}

.input-unit input{
  border:none;
  background:transparent;
  padding:7px 10px;
  color:var(--fg);
}

.input-unit .unit{
  padding:6px 10px;
  font-size:11px;
  color:var(--muted);
  white-space:nowrap;
  background:color-mix(in oklab, var(--line), transparent 70%);
}

.field-hint{
  display:block;
  margin-top:4px;
  font-size:11px;
  color:var(--muted);
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 20px));
  justify-content: flex-start;
  gap: 6px;
}

.color-swatch {
  width: 18px !important;
  height: 18px !important;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, #000, transparent 80%);
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.color-swatch.active {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--brand, #2563eb), transparent 60%);
}

.color-swatch:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 40%);
  outline-offset: 1px;
}
</style>
