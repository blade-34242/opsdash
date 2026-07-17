import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { useDashboard } from '../composables/useDashboard'
import { useCategories } from '../composables/useCategories'
import { useCharts } from '../composables/useCharts'
import { buildTargetsSummary } from '../src/services/targets'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface IntegrationHarness {
  fixture: any
  range: ReturnType<typeof ref<'week' | 'month'>>
  dashboard: ReturnType<typeof useDashboard>
  categories: ReturnType<typeof useCategories>
  charts: ReturnType<typeof useCharts>
  targetsSummary: ReturnType<typeof computed>
  currentTargets: ReturnType<typeof computed>
  route: ReturnType<typeof vi.fn>
  getJson: ReturnType<typeof vi.fn>
  postJson: ReturnType<typeof vi.fn>
  scheduleDraw: ReturnType<typeof vi.fn>
  fetchNotes: ReturnType<typeof vi.fn>
}

function loadFixture(name: string) {
  const file = path.join(__dirname, 'fixtures-v2', name)
  const json = readFileSync(file, 'utf-8')
  return JSON.parse(json)
}

function fixtureExists(name: string) {
  return existsSync(path.join(__dirname, 'fixtures-v2', name))
}

function offsetFixtureName(range: 'week' | 'month', offset: number) {
  if (offset === 0) return `load-${range}.json`
  const base = `load-${range}-offset${offset}.json`
  const trend = base.replace('.json', '-trend.json')
  return fixtureExists(trend) ? trend : base
}

async function createIntegrationHarness(options: {
  fixture: string
  range: 'week' | 'month'
  offset?: number
  userId?: string
}): Promise<IntegrationHarness> {
  const fixture = loadFixture(options.fixture)
  const range = ref<'week' | 'month'>(options.range)
  const offset = ref(options.offset ?? 0)
  const userChangedSelection = ref(false)
  if (typeof window !== 'undefined') {
    ;(window as any).OC = { currentUser: options.userId || 'admin' }
  }

  const route = vi.fn<(name: 'loadData') => string>().mockReturnValue('/overview/load')
  const getJson = vi.fn().mockImplementation(async () => JSON.parse(JSON.stringify(fixture)))
  const postJson = vi.fn().mockImplementation(async () => JSON.parse(JSON.stringify(fixture)))
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
  })

  await dashboard.load()
  await nextTick()

  const targetsSummary = computed(() =>
    buildTargetsSummary({
      config: dashboard.targetsConfig.value,
      stats: fixture.stats,
      byDay: dashboard.byDay.value,
      byCal: dashboard.byCal.value,
      groupsById: dashboard.groupsById.value,
      range: range.value,
      from: dashboard.from.value,
      to: dashboard.to.value,
    }),
  )

  const currentTargets = computed(() => (range.value === 'week' ? dashboard.targetsWeek.value : dashboard.targetsMonth.value))

  const categories = useCategories({
    calendars: dashboard.calendars,
    selected: dashboard.selected,
    groupsById: dashboard.groupsById,
    colorsById: dashboard.colorsById,
    targetsConfig: dashboard.targetsConfig,
    targetsSummary,
    byCal: dashboard.byCal,
    currentTargets,
  })

  const activityCardConfig = computed(() => dashboard.targetsConfig.value.activityCard)

  const charts = useCharts({
    charts: dashboard.charts,
    colorsById: dashboard.colorsById,
    colorsByName: dashboard.colorsByName,
    calendarGroups: categories.calendarGroups,
    calendarCategoryMap: categories.calendarCategoryMap,
    targetsConfig: dashboard.targetsConfig,
    currentTargets,
    activityCardConfig,
  })

  return {
    fixture,
    range,
    dashboard,
    categories,
    charts,
    targetsSummary,
    currentTargets,
    route,
    getJson,
    postJson,
    scheduleDraw,
    fetchNotes,
  }
}

