<template>
  <div v-if="open" class="ov-backdrop" @mousedown.self="$emit('close')" @keydown.esc.stop="$emit('close')">
    <div class="overlay-panel" role="dialog" aria-modal="true" aria-label="Add a widget" @keydown.esc.stop="$emit('close')" @keydown.enter.stop="onEnterAdd">
      <!-- Header -->
      <div class="ov-head">
        <div class="ov-search">
          <svg class="ov-search-icon" viewBox="0 0 13 13" width="13" height="13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.6"/>
            <path d="M9 9l2.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <input
            ref="searchInputRef"
            v-model="search"
            class="ov-search-input"
            placeholder="Search widgets…"
            type="search"
            @keydown.esc.stop="$emit('close')"
            @keydown.enter.stop="onEnterAdd"
          />
        </div>
        <button class="ov-cancel" type="button" @click="$emit('close')">Cancel</button>
      </div>

      <!-- Category tabs -->
      <div class="ov-cats">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="ov-cat"
          :class="{ on: activeCat === cat }"
          @click="activeCat = cat"
        >{{ cat }}</button>
      </div>

      <!-- Widget grid -->
      <div class="ov-grid">
        <div
          v-for="entry in filteredTypes"
          :key="entry.type"
          class="ov-card"
          :class="{ on: selected === entry.type }"
          role="button"
          :title="entry.label"
          @click="selected = entry.type"
          @dblclick="confirmAdd(true)"
        >
          <div class="ov-preview">
            <WidgetPreview :type="entry.type" :selected="selected === entry.type" />
          </div>
          <div class="ov-name" :class="{ on: selected === entry.type }">{{ entry.label }}</div>
        </div>
        <div v-if="!filteredTypes.length" class="ov-empty">No widgets match your search.</div>
      </div>

      <!-- Footer -->
      <div class="ov-foot">
        <span class="ov-hint">↵ Add · Esc cancel{{ selected ? ` · ${selectedLabel}` : '' }}</span>
        <div class="ov-foot-actions">
          <button class="ov-add-soft" type="button" :disabled="!selected" @click="confirmAdd(false)">Add without closing</button>
          <button class="ov-add" type="button" :disabled="!selected" @click="confirmAdd(true)">
            Add{{ selectedLabel ? ` ${selectedLabel}` : ' widget' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import WidgetPreview from './WidgetPreview.vue'

const props = defineProps<{
  open: boolean
  widgetTypeList: Array<{ type: string; label: string; category?: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', type: string): void
}>()

const search = ref('')
const selected = ref('')
const activeCat = ref('All')
const searchInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.open, (val) => {
  if (val) {
    search.value = ''
    selected.value = ''
    activeCat.value = 'All'
    nextTick(() => searchInputRef.value?.focus())
  }
})

const categories = computed(() => {
  const cats = new Set<string>(['All'])
  props.widgetTypeList.forEach((w) => { if (w.category) cats.add(w.category) })
  const order = ['All', 'Time', 'Charts', 'Tasks', 'Notes']
  return order.filter(c => cats.has(c))
})

const filteredTypes = computed(() =>
  props.widgetTypeList.filter((w) => {
    const matchesCat = activeCat.value === 'All' || w.category === activeCat.value
    const matchesSearch = !search.value || w.label.toLowerCase().includes(search.value.toLowerCase())
    return matchesCat && matchesSearch
  }),
)

const selectedLabel = computed(() =>
  props.widgetTypeList.find(w => w.type === selected.value)?.label ?? ''
)

function confirmAdd(closeAfter: boolean) {
  if (!selected.value) return
  emit('select', selected.value)
  if (closeAfter) emit('close')
  else selected.value = ''
}

function onEnterAdd() {
  if (selected.value) confirmAdd(true)
}
</script>

<style scoped>
.ov-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(9, 14, 26, .55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.overlay-panel {
  background: var(--card, #fff);
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(9, 14, 26, .28), 0 4px 16px rgba(9, 14, 26, .12);
  width: 680px;
  max-width: 92vw;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line, #e2e8f0);
}

.ov-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 0;
}
.ov-search {
  flex: 1;
  height: 38px;
  border-radius: 11px;
  border: 1px solid color-mix(in oklab, var(--brand), transparent 78%);
  background: color-mix(in oklab, var(--brand), transparent 93%);
  display: flex;
  align-items: center;
  padding: 0 13px;
  gap: 8px;
  color: var(--brand, #2563eb);
}
.ov-search-icon { flex-shrink: 0; }
.ov-search-input {
  flex: 1;
  border: 0;
  background: none;
  font: inherit;
  color: var(--brand, #2563eb);
  font-size: 12px;
  font-weight: 700;
  outline: none;
}
.ov-search-input::placeholder { color: color-mix(in oklab, var(--brand), transparent 60%); font-weight: 500; }
.ov-cancel {
  height: 38px;
  border-radius: 11px;
  padding: 0 14px;
  border: 1px solid var(--line, #e2e8f0);
  font-size: 12px;
  font-weight: 800;
  color: var(--muted, #64748b);
  background: none;
  cursor: pointer;
  appearance: none;
  white-space: nowrap;
}

.ov-cats {
  display: flex;
  gap: 5px;
  padding: 12px 18px 0;
  flex-wrap: wrap;
}
.ov-cat {
  height: 28px;
  border-radius: 999px;
  padding: 0 13px;
  border: 1px solid var(--line, #e2e8f0);
  font-size: 11px;
  font-weight: 800;
  color: var(--muted, #64748b);
  background: none;
  cursor: pointer;
  appearance: none;
}
.ov-cat.on {
  border-color: color-mix(in oklab, var(--brand), transparent 78%);
  background: color-mix(in oklab, var(--brand), transparent 93%);
  color: var(--brand, #2563eb);
}

.ov-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 9px;
  padding: 12px 18px;
  overflow-y: auto;
  flex: 1;
}
.ov-card {
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 13px;
  padding: 10px 8px;
  background: var(--card, #fff);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.ov-card:hover { border-color: color-mix(in oklab, var(--brand), transparent 60%); background: color-mix(in oklab, var(--brand), transparent 96%); }
.ov-card.on {
  border: 2px solid var(--brand, #2563eb);
  background: color-mix(in oklab, var(--brand), transparent 93%);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand), transparent 88%);
}

.ov-preview {
  width: 100%;
  height: 46px;
  border-radius: 8px;
  background: color-mix(in oklab, var(--brand, #2563eb), transparent 95%);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.ov-name {
  font-size: 10px;
  font-weight: 900;
  color: var(--fg, #0f172a);
  text-align: center;
  line-height: 1.3;
}
.ov-name.on { color: var(--brand, #2563eb); }

.ov-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--muted, #64748b);
  font-size: 12px;
  padding: 24px 0;
}

.ov-foot {
  padding: 12px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line, #e2e8f0);
  flex-shrink: 0;
  gap: 8px;
}
.ov-hint {
  font-size: 11px;
  color: var(--muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ov-foot-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

.ov-add-soft {
  height: 36px;
  border-radius: 999px;
  padding: 0 16px;
  border: 1px solid var(--line, #e2e8f0);
  font-size: 12px;
  font-weight: 800;
  color: var(--muted, #64748b);
  background: none;
  cursor: pointer;
  appearance: none;
  white-space: nowrap;
}
.ov-add-soft:disabled { opacity: .4; cursor: default; }
.ov-add {
  height: 36px;
  border-radius: 999px;
  padding: 0 22px;
  background: var(--brand, #2563eb);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  border: 0;
  cursor: pointer;
  box-shadow: 0 6px 20px color-mix(in oklab, var(--brand), transparent 78%);
  appearance: none;
  white-space: nowrap;
}
.ov-add:disabled { opacity: .4; cursor: default; box-shadow: none; }
.ov-add:hover:not(:disabled) { filter: brightness(1.08); }
</style>
