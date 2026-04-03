<template>
  <div class="layout-wrapper" :class="{ 'editable-mode': editable }" @click.self="clearSelection">
    <DashboardToolbar
      :editable="editable && !advancedTargetsId"
      :selected-item="selectedItem"
      :open-options-id="openOptionsId"
      :preset-label="presetLabel"
      :context="context"
      :tabs="tabs"
      :current-tab-id="currentTabId"
      @select-first="selectFirst"
      @move="moveSelected"
      @cycle-width="cycleSelectedWidth"
      @cycle-height="cycleSelectedHeight"
      @remove="removeSelected"
      @reset-preset="emit('reset:preset')"
      @toggle-options="toggleOptions"
      @open-advanced="openAdvancedTargets"
      @edit-options="(id, key, value) => emit('edit:options', id, key, value)"
      @move-to-tab="(id, tabId) => emit('edit:move-tab', id, tabId)"
      @duplicate-to-tab="(id, tabId) => emit('edit:duplicate-tab', id, tabId)"
    />

    <DashboardGrid
      :ordered="ordered"
      :editable="editable"
      :selected-id="selectedId"
      :widget-type-list="widgetTypeList"
      @select="selectItem"
      @select-cell="selectCell"
      @add="(type, hint) => emit('edit:add', type, hint)"
      @reorder="(id, hint) => emit('edit:reorder', id, hint)"
    />

    <DashboardAdvancedTargetsOverlay
      :widget-id="advancedTargetsId"
      :widgets="widgets"
      :context-targets-config="context.targetsConfig"
      :context-targets-week="context.targetsWeek"
      :context-groups-by-id="context.groupsById"
      :context-calendars="context.calendars"
      :context-selected="context.selected"
      :strategy="context.onboardingStrategy"
      @close="closeAdvancedTargets"
      @save="saveAdvancedTargets"
      @use-global="resetToGlobalTargets"
      @open-onboarding="openOnboardingTargets"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WidgetDefinition, WidgetRenderContext } from '../../services/widgetsRegistry'
import { mapWidgetToComponent } from '../../services/widgetsRegistry'
import DashboardGrid from './DashboardGrid.vue'
import DashboardToolbar from './DashboardToolbar.vue'
import DashboardAdvancedTargetsOverlay from './DashboardAdvancedTargetsOverlay.vue'

type AdvancedTargetsPayload = {
  localConfig: Record<string, any> | null
  localTargetsWeek: Record<string, number>
  localGroupsById: Record<string, number>
}

const props = defineProps<{
  widgets: WidgetDefinition[]
  context: WidgetRenderContext
  editable?: boolean
  widgetTypes?: Array<{ type: string; label: string }>
  presetLabel?: string | null
  tabs?: Array<{ id: string; label: string }>
  currentTabId?: string | null
}>()

const emit = defineEmits<{
  (e: 'edit:width', id: string): void
  (e: 'edit:height', id: string): void
  (e: 'edit:remove', id: string): void
  (e: 'edit:move', id: string, dir: 'up' | 'down'): void
  (e: 'edit:move-tab', id: string, tabId: string): void
  (e: 'edit:duplicate-tab', id: string, tabId: string): void
  (e: 'edit:options', id: string, key: string, value: any): void
  (e: 'edit:add', type: string, orderHint?: number): void
  (e: 'edit:reorder', id: string, orderHint?: number | null): void
  (e: 'open:onboarding', step?: string): void
  (e: 'reset:preset'): void
  (e: 'select:cell', orderHint?: number): void
}>()

const openOptionsId = ref<string | null>(null)
const advancedTargetsId = ref<string | null>(null)
const selectedId = ref<string | null>(null)

const ordered = computed(() => {
  return (props.widgets || [])
    .slice()
    .sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    .map((def) => {
      const mapped = mapWidgetToComponent(def, props.context)
      if (!mapped) return null
      const options = def.options || {}
      return { ...mapped, id: def.id, layout: def.layout, type: def.type, options }
    })
    .filter(Boolean) as Array<{ id: string; component: any; props: any; layout: any; type: string; options: any; loading?: boolean }>
})

const selectedItem = computed(() => ordered.value.find((w) => w.id === selectedId.value) || null)
const widgetTypeList = computed(() => props.widgetTypes || [])

watch(
  () => props.editable,
  (next) => {
    if (!next) {
      selectedId.value = null
      openOptionsId.value = null
      advancedTargetsId.value = null
    }
  },
  { immediate: true },
)

watch(
  () => ordered.value.map((w) => w.id).join('|'),
  () => {
    if (selectedId.value && !ordered.value.find((w) => w.id === selectedId.value)) {
      selectedId.value = null
    }
  },
)

function toggleOptions(id: string, nextOpen: boolean) {
  openOptionsId.value = nextOpen ? id : null
  if (!nextOpen && advancedTargetsId.value === id) {
    advancedTargetsId.value = null
  }
}

function selectItem(id: string) {
  selectedId.value = id
  openOptionsId.value = null
}

function selectFirst() {
  if (ordered.value.length) {
    selectedId.value = ordered.value[0].id
  }
}

function clearSelection() {
  selectedId.value = null
  openOptionsId.value = null
  advancedTargetsId.value = null
}

function cycleSelectedWidth() {
  if (selectedId.value) {
    emit('edit:width', selectedId.value)
  }
}

function cycleSelectedHeight() {
  if (selectedId.value) {
    emit('edit:height', selectedId.value)
  }
}

function moveSelected(dir: 'up' | 'down') {
  if (selectedId.value) emit('edit:move', selectedId.value, dir)
}

function removeSelected() {
  if (selectedId.value) emit('edit:remove', selectedId.value)
}

function openAdvancedTargets(id: string) {
  selectedId.value = id
  openOptionsId.value = null
  advancedTargetsId.value = id
}

function closeAdvancedTargets() {
  openOptionsId.value = null
  advancedTargetsId.value = null
}

function saveAdvancedTargets(widgetId: string, payload: AdvancedTargetsPayload) {
  emit('edit:options', widgetId, 'localConfig', payload.localConfig)
  emit('edit:options', widgetId, 'localTargetsWeek', payload.localTargetsWeek)
  emit('edit:options', widgetId, 'localGroupsById', payload.localGroupsById)
  emit('edit:options', widgetId, 'useLocalConfig', true)
  closeAdvancedTargets()
}

function resetToGlobalTargets(widgetId: string) {
  emit('edit:options', widgetId, 'localTargetsWeek', null)
  emit('edit:options', widgetId, 'localGroupsById', null)
  emit('edit:options', widgetId, 'localConfig', null)
  emit('edit:options', widgetId, 'useLocalConfig', false)
  closeAdvancedTargets()
}

function openOnboardingTargets(step?: string) {
  closeAdvancedTargets()
  emit('open:onboarding', step)
}

function openOptionsForSelected() {
  if (selectedId.value) {
    openOptionsId.value = selectedId.value
  }
}

function selectCell(orderHint?: number) {
  emit('select:cell', orderHint)
}

defineExpose({
  openOptionsForSelected,
})
</script>

<style scoped>
.layout-wrapper{
  position:relative;
}
.layout-wrapper.editable-mode{
  overflow:visible;
}
</style>
