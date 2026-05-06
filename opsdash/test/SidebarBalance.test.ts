import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Sidebar from '../src/components/sidebar/Sidebar.vue'
vi.mock('@nextcloud/vue', () => {
  const buttonStub = {
    name: 'NcButton',
    inheritAttrs: false,
    setup(_props: unknown, { slots, attrs }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default ? slots.default() : [])
    },
  }

  const navigationStub = {
    name: 'NcAppNavigation',
    setup(_props: unknown, { slots }) {
      return () => h('nav', {}, slots.default ? slots.default() : [])
    },
  }

  const checkboxStub = {
    name: 'NcCheckboxRadioSwitch',
    props: {
      checked: { type: Boolean, default: false },
    },
    emits: ['update:checked'],
    setup(props, { slots, emit, attrs }) {
      const toggle = () => {
        emit('update:checked', !props.checked)
      }
      return () =>
        h(
          'label',
          {
            ...attrs,
            onClick: (event: MouseEvent) => {
              event.preventDefault()
              toggle()
            },
          },
          slots.default ? slots.default() : [],
        )
    },
  }

  return {
    NcAppNavigation: navigationStub,
    NcButton: buttonStub,
    NcCheckboxRadioSwitch: checkboxStub,
  }
})

function mountSidebar() {
  return mount(Sidebar, {
    props: {
      isLoading: false,
      range: 'week',
      offset: 0,
      from: '2025-03-03',
      to: '2025-03-09',
      navToggleLabel: 'Toggle sidebar',
      navToggleIcon: '⟨',
      dashboardMode: 'standard',
    },
  })
}

describe('Sidebar layout', () => {
  it('renders the range hero and profiles trigger without legacy controls', () => {
    const wrapper = mountSidebar()
    expect(wrapper.find('.rc.hero').exists()).toBe(true)
    expect(wrapper.text()).toContain('This week')
    expect(wrapper.find('button[aria-label="Profiles and backups"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Projection mode')
    expect(wrapper.text()).not.toContain('Trend lookback')
  })
})
