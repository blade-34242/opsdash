import { describe, it, expect } from 'vitest'

import { createDefaultTargetsConfig } from '../src/services/targets'
import { mapWidgetToComponent, widgetsRegistry } from '../src/services/widgetsRegistry'

describe('widgetsRegistry targets_v2', () => {
  it('overrides UI flags without mutating base config', () => {
    const entry = widgetsRegistry.targets_v2
    const baseCfg = createDefaultTargetsConfig()
    baseCfg.ui.showTotalDelta = true
    baseCfg.includeZeroDaysInStats = false
    const def: any = {
      options: {
        showTotalDelta: false,
        showNeedPerDay: false,
        badges: false,
        includeWeekendToggle: false,
        includeZeroDaysInStats: true,
      },
    }
    const ctx: any = { targetsConfig: baseCfg }
    const props = entry.buildProps(def, ctx) as any

    expect(props.config.ui.showTotalDelta).toBe(false)
    expect(props.config.ui.showNeedPerDay).toBe(false)
    expect(props.config.ui.badges).toBe(false)
    expect(props.config.ui.includeWeekendToggle).toBe(false)
    expect(props.config.includeZeroDaysInStats).toBe(true)
    expect(baseCfg.ui.showTotalDelta).toBe(true)
    expect(baseCfg.includeZeroDaysInStats).toBe(false)
  })

  it('applies showPace toggle', () => {
    const entry = widgetsRegistry.targets_v2
    const def: any = { options: { showPace: false } }
    const props = entry.buildProps(def, {}) as any
    expect(props.showPace).toBe(false)
  })

  it('passes never finished mode only when explicitly enabled', () => {
    const entry = widgetsRegistry.targets_v2
    const offProps = entry.buildProps({ options: {} } as any, {}) as any
    const onProps = entry.buildProps({ options: { neverFinishedMode: true } } as any, {}) as any
    expect(entry.defaultOptions?.neverFinishedMode).toBe(false)
    expect(offProps.neverFinishedMode).toBe(false)
    expect(onProps.neverFinishedMode).toBe(true)
  })

  it('uses localConfig when enabled', () => {
    const entry = widgetsRegistry.targets_v2
    const baseCfg = createDefaultTargetsConfig()
    baseCfg.totalHours = 48
    const localCfg = { ...baseCfg, totalHours: 12 }
    localCfg.categories = [{ id: 'only', label: 'Only', targetHours: 12, includeWeekend: true, groupIds: [1] }]

    const def: any = {
      options: {
        useLocalConfig: true,
        localConfig: localCfg,
        showPace: true,
      },
    }
    const ctx: any = {
      targetsConfig: baseCfg,
      targetsSummary: { total: { targetHours: 48 } },
      stats: {},
      byDay: [],
      byCal: [{ total_hours: 6 }],
      groupsById: {},
      rangeMode: 'week',
      from: '2024-01-01',
      to: '2024-01-07',
    }
    const props = entry.buildProps(def, ctx) as any

    expect(props.config.totalHours).toBe(12)
    expect(props.summary.total.targetHours).toBe(12)
    expect(props.summary.total.actualHours).toBe(6)
    expect(Array.isArray(props.groups)).toBe(true)
    expect(props.groups).toHaveLength(1)
    expect(props.groups[0].id).toBe('only')
    expect(ctx.targetsConfig.totalHours).toBe(48)
  })

  it('local summary respects current category list', () => {
    const entry = widgetsRegistry.targets_v2
    const baseCfg = createDefaultTargetsConfig()
    const localCfg = {
      ...baseCfg,
      categories: [{ id: 'only', label: 'Only', targetHours: 10, includeWeekend: true, groupIds: [1] }],
    }
    const def: any = { options: { useLocalConfig: true, localConfig: localCfg } }
    const ctx: any = {
      targetsConfig: baseCfg,
      stats: {},
      byDay: [],
      byCal: [{ id: 'cal-1', total_hours: 5, group: 1 }],
      groupsById: { 'cal-1': 1 },
      rangeMode: 'week',
      from: '2024-01-01',
      to: '2024-01-07',
    }
    const props = entry.buildProps(def, ctx) as any
    expect(props.summary.categories).toHaveLength(1)
    expect(props.summary.categories[0].id).toBe('only')
    expect(props.summary.categories[0].actualHours).toBe(5)
  })

  it('shows calendar rows for calendar goal mode', () => {
    const entry = widgetsRegistry.targets_v2
    const cfg = createDefaultTargetsConfig()
    cfg.categories = []
    cfg.ui.showCategoryBlocks = false

    const def: any = { options: {} }
    const ctx: any = {
      onboardingStrategy: 'total_plus_categories',
      targetsConfig: cfg,
      targetsSummary: {
        total: {
          id: 'total',
          label: 'Total',
          actualHours: 6,
          plannedHours: 1,
          targetHours: 12,
          percent: 50,
          deltaHours: -6,
          remainingHours: 6,
          needPerDay: 3,
          daysLeft: 2,
          calendarPercent: 40,
          gap: 10,
          status: 'on_track',
          statusLabel: 'On Track',
          includeWeekend: true,
          paceMode: 'days_only',
        },
        categories: [],
        forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
      },
      byCal: [{ id: 'cal-1', calendar: 'Primary', total_hours: 6, future_hours: 1 }],
      calendars: [{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }],
      currentTargets: { 'cal-1': 8 },
      calendarTodayHours: { 'cal-1': 2 },
    }

    const props = entry.buildProps(def, ctx) as any

    expect(props.config.ui.showCategoryBlocks).toBe(true)
    expect(props.groups).toHaveLength(1)
    expect(props.groups[0].id).toBe('cal-1')
    expect(props.groups[0].label).toBe('Primary')
    expect(props.groups[0].summary.targetHours).toBe(8)
    expect(props.groups[0].todayHours).toBe(2)
  })

  it('keeps over-target calendar row percentages above 200%', () => {
    const entry = widgetsRegistry.targets_v2
    const cfg = createDefaultTargetsConfig()
    cfg.categories = []

    const props = entry.buildProps({ options: {} } as any, {
      onboardingStrategy: 'total_plus_categories',
      targetsConfig: cfg,
      targetsSummary: {
        total: {
          id: 'total',
          label: 'Total',
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
        },
        categories: [],
        forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
      },
      byCal: [{ id: 'cal-1', calendar: 'Primary', total_hours: 25 }],
      calendars: [{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }],
      currentTargets: { 'cal-1': 10 },
    }) as any

    expect(props.groups[0].summary.percent).toBe(250)
    expect(props.groups[0].summary.gap).toBe(150)
  })

  it('prefers single goal mode over stale categories when strategy says total only', () => {
    const entry = widgetsRegistry.targets_v2
    const cfg = createDefaultTargetsConfig()
    const def: any = { options: {} }
    const ctx: any = {
      onboardingStrategy: 'total_only',
      targetsConfig: cfg,
      targetsSummary: {
        total: {
          id: 'total',
          label: 'Total',
          actualHours: 6,
          targetHours: 12,
          percent: 50,
          deltaHours: -6,
          remainingHours: 6,
          needPerDay: 3,
          daysLeft: 2,
          calendarPercent: 40,
          gap: 10,
          status: 'on_track',
          statusLabel: 'On Track',
          includeWeekend: true,
          paceMode: 'days_only',
        },
        categories: cfg.categories,
        forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
      },
      byCal: [{ id: 'cal-1', calendar: 'Primary', total_hours: 6 }],
      calendars: [{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }],
      currentTargets: {},
    }

    const props = entry.buildProps(def, ctx) as any

    expect(props.config.ui.showCategoryBlocks).toBe(false)
    expect(props.groups).toEqual([])
  })

  it('time summary overview applies overrides to config', () => {
    const entry = widgetsRegistry.time_summary_overview
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        showTotal: false,
        showWeekendShare: false,
        showBalance: false,
        mode: 'all',
      },
    }
    const ctx: any = { targetsConfig: baseCfg, summary: { rangeLabel: 'Week' }, activeDayMode: 'active' }
    const props = entry.buildProps(def, ctx) as any
    expect(props.config.showTotal).toBe(false)
    expect(props.config.showWeekendShare).toBe(false)
    expect(props.config.showBalance).toBe(true)
    expect(props.showOverview).toBe(true)
    expect(props.showLookback).toBe(false)
    expect(props.showDelta).toBe(false)
    expect(props.mode).toBe('all')
  })

  it('time summary lookback exposes defaults for options', () => {
    const entry = widgetsRegistry.time_summary_lookback
    expect(entry.defaultOptions?.showTotal).toBe(true)
    expect(entry.defaultOptions?.mode).toBe('active')
    expect(entry.defaultOptions?.showDelta).toBe(true)
  })

  it('balance_index uses defaults when options/context missing', () => {
    const entry = widgetsRegistry.balance_index
    const def: any = { options: {}, layout: {}, type: 'balance_index', id: 'w1', version: 1 }
    const ctx: any = { balanceOverview: { trend: { history: [], delta: [], badge: '' }, categories: [], relations: [], warnings: [], index: 0 } }
    const props = entry.buildProps(def, ctx) as any
    expect(props.indexBasis).toBe('category')
    expect(props.thresholds.noticeAbove).toBeCloseTo(0.15)
    expect(props.thresholds.warnIndex).toBeCloseTo(0.6)
    expect(props.showConfig).toBe(true)
    expect(entry.defaultOptions?.indexBasis).toBe('category')
    expect(entry.defaultOptions?.noticeAbove).toBeCloseTo(0.15)
  })

  it('balance_index falls back to calendar basis when category mapping is disabled', () => {
    const entry = widgetsRegistry.balance_index
    const cfg = createDefaultTargetsConfig()
    cfg.balance.useCategoryMapping = false
    cfg.balance.index.basis = 'category'
    const def: any = {
      options: { indexBasis: 'category' },
      layout: {},
      type: 'balance_index',
      id: 'w-balance-calendar-fallback',
      version: 1,
    }
    const ctx: any = {
      targetsConfig: cfg,
      balanceConfig: cfg.balance,
      balanceOverview: { trend: { history: [], delta: [], badge: '' }, categories: [], relations: [], warnings: [], index: 0 },
    }
    const props = entry.buildProps(def, ctx) as any
    expect(props.indexBasis).toBe('calendar')
  })

  it('balance_index propagates trend color and background', () => {
    const entry = widgetsRegistry.balance_index
    const def: any = {
      options: {
        trendColor: '#111111',
        cardBg: '#fafafa',
      },
      layout: {},
      type: 'balance_index',
      id: 'w2',
      version: 1,
    }
    const ctx: any = { balanceOverview: { trend: { history: [], delta: [], badge: '' }, categories: [], relations: [], warnings: [], index: 0 } }
    const props = entry.buildProps(def, ctx) as any
    expect(props.trendColor).toBe('#111111')
    expect(props.cardBg).toBe('#fafafa')
  })

  it('trend widgets use global lookback and ignore per-widget lookback options', () => {
    const balanceEntry = widgetsRegistry.balance_index
    const balanceProps = balanceEntry.buildProps(
      {
        options: {
          lookbackWeeks: 1,
          loopbackCount: 1,
        },
        layout: {},
        type: 'balance_index',
        id: 'b1',
        version: 1,
      } as any,
      {
        lookbackWeeks: 4,
        balanceOverview: { trend: { history: [], delta: [], badge: '' }, categories: [], relations: [], warnings: [], index: 0 },
      } as any,
    ) as any
    expect(balanceProps.lookbackWeeks).toBe(4)
    expect(balanceProps.loopbackCount).toBe(4)

    const mixEntry = widgetsRegistry.category_mix_trend
    const mixProps = mixEntry.buildProps(
      {
        options: { lookbackWeeks: 1 },
        layout: {},
        type: 'category_mix_trend',
        id: 'c1',
        version: 1,
      } as any,
      {
        lookbackWeeks: 3,
        balanceOverview: { trend: { history: [], delta: [], badge: '' }, categories: [], relations: [], warnings: [], index: 0 },
      } as any,
    ) as any
    expect(mixProps.lookbackWeeks).toBe(3)
    expect(mixEntry.defaultOptions?.colorMode).toBe('hybrid')
    expect(mixEntry.defaultOptions?.trendIndicator).toBe('none')
    expect(mixEntry.defaultOptions?.shareLowColor).toBe('#e2e8f0')
    expect(mixEntry.defaultOptions?.shareHighColor).toBe('#60a5fa')
    expect(mixEntry.defaultOptions?.toneLowColor).toBe('#e11d48')
    expect(mixEntry.defaultOptions?.toneHighColor).toBe('#10b981')
  })

  it('dayoff_trend uses global unit and defaults tone colors', () => {
    const entry = widgetsRegistry.dayoff_trend
    const def: any = { options: { lookback: 1 }, layout: {}, type: 'dayoff_trend', id: 'd1', version: 1 }
    const ctx: any = { activityDayOffTrend: [], activityTrendUnit: 'mo', activityDayOffLookback: 2 }
    const props = entry.buildProps(def, ctx) as any
    const keys = (entry.controls || []).map((control: any) => control.key)

    expect(keys).not.toContain('unit')
    expect(keys).not.toContain('lookback')
    expect(keys).not.toContain('showBadges')
    expect(keys).toContain('labelMode')
    expect(keys).toContain('interpretation')
    expect(entry.defaultOptions?.toneLowColor).toBe('#dc2626')
    expect(entry.defaultOptions?.toneHighColor).toBe('#16a34a')
    expect(entry.defaultOptions?.labelMode).toBe('period')
    expect(entry.defaultOptions?.interpretation).toBe('more_off_positive')
    expect(props.unit).toBe('mo')
    expect(props.lookback).toBe(2)
  })

  it('common title prefix is applied when provided', () => {
    const entry = widgetsRegistry.balance_index
    const def: any = {
      options: {
        titlePrefix: 'My ',
      },
      layout: {},
      type: 'balance_index',
      id: 'w3',
      version: 1,
    }
    const ctx: any = { balanceOverview: { trend: { history: [], delta: [], badge: '' }, categories: [], relations: [], warnings: [], index: 0 } }
    const props = entry.buildProps(def, ctx) as any
    expect(props.title.startsWith('My ')).toBe(true)
  })

  it('computes loading per widget type', () => {
    const baseCtx: any = {
      hasInitialLoad: true,
      isLoading: false,
      isInitialLoading: false,
      isRefreshing: false,
      deckLoading: false,
      rangeLabel: 'Week',
      rangeMode: 'week',
      from: '2024-01-01',
      to: '2024-01-07',
      summary: {},
      targetsConfig: {},
    }
    const defSummary: any = { id: 's1', type: 'time_summary_overview', layout: { width: 'half', height: 'm', order: 1 }, options: {}, version: 1 }
    const defDeck: any = { id: 'd1', type: 'deck_cards', layout: { width: 'half', height: 'm', order: 1 }, options: {}, version: 1 }

    expect(mapWidgetToComponent(defSummary, { ...baseCtx, isInitialLoading: true })?.loading).toBe(true)
    expect(mapWidgetToComponent(defDeck, { ...baseCtx, deckLoading: true })?.loading).toBe(false)
    expect(mapWidgetToComponent({ ...defSummary, type: 'unknown' }, baseCtx)).toBeNull()
  })

  it('deck_stats builds compact props from widget options', () => {
    const entry = widgetsRegistry.deck_stats
    const def: any = {
      id: 'deck-stats-1',
      type: 'deck_stats',
      layout: { width: 'half', height: 'm', order: 2 },
      options: {
        boardIds: [1],
        stackIds: [11],
        tagIds: ['tag_urgent'],
        metrics: ['open_now', 'due_in_range'],
        scope: 'mine',
        mineMode: 'both',
      },
      version: 1,
    }
    const props = entry.buildProps(def, {
      deckCards: [],
      rangeLabel: 'This week',
      from: '2026-04-01',
      to: '2026-04-07',
      uid: 'me',
    } as any) as any

    expect(props.metrics).toEqual(['open_now', 'due_in_range'])
    expect(props.scope).toBe('mine')
    expect(props.mineMode).toBe('both')
    expect(props.selectionText).toContain('1 board')
    expect(props.selectionText).toContain('Mine')
  })
})
