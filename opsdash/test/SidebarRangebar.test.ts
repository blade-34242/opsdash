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

describe('Sidebar range hero', () => {
  it('emits refresh and navigation events', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('button.btn-ref').trigger('click')
    expect(wrapper.emitted('load')).toEqual([[]])

    const navButtons = wrapper.findAll('button.arw')
    await navButtons[0].trigger('click')
    await navButtons[1].trigger('click')

    expect(wrapper.emitted('update:offset')).toEqual([[-1], [1]])
  })

  it('emits range changes from segmented controls', async () => {
    const wrapper = mountSidebar()
    const monthToggle = wrapper.findAll('.seg button').find((button) => button.text() === 'Month')
    expect(monthToggle).toBeTruthy()
    await monthToggle!.trigger('click')
    expect(wrapper.emitted('update:range')).toEqual([['month']])
  })

  it('emits toggle nav from the hide button', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('button.hide-btn').trigger('click')
    expect(wrapper.emitted('toggle-nav')).toEqual([[]])
  })

  it('shows loading sync state and last sync label', () => {
    const wrapper = mountSidebar({
      isLoading: true,
      lastSync: 'Updated 2m ago',
    })

    expect(wrapper.get('.sync-dot').classes()).toContain('syncing')
    expect(wrapper.get('.sync-txt').text()).toBe('Syncing…')
  })
})
