import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DayOffTrendCard from '../src/components/widgets/cards/DayOffTrendCard.vue'

describe('DayOffTrendCard', () => {
  it('switches between a single row and a vertical stack based on widget width', async () => {
    let resizeCallback: ResizeObserverCallback | null = null
    const originalResizeObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }

      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver

    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
          { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
          { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 7, daysOff: 3, daysWorked: 4 },
        ],
      },
      attachTo: document.body,
    })

    const heatmap = wrapper.get('.dayoff-heatmap')

    Object.defineProperty(heatmap.element, 'clientWidth', { configurable: true, value: 460 })
    resizeCallback?.([{ target: heatmap.element } as ResizeObserverEntry], {} as ResizeObserver)
    await wrapper.vm.$nextTick()
    expect(heatmap.classes()).toContain('dayoff-heatmap--row')

    Object.defineProperty(heatmap.element, 'clientWidth', { configurable: true, value: 240 })
    resizeCallback?.([{ target: heatmap.element } as ResizeObserverEntry], {} as ResizeObserver)
    await wrapper.vm.$nextTick()
    expect(heatmap.classes()).toContain('dayoff-heatmap--stacked')

    wrapper.unmount()
    globalThis.ResizeObserver = originalResizeObserver
  })

  it('applies custom tone colors', () => {
    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 0, daysWorked: 7 },
          { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 7, daysWorked: 0 },
        ],
        toneLowColor: '#000000',
        toneHighColor: '#ffffff',
      },
    })
    const tiles = wrapper.findAll('.dayoff-tile').map((node) => node.element as HTMLElement)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.some((tile) => tile.style.background.includes('rgb(0, 0, 0)'))).toBe(true)
    expect(tiles.some((tile) => tile.style.color.includes('rgb(255, 255, 255)'))).toBe(true)
  })

  it('uses continuous color blending and supports warning interpretation', () => {
    const trend = [
      { offset: 0, label: 'This week', from: '', to: '', totalDays: 10, daysOff: 0, daysWorked: 10 },
      { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 10, daysOff: 5, daysWorked: 5 },
      { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 10, daysOff: 10, daysWorked: 0 },
    ]

    const positive = mount(DayOffTrendCard, {
      props: {
        trend,
        reverseOrder: true,
        toneLowColor: '#000000',
        toneHighColor: '#ffffff',
        interpretation: 'more_off_positive',
      },
    })
    const positiveTiles = positive.findAll('.dayoff-tile').map((node) => node.element as HTMLElement)
    expect(positiveTiles[0].style.background).toContain('rgb(0, 0, 0)')
    expect(positiveTiles[1].style.background).toContain('rgb(128, 128, 128)')
    expect(positiveTiles[2].style.background).toContain('rgb(255, 255, 255)')

    const warning = mount(DayOffTrendCard, {
      props: {
        trend,
        reverseOrder: true,
        toneLowColor: '#000000',
        toneHighColor: '#ffffff',
        interpretation: 'more_off_warning',
      },
    })
    const warningTiles = warning.findAll('.dayoff-tile').map((node) => node.element as HTMLElement)
    expect(warningTiles[0].style.background).toContain('rgb(255, 255, 255)')
    expect(warningTiles[1].style.background).toContain('rgb(128, 128, 128)')
    expect(warningTiles[2].style.background).toContain('rgb(0, 0, 0)')
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
        ],
        showHeader: false,
      },
    })
    expect(wrapper.find('.dayoff-card__header').exists()).toBe(false)
  })

  it('shows oldest-first by default and supports reverse-order toggle', () => {
    const trend = [
      { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
      { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
      { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 7, daysOff: 3, daysWorked: 4 },
    ]
    const normal = mount(DayOffTrendCard, {
      props: { trend, lookback: 2, labelMode: 'offset' },
    })
    expect(normal.findAll('.dayoff-tile__label').map((node) => node.text())).toEqual([
      '-2',
      '-1',
      'Current',
    ])

    const reversed = mount(DayOffTrendCard, {
      props: { trend, lookback: 2, labelMode: 'offset', reverseOrder: true },
    })
    expect(reversed.findAll('.dayoff-tile__label').map((node) => node.text())).toEqual([
      'Current',
      '-1',
      '-2',
    ])
  })
})
