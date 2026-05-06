import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import WidgetOptionsMenu from '../src/components/layout/WidgetOptionsMenu.vue'

describe('WidgetOptionsMenu', () => {
  const entry = {
    controls: [
      { key: 'customToggle', label: 'Custom toggle', type: 'toggle' },
      { key: 'cardBg', label: 'Card background', type: 'color' }, // duplicate should be deduped
    ],
  }

  it('shows core layout controls and widget controls without duplicate cardBg', async () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry,
        options: {},
        open: true,
      },
    })

    const sections = wrapper.findAll('.opt-section')
    expect(sections.length).toBe(2) // layout/title + widget options

    const labels = wrapper.findAll('label').map((n) => n.text())
    expect(labels).toContain('Title prefix')
    expect(labels).toContain('Card background')
    expect(labels).toContain('Scale')
    expect(labels).toContain('Dense mode')
    expect(labels.filter((l) => l === 'Card background').length).toBe(1)
    expect(labels).toContain('Custom toggle')

    const scaleSelect = wrapper.find('#opt-scale')
    const scaleOptions = scaleSelect.findAll('option').map((opt) => opt.text())
    expect(scaleOptions).toContain('Extra large')
  })

  it('builds custom filters with the filter builder control', async () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry: {
          controls: [{ key: 'customFilters', label: 'Custom filters', type: 'filterbuilder' }],
        },
        options: {},
        open: true,
      },
    })

    const addButton = wrapper.findAll('button').find((btn) => btn.text().includes('Add filter'))
    expect(addButton).toBeTruthy()
    await addButton!.trigger('click')
    await nextTick()

    const addEmission = wrapper.emitted('change')?.at(-1)
    expect(addEmission).toBeTruthy()
    await wrapper.setProps({ options: { customFilters: addEmission?.[1] } })
    await nextTick()

    const labelInput = wrapper.find('input.filter-builder__label')
    const tagInput = wrapper.findAll('input.filter-builder__input')[0]
    const assigneeInput = wrapper.findAll('input.filter-builder__input')[1]

    await labelInput.setValue('Urgent')
    await nextTick()
    let lastEmission = wrapper.emitted('change')?.at(-1)
    await wrapper.setProps({ options: { customFilters: lastEmission?.[1] } })
    await nextTick()

    await tagInput.setValue('Ops, QA')
    await nextTick()
    lastEmission = wrapper.emitted('change')?.at(-1)
    await wrapper.setProps({ options: { customFilters: lastEmission?.[1] } })
    await nextTick()

    await assigneeInput.setValue('me, qa')
    await nextTick()
    lastEmission = wrapper.emitted('change')?.at(-1)

    const emissions = wrapper.emitted('change') ?? []
    const last = emissions.at(-1)
    expect(last).toBeTruthy()
    expect(last![0]).toBe('customFilters')
    expect(last![1]).toEqual([
      {
        label: 'Urgent',
        labels: ['Ops', 'QA'],
        assignees: ['me', 'qa'],
      },
    ])
  })

  it('shows tab actions and emits move/copy targets', async () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry,
        options: {},
        open: true,
        tabs: [
          { id: 'tab-1', label: 'Overview' },
          { id: 'tab-2', label: 'Charts' },
        ],
        currentTabId: 'tab-1',
      },
    })

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Tab actions')
    expect(text).toContain('Current tab')
    expect(text).toContain('Charts')

    const moveButtons = wrapper.findAll('.tab-actions__buttons .ghost.sm')
    await moveButtons[2].trigger('click')
    await moveButtons[3].trigger('click')

    expect(wrapper.emitted('move-to-tab')?.[0]).toEqual(['tab-2'])
    expect(wrapper.emitted('duplicate-to-tab')?.[0]).toEqual(['tab-2'])
  })

  it('applies core defaults to checkbox and select controls', () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry: {
          controls: [],
        },
        options: {},
        open: true,
      },
    })

    expect((wrapper.get('#opt-showHeader').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('#opt-dense').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.get('#opt-scale').element as HTMLSelectElement).value).toBe('md')
  })

  it('passes merged defaults into dynamic controls', () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry: {
          dynamicControls: (options: Record<string, any>) => [
            {
              key: 'debugToggle',
              label: options.showHeader ? 'ShowHeader defaulted on' : 'ShowHeader defaulted off',
              type: 'toggle',
            },
          ],
        },
        options: {},
        open: true,
      },
    })

    expect(wrapper.text()).toContain('ShowHeader defaulted on')
  })

  it('uses registry-resolved effective options for checkbox controls', () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry: {
          controls: [{ key: 'showTotalDelta', label: 'Show total delta', type: 'toggle' }],
          resolveOptions: () => ({ showTotalDelta: true }),
        },
        options: {},
        open: true,
      },
    })

    expect((wrapper.get('#opt-showTotalDelta').element as HTMLInputElement).checked).toBe(true)
  })

  it('renders ColorPickerPopover for color controls and emits change on pick', async () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry: { controls: [{ key: 'trendColor', label: 'Trend color', type: 'color' }] },
        options: { trendColor: '#2563EB' },
        open: true,
      },
    })

    // find the picker for trendColor specifically (not the core cardBg one)
    const pickers = wrapper.findAllComponents({ name: 'ColorPickerPopover' })
    const trendPicker = pickers.find((p) => p.props('modelValue') === '#2563EB')
    expect(trendPicker).toBeTruthy()

    await trendPicker!.vm.$emit('update:modelValue', '#F97316')
    const emissions = wrapper.emitted('change') ?? []
    expect(emissions.at(-1)).toEqual(['trendColor', '#F97316'])
  })

  it('renders ColorPickerPopover for each colorlist entry and emits updated array', async () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry: { controls: [{ key: 'palette', label: 'Palette', type: 'colorlist' }] },
        options: { palette: ['#ff0000', '#00ff00'] },
        open: true,
      },
    })

    // core controls add a cardBg picker; find the palette pickers by their values
    const pickers = wrapper.findAllComponents({ name: 'ColorPickerPopover' })
    const palettePickers = pickers.filter((p) => ['#ff0000', '#00ff00'].includes(p.props('modelValue') as string))
    expect(palettePickers).toHaveLength(2)

    await palettePickers[0].vm.$emit('update:modelValue', '#0000ff')
    const emissions = wrapper.emitted('change') ?? []
    const last = emissions.at(-1) as [string, string[]]
    expect(last[0]).toBe('palette')
    expect(last[1][0]).toBe('#0000ff')
    expect(last[1][1]).toBe('#00ff00')
  })
})
