import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'

import { useVersionOverlay } from '../composables/useVersionOverlay'
import type { OnboardingState } from '../composables/useDashboard'

describe('useVersionOverlay', () => {
  it('opens the current release automatically when it has not been seen', async () => {
    const onboardingState = ref<OnboardingState | null>({
      completed: true,
      version: 1,
      strategy: 'total_only',
      completed_at: '2026-04-01T00:00:00Z',
      releaseNotesSeenVersion: '0.7.4',
    })
    const overlay = useVersionOverlay({
      appVersion: ref('0.7.5'),
      onboardingState,
      hasInitialLoad: ref(true),
      isBlocked: computed(() => false),
      route: vi.fn().mockReturnValue('/persist'),
      postJson: vi.fn().mockResolvedValue({}),
      notifyError: vi.fn(),
    })

    await nextTick()

    expect(overlay.isOpen.value).toBe(true)
    expect(overlay.activeEntry.value?.version).toBe('0.7.5')
    expect(overlay.entries.value.map((entry) => entry.version)).toEqual(['0.8.2', '0.8.1', '0.8.0', '0.7.6', '0.7.5', '0.7.4'])
  })

  it('marks the current version as seen when the current release closes', async () => {
    const onboardingState = ref<OnboardingState | null>({
      completed: true,
      version: 1,
      strategy: 'total_only',
      completed_at: '2026-04-01T00:00:00Z',
      releaseNotesSeenVersion: '0.7.4',
    })
    const route = vi.fn().mockReturnValue('/persist')
    const postJson = vi.fn().mockResolvedValue({})
    const overlay = useVersionOverlay({
      appVersion: ref('0.7.5'),
      onboardingState,
      hasInitialLoad: ref(true),
      isBlocked: computed(() => false),
      route,
      postJson,
      notifyError: vi.fn(),
    })

    await nextTick()
    await overlay.closeOverlay()

    expect(route).toHaveBeenCalledWith('persist')
    expect(postJson).toHaveBeenCalledWith('/persist', {
      onboarding: expect.objectContaining({
        releaseNotesSeenVersion: '0.7.5',
      }),
    })
    expect(onboardingState.value).toMatchObject({
      releaseNotesSeenVersion: '0.7.5',
    })
    expect(overlay.isOpen.value).toBe(false)
  })

  it('does not mark the current version as seen when browsing an older entry', async () => {
    const onboardingState = ref<OnboardingState | null>({
      completed: true,
      version: 1,
      strategy: 'total_only',
      completed_at: '2026-04-01T00:00:00Z',
      releaseNotesSeenVersion: '',
    })
    const postJson = vi.fn().mockResolvedValue({})
    const overlay = useVersionOverlay({
      appVersion: ref('0.7.5'),
      onboardingState,
      hasInitialLoad: ref(true),
      isBlocked: computed(() => false),
      route: vi.fn().mockReturnValue('/persist'),
      postJson,
      notifyError: vi.fn(),
    })

    await nextTick()
    overlay.openVersion('0.7.4')
    await overlay.closeOverlay()

    expect(postJson).not.toHaveBeenCalled()
    expect(onboardingState.value?.releaseNotesSeenVersion).toBe('')
  })
})
