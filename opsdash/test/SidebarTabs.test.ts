import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Sidebar from '../src/components/sidebar/Sidebar.vue'

vi.mock('@nextcloud/vue', () => {
  const navigationStub = {
    name: 'NcAppNavigation',
    setup(_props: unknown, { slots }) {
      return () => h('nav', {}, slots.default ? slots.default() : [])
    },
  }

  return {
    NcAppNavigation: navigationStub,
  }
})

function mountSidebar(props: Record<string, unknown> = {}) {
  return mount(Sidebar, {
    props: {
      isLoading: false,
      range: 'week',
      offset: 0,
      from: '2025-03-03',
      to: '2025-03-09',
      navToggleLabel: 'Toggle sidebar',
      navToggleIcon: '⟨',
      ...props,
    },
  })
}

describe('Sidebar guided setup', () => {
  it('emits rerun onboarding when clicking the main button', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('button.wiz').trigger('click')
    expect(wrapper.emitted('rerun-onboarding')).toEqual([[]])
  })

  it('emits rerun onboarding with a step when clicking a guided step', async () => {
    const wrapper = mountSidebar()
    const calendarsStep = wrapper.findAll('.step').find((item) => item.text().includes('Calendars'))
    expect(calendarsStep).toBeTruthy()
    await calendarsStep!.trigger('click')
    expect(wrapper.emitted('rerun-onboarding')).toEqual([['calendars']])
  })

  it('renders guided hint text and status classes from props', () => {
    const wrapper = mountSidebar({
      guidedHints: {
        calendars: '2 calendars linked',
      },
      guidedHintStatuses: {
        calendars: 'done',
        review: 'warn',
      },
    })

    const calendarsStep = wrapper.findAll('.step').find((item) => item.text().includes('Calendars'))
    const reviewStep = wrapper.findAll('.step').find((item) => item.text().includes('Review'))

    expect(calendarsStep?.classes()).toContain('done')
    expect(calendarsStep?.text()).toContain('2 calendars linked')
    expect(reviewStep?.classes()).toContain('warn')
  })
})
