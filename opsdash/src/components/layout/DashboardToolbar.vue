<template>
  <div v-if="editable" class="widget-toolbar-layer">
    <div class="widget-toolbar" :class="{ 'widget-toolbar--empty': !selectedItem }">
      <div class="toolbar-header">
        <div class="toolbar-heading">
          <div class="toolbar-kicker">Widget configuration</div>
          <div class="toolbar-title">
            <template v-if="selectedItem">{{ selectedItemTitle }}</template>
            <template v-else>Click a widget to edit</template>
          </div>
          <div class="toolbar-subtitle">
            <template v-if="selectedItem">Size, title and widget-specific options appear here.</template>
            <template v-else>Select a card in the grid to start editing.</template>
          </div>
        </div>
      </div>
      <div class="toolbar-body" v-if="selectedItem">
        <div class="toolbar-group toolbar-group--layout">
          <span class="toolbar-group__label">Layout</span>
          <div class="toolbar-actions">
            <button type="button" class="ghost" title="Move earlier" @click="$emit('move', 'up')">←</button>
            <button type="button" class="ghost" title="Move later" @click="$emit('move', 'down')">→</button>
            <button type="button" class="ghost" title="Cycle width" @click="$emit('cycle-width')">{{ widthLabel(selectedItem.layout.width) }}</button>
            <button type="button" class="ghost" title="Cycle height" @click="$emit('cycle-height')">{{ heightLabel(selectedItem.layout.height) }}</button>
          </div>
        </div>
        <div class="toolbar-group toolbar-group--appearance">
          <span class="toolbar-group__label">Appearance</span>
          <div class="toolbar-quick">
            <label class="toolbar-field">
              <span>Title</span>
              <input
                type="text"
                :value="optionValue('titlePrefix') || ''"
                placeholder="Prefix"
                @input="$emit('edit-options', selectedItem.id, 'titlePrefix', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="toolbar-field">
              <span>Card</span>
              <input
                type="color"
                :value="optionValue('cardBg') || '#ffffff'"
                @input="$emit('edit-options', selectedItem.id, 'cardBg', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="toolbar-field">
              <span>Scale</span>
              <select
                :value="optionValue('scale') || 'md'"
                @change="$emit('edit-options', selectedItem.id, 'scale', ($event.target as HTMLSelectElement).value)"
              >
                <option value="sm">Small</option>
                <option value="md">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">Extra large</option>
              </select>
            </label>
            <label class="toolbar-field toolbar-field--toggle">
              <input
                type="checkbox"
                :checked="optionValue('showHeader') !== false"
                @change="$emit('edit-options', selectedItem.id, 'showHeader', ($event.target as HTMLInputElement).checked)"
              />
              <span>Show title</span>
            </label>
          </div>
        </div>
        <div class="toolbar-group toolbar-group--actions">
          <span class="toolbar-group__label">Widget</span>
          <div class="toolbar-actions toolbar-actions--end">
            <WidgetOptionsMenu
              v-if="selectedItem && isConfigurable(selectedItem.type)"
              :entry="registryEntry(selectedItem.type)"
              :options="selectedItem.options"
              :open="openOptionsId === selectedItem.id"
              :show-advanced="selectedItem.type === 'targets_v2'"
              :context="context"
              :tabs="tabs"
              :current-tab-id="currentTabId"
              @toggle="(nextOpen) => $emit('toggle-options', selectedItem.id, nextOpen)"
              @open-advanced="$emit('open-advanced', selectedItem.id)"
              @change="(key,value)=>$emit('edit-options', selectedItem.id, key, value)"
              @move-to-tab="(tabId) => $emit('move-to-tab', selectedItem.id, tabId)"
              @duplicate-to-tab="(tabId) => $emit('duplicate-to-tab', selectedItem.id, tabId)"
            />
            <button
              v-if="presetLabel"
              type="button"
              class="ghost"
              title="Reset widgets to preset"
              @click="$emit('reset-preset')"
            >
              Reset {{ presetLabel }}
            </button>
            <button type="button" class="ghost danger" title="Remove widget" @click="$emit('remove')">✕</button>
          </div>
        </div>
      </div>
      <div class="toolbar-empty" v-else>
        <button type="button" class="ghost" @click="$emit('select-first')">Select first widget</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetOptionsMenu from './WidgetOptionsMenu.vue'
