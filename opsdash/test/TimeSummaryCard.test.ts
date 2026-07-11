import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import TimeSummaryCard from '../src/components/widgets/cards/TimeSummaryCard.vue'

const baseSummary = {
  rangeLabel: 'Week 10',
  rangeStart: '2025-03-03',
  rangeEnd: '2025-03-09',
  offset: 0,
  totalHours: 12.5,
  futureHours: 2.5,
  avgDay: 2.5,
  avgEvent: 1.25,
  medianDay: 2,
  todayActualHours: 0,
  todayPlannedHours: 0,
  busiest: { date: '2025-03-04', hours: 5 },
  workdayAvg: 3,
  workdayMedian: 2.5,
  weekendAvg: 1,
  weekendMedian: 1.5,
  weekendShare: 40,
  activeCalendars: 3,
  calendarSummary: 'Cal A 60%, Cal B 40%',
  balanceIndex: 0.78,
  delta: null,
  topCategory: {
    label: 'Work',
    actualHours: 7.5,
    targetHours: 10,
    percent: 75,
    statusLabel: 'At risk',
    status: 'at_risk',
  },
}

const baseHistoryEntry = {
  offset: 1,
  label: 'Week -1',
  rangeStart: '2025-02-24',
  rangeEnd: '2025-03-02',
  totalHours: 9.5,
  avgDay: 1.9,
  avgEvent: 1.1,
  medianDay: 1.7,
  busiest: { date: '2025-02-26', hours: 3.5 },
  workdayAvg: 2.1,
  workdayMedian: 2.0,
  weekendAvg: 1.2,
  weekendMedian: 1.1,
  weekendShare: 32,
  activeCalendars: 2,
  calendarSummary: 'Cal A 70%, Cal B 30%',
  topCategory: null,
  balanceIndex: 0.67,
  activity: {
    events: 8,
    activeDays: 4,
    typicalStart: '08:30',
    typicalEnd: '16:30',
    weekendShare: 32,
    eveningShare: 21,
    earliestStart: '07:45',
    latestEnd: '19:20',
    overlapEvents: 1,
    longestSession: 2.8,
    lastDayOff: '2025-02-23',
    lastHalfDayOff: '2025-02-22',
  },
}

