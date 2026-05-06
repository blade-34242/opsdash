import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DashboardLayout from '../src/components/layout/DashboardLayout.vue'

vi.mock('../src/services/widgetsRegistry', () => {
  const component = { template: '<div class="widget-stub"></div>' }
  return {
    mapWidgetToComponent: (def: any) => ({
      component,
      props: {},
      layout: def.layout,
      type: def.type,
      options: def.options || {},
      id: def.id,
      heightMode: def.options?.heightMode,
    }),
  }
})

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
      <button class="close-overlay" @click="$emit('close')">Close</button>
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

function mountLayout(props: Record<string, unknown> = {}) {
  return mount(DashboardLayout, {
    props: {
      widgets: [
        {
          id: 'w1',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 10 },
          options: {},
          version: 1,
        },
      ],
      widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
      context: {},
      editable: true,
      ...props,
    },
    global: {
      stubs: {
        DashboardAdvancedTargetsOverlay: stubAdvancedOverlay,
      },
    },
  })
}

describe('DashboardLayout advanced targets overlay', () => {
  it('opens advanced targets for the selected widget and emits local config edits when saved', async () => {
    const wrapper = mountLayout()

    await wrapper.find('.layout-item').trigger('click')
    await nextTick()
    expect((wrapper.vm as any).selectedItem?.id).toBe('w1')

    ;(wrapper.vm as any).openAdvancedTargets('w1')
    await nextTick()
    expect(wrapper.find('.advanced-panel').exists()).toBe(true)

    await wrapper.get('.save-overlay').trigger('click')

    expect(wrapper.emitted('edit:options')).toEqual([
      ['w1', 'localConfig', { totalHours: 12 }],
      ['w1', 'localTargetsWeek', { cal_a: 6 }],
      ['w1', 'localGroupsById', { cal_a: 1 }],
      ['w1', 'useLocalConfig', true],
    ])
    expect(wrapper.find('.advanced-panel').exists()).toBe(false)
  })

  it('can reset to global targets and reopen onboarding from overlay actions', async () => {
    const wrapper = mountLayout()

    ;(wrapper.vm as any).openAdvancedTargets('w1')
    await nextTick()
    await wrapper.get('.open-onboarding').trigger('click')
    expect(wrapper.emitted('open:onboarding')).toEqual([['goals']])
    expect(wrapper.find('.advanced-panel').exists()).toBe(false)

    ;(wrapper.vm as any).openAdvancedTargets('w1')
    await nextTick()
    await wrapper.get('.reset-overlay').trigger('click')

    expect(wrapper.emitted('edit:options')).toEqual([
      ['w1', 'localTargetsWeek', null],
      ['w1', 'localGroupsById', null],
      ['w1', 'localConfig', null],
      ['w1', 'useLocalConfig', false],
    ])
    expect(wrapper.find('.advanced-panel').exists()).toBe(false)
  })

  it('closes the advanced overlay when the overlay emits close', async () => {
    const wrapper = mountLayout()

    ;(wrapper.vm as any).openAdvancedTargets('w1')
    await nextTick()
    expect(wrapper.find('.advanced-panel').exists()).toBe(true)

    await wrapper.get('.close-overlay').trigger('click')
    expect(wrapper.find('.advanced-panel').exists()).toBe(false)
  })
})

describe('DashboardLayout grid behavior', () => {
  it('emits select:cell with an order hint on grid context click', async () => {
    const wrapper = mountLayout()

    const grid = wrapper.find('.layout-grid').element as HTMLElement
    grid.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 600, width: 1200, height: 600, toJSON() { return {} },
    })

    await wrapper.find('.layout-grid').trigger('contextmenu', { clientX: 800, clientY: 200 })
    const emitted = wrapper.emitted('select:cell') || []
    expect(typeof emitted[0][0]).toBe('number')
  })

  it('emits reorder on drag and drop', async () => {
    const wrapper = mountLayout()

    const grid = wrapper.find('.layout-grid').element as HTMLElement
    grid.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 600, width: 1200, height: 600, toJSON() { return {} },
    })

    await wrapper.find('.layout-item').trigger('dragstart')
    await wrapper.find('.layout-grid').trigger('dragover', { clientX: 900, clientY: 300 })
    await wrapper.find('.layout-grid').trigger('drop', { clientX: 900, clientY: 300 })

    const emitted = wrapper.emitted('edit:reorder') || []
    expect(emitted[0][0]).toBe('w1')
    expect(typeof emitted[0][1]).toBe('number')
  })

  it('tracks selection, clears it on background click, and exposes selectFirst', async () => {
    const wrapper = mountLayout({
      widgets: [
        {
          id: 'w1',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 10 },
          options: {},
          version: 1,
        },
        {
          id: 'w2',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 20 },
          options: {},
          version: 1,
        },
      ],
    })

    await wrapper.findAll('.layout-item')[1].trigger('click')
    await nextTick()
    expect((wrapper.vm as any).selectedItem?.id).toBe('w2')

    await wrapper.get('.layout-wrapper').trigger('click')
    await nextTick()
    expect((wrapper.vm as any).selectedItem).toBe(null)

    ;(wrapper.vm as any).selectFirst()
    await nextTick()
    expect((wrapper.vm as any).selectedItem?.id).toBe('w1')
  })

  it('applies scale classes from widget options', () => {
    const wrapper = mountLayout({
      widgets: [
        {
          id: 'w1',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 10 },
          options: { scale: 'sm' },
          version: 1,
        },
      ],
    })

    expect(wrapper.get('.layout-item').classes()).toContain('scale-sm')
  })

  it('clears selection when editable mode is turned off', async () => {
    const wrapper = mountLayout()

    await wrapper.find('.layout-item').trigger('click')
    await nextTick()
    expect((wrapper.vm as any).selectedItem?.id).toBe('w1')

    await wrapper.setProps({ editable: false })
    expect((wrapper.vm as any).selectedItem).toBe(null)
  })

  it('exposes item edit intent helpers for the selected widget', async () => {
    const wrapper = mountLayout()

    await wrapper.find('.layout-item').trigger('click')
    await nextTick()

    ;(wrapper.vm as any).cycleSelectedWidth()
    ;(wrapper.vm as any).cycleSelectedHeight()
    ;(wrapper.vm as any).moveSelected('up')
    ;(wrapper.vm as any).moveSelected('down')
    ;(wrapper.vm as any).removeSelected()

    expect(wrapper.emitted('edit:width')).toEqual([['w1']])
    expect(wrapper.emitted('edit:height')).toEqual([['w1']])
    expect(wrapper.emitted('edit:move')).toEqual([
      ['w1', 'up'],
      ['w1', 'down'],
    ])
    expect(wrapper.emitted('edit:remove')).toEqual([['w1']])
  })

  it('drops selection when the selected widget disappears', async () => {
    const wrapper = mountLayout({
      widgets: [
        {
          id: 'w1',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 10 },
          options: {},
          version: 1,
        },
        {
          id: 'w2',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 20 },
          options: {},
          version: 1,
        },
      ],
    })

    await wrapper.findAll('.layout-item')[1].trigger('click')
    await nextTick()
    expect((wrapper.vm as any).selectedItem?.id).toBe('w2')

    await wrapper.setProps({
      widgets: [
        {
          id: 'w1',
          type: 'targets_v2',
          layout: { width: 'half', height: 'm', order: 10 },
          options: {},
          version: 1,
        },
      ],
    })

    expect((wrapper.vm as any).selectedItem).toBe(null)
  })
})
