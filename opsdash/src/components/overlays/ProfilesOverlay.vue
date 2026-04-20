<template>
  <AppOverlayShell
    :visible="visible"
    :theme="theme"
    panel-class="profiles-overlay"
    aria-labelledby="profiles-overlay-title"
    @close="emit('close')"
  >
        <header class="onboarding-header profiles-overlay__header">
          <div class="onboarding-title">
            <h2 id="profiles-overlay-title">Profiles</h2>
            <p class="subtitle">
              Export/import full configs or save/load named profiles (calendars, groups, targets, widgets, settings).
            </p>
          </div>
          <div class="onboarding-actions">
            <button
              type="button"
              class="close-btn"
              aria-label="Close profiles"
              @click="emit('close')"
            >
              x
            </button>
          </div>
        </header>

        <main class="onboarding-body profiles-overlay__body">
          <SidebarProfilesPane
            :presets="presets"
            :is-loading="isLoading"
            :is-saving="isSaving"
            :is-applying="isApplying"
            :warnings="warnings"
            :show-header="false"
            :as-panel="false"
            @save="(name) => emit('save', name)"
            @load="(name) => emit('load', name)"
            @delete="(name) => emit('delete', name)"
            @refresh="() => emit('refresh')"
            @clear-warnings="() => emit('clear-warnings')"
            @export-config="() => emit('export-config')"
            @import-config="(file) => emit('import-config', file)"
          />
        </main>
  </AppOverlayShell>
</template>

<script setup lang="ts">
import AppOverlayShell from './AppOverlayShell.vue'
import SidebarProfilesPane from '../sidebar/SidebarProfilesPane.vue'

defineProps<{
  visible: boolean
  theme: 'light' | 'dark'
  presets: Array<{ name: string; createdAt?: string | null; updatedAt?: string | null; selectedCount: number; calendarCount: number }>
  isLoading: boolean
  isSaving: boolean
  isApplying: boolean
  warnings: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', name: string): void
  (e: 'load', name: string): void
  (e: 'delete', name: string): void
  (e: 'refresh'): void
  (e: 'clear-warnings'): void
  (e: 'export-config'): void
  (e: 'import-config', file: File): void
}>()

</script>

<style scoped>
.profiles-overlay__body {
  padding-right: 4px;
  margin-right: -4px;
}
</style>
