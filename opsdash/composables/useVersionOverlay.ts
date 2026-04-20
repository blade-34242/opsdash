import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { OnboardingState } from './useDashboard'
import {
  getReleaseNotesEntries,
  getReleaseNotesEntry,
  normalizeReleaseVersion,
  type ReleaseNotesEntry,
} from '../src/services/releaseNotes'

interface VersionOverlayDeps {
  appVersion: Ref<string>
  onboardingState: Ref<OnboardingState | null>
  hasInitialLoad: Ref<boolean>
  isBlocked: ComputedRef<boolean>
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifyError: (message: string) => void
}

export function useVersionOverlay(deps: VersionOverlayDeps) {
  const isOpen = ref(false)
  const isSaving = ref(false)
  const selectedVersion = ref('')

  const entries = computed(() => getReleaseNotesEntries().filter((entry) => entry.showInHistory !== false))
  const currentVersion = computed(() => normalizeReleaseVersion(deps.appVersion.value))
  const currentEntry = computed(() => getReleaseNotesEntry(currentVersion.value))
  const selectedEntry = computed<ReleaseNotesEntry | null>(() => {
    const version = normalizeReleaseVersion(selectedVersion.value)
    return getReleaseNotesEntry(version)
  })
  const activeEntry = computed(() => selectedEntry.value ?? currentEntry.value)
  const seenVersion = computed(() =>
    normalizeReleaseVersion(deps.onboardingState.value?.releaseNotesSeenVersion ?? ''),
  )
  const shouldAutoOpen = computed(() =>
    deps.hasInitialLoad.value
    && !deps.isBlocked.value
    && Boolean(currentEntry.value?.autoShow)
    && currentVersion.value !== ''
    && currentVersion.value !== seenVersion.value,
  )

  function openCurrent() {
    if (!currentEntry.value) return
    selectedVersion.value = currentEntry.value.version
    isOpen.value = true
  }

  function openVersion(version: string) {
    const entry = getReleaseNotesEntry(version)
    if (!entry) return
    selectedVersion.value = entry.version
    isOpen.value = true
  }

  watch(
    shouldAutoOpen,
    (next) => {
      if (next && !isOpen.value) {
        openCurrent()
      }
    },
    { immediate: true },
  )

  watch(
    () => deps.isBlocked.value,
    (blocked) => {
      if (blocked && shouldAutoOpen.value && activeEntry.value?.version === currentVersion.value) {
        isOpen.value = false
      } else if (!blocked && shouldAutoOpen.value && !isOpen.value) {
        openCurrent()
      }
    },
  )

  async function markCurrentVersionSeen() {
    if (!currentEntry.value) return
    if (seenVersion.value === currentEntry.value.version) return

    const nextState: OnboardingState = {
      ...(deps.onboardingState.value || {
        completed: false,
        version: 0,
        strategy: '',
        completed_at: '',
        dashboardMode: 'standard',
      }),
      releaseNotesSeenVersion: currentEntry.value.version,
    }

    await deps.postJson(deps.route('persist'), { onboarding: nextState })
    deps.onboardingState.value = nextState
  }

  async function closeOverlay() {
    const shouldPersistCurrent = activeEntry.value?.version === currentVersion.value && Boolean(currentEntry.value)
    try {
      if (shouldPersistCurrent) {
        isSaving.value = true
        await markCurrentVersionSeen()
      }
      isOpen.value = false
    } catch (error) {
      console.error('[opsdash] release notes persist failed', error)
      deps.notifyError('Failed to save release note state')
    } finally {
      isSaving.value = false
    }
  }

  return {
    isOpen,
    isSaving,
    entries,
    currentVersion,
    currentEntry,
    activeEntry,
    selectedVersion,
    openCurrent,
    openVersion,
    closeOverlay,
  }
}