import { widgetsRegistry, type WidgetRenderContext } from '../../services/widgetsRegistry'

const props = defineProps<{
  editable?: boolean
  selectedItem: null | { id: string; layout: any; type: string; options: any; props: any }
  openOptionsId: string | null
  presetLabel?: string | null
  context: WidgetRenderContext
  tabs?: Array<{ id: string; label: string }>
  currentTabId?: string | null
}>()

defineEmits<{
  (e: 'select-first'): void
  (e: 'move', dir: 'up' | 'down'): void
  (e: 'cycle-width'): void
  (e: 'cycle-height'): void
  (e: 'remove'): void
  (e: 'reset-preset'): void
  (e: 'toggle-options', id: string, nextOpen: boolean): void
  (e: 'open-advanced', id: string): void
  (e: 'edit-options', id: string, key: string, value: any): void
  (e: 'move-to-tab', id: string, tabId: string): void
  (e: 'duplicate-to-tab', id: string, tabId: string): void
}>()

const selectedItemTitle = computed(() => {
  const title = (props.selectedItem?.props as any)?.title || ''
  if (title) return title
  const registry = props.selectedItem ? widgetsRegistry[props.selectedItem.type] : null
  return registry?.label || props.selectedItem?.type || 'Widget'
})

function optionValue(key: string) {
  return props.selectedItem?.options?.[key]
}

function registryEntry(type: string) {
  return widgetsRegistry[type]
}

function isConfigurable(type: string) {
  return Boolean(widgetsRegistry[type]?.configurable)
}

function widthLabel(width: string) {
  if (width === 'quarter') return '¼'
  if (width === 'half') return '½'
  return '1×'
}

function heightLabel(height: string) {
  if (height === 's') return 'S'
  if (height === 'l') return 'L'
  if (height === 'xl') return 'XL'
  return 'M'
}
</script>

