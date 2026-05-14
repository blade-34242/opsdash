import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDashboard } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'

function createDashboard(overrides: Partial<Parameters<typeof useDashboard>[0]> = {}) {
  const range = ref<'week' | 'month'>('week')
  const offset = ref(0)
  const userChangedSelection = ref(false)

  const route = vi.fn<(name: 'loadData') => string>().mockImplementation(() => '/load')
  const getJson = vi.fn()
  const postJson = vi.fn()
  const notifyError = vi.fn()
  const scheduleDraw = vi.fn()
  const fetchNotes = vi.fn().mockResolvedValue(undefined)

  const dashboard = useDashboard({
    range,
    offset,
    userChangedSelection,
    route,
    getJson,
    postJson,
    notifyError,
    scheduleDraw,
    fetchNotes,
    isDebug: () => false,
    ...overrides,
  })

  return {
    range,
    offset,
    userChangedSelection,
    route,
    getJson,
    postJson,
    notifyError,
    scheduleDraw,
    fetchNotes,
    ...dashboard,
  }
}

describe('useDashboard load', () => {
  const originalOc = (globalThis as any).OC

  beforeEach(() => {
    ;(window as any).OC = { currentUser: 'user-123' }
  })

  afterEach(() => {
    if (originalOc === undefined) {
      delete (window as any).OC
    } else {
      ;(window as any).OC = originalOc
    }
  })

  it('populates reactive state from the load response', async () => {
    const config = createDefaultTargetsConfig()
    config.totalHours = 123

    const response = {
      meta: {
        from: '2024-01-01',
        to: '2024-01-07',
        truncated: true,
        limits: {
          maxPerCal: 10,
          maxTotal: 100,
          totalProcessed: 42,
        },
      },
      calendars: [
        { id: 'cal-1', displayname: 'Calendar 1', color: '#ff0000' },
        { id: 'cal-2', displayname: 'Calendar 2', color: '#00ff00' },
      ],
      colors: {
        byName: { 'Calendar 1': '#ff0000' },
        byId: { 'cal-1': '#ff0000', 'cal-2': '#00ff00' },
      },
      groups: {
        byId: {
          'cal-1': 2,
          'cal-2': 7,
        },
      },
      targets: {
        week: { 'cal-1': 12 },
        month: { 'cal-1': 48 },
      },
      targetsConfig: config,
      onboarding: {
        completed: false,
        version: 0,
        version_required: 1,
        needsOnboarding: true,
      },
      selected: ['cal-1'],
      stats: { totalHours: 12 },
      byCal: [{ id: 'cal-1', total_hours: 12 }],
      byDay: [{ date: '2024-01-02', total_hours: 6 }],
      longest: [],
      charts: { pie: { ids: ['cal-1'], colors: ['#ff0000'] } },
      reportingConfig: {
        enabled: true,
        modes: {
          week: {
            enabled: true,
            cadence: 'mid',
            reminderLead: '1d',
          },
          month: {
            enabled: false,
            cadence: 'end',
            reminderLead: '2d',
          },
        },
        alertOnRisk: true,
        riskThreshold: 0.75,
        notifyEmail: true,
        notifyNotification: false,
      },
      deckSettings: {
        enabled: true,
        filtersEnabled: false,
        defaultFilter: 'mine',
      },
    }

    const getJson = vi.fn().mockResolvedValue(response)
    const postJson = vi.fn().mockResolvedValue(response)
    const fetchNotes = vi.fn().mockResolvedValue(undefined)
    const notifyError = vi.fn()
    const scheduleDraw = vi.fn()

    const dashboard = createDashboard({
      getJson,
      postJson,
      fetchNotes,
      notifyError,
      scheduleDraw,
    })

    expect(dashboard.isLoading.value).toBe(false)
    await dashboard.load()

    expect(dashboard.route).toHaveBeenCalledWith('loadData')
    expect(getJson).toHaveBeenCalledWith('/load', {
      range: 'week',
      offset: 0,
      include: ['core'],
    })
    expect(postJson).toHaveBeenCalledWith('/load', {
      range: 'week',
      offset: 0,
      include: ['data'],
    })

    expect(dashboard.isLoading.value).toBe(false)
    expect(dashboard.uid.value).toBe('user-123')
    expect(dashboard.from.value).toBe('2024-01-01')
    expect(dashboard.to.value).toBe('2024-01-07')
    expect(dashboard.isTruncated.value).toBe(true)
    expect(dashboard.truncLimits.value).toEqual(response.meta.limits)

    expect(dashboard.calendars.value).toHaveLength(2)
    expect(dashboard.groupsById.value).toEqual({ 'cal-1': 2, 'cal-2': 7 })
    expect(dashboard.selected.value).toEqual(['cal-1'])

    expect(dashboard.targetsWeek.value).toEqual({ 'cal-1': 12 })
    expect(dashboard.targetsMonth.value).toEqual({ 'cal-1': 48 })
    expect(dashboard.targetsConfig.value.totalHours).toBe(123)
    expect(dashboard.onboarding.value).toEqual(response.onboarding)

    expect(dashboard.stats.totalHours).toBe(12)
    expect(dashboard.reportingConfig.value.modes.week).toEqual({
      enabled: true,
      cadence: 'mid',
      reminderLead: '1d',
    })
    expect(dashboard.reportingConfig.value.modes.month).toEqual({
      enabled: false,
      cadence: 'end',
      reminderLead: '2d',
    })
    expect(dashboard.deckSettings.value.filtersEnabled).toBe(false)
    expect(dashboard.byCal.value).toEqual(response.byCal)
    expect(dashboard.byDay.value).toEqual(response.byDay)
    expect(dashboard.charts.value).toEqual(response.charts)

    expect(scheduleDraw).toHaveBeenCalledTimes(1)
    expect(fetchNotes).toHaveBeenCalledTimes(1)
    expect(notifyError).not.toHaveBeenCalled()
    expect(dashboard.userChangedSelection.value).toBe(false)
  })

  it('preserves existing palette when the server falls back to hashed colors', async () => {
    const configA = createDefaultTargetsConfig()
    const configB = createDefaultTargetsConfig()

    const firstResponse = {
      meta: {
        from: '2024-02-01',
        to: '2024-02-07',
      },
      calendars: [
        { id: 'cal-1', displayname: 'Calendar 1', color: '#123456', color_src: 'getColor' },
      ],
      colors: {
        byName: { 'Calendar 1': '#123456' },
        byId: { 'cal-1': '#123456' },
      },
      groups: { byId: { 'cal-1': 0 } },
      targets: { week: {}, month: {} },
      targetsConfig: configA,
      selected: ['cal-1'],
      onboarding: {
        completed: true,
        version: 1,
        version_required: 1,
        needsOnboarding: false,
      },
      stats: {},
      byCal: [],
      byDay: [],
      longest: [],
      charts: {
        pie: { ids: ['cal-1'], colors: ['#123456'], labels: ['Calendar 1'], data: [6] },
        perDaySeries: {
          labels: ['2024-02-01'],
          series: [{ id: 'cal-1', color: '#123456', data: [6] }],
        },
      },
    }

    const secondResponse = {
      meta: {
        from: '2024-02-08',
        to: '2024-02-14',
      },
      calendars: [
        { id: 'cal-1', displayname: 'Calendar 1', color: '#aaaaaa', color_src: 'fallback' },
      ],
      colors: {
        byName: { 'Calendar 1': '#aaaaaa' },
        byId: { 'cal-1': '#aaaaaa' },
      },
      groups: { byId: { 'cal-1': 0 } },
      targets: { week: {}, month: {} },
      targetsConfig: configB,
      selected: ['cal-1'],
      onboarding: {
        completed: false,
        version: 0,
        version_required: 1,
        needsOnboarding: true,
      },
      stats: {},
      byCal: [],
      byDay: [],
      longest: [],
      charts: {
        pie: { ids: ['cal-1'], colors: ['#aaaaaa'], labels: ['Calendar 1'], data: [4] },
        perDaySeries: {
          labels: ['2024-02-08'],
          series: [{ id: 'cal-1', color: '#aaaaaa', data: [4] }],
        },
      },
    }

    const responses = [firstResponse, firstResponse, secondResponse, secondResponse]
    const getJson = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()))
    const postJson = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()))
    const fetchNotes = vi.fn().mockResolvedValue(undefined)
    const scheduleDraw = vi.fn()

    const dashboard = createDashboard({
      getJson,
      postJson,
      fetchNotes,
      scheduleDraw,
    })

    await dashboard.load()

    expect(dashboard.colorsById.value['cal-1']).toBe('#123456')
    expect(dashboard.charts.value.pie.colors).toEqual(['#123456'])
    expect(dashboard.charts.value.perDaySeries.series[0].color).toBe('#123456')
    expect(dashboard.onboarding.value).toEqual(firstResponse.onboarding)

    await dashboard.load()

    expect(dashboard.colorsById.value['cal-1']).toBe('#123456')
    expect(dashboard.colorsByName.value['Calendar 1']).toBe('#123456')
    expect(dashboard.calendars.value[0].color).toBe('#123456')
    expect(dashboard.calendars.value[0].color_src).toBe('fallback')
    expect(dashboard.charts.value.pie.colors).toEqual(['#123456'])
    expect(dashboard.charts.value.perDaySeries.series[0].color).toBe('#123456')
    expect(dashboard.onboarding.value).toEqual(secondResponse.onboarding)
    expect(fetchNotes).toHaveBeenCalledTimes(2)
    expect(scheduleDraw).toHaveBeenCalledTimes(2)
  })

  it('does not block dashboard loading completion on notes fetch', async () => {
    const response = {
      meta: {
        from: '2024-01-01',
        to: '2024-01-07',
      },
      calendars: [
        { id: 'cal-1', displayname: 'Calendar 1', color: '#ff0000' },
      ],
      colors: {
        byName: { 'Calendar 1': '#ff0000' },
        byId: { 'cal-1': '#ff0000' },
      },
      groups: { byId: { 'cal-1': 0 } },
      targets: { week: {}, month: {} },
      targetsConfig: createDefaultTargetsConfig(),
      onboarding: {
        completed: true,
        version: 1,
        version_required: 1,
        needsOnboarding: false,
      },
      selected: ['cal-1'],
      stats: {},
      byCal: [],
      byDay: [],
      longest: [],
      charts: {},
    }
    let resolveNotes: ((value?: unknown) => void) | undefined
    const fetchNotes = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveNotes = resolve
    }))
    const getJson = vi.fn().mockResolvedValue(response)
    const postJson = vi.fn().mockResolvedValue(response)
    const dashboard = createDashboard({
      getJson,
      postJson,
      fetchNotes,
    })

    const loadPromise = dashboard.load()
    await loadPromise

    expect(fetchNotes).toHaveBeenCalledTimes(1)
    expect(dashboard.isLoading.value).toBe(false)

    resolveNotes?.()
  })
})
