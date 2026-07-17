import { ref, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

import { KEYBOARD_SHORTCUT_GROUPS } from '../src/services/shortcuts'

interface KeyboardShortcutDeps {
  goPrevious: () => void | Promise<void>
  goNext: () => void | Promise<void>
  toggleRange: () => void | Promise<void>
  openWidgetOptions?: () => void | Promise<void>
  openConfigPanel?: () => void
  ensureSidebarVisible?: () => void
  toggleEditLayout?: () => void | Promise<void>
}

export function useKeyboardShortcuts(deps: KeyboardShortcutDeps) {
  const shortcutsOpen = ref(false)
  const triggerEl = ref<HTMLElement | null>(null)
  let listenerBound = false
  const hasInstance = !!getCurrentInstance()

  function openShortcuts(trigger?: HTMLElement | null) {
    if (trigger) {
      triggerEl.value = trigger
    }
    shortcutsOpen.value = true
  }

  function closeShortcuts() {
    shortcutsOpen.value = false
    const trigger = triggerEl.value
    triggerEl.value = null
    if (trigger && typeof trigger.focus === 'function') {
      try {
        trigger.focus()
      } catch {
        // ignore focus errors
      }
    }
  }

  function ensureSidebarVisible() {
    if (typeof deps.ensureSidebarVisible === 'function') {
      deps.ensureSidebarVisible()
    }
  }

  function handleNavigation(action: () => void | Promise<void>, event: KeyboardEvent) {
    event.preventDefault()
    ensureSidebarVisible()
    action()
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    if (!tag) return false
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true
    const role = el.getAttribute?.('role')
    if (role && ['textbox', 'combobox'].includes(role)) return true
    return false
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return
    const editable = isEditableTarget(event.target)

    if ((event.key === 'Escape' || event.key === 'Esc') && shortcutsOpen.value) {
      event.preventDefault()
      closeShortcuts()
      return
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      if (!editable && (event.key === '?' || (event.shiftKey && event.key === '/'))) {
        event.preventDefault()
        openShortcuts(event.target instanceof HTMLElement ? event.target : null)
        return
      }
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const key = event.key
      if (key === 'ArrowLeft') {
        handleNavigation(deps.goPrevious, event)
        return
      }
      if (key === 'ArrowRight') {
        handleNavigation(deps.goNext, event)
        return
      }
      if (event.shiftKey && (key === 'R' || key === 'r')) {
        handleNavigation(deps.toggleRange, event)
        return
      }
      if (key === 'T' || key === 't') {
        if (deps.openConfigPanel) {
          event.preventDefault()
          ensureSidebarVisible()
          deps.openConfigPanel()
        }
        return
      }
    }

    if (event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
      if ((event.key === 'e' || event.key === 'E') && deps.toggleEditLayout && !editable) {
        event.preventDefault()
        deps.toggleEditLayout()
        return
      }
      if ((event.key === 'c' || event.key === 'C') && deps.openWidgetOptions && !editable) {
        event.preventDefault()
        deps.openWidgetOptions()
        return
      }
    }
  }

  function bindListener() {
    if (listenerBound || typeof document === 'undefined') return
    document.addEventListener('keydown', handleKeydown)
    listenerBound = true
  }

  function unbindListener() {
    if (!listenerBound || typeof document === 'undefined') return
    document.removeEventListener('keydown', handleKeydown)
    listenerBound = false
  }

  bindListener()

  if (hasInstance) {
    onMounted(() => {
      bindListener()
    })

    onBeforeUnmount(() => {
      unbindListener()
    })
  }

  return {
    shortcutsOpen,
    openShortcuts,
    closeShortcuts,
    shortcutGroups: KEYBOARD_SHORTCUT_GROUPS,
    unbindShortcuts: unbindListener,
  }
}

export type UseKeyboardShortcuts = ReturnType<typeof useKeyboardShortcuts>
