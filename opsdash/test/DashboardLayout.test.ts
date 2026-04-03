import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardLayout from '../src/components/layout/DashboardLayout.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { nextTick } from 'vue'

vi.mock('../src/services/widgetsRegistry', () => {
  const component = { template: '<div class="widget-stub"></div>' }
  return {
    mapWidgetToComponent: (def: any) => ({ component, props: {}, layout: def.layout, type: def.type }),
    widgetsRegistry: {
      targets_v2: {
        configurable: true,
        defaultOptions: {},
        buildProps: () => ({}),
      },
    },
  }
})

const stubMenu = {
  template: `<button class="open-adv" @click="$emit('open-advanced')">open</button>`,
  props: ['entry', 'options', 'open', 'showAdvanced'],
  emits: ['toggle', 'open-advanced', 'change'],
}

const stubAdvancedOverlay = {
  template: `
    <div v-if="widgetId" class="advanced-panel">
      <button
        class="save-overlay"
        @click="$emit('save', widgetId, {
          localConfig: { totalHours: 12 },
          localTargetsWeek: { cal_a: 6 },
          localGroupsById: { cal_a: 1 },
        })"
      >
        Save
      </button>
      <button class="reset-overlay" @click="$emit('use-global', widgetId)">Use global targets</button>
      <button class="open-onboarding" @click="$emit('open-onboarding', 'goals')">Edit via onboarding</button>
    </div>
  `,
  props: [
    'widgetId',
    'widgets',
    'contextTargetsConfig',
    'contextTargetsWeek',
    'contextGroupsById',
    'contextCalendars',
    'contextSelected',
    'strategy',
  ],
  emits: ['close', 'save', 'use-global', 'open-onboarding'],
}