<style scoped>
.ghost {
  border: 1px solid var(--tb-btn-border, #cbd5e1);
  background: var(--tb-btn-bg, #ffffff);
  color: var(--tb-btn-fg, #0f172a);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}

.ghost:hover {
  background: var(--tb-btn-hover-bg, #f8fafc);
  border-color: var(--tb-btn-hover-border, #94a3b8);
}

.ghost.danger {
  color: var(--tb-danger, #b91c1c);
  border-color: color-mix(in oklab, var(--tb-danger, #b91c1c), transparent 55%);
}

.widget-toolbar-layer {
  position: sticky;
  top: 8px;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 14px;
  padding: 0;
  width: 100%;
  background: none;
}
.widget-toolbar {
  --tb-bg: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%);
  --tb-border: color-mix(in oklab, #2563eb, #cbd5e1 68%);
  --tb-shadow: 0 10px 24px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.12);
  --tb-hover-bg: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,245,249,0.99) 100%);
  --tb-hover-shadow: 0 12px 28px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(37, 99, 235, 0.18);
  --tb-fg: #0f172a;
  --tb-muted: #475569;
  --tb-input-bg: color-mix(in oklab, #ffffff, #f8fafc 70%);
  --tb-input-border: color-mix(in oklab, #94a3b8, transparent 36%);
  --tb-input-fg: #0f172a;
  --tb-btn-bg: color-mix(in oklab, #ffffff, #f8fafc 48%);
  --tb-btn-border: color-mix(in oklab, #94a3b8, transparent 30%);
  --tb-btn-fg: #0f172a;
  --tb-btn-hover-bg: color-mix(in oklab, #dbeafe, #ffffff 72%);
  --tb-btn-hover-border: color-mix(in oklab, #2563eb, transparent 48%);
  position: relative;
  margin-top: 0;
  padding: 10px 14px;
  border: 1px solid var(--tb-border);
  background: var(--tb-bg);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 6px;
  box-shadow: var(--tb-shadow);
  max-width: none;
  width: 100%;
  opacity:1;
  backdrop-filter: blur(6px);
  transition: background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.widget-toolbar--empty {
  align-items: stretch;
}

:global(body.opsdash-theme-dark .widget-toolbar) {
  --tb-bg: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%);
  --tb-border: color-mix(in oklab, #2563eb, transparent 30%);
  --tb-shadow: 0 10px 24px rgba(2, 6, 23, 0.62), 0 0 0 1px rgba(59, 130, 246, 0.2);
  --tb-hover-bg: linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%);
  --tb-hover-shadow: 0 12px 28px rgba(2, 6, 23, 0.66), 0 0 0 1px rgba(59, 130, 246, 0.26);
  --tb-fg: #e5e7eb;
  --tb-muted: #94a3b8;
  --tb-input-bg: color-mix(in oklab, #0f172a, #111827 70%);
  --tb-input-border: color-mix(in oklab, #475569, transparent 28%);
  --tb-input-fg: #e2e8f0;
  --tb-btn-bg: color-mix(in oklab, #111827, #1f2937 80%);
  --tb-btn-border: color-mix(in oklab, #4b5563, transparent 35%);
  --tb-btn-fg: #f1f5f9;
  --tb-btn-hover-bg: color-mix(in oklab, #2563EB, #111827 85%);
  --tb-btn-hover-border: color-mix(in oklab, #2563EB, transparent 50%);
}

.widget-toolbar:hover {
  background: var(--tb-hover-bg);
  box-shadow: var(--tb-hover-shadow);
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toolbar-heading {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.toolbar-kicker {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tb-muted);
}

.toolbar-title {
  font-weight:600;
  font-size:14px;
  color: var(--tb-fg);
  min-width: 140px;
}

.toolbar-subtitle {
  font-size: 11px;
  color: var(--tb-muted);
}

.toolbar-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: stretch;
}

.toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 9px;
  border: 1px solid color-mix(in oklab, var(--tb-border), transparent 12%);
  background: color-mix(in oklab, var(--tb-input-bg), transparent 6%);
}

.toolbar-group--layout {
  min-width: 148px;
}

.toolbar-group--appearance {
  flex: 1 1 320px;
}

.toolbar-group--actions {
  min-width: 150px;
}

.toolbar-group__label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tb-muted);
}

.toolbar-actions {
  display:flex;
  gap:5px;
  flex-wrap:wrap;
  align-items:center;
}

.toolbar-actions--end {
  justify-content: flex-end;
}

.toolbar-quick {
  display:flex;
  gap:5px;
  flex-wrap:wrap;
  align-items:center;
}

.toolbar-empty {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .widget-toolbar-layer {
    top: 6px;
  }

  .widget-toolbar {
    align-items: stretch;
  }

  .toolbar-title {
    min-width: 0;
  }

  .toolbar-body {
    width: 100%;
  }

  .toolbar-group {
    width: 100%;
  }

  .toolbar-actions--end {
    justify-content: flex-start;
  }
}

.toolbar-field {
  display:flex;
  align-items:center;
  gap:5px;
  font-size:11px;
  color: var(--tb-fg);
}

.toolbar-field span {
  opacity: 0.82;
  color: var(--tb-muted);
}
.toolbar-field input[type="text"],
.toolbar-field select {
  border-radius: 6px;
  border: 1px solid var(--tb-input-border);
  background: var(--tb-input-bg);
  color: var(--tb-input-fg);
  padding: 2px 5px;
  font-size: 11px;
  min-width: 72px;
}

.toolbar-field input[type="color"] {
  width: 24px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--tb-input-border);
  border-radius: 6px;
  background: transparent;
}

.toolbar-field--toggle {
  gap: 4px;
}

.widget-toolbar .ghost {
  padding: 4px 7px;
  font-size: 11px;
}

@media (max-width: 1200px) {
  .toolbar-subtitle {
    display: none;
  }
}

@media (max-width: 1100px) {
  .widget-toolbar {
    padding: 8px 10px;
  }

  .toolbar-group {
    padding: 5px 7px;
  }

  .toolbar-group--layout {
    min-width: 136px;
  }

  .toolbar-group--appearance {
    flex-basis: 300px;
  }

  .toolbar-group--actions {
    min-width: 140px;
  }
}

.widget-toolbar .ghost:hover {
  background: var(--tb-btn-hover-bg);
  border-color: var(--tb-btn-hover-border);
}
</style>
