import { describe, it, expect } from 'vitest'

import { createDefaultTargetsConfig } from '../src/services/targets'
import { widgetsRegistry } from '../src/services/widgetsRegistry'

describe('time summary split widgets', () => {
  it('overview widget applies toggle overrides and respects active day mode from options', () => {
    const entry = widgetsRegistry.time_summary_overview
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        showTotal: false,
        showWeekend: false,
        showBalance: false,
        showToday: false,
        showActivity: false,
        showHistoryCoreMetrics: false,
        mode: 'all',
      },
    }
    const ctx: any = {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      activeDayMode: 'active',
      groups: [{ id: 'work', label: 'Work', todayHours: 2, color: '#123456' }],
      targetsConfig: baseCfg,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.mode).toBe('all')
    expect(props.config.showTotal).toBe(false)
    expect(props.config.showWeekend).toBe(false)
    expect(props.config.showBalance).toBe(true)
    expect(props.showOverview).toBe(true)
    expect(props.showLookback).toBe(false)
    expect(props.showToday).toBe(false)
    expect(props.showActivity).toBe(false)
    expect(props.showDelta).toBe(false)
    expect(props.showHistoryCoreMetrics).toBe(false)
    expect(props.summary.totalHours).toBe(10)
    expect(props.todayGroups?.[0]?.todayHours).toBe(2)
    expect(props.showHeader).toBe(true)
    expect(Array.isArray(props.history)).toBe(true)
    expect(props.history).toHaveLength(0)
  })

  it('limits overview mini chart to the current widget week only', () => {
    const entry = widgetsRegistry.time_summary_overview
    const baseCfg = createDefaultTargetsConfig()
    const def: any = { options: {} }
    const ctx: any = {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      rangeMode: 'week',
      from: '2026-07-05',
      to: '2026-07-11',
      byDay: [
        { date: '2026-07-04', total_hours: 99, events_count: 9 },
        { date: '2026-07-05', total_hours: 1, events_count: 1 },
        { date: '2026-07-07', total_hours: 3, events_count: 2 },
        { date: '2026-07-12', total_hours: 99, events_count: 9 },
      ],
      targetsConfig: baseCfg,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.weekDays.map((day: any) => day.date)).toEqual([
      '2026-07-05',
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
    ])
    expect(props.weekDays.map((day: any) => day.hours)).toEqual([1, 0, 3, 0, 0, 0, 0])
    expect(props.weekDays[0].label).toBe('Sun')
  })

  it('builds category today lanes from calendar groups and today hour maps', () => {
    const entry = widgetsRegistry.time_summary_overview
    const baseCfg = createDefaultTargetsConfig()
    const props = entry.buildProps({ options: {} } as any, {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      rangeMode: 'week',
      from: '2026-07-05',
      to: '2026-07-11',
      onboardingStrategy: 'full_granular',
      targetsConfig: baseCfg,
      calendarGroups: [
        { id: 'work', label: 'Work' },
        { id: 'sport', label: 'Sport', todayHours: 1.5 },
      ],
      categoryTodayHours: {
        work: 3.25,
        sport: 1,
      },
      categoryColorMap: {
        work: '#2563eb',
        sport: '#10b981',
      },
    } as any) as any

    expect(props.displayMode).toBe('category_and_calendar_goals')
    expect(props.categoryTodayItems).toEqual([
      { id: 'work', label: 'Work', todayHours: 3.25, color: '#2563eb', isUnassigned: false },
      { id: 'sport', label: 'Sport', todayHours: 1.5, color: '#10b981', isUnassigned: false },
    ])
  })

  it('does not build the overview mini week chart in month mode', () => {
    const entry = widgetsRegistry.time_summary_overview
    const baseCfg = createDefaultTargetsConfig()
    const props = entry.buildProps({ options: {} } as any, {
      summary: { rangeLabel: 'Month', totalHours: 10 },
      rangeMode: 'month',
      from: '2026-07-01',
      to: '2026-07-31',
      byDay: [{ date: '2026-07-01', total_hours: 1 }],
      targetsConfig: baseCfg,
    } as any) as any

    expect(props.weekDays).toEqual([])
  })

  it('lookback widget enables history and hides overview rows', () => {
    const entry = widgetsRegistry.time_summary_lookback
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        historyView: 'pills',
        showDelta: false,
      },
    }
    const ctx: any = {
      summary: { rangeLabel: 'Month', totalHours: 5, todayHours: 1 },
      activeDayMode: 'active',
      groups: [{ id: 'sport', label: 'Sport', todayHours: 0 }],
      targetsConfig: baseCfg,
      lookbackWeeks: 4,
      charts: {
        perDaySeriesByOffset: [
          { offset: 1, from: '2025-12-01', to: '2025-12-07', labels: ['2025-12-01'], series: [{ id: 'cal-1', name: 'A', data: [2] }] },
        ],
        hodByOffset: [{ offset: 1, dows: ['Mon'], matrix: [[2]] }],
        summaryByOffset: [{ offset: 1, events: 1 }],
      },
      calendarCategoryMap: { 'cal-1': 'work' },
      calendarGroups: [{ id: 'work', label: 'Work' }],
      categoryColorMap: { work: '#2563EB' },
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.mode).toBe('active')
    expect(props.showOverview).toBe(false)
    expect(props.showLookback).toBe(true)
    expect(props.showToday).toBe(false)
    expect(props.showActivity).toBe(false)
    expect(props.showDelta).toBe(false)
    expect(props.historyView).toBe('accordion')
    expect(props.history.length).toBe(1)
    expect(baseCfg.timeSummary.showTotal).toBe(true)
    expect(baseCfg.timeSummary.showWeekend).toBe(true)
    expect(props.showHistoryCoreMetrics).toBe(true)
    expect(props.showHeader).toBe(true)
  })

  it('maps legacy list history layout to timeline', () => {
    const entry = widgetsRegistry.time_summary_lookback
    const baseCfg = createDefaultTargetsConfig()
    const def: any = { options: { historyView: 'list' } }
    const ctx: any = {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      activeDayMode: 'active',
      targetsConfig: baseCfg,
      lookbackWeeks: 1,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.historyView).toBe('timeline')
  })

  it('passes showHeader when explicitly disabled on lookback widget', () => {
    const entry = widgetsRegistry.time_summary_lookback
    const baseCfg = createDefaultTargetsConfig()
    const def: any = { options: { showHeader: false } }
    const ctx: any = {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      activeDayMode: 'active',
      targetsConfig: baseCfg,
      lookbackWeeks: 1,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.showHeader).toBe(false)
  })
})