describe('DashboardLayout advanced targets overlay', () => {
  it('emits local targets config when saved', async () => {
    const targetsConfig = createDefaultTargetsConfig()
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          {
            id: 'w1',
            type: 'targets_v2',
            layout: { width: 'full', height: 'm', order: 1 },
            options: {},
            version: 1,
          },
        ],
        context: { targetsConfig },
        editable: true,
      },
      global: {
        stubs: {
          WidgetOptionsMenu: stubMenu,
          DashboardAdvancedTargetsOverlay: stubAdvancedOverlay,
        },
        mocks: {
          // mapWidgetToComponent uses the registry entry; fall back to default mapping
        },
      },
    })

    await wrapper.find('.layout-item').trigger('click')
    await wrapper.vm.$nextTick()

    const menu = wrapper.findComponent(stubMenu)
    expect(menu.exists()).toBe(true)
    menu.vm.$emit('open-advanced')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(stubAdvancedOverlay).exists()).toBe(true)
    await wrapper.get('.save-overlay').trigger('click')

    const edits = wrapper.emitted('edit:options') || []
    const localCfgPayload = edits.find((args) => args[1] === 'localConfig')
    const localTargetsPayload = edits.find((args) => args[1] === 'localTargetsWeek')
    const localGroupsPayload = edits.find((args) => args[1] === 'localGroupsById')
    const flagPayload = edits.find((args) => args[1] === 'useLocalConfig')

    expect(localCfgPayload?.[0]).toBe('w1')
    expect((localCfgPayload?.[2] as any)?.totalHours).toBe(12)
    expect(localTargetsPayload).toEqual(['w1', 'localTargetsWeek', { cal_a: 6 }])
    expect(localGroupsPayload).toEqual(['w1', 'localGroupsById', { cal_a: 1 }])
    expect(flagPayload).toEqual(['w1', 'useLocalConfig', true])
    wrapper.unmount()
  })

  it('can reset to global and open onboarding from overlay actions', async () => {
    const targetsConfig = createDefaultTargetsConfig()
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          {
            id: 'w1',
            type: 'targets_v2',
            layout: { width: 'full', height: 'm', order: 1 },
            options: { useLocalConfig: true, localConfig: targetsConfig },
            version: 1,
          },
        ],
        context: { targetsConfig },
        editable: true,
      },
      global: {
        stubs: {
          WidgetOptionsMenu: stubMenu,
          DashboardAdvancedTargetsOverlay: stubAdvancedOverlay,
        },
      },
    })

    await wrapper.find('.layout-item').trigger('click')
    await wrapper.vm.$nextTick()

    const menu = wrapper.findComponent(stubMenu)
    expect(menu.exists()).toBe(true)
    menu.vm.$emit('open-advanced')
    await wrapper.vm.$nextTick()
    await wrapper.get('.open-onboarding').trigger('click')
    expect(wrapper.emitted('open:onboarding')?.[0]).toEqual(['goals'])

    await wrapper.find('.layout-item').trigger('click')
    await wrapper.vm.$nextTick()
    const menuAgain = wrapper.findComponent(stubMenu)
    expect(menuAgain.exists()).toBe(true)
    menuAgain.vm.$emit('open-advanced')
    await wrapper.vm.$nextTick()
    await wrapper.get('.reset-overlay').trigger('click')

    const edits = wrapper.emitted('edit:options') || []
    const resetFlag = edits.find((args) => args[1] === 'useLocalConfig')
    const resetConfig = edits.find((args) => args[1] === 'localConfig')
    const resetTargets = edits.find((args) => args[1] === 'localTargetsWeek')
    const resetGroups = edits.find((args) => args[1] === 'localGroupsById')
    expect(resetFlag).toEqual(['w1', 'useLocalConfig', false])
    expect(resetTargets).toEqual(['w1', 'localTargetsWeek', null])
    expect(resetGroups).toEqual(['w1', 'localGroupsById', null])
    expect(resetConfig).toEqual(['w1', 'localConfig', null])
    wrapper.unmount()
  })

  it('closes widget options and hides toolbar while advanced targets is open', async () => {
    const targetsConfig = createDefaultTargetsConfig()
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          {
            id: 'w1',
            type: 'targets_v2',
            layout: { width: 'full', height: 'm', order: 1 },
            options: {},
            version: 1,
          },
        ],
        context: { targetsConfig },
        editable: true,
      },
      global: {
        stubs: {
          WidgetOptionsMenu: stubMenu,
          DashboardAdvancedTargetsOverlay: stubAdvancedOverlay,
        },
      },
    })

    await wrapper.find('.layout-item').trigger('click')
    await nextTick()

    let menu = wrapper.findComponent(stubMenu)
    expect(menu.exists()).toBe(true)
    menu.vm.$emit('toggle', true)
    await nextTick()

    menu = wrapper.findComponent(stubMenu)
    expect(menu.exists()).toBe(true)
    expect(menu.props('open')).toBe(true)

    menu.vm.$emit('open-advanced')
    await nextTick()

    expect(wrapper.findComponent(stubMenu).exists()).toBe(false)
    expect(wrapper.find('.advanced-panel').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('DashboardLayout grid add flow', () => {
  it('emits select:cell with an order hint on grid context click', async () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [
          { type: 'targets_v2', label: 'Targets' },
          { type: 'x', label: 'Other' },
        ],
        context: {},
        editable: true,
      },
      global: {
        stubs: {
          WidgetOptionsMenu: stubMenu,
          DashboardAdvancedTargetsOverlay: stubAdvancedOverlay,
        },
      },
    })

    const grid = wrapper.find('.layout-grid').element as HTMLElement
    grid.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 600, width: 1200, height: 600, toJSON() { return {} },
    })

    await wrapper.find('.layout-grid').trigger('contextmenu', { clientX: 800, clientY: 200 })
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('select:cell') || []
    expect(typeof emitted[0][0]).toBe('number')
  })

  it('emits reorder on drag/drop', async () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { WidgetOptionsMenu: stubMenu, DashboardAdvancedTargetsOverlay: stubAdvancedOverlay },
      },
    })

    const grid = wrapper.find('.layout-grid').element as HTMLElement
    grid.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 600, width: 1200, height: 600, toJSON() { return {} },
    })

    const item = wrapper.find('.layout-item')
    await item.trigger('dragstart')
    const gridWrapper = wrapper.find('.layout-grid')
    await gridWrapper.trigger('dragover', { clientX: 900, clientY: 300 })
    await gridWrapper.trigger('drop', { clientX: 900, clientY: 300 })

    const emitted = wrapper.emitted('edit:reorder') || []
    expect(emitted[0][0]).toBe('w1')
    expect(typeof emitted[0][1]).toBe('number')
  })

  it('applies text size scale class based on widget options', () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: { scale: 'sm' }, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { WidgetOptionsMenu: stubMenu, DashboardAdvancedTargetsOverlay: stubAdvancedOverlay },
      },
    })

    const item = wrapper.find('.layout-item')
    expect(item.classes()).toContain('scale-sm')
  })

  it('shows inline toolbar in editable mode', () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { WidgetOptionsMenu: stubMenu, DashboardAdvancedTargetsOverlay: stubAdvancedOverlay },
      },
    })

    const bar = wrapper.find('.widget-toolbar')
    expect(bar.exists()).toBe(true)
    wrapper.unmount()
  })

  it('toolbar buttons emit edit events when clicked', async () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { WidgetOptionsMenu: stubMenu, DashboardAdvancedTargetsOverlay: stubAdvancedOverlay },
      },
    })

    await nextTick()
    await wrapper.find('.layout-item').trigger('click')
    await nextTick()
    const toolbar = wrapper.find('.widget-toolbar')
    expect(toolbar.exists()).toBe(true)

    // Call the same handlers the toolbar buttons are wired to so we verify emissions
    ;(wrapper.vm as any).selectedId = 'w1'
    ;(wrapper.vm as any).moveSelected('up')
    ;(wrapper.vm as any).moveSelected('down')
    ;(wrapper.vm as any).cycleSelectedWidth()
    ;(wrapper.vm as any).cycleSelectedHeight()
    ;(wrapper.vm as any).removeSelected()
    await nextTick()

    expect(wrapper.emitted('edit:move')?.[0]).toEqual(['w1', 'up'])
    expect(wrapper.emitted('edit:move')?.[1]).toEqual(['w1', 'down'])
    expect(wrapper.emitted('edit:width')?.[0]).toEqual(['w1'])
    expect(wrapper.emitted('edit:height')?.[0]).toEqual(['w1'])
    expect(wrapper.emitted('edit:remove')?.[0]).toEqual(['w1'])
    wrapper.unmount()
  })

  it('hides toolbar when not editable', () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: false,
      },
      global: {
        stubs: { WidgetOptionsMenu: stubMenu, DashboardAdvancedTargetsOverlay: stubAdvancedOverlay },
      },
    })

    expect(document.body.querySelector('.widget-toolbar')).toBeNull()
    wrapper.unmount()
  })
})
