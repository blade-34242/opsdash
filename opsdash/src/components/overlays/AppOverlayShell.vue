<template>
  <transition name="onboarding-fade">
    <div
      v-if="visible"
      class="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ariaLabelledby"
      :aria-label="ariaLabel"
    >
      <div class="onboarding-backdrop" @click="handleBackdropClose"></div>
      <div
        ref="panelRef"
        class="onboarding-panel"
        :class="[panelClass, `theme-${theme}`]"
        tabindex="-1"
        @click.stop
        @keydown.esc.prevent="handleEscClose"
      >
        <slot />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  theme: 'light' | 'dark'
  panelClass?: string | string[] | Record<string, boolean>
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  ariaLabelledby?: string
  ariaLabel?: string
}>(), {
  panelClass: '',
  closeOnBackdrop: true,
  closeOnEsc: true,
  ariaLabelledby: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const panelRef = ref<HTMLDivElement | null>(null)

function requestClose() {
  emit('close')
}

function handleBackdropClose() {
  if (!props.closeOnBackdrop) return
  requestClose()
}

function handleEscClose() {
  if (!props.closeOnEsc) return
  requestClose()
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    nextTick(() => {
      panelRef.value?.focus()
    }).catch(() => {})
  },
)
</script>