describe('Dashboard integration fixtures', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('replays week payload and produces forecast for remaining days', async () => {
    vi.setSystemTime(new Date('2025-10-29T12:00:00Z'))

    const harness = await createIntegrationHarness({ range: 'week', fixture: 'load-week.json', userId: 'admin' })

    expect(harness.route).toHaveBeenCalledWith('loadData')
    expect(harness.getJson).toHaveBeenCalledTimes(1)
    expect(harness.postJson).toHaveBeenCalledTimes(1)
    expect(harness.scheduleDraw).toHaveBeenCalledTimes(1)

    expect(harness.dashboard.uid.value).toBe('admin')
    expect(harness.dashboard.targetsConfig.value.allDayHours).toBe(15)
    expect(harness.dashboard.longest.value.some((entry: any) => entry?.allday === true)).toBe(true)

    const summary = harness.targetsSummary.value
    expect(summary.total.actualHours).toBeCloseTo(31, 5)
    expect(summary.categories).toHaveLength(harness.dashboard.targetsConfig.value.categories.length)

    expect(harness.categories.calendarCategoryMap.value.personal).toBe('__uncategorized__')
    const unassigned = harness.categories.calendarGroups.value.find((group) => group.id === '__uncategorized__')
    expect(unassigned?.rows.length).toBeGreaterThan(0)

    const stacked = harness.charts.calendarChartData.value.stacked
    expect(stacked).not.toBeNull()
    expect(stacked?.labels).toHaveLength(7)
    expect(stacked?.series).toHaveLength(1)

    const forecast = stacked?.series?.[0]?.forecast as number[] | undefined
    expect(forecast).toBeDefined()
    const futureIndices = stacked!.labels
      .map((label, idx) => (label > '2025-10-29' ? idx : -1))
      .filter((idx) => idx >= 0)
    futureIndices.forEach((idx) => {
      expect(forecast?.[idx]).toBeGreaterThan(0)
    })
    const pastSlice = forecast?.slice(0, futureIndices[0] ?? 0) ?? []
    pastSlice.forEach((value) => expect(value).toBe(0))

    const totalTarget = harness.dashboard.targetsConfig.value.totalHours
    const actualTotal = harness.targetsSummary.value.total.actualHours
    const remaining = Math.max(0, Math.round((totalTarget - actualTotal) * 100) / 100)
    const expectedPerDay =
      futureIndices.length > 0 ? Math.round((remaining / futureIndices.length) * 100) / 100 : 0
    futureIndices.forEach((idx) => {
      expect(forecast?.[idx]).toBeCloseTo(expectedPerDay, 2)
    })
  })

  it('exposes longest task summaries from fixtures', async () => {
    vi.setSystemTime(new Date('2025-10-29T12:00:00Z'))
    const harness = await createIntegrationHarness({ range: 'week', fixture: 'load-week.json' })
    const longest = harness.dashboard.longest.value
    expect(Array.isArray(longest)).toBe(true)
    expect(longest.length).toBeGreaterThan(0)
    expect(longest.some((entry: any) => typeof entry?.summary === 'string' && entry.summary.length > 0)).toBe(true)
  })

  it('replays month payload and keeps category mapping + forecast data stable', async () => {
    vi.setSystemTime(new Date('2025-10-05T12:00:00Z'))

    const harness = await createIntegrationHarness({ range: 'month', fixture: 'load-month.json', userId: 'admin' })

    expect(harness.dashboard.uid.value).toBe('admin')
    expect(harness.dashboard.targetsConfig.value.totalHours).toBe(48)

    const summary = harness.targetsSummary.value
    expect(summary.total.actualHours).toBeCloseTo(62, 5)
    expect(summary.categories).toHaveLength(harness.dashboard.targetsConfig.value.categories.length)

    const groupIds = harness.categories.calendarGroups.value.map((group) => group.id)
    expect(groupIds).toContain('__uncategorized__')

    const stacked = harness.charts.calendarChartData.value.stacked
    expect(stacked).not.toBeNull()
    const forecasts = (stacked?.series || []).flatMap((series: any) => series?.forecast || [])
    expect(forecasts.some((val: number) => val > 0)).toBe(true)
  })

  it('handles previous-week offset fixtures', async () => {
    const fixtureName = offsetFixtureName('week', -1)
    if (!fixtureExists(fixtureName)) {
      return
    }
    const fixture = loadFixture(fixtureName)
    vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
    const harness = await createIntegrationHarness({ range: 'week', fixture: fixtureName, offset: -1, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(-1)
    expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
    expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
    expect(harness.dashboard.byCal.value.length).toBeGreaterThan(0)
  })

  it('handles future-week offset fixtures with multiple calendars', async () => {
    vi.setSystemTime(new Date('2025-11-12T12:00:00Z'))
    const harness = await createIntegrationHarness({ range: 'week', fixture: 'load-week-offset2.json', offset: 2, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(2)
    expect(harness.dashboard.from.value).toBe('2025-11-10')
    expect(harness.dashboard.to.value).toBe('2025-11-16')
    expect(harness.dashboard.selected.value).toEqual(['personal', 'asdsad'])
  })

  it('handles next-month offset fixtures', async () => {
    vi.setSystemTime(new Date('2025-11-28T12:00:00Z'))
    const harness = await createIntegrationHarness({ range: 'month', fixture: 'load-month-offset1.json', offset: 1, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(1)
    expect(harness.dashboard.from.value).toBe('2025-11-03')
    expect(harness.dashboard.to.value).toBe('2025-11-30')
    expect(harness.dashboard.themePreference.value).toBe('dark')
    expect(harness.dashboard.targetsWeek.value.personal).toBe(12)
    expect(harness.dashboard.targetsMonth.value['opsdash-focus']).toBe(32)
    expect(harness.dashboard.selected.value).toEqual(['personal', 'opsdash-focus'])
  })

  it('handles month fixtures with multiple calendars selected', async () => {
    vi.setSystemTime(new Date('2025-10-15T12:00:00Z'))
    const harness = await createIntegrationHarness({ range: 'month', fixture: 'load-month-multiuser.json', offset: 0, userId: 'admin' })
    expect(harness.dashboard.selected.value).toEqual(['personal', 'opsdash-focus'])
    const calendars = harness.dashboard.calendars.value
    expect(calendars.filter((cal: any) => cal.checked === false).map((cal: any) => cal.id)).toContain('asdsad')
    expect(harness.currentTargets.value['opsdash-focus']).toBeGreaterThan(0)
    expect(harness.dashboard.groupsById.value.personal).toBe(0)
  })

  it('replays QA month payload with limit metadata intact', async () => {
    vi.setSystemTime(new Date('2025-11-12T12:00:00Z'))
    const harness = await createIntegrationHarness({ range: 'month', fixture: 'load-month-qa.json', offset: 0, userId: 'admin' })
    expect(harness.dashboard.uid.value).toBe('admin')
    expect(harness.dashboard.colorsById.value.personal).toBe('#0be5a6')
    expect(harness.dashboard.truncLimits.value?.totalProcessed).toBe(3)
    expect(harness.dashboard.byCal.value.length).toBeGreaterThan(0)
    expect(harness.dashboard.charts.value?.perDaySeries).toBeTruthy()
  })

  it('replays QA week payload with independent selection', async () => {
    vi.setSystemTime(new Date('2025-11-14T12:00:00Z'))
    const harness = await createIntegrationHarness({ range: 'week', fixture: 'load-week-qa.json', offset: 0, userId: 'qa' })
    expect(harness.dashboard.uid.value).toBe('qa')
    expect(harness.dashboard.selected.value).toEqual(['opsdash-focus'])
    expect(harness.dashboard.colorsById.value['opsdash-focus']).toBe('#2563EB')
    expect(harness.dashboard.groupsById.value['opsdash-focus']).toBe(2)
  })

  it('handles week offset -2 fixtures', async () => {
    const fixtureName = offsetFixtureName('week', -2)
    if (!fixtureExists(fixtureName)) {
      return
    }
    const fixture = loadFixture(fixtureName)
    vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
    const harness = await createIntegrationHarness({ range: 'week', fixture: fixtureName, offset: -2, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(-2)
    expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
    expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
    expect(harness.dashboard.byCal.value.length).toBeGreaterThan(0)
  })

  it('handles week offset 3 fixtures', async () => {
    const fixtureName = offsetFixtureName('week', 3)
    if (!fixtureExists(fixtureName)) {
      return
    }
    const fixture = loadFixture(fixtureName)
    vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
    const harness = await createIntegrationHarness({ range: 'week', fixture: fixtureName, offset: 3, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(3)
    expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
    expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
    expect(harness.dashboard.byCal.value.length).toBeGreaterThan(0)
  })

  it('handles month offset -2 fixtures', async () => {
    const fixtureName = offsetFixtureName('month', -2)
    if (!fixtureExists(fixtureName)) {
      return
    }
    const fixture = loadFixture(fixtureName)
    vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
    const harness = await createIntegrationHarness({ range: 'month', fixture: fixtureName, offset: -2, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(-2)
    expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
    expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
    expect(harness.dashboard.byCal.value.length).toBeGreaterThan(0)
  })

  it('handles month offset 2 fixtures', async () => {
    const fixtureName = offsetFixtureName('month', 2)
    if (!fixtureExists(fixtureName)) {
      return
    }
    const fixture = loadFixture(fixtureName)
    vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
    const harness = await createIntegrationHarness({ range: 'month', fixture: fixtureName, offset: 2, userId: 'admin' })
    expect(harness.fixture.meta.offset).toBe(2)
    expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
    expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
    expect(harness.dashboard.byCal.value.length).toBeGreaterThan(0)
  })

  describe('offset coverage (fixtures optional)', () => {
    const weekOffsets = [-4, -3, -2, -1, 1, 2, 3, 4] as const
    const monthOffsets = [-4, -3, -2, -1, 1, 2, 3, 4] as const

    weekOffsets.forEach((offset) => {
      const fixtureName = offsetFixtureName('week', offset)
      const testName = `handles week offset ${offset} fixtures`
      if (!fixtureExists(fixtureName)) {
        it.skip(`${testName} (missing ${fixtureName})`, async () => {})
        return
      }
      it(testName, async () => {
        const fixture = loadFixture(fixtureName)
        vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
        const harness = await createIntegrationHarness({ range: 'week', fixture: fixtureName, offset, userId: 'admin' })
        expect(harness.fixture.meta.offset).toBe(offset)
        expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
        expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
        expect(Array.isArray(harness.dashboard.byCal.value)).toBe(true)
      })
    })

    monthOffsets.forEach((offset) => {
      const fixtureName = offsetFixtureName('month', offset)
      const testName = `handles month offset ${offset} fixtures`
      if (!fixtureExists(fixtureName)) {
        it.skip(`${testName} (missing ${fixtureName})`, async () => {})
        return
      }
      it(testName, async () => {
        const fixture = loadFixture(fixtureName)
        vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
        const harness = await createIntegrationHarness({ range: 'month', fixture: fixtureName, offset, userId: 'admin' })
        expect(harness.fixture.meta.offset).toBe(offset)
        expect(harness.dashboard.from.value).toBe(harness.fixture.meta.from)
        expect(harness.dashboard.to.value).toBe(harness.fixture.meta.to)
        expect(Array.isArray(harness.dashboard.byCal.value)).toBe(true)
      })
    })
  })

  it('keeps trend history for multi-offset fixtures', async () => {
    const weekFixture = offsetFixtureName('week', 3)
    if (fixtureExists(weekFixture)) {
      const fixture = loadFixture(weekFixture)
      vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
      const harness = await createIntegrationHarness({ range: 'week', fixture: weekFixture, offset: 3, userId: 'admin' })
      expect(Array.isArray(harness.dashboard.stats.day_off_trend)).toBe(true)
      expect(harness.dashboard.stats.day_off_trend.length).toBeGreaterThan(1)
      expect(Array.isArray(harness.dashboard.stats.balance_overview?.trend?.history)).toBe(true)
      expect(harness.dashboard.stats.balance_overview.trend.history.length).toBeGreaterThan(0)
    }

    const monthFixture = offsetFixtureName('month', -3)
    if (fixtureExists(monthFixture)) {
      const fixture = loadFixture(monthFixture)
      vi.setSystemTime(new Date(`${fixture.meta.from}T12:00:00Z`))
      const harness = await createIntegrationHarness({ range: 'month', fixture: monthFixture, offset: -3, userId: 'admin' })
      expect(Array.isArray(harness.dashboard.stats.day_off_trend)).toBe(true)
      expect(harness.dashboard.stats.day_off_trend.length).toBeGreaterThan(1)
      expect(Array.isArray(harness.dashboard.stats.balance_overview?.trend?.history)).toBe(true)
      expect(harness.dashboard.stats.balance_overview.trend.history.length).toBeGreaterThan(0)
    }
  })
})
