import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeTargetsCard from '../src/components/widgets/cards/TimeTargetsCard.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'

describe('TimeTargetsCard', () => {
  it('hides pace/forecast lines when toggled off', () => {
    const baseSummary = {
      id: 'total',
      label: 'Total',
      actualHours: 10,
      targetHours: 20,
      percent: 50,
      deltaHours: -10,
      remainingHours: 10,
      needPerDay: 1,
      daysLeft: 5,
      calendarPercent: 0,
      gap: 0,
      status: 'behind' as const,
      statusLabel: 'Behind',
      includeWeekend: true,
      paceMode: 'days_only' as const,
    }
    const summary = {
      total: baseSummary,
      categories: [],
      forecast: { text: 'Forecast text', linear: 1, momentum: 2, primaryMethod: 'linear' as const },
    }
    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        showPace: false,
        showForecast: false,
      },
    })

    expect(wrapper.text()).not.toContain('Pace:')
    expect(wrapper.text()).not.toContain('Forecast:')
  })

  it('hides delta readouts when the widget delta toggle is off', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 10,
        targetHours: 20,
        percent: 50,
        deltaHours: -10,
        remainingHours: 10,
        needPerDay: 1,
        daysLeft: 5,
        calendarPercent: 0,
        gap: 0,
        status: 'behind' as const,
        statusLabel: 'Behind',
        includeWeekend: true,
        paceMode: 'days_only' as const,
      },
      categories: [
        {
          id: 'work',
          label: 'Work',
          actualHours: 5,
          targetHours: 12,
          percent: 42,
          deltaHours: -7,
          remainingHours: 7,
          needPerDay: 1.4,
          daysLeft: 5,
          calendarPercent: 0,
          gap: 0,
          status: 'behind' as const,
          statusLabel: 'Behind',
          includeWeekend: true,
          paceMode: 'days_only' as const,
        },
      ],
      forecast: { text: 'Forecast text', linear: 1, momentum: 2, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        showDelta: false,
      },
    })

    expect(wrapper.text()).not.toContain('Δ')
  })

  it('shows today overlay and inline today text on category bars', () => {
    const catSummary = {
      id: 'work',
      label: 'Work',
      actualHours: 9,
      plannedHours: 3,
      targetHours: 32,
      percent: 28,
      deltaHours: -23,
      remainingHours: 23,
      needPerDay: 7.7,
      daysLeft: 3,
      calendarPercent: 0,
      gap: 0,
      status: 'behind',
      statusLabel: 'Behind',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const summary = {
      total: catSummary,
      categories: [catSummary],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const config = createDefaultTargetsConfig()

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config,
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
            todayHours: 2,
          },
        ],
      },
    })

    const todayInline = wrapper.find('.today-inline')
    expect(todayInline.exists()).toBe(true)
    expect(todayInline.text()).toContain('Today')
    expect(wrapper.text()).toContain('Planned 3h')
    expect(wrapper.find('.bar-track').exists()).toBe(true)
    expect(wrapper.find('.bar-track .today-overlay').exists()).toBe(true)
    expect(wrapper.find('.bar-track .today-chip').exists()).toBe(false)
  })

  it('clamps today overlay placement for extreme progress values', () => {
    const catSummary = {
      id: 'work',
      label: 'Work',
      actualHours: 45,
      targetHours: 20,
      percent: 225,
      deltaHours: 25,
      remainingHours: 0,
      needPerDay: 0,
      daysLeft: 0,
      calendarPercent: 0,
      gap: 0,
      status: 'done',
      statusLabel: 'Done',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const summary = {
      total: catSummary,
      categories: [catSummary],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
            todayHours: 3,
          },
        ],
      },
    })

    const overlay = wrapper.find('.today-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.attributes('style')).toContain('right: 0%')
    expect(overlay.attributes('style')).toContain('width: 15%')
    expect(wrapper.find('.today-chip').exists()).toBe(false)
  })

  it('shows target percentages above 200%', () => {
    const catSummary = {
      id: 'work',
      label: 'Work',
      actualHours: 25,
      plannedHours: 0,
      targetHours: 10,
      percent: 250,
      deltaHours: 15,
      remainingHours: 0,
      needPerDay: 0,
      daysLeft: 0,
      calendarPercent: 100,
      gap: 150,
      status: 'done',
      statusLabel: 'Done',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const summary = {
      total: catSummary,
      categories: [catSummary],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
          },
        ],
      },
    })

    expect(wrapper.text()).toContain('250%')
    expect(wrapper.find('.fill').attributes('style')).toContain('width: 250%')
  })

  it('hides today overlay and inline today text when todayHours is zero', () => {
    const catSummary = {
      id: 'work',
      label: 'Work',
      actualHours: 9,
      targetHours: 32,
      percent: 28,
      deltaHours: -23,
      remainingHours: 23,
      needPerDay: 7.7,
      daysLeft: 3,
      calendarPercent: 0,
      gap: 0,
      status: 'behind',
      statusLabel: 'Behind',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const summary = {
      total: catSummary,
      categories: [catSummary],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
            todayHours: 0,
          },
        ],
      },
    })

    expect(wrapper.find('.today-inline').exists()).toBe(false)
    expect(wrapper.find('.today-chip').exists()).toBe(false)
    expect(wrapper.find('.today-overlay').exists()).toBe(false)
  })

  it('omits categories when summary has none and no groups provided', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 0,
        targetHours: 10,
        percent: 0,
        deltaHours: -10,
        remainingHours: 10,
        needPerDay: 1,
        daysLeft: 5,
        calendarPercent: 0,
        gap: 0,
        status: 'behind',
        statusLabel: 'Behind',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
      },
    })

    expect(wrapper.findAll('.targets-categories .category')).toHaveLength(0)
  })

  it('does not fall back to summary categories when explicit empty groups are provided', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 4,
        targetHours: 10,
        percent: 40,
        deltaHours: -6,
        remainingHours: 6,
        needPerDay: 2,
        daysLeft: 3,
        calendarPercent: 33,
        gap: 7,
        status: 'on_track',
        statusLabel: 'On Track',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [
        {
          id: 'stale',
          label: 'Stale Category',
          actualHours: 4,
          targetHours: 10,
          percent: 40,
          deltaHours: -6,
          remainingHours: 6,
          needPerDay: 2,
          daysLeft: 3,
          calendarPercent: 33,
          gap: 7,
          status: 'on_track',
          statusLabel: 'On Track',
          includeWeekend: true,
          paceMode: 'days_only',
        },
      ],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        groups: [],
      },
    })

    expect(wrapper.findAll('.targets-categories .category')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Stale Category')
  })

  it('hides the header when showHeader is false', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 0,
        targetHours: 10,
        percent: 0,
        deltaHours: -10,
        remainingHours: 10,
        needPerDay: 1,
        daysLeft: 5,
        calendarPercent: 0,
        gap: 0,
        status: 'behind',
        statusLabel: 'Behind',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        showHeader: false,
      },
    })

    expect(wrapper.find('.targets-header').exists()).toBe(false)
  })

  it('keeps done targets in the endless zone when never finished mode is enabled', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 22,
        targetHours: 20,
        percent: 110,
        deltaHours: 2,
        remainingHours: 0,
        needPerDay: 0,
        daysLeft: 0,
        calendarPercent: 100,
        gap: 10,
        status: 'done',
        statusLabel: 'Done',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [
        {
          id: 'work',
          label: 'Work',
          actualHours: 15,
          targetHours: 12,
          percent: 125,
          deltaHours: 3,
          remainingHours: 0,
          needPerDay: 0,
          daysLeft: 0,
          calendarPercent: 100,
          gap: 25,
          status: 'done',
          statusLabel: 'Done',
          includeWeekend: true,
          paceMode: 'days_only',
        },
      ],
      forecast: { text: 'On pace', linear: 22, momentum: 24, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        neverFinishedMode: true,
      },
    })

    expect(wrapper.text()).toContain('Never Finished')
    expect(wrapper.text()).toContain('Stay Hard')
    expect(wrapper.text()).not.toContain('Done')
    expect(wrapper.find('.targets-hustle').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('110%')
    const hintedPercent = wrapper.text().match(/(\d+)%/)
    expect(hintedPercent).not.toBeNull()
    expect(Number.parseInt(hintedPercent?.[1] ?? '0', 10)).toBeGreaterThanOrEqual(80)
    expect(Number.parseInt(hintedPercent?.[1] ?? '0', 10)).toBeLessThan(100)
  })

  it('keeps real percentages below the endless threshold', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 15,
        targetHours: 20,
        percent: 75,
        deltaHours: -5,
        remainingHours: 5,
        needPerDay: 1,
        daysLeft: 5,
        calendarPercent: 60,
        gap: 15,
        status: 'on_track',
        statusLabel: 'On Track',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [],
      forecast: { text: 'Forecast text', linear: 18, momentum: 19, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        neverFinishedMode: true,
      },
    })

    expect(wrapper.text()).toContain('75%')
    expect(wrapper.text()).toContain('On Track')
    expect(wrapper.text()).not.toContain('Stay Hard')
  })
})