describe('TimeSummaryCard', () => {
  it('renders the daily KPI hero when today data is provided', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: {
          ...baseSummary,
          todayActualHours: 6.5,
          todayPlannedHours: 1.5,
        },
        mode: 'active',
      },
    })

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Today')
    expect(text).toContain('6.5h')
    expect(text).toContain('1.5 h planned later')
  })

  it('renders daily metrics, category lanes, and the week mini chart', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: baseSummary,
        mode: 'active',
        showHeader: true,
        displayMode: 'category_and_calendar_goals',
        categoryTodayItems: [
          { id: 'work', label: 'Work', todayHours: 4, color: '#2563EB' },
          { id: '__uncategorized__', label: 'Unassigned', todayHours: 1, color: '#64748b', isUnassigned: true },
        ],
        weekDays: [
          { date: '2025-03-03', label: 'Mon', hours: 2 },
          { date: '2025-03-04', label: 'Tue', hours: 5, isToday: true },
        ],
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Time Summary · Week 10')
    expect(text).toContain('Daily')
    expect(text).toContain('Calendars')
    expect(text).toContain('Categories')
    expect(text).toContain('Today by category')
    expect(text).toContain('Work')
    expect(text).toContain('4.0 h')
    expect(text).toContain('avg/event')
    expect(wrapper.find('.time-summary-week').exists()).toBe(true)
  })

  it('hides calendar and category-specific summary rows in single goal mode', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: baseSummary,
        mode: 'active',
        displayMode: 'single_goal',
        config: {
          showCalendarSummary: false,
          showTopCategory: false,
        },
      },
    })

    const text = wrapper.text()
    expect(text).not.toContain('3 calendars')
    expect(text).not.toContain('Top category')
    expect(text).not.toContain('Calendars')
    expect(text).not.toContain('Categories')
    expect(wrapper.find('.time-summary-row.calendars').exists()).toBe(false)
    expect(wrapper.find('.time-summary-row.top-category').exists()).toBe(false)
  })

  it('uses calendar-specific lanes in calendar goals mode', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: {
          ...baseSummary,
          topCategory: null,
        },
        mode: 'active',
        displayMode: 'calendar_goals',
        config: {
          showCalendarSummary: true,
          showTopCategory: false,
        },
        calendarTodayItems: [
          { id: 'cal-a', label: 'Cal A', todayHours: 2.5, color: '#ff0000' },
          { id: 'cal-b', label: 'Cal B', todayHours: 1, color: '#00ff00' },
        ],
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Today by calendar')
    expect(text).toContain('Cal A')
    expect(text).toContain('2.5 h')
    expect(wrapper.text()).toContain('Calendars')
    expect(wrapper.text()).not.toContain('Categories')
  })

  it('keeps category lanes in category and calendar goals mode', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: baseSummary,
        mode: 'active',
        displayMode: 'category_and_calendar_goals',
        categoryTodayItems: [
          { id: 'work', label: 'Work', todayHours: 3, color: '#2563eb' },
        ],
      },
    })

    expect(wrapper.text()).toContain('Today by category')
    expect(wrapper.text()).toContain('Work')
    expect(wrapper.text()).toContain('Categories')
  })

  it('honours new overview toggles', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: {
          ...baseSummary,
          topCategory: null,
        },
        mode: 'all',
        displayMode: 'calendar_goals',
        config: {
          showWeekendShare: false,
          showTopCategory: false,
          showBusiest: false,
        },
        showDailyKpis: false,
        showWeekMiniChart: false,
        showActivityNote: false,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Today')
    expect(wrapper.find('.time-summary-kpis').exists()).toBe(false)
    expect(wrapper.find('.time-summary-week').exists()).toBe(false)
    expect(wrapper.find('.time-summary-activity-note').exists()).toBe(false)
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: baseSummary,
        mode: 'active',
        showHeader: false,
        displayMode: 'category_and_calendar_goals',
      },
    })
    expect(wrapper.find('.time-summary-firstline').exists()).toBe(false)
  })

  it('supports legacy lookback toggles only when lookback is explicitly enabled', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: {
          ...baseSummary,
          todayHours: 4,
          delta: {
            totalHours: 1.2,
            avgPerDay: 0.2,
            avgPerEvent: 0.1,
            events: 1,
          },
        },
        activitySummary: {
          events: 10,
          activeDays: 5,
          typicalStart: '08:00',
          typicalEnd: '17:00',
          weekendShare: 40,
          eveningShare: 25,
          delta: null,
          earliestStart: '07:30',
          latestEnd: '19:00',
          overlapEvents: 2,
          longestSession: 3.2,
          lastDayOff: '2025-03-01',
          lastHalfDayOff: '2025-02-28',
        },
        mode: 'active',
        displayMode: 'category_and_calendar_goals',
        showToday: false,
        showActivity: false,
        showLookback: true,
        showHistoryCoreMetrics: false,
        history: [baseHistoryEntry],
      },
    })

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).not.toContain('Total today')
    expect(text).not.toContain('Activity & Schedule')
    expect(text).not.toContain('Δ vs. offset')
    expect(text).not.toContain('Events')
    expect(text).not.toContain('Active days')
    expect(text).not.toContain('Typical')
    expect(text).toContain('Lookback')
  })

  it('uses accordion by default and maps legacy list to timeline layout', () => {
    const baseProps = {
        summary: baseSummary,
        mode: 'active' as const,
        displayMode: 'category_and_calendar_goals' as const,
        showLookback: true,
        history: [baseHistoryEntry],
      }

    const accordion = mount(TimeSummaryCard, { props: baseProps })
    expect(accordion.find('.time-summary-history__accordion').exists()).toBe(true)
    expect(accordion.find('.time-summary-history__timeline').exists()).toBe(false)

    const timeline = mount(TimeSummaryCard, {
      props: {
        ...baseProps,
        historyView: 'list',
      },
    })
    expect(timeline.find('.time-summary-history__timeline').exists()).toBe(true)
    expect(timeline.find('.time-summary-history__accordion').exists()).toBe(false)
  })

  it('shows a clear hint when lookback is enabled but configured to only one period', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: baseSummary,
        mode: 'active',
        displayMode: 'category_and_calendar_goals',
        showOverview: false,
        showLookback: true,
        lookbackWeeks: 1,
        rangeMode: 'week',
        history: [],
      },
    })

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Lookback data required')
    expect(text).toContain('Increase trend lookback above 1 to compare previous weeks here.')
  })
})
