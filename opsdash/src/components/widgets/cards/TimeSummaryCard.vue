<template>
    <div class="card time-summary compact" :style="cardStyle">
      <div class="time-summary-firstline" v-if="showHeader">
      <span>{{ headerText }}</span>
      </div>
    <div v-if="showOverviewPanel">
    <div class="today-highlight" v-if="showToday && todayTotal !== null">
      <div class="today-label">Total today</div>
      <div class="today-value">{{ n2(todayTotal) }} h</div>
      <div v-if="todayPlannedHours > 0" class="today-subvalue">Later today {{ n2(todayPlannedHours) }} h planned</div>
    </div>
    <div class="today-cats" v-if="showToday && todayItems.length">
      <div class="today-cat" v-for="cat in todayItems" :key="cat.id">
        <span class="dot" :style="{ background: cat.color || 'var(--brand)' }"></span>
        <span class="name">{{ cat.label }}</span>
        <span
          v-if="(cat as any).isUnassigned"
          class="unassigned-hint"
          title="Hours from calendars not assigned to a category. Open Settings → Categories to assign them."
        >ⓘ</span>
        <span class="value">{{ n2(cat.todayHours) }} h</span>
      </div>
    </div>

    <div class="time-summary-inline" v-if="summaryConfig.showTotal">
      <strong>{{ n2(summary.totalHours) }} h</strong> total
    </div>
    <div class="time-summary-inline time-summary-inline--planned" v-if="summary.futureHours > 0">
      {{ n2(summary.futureHours) }} h planned later
    </div>
    <div class="time-summary-inline" v-if="inlineStats">
      {{ inlineStats }}
    </div>
    <div class="time-summary-inline" v-if="summaryConfig.showBusiest && busiestText">
      {{ busiestText }}
    </div>
    <div class="time-summary-row" v-if="summaryConfig.showWorkday">
      <span class="label">Workdays</span> {{ n2(summary.workdayAvg) }} h avg · {{ n2(summary.workdayMedian) }} h median
    </div>
    <div class="time-summary-row" v-if="summaryConfig.showWeekend">
      <span class="label">Weekend</span> {{ n2(summary.weekendAvg) }} h avg · {{ n2(summary.weekendMedian) }} h median
      <span v-if="summaryConfig.showWeekendShare && weekendShareText" class="share">({{ weekendShareText }})</span>
    </div>
    <div class="time-summary-row calendars" v-if="summaryConfig.showCalendarSummary">
      <span class="label">{{ calendarRowLabel }}</span>
      <template v-if="summary.calendarSummary">
        <span class="sep">·</span>
        <span class="text">{{ summary.calendarSummary }}</span>
      </template>
    </div>
    <div class="time-summary-row top-category" v-if="summaryConfig.showTopCategory && topCategoryInfo">
      <span class="label">{{ topCategoryLabel }}</span>
      <span class="text">{{ topCategoryInfo.text }}</span>
      <span v-if="topCategoryInfo.badge" class="summary-badge" :class="topCategoryInfo.badgeClass">{{ topCategoryInfo.badge }}</span>
    </div>
    <div class="time-summary-activity" v-if="showActivity && activity">
      <div class="time-summary-activity__title">Activity &amp; Schedule</div>
      <div class="time-summary-activity__line">
        Events {{ activity.events }} • Active Days {{ activity.activeDays ?? 0 }} • Typical {{ typicalWindow }}{{ activityOffsetSuffix }}
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Weekend {{ pct(activity.weekendShare) }}
        <span v-if="weekendDeltaLabel" class="time-summary-activity__delta">({{ weekendDeltaLabel }})</span>
        • Evening {{ pct(activity.eveningShare) }}
        <span v-if="eveningDeltaLabel" class="time-summary-activity__delta">({{ eveningDeltaLabel }})</span>
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Earliest/Late {{ earliestLatestLabel }}
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Overlaps {{ activity.overlapEvents ?? 0 }} • Longest {{ longestSessionLabel }}
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Last day off {{ lastDayOffLabel }}
      </div>
    </div>
    </div>
    <div class="time-summary-history" v-if="showLookbackPanel && historyRows.length">
      <div class="time-summary-history__header">
        <div class="time-summary-history__title">Lookback</div>
        <div class="time-summary-history__mode">{{ historyViewLabel }}</div>
      </div>
      <div v-if="historyView === 'timeline'" class="time-summary-history__timeline">
        <div class="history-timeline-entry" v-for="item in historyRows" :key="item.offset">
          <div class="history-timeline-entry__header">
            <span class="history-timeline-entry__title">{{ item.label }}</span>
            <span v-if="item.range" class="history-timeline-entry__range">{{ item.range }}</span>
            <span v-if="showDelta && item.deltaHours" class="history-timeline-entry__delta">
              {{ item.deltaHours }}<template v-if="item.deltaPercent"> · {{ item.deltaPercent }}</template>
            </span>
          </div>
          <div class="history-timeline-entry__metrics">
            <div v-if="summaryConfig.showTotal" class="history-timeline-cell">
              <span class="history-timeline-cell__label">Total</span>
              <span class="history-timeline-cell__value">{{ item.totalHours }}</span>
            </div>
            <div v-if="summaryConfig.showAverage" class="history-timeline-cell">
              <span class="history-timeline-cell__label">Avg/day</span>
              <span class="history-timeline-cell__value">{{ item.avgDay }}</span>
            </div>
            <div v-if="summaryConfig.showBalance" class="history-timeline-cell">
              <span class="history-timeline-cell__label">Balance</span>
              <span class="history-timeline-cell__value">{{ item.balanceIndex }}</span>
            </div>
            <div v-if="summaryConfig.showWeekendShare" class="history-timeline-cell">
              <span class="history-timeline-cell__label">Weekend %</span>
              <span class="history-timeline-cell__value">{{ item.weekendShare }}</span>
            </div>
            <div v-if="summaryConfig.showTopCategory" class="history-timeline-cell">
              <span class="history-timeline-cell__label">Top category</span>
              <span class="history-timeline-cell__value">{{ item.topCategoryBrief }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="time-summary-history__accordion">
        <div class="history-accordion-entry" v-for="item in historyRows" :key="item.offset">
          <button class="history-accordion-entry__header" type="button" @click="toggleAccordion(item.offset)">
            <span class="history-accordion-entry__title">{{ item.label }}</span>
            <span v-if="item.range" class="history-accordion-entry__range">{{ item.range }}</span>
            <span v-if="summaryConfig.showTotal" class="history-accordion-entry__summary">{{ item.totalHours }}</span>
            <span v-if="showDelta && item.deltaHours" class="history-accordion-entry__delta">
              {{ item.deltaHours }}<template v-if="item.deltaPercent"> · {{ item.deltaPercent }}</template>
            </span>
            <span class="history-accordion-entry__caret">{{ isAccordionOpen(item.offset) ? '−' : '+' }}</span>
          </button>
          <div v-if="isAccordionOpen(item.offset)" class="history-accordion-entry__body">
            <div class="history-accordion-group" v-for="section in item.sections" :key="section.key">
              <div class="history-accordion-group__title">{{ section.label }}</div>
              <div class="history-accordion-group__metrics">
                <div class="history-accordion-group__metric" v-for="metric in section.metrics" :key="metric.label">
                  <span class="history-accordion-group__metric-label">{{ metric.label }}</span>
                  <span class="history-accordion-group__metric-value">{{ metric.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="showLookbackPanel" class="time-summary-history time-summary-history--empty">
      <div class="time-summary-history__header">
        <div class="time-summary-history__title">Lookback</div>
      </div>
      <div class="time-summary-history__empty">
        <div class="time-summary-history__empty-title">{{ lookbackEmptyTitle }}</div>
        <div class="time-summary-history__empty-copy">{{ lookbackEmptyCopy }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDateOnly, formatDateRange, formatTime } from '../../../services/dateTime'

type Mode = 'active' | 'all'

type SummaryConfig = {
  showTotal: boolean
  showAverage: boolean
  showMedian: boolean
  showBusiest: boolean
  showWorkday: boolean
  showWeekend: boolean
  showWeekendShare: boolean
  showCalendarSummary: boolean
  showTopCategory: boolean
  showBalance: boolean
}

type DisplayMode = 'single_goal' | 'calendar_goals' | 'category_and_calendar_goals'

type HistoryEntry = {
  offset: number
  label: string
  rangeStart: string
  rangeEnd: string
  totalHours: number
  avgDay: number
  avgEvent: number
  medianDay: number
  busiest: { date?: string; hours?: number } | null
  workdayAvg: number
  workdayMedian: number
  weekendAvg: number
  weekendMedian: number
  weekendShare: number | null
  activeCalendars: number
  calendarSummary: string
  topCategory: { label: string; actualHours: number; targetHours: number; percent: number; color?: string } | null
  balanceIndex: number | null
  activity: {
    events: number
    activeDays: number
    typicalStart: string | null
    typicalEnd: string | null
    weekendShare: number | null
    eveningShare: number | null
    earliestStart: string | null
    latestEnd: string | null
    overlapEvents: number | null
    longestSession: number | null
    lastDayOff: string | null
    lastHalfDayOff: string | null
  }
}

type HistoryMetric = {
  label: string
  value: string
}

type HistorySection = {
  key: string
  label: string
  metrics: HistoryMetric[]
}

type HistoryRow = {
  offset: number
  label: string
  range: string
  totalHours: string
  avgDay: string
  balanceIndex: string
  weekendShare: string
  topCategoryBrief: string
  deltaHours: string
  deltaPercent: string
  sections: HistorySection[]
}

const defaultConfig: SummaryConfig = {
  showTotal: true,
  showAverage: true,
  showMedian: true,
  showBusiest: true,
  showWorkday: true,
  showWeekend: true,
  showWeekendShare: true,
  showCalendarSummary: true,
  showTopCategory: true,
  showBalance: true,
}

const props = withDefaults(defineProps<{
  summary: {
    rangeLabel: string
    rangeStart: string
    rangeEnd: string
    offset: number
    totalHours: number
    futureHours: number
    avgDay: number
    avgEvent: number
    medianDay: number
    todayActualHours: number
    todayPlannedHours: number
    busiest: { date?: string; hours?: number } | null
    workdayAvg: number
    workdayMedian: number
    weekendAvg: number
    weekendMedian: number
    weekendShare: number | null
    activeCalendars: number
    calendarSummary: string
    balanceIndex: number | null
    delta: {
      totalHours: number
      avgPerDay: number
      avgPerEvent: number
      events: number
    } | null
    topCategory: {
      label: string
      actualHours: number
      targetHours: number
      percent: number
      statusLabel: string
      status: string
      color?: string
    } | null
  }
  activitySummary?: {
    events: number
    activeDays: number | null
    typicalStart: string | null
    typicalEnd: string | null
    weekendShare: number | null
    eveningShare: number | null
    delta: {
      weekendShare: number | null
      eveningShare: number | null
    } | null
    earliestStart: string | null
    latestEnd: string | null
    overlapEvents: number | null
    longestSession: number | null
    lastDayOff: string | null
    lastHalfDayOff: string | null
  } | null
  mode: Mode
  config?: SummaryConfig
  todayGroups?: Array<{ id: string; label: string; todayHours: number; color?: string | null }>
  title?: string
  cardBg?: string | null
  rangeMode?: 'week' | 'month' | string
  rangeStart?: string
  rangeEnd?: string
  offset?: number
  lookbackWeeks?: number
  showHeader?: boolean
  showToday?: boolean
  showActivity?: boolean
  history?: HistoryEntry[]
  showHistoryCoreMetrics?: boolean
  historyView?: 'timeline' | 'accordion' | 'list' | 'pills'
  showActivityDetails?: boolean
  showOverview?: boolean
  showLookback?: boolean
  showDelta?: boolean
  displayMode?: DisplayMode
}>(), {
  showHeader: true,
  showToday: true,
  showActivity: true,
  showHistoryCoreMetrics: true,
  showActivityDetails: true,
  showOverview: true,
  showLookback: true,
  showDelta: true,
})

const summaryConfig = computed<SummaryConfig>(() => Object.assign({}, defaultConfig, props.config ?? {}))
const displayMode = computed<DisplayMode>(() => {
  const value = String(props.displayMode ?? '')
  if (value === 'calendar_goals' || value === 'category_and_calendar_goals') return value
  return 'single_goal'
})

const modeLabel = computed(() => (props.mode === 'active' ? 'active days' : 'all days'))

const todayItems = computed(() =>
  (props.todayGroups || [])
    .filter((g) => Number(g.todayHours) > 0)
    .map((g) => ({
      ...g,
      todayHours: Number(g.todayHours) || 0,
      color: g.color || 'var(--brand)',
    })),
)

const todayTotal = computed(() => {
  if (todayItems.value.length) {
    return todayItems.value.reduce((sum, g) => sum + g.todayHours, 0)
  }
  if (Number.isFinite(props.summary.todayActualHours)) {
    return props.summary.todayActualHours
  }
  const v = (props.summary as any)?.todayHours
  return typeof v === 'number' && Number.isFinite(v) ? v : null
})
const todayPlannedHours = computed(() => {
  const value = Number(props.summary?.todayPlannedHours ?? 0)
  return Number.isFinite(value) ? Math.max(0, value) : 0
})

const titleText = computed(() => props.title || 'Time Summary')
const calendarRowLabel = computed(() => displayMode.value === 'single_goal' ? '' : `${props.summary.activeCalendars} calendars`)
const topCategoryLabel = computed(() => displayMode.value === 'category_and_calendar_goals' ? 'Top category' : 'Top focus')
const historyGroupLabel = computed(() => {
  if (displayMode.value === 'calendar_goals') return 'Calendars'
  if (displayMode.value === 'category_and_calendar_goals') return 'Categories & calendars'
  return 'Focus'
})
const headerText = computed(() => {
  const base = titleText.value
  const range = props.summary?.rangeLabel || ''
  return range ? `${base} · ${range}` : base
})
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const showHeader = computed(() => props.showHeader)
const showToday = computed(() => props.showToday)
const showActivity = computed(() => props.showActivity)
const showHistoryCoreMetrics = computed(() => props.showHistoryCoreMetrics)
const historyView = computed(() => {
  const value = String(props.historyView ?? '').toLowerCase()
  if (value === 'timeline' || value === 'list') return 'timeline'
  return 'accordion'
})
const historyViewLabel = computed(() => (historyView.value === 'accordion' ? 'Accordion' : 'Timeline'))
const showActivityDetails = computed(() => props.showActivityDetails)
const showOverviewPanel = computed(() => props.showOverview !== false)
const showLookbackPanel = computed(() => props.showLookback !== false)
const showDelta = computed(() => props.showDelta !== false)
const configuredLookbackWeeks = computed(() => {
  const value = Number(props.lookbackWeeks ?? 1)
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1
})
const lookbackNeedsConfig = computed(() => configuredLookbackWeeks.value <= 1)
const lookbackUnitLabel = computed(() => String(props.rangeMode).toLowerCase() === 'month' ? 'months' : 'weeks')
const lookbackEmptyTitle = computed(() =>
  lookbackNeedsConfig.value ? 'Lookback data required' : 'No lookback data available',
)
const lookbackEmptyCopy = computed(() => {
  if (lookbackNeedsConfig.value) {
    return `Increase trend lookback above 1 to compare previous ${lookbackUnitLabel.value} here.`
  }
  return `No previous ${lookbackUnitLabel.value} are available for this comparison yet.`
})
const offsetBase = computed(() =>
  Number.isFinite(props.summary.offset) ? props.summary.offset : (props.offset ?? 0),
)
const comparisonOffset = computed(() => offsetBase.value - 1)
const comparisonOffsetLabel = computed(() => formatOffset(comparisonOffset.value))
const activityOffsetSuffix = computed(() => {
  if (offsetBase.value === 0) return ''
  return ` (offset ${formatOffset(offsetBase.value)})`
})

const weekendShareText = computed(() => {
  if (!summaryConfig.value.showWeekendShare) return ''
  const v = props.summary.weekendShare
  return v == null ? '' : `${n1(v)}%`
})

const topCategoryInfo = computed(() => {
  if (!summaryConfig.value.showTopCategory) return null
  const cat = props.summary.topCategory
  if (!cat) return null
  const actual = n2(cat.actualHours)
  const percent = Number(cat.percent ?? 0).toFixed(0)
  const targetPart = cat.targetHours > 0 ? ` (${percent}% of ${n2(cat.targetHours)} h)` : ''
  return {
    text: `${cat.label} — ${actual} h${targetPart}`,
    badge: cat.statusLabel || '',
    badgeClass: statusClass(cat.status as any),
  }
})

const busiestText = computed(() => {
  if (!summaryConfig.value.showBusiest) return ''
  const b = props.summary.busiest
  if (!b || !b.date) {
    return ''
  }
  const hours = Number(b.hours ?? 0)
  return `Busiest ${b.date} — ${n2(hours)} h`
})

const inlineStats = computed(() => {
  const parts: string[] = []
  if (summaryConfig.value.showAverage) {
    parts.push(`${n2(props.summary.avgDay)} h/day (${modeLabel.value})`)
    parts.push(`${n2(props.summary.avgEvent)} h/event`)
  }
  if (summaryConfig.value.showMedian) {
    parts.push(`${n2(props.summary.medianDay)} h median/day`)
  }
  return parts.filter(Boolean).join(' · ')
})

const activity = computed(() => props.activitySummary ?? null)
const lastDayOffLabel = computed(() => activity.value?.lastDayOff || '—')
const typicalWindow = computed(() => {
  const start = timeOf(activity.value?.typicalStart ?? null)
  const end = timeOf(activity.value?.typicalEnd ?? null)
  if (start && end) return `${start}–${end}`
  if (start) return `${start}→`
  if (end) return `→${end}`
  return '—'
})
const earliestLatestLabel = computed(() => {
  const earliest = timeOf(activity.value?.earliestStart ?? null)
  const latest = timeOf(activity.value?.latestEnd ?? null)
  if (!earliest && !latest) return '—'
  return `${earliest || '—'} / ${latest || '—'}`
})
const longestSessionLabel = computed(() => {
  const longest = activity.value?.longestSession
  if (longest == null) return '—'
  return `${Number(longest).toFixed(1)} h`
})
const weekendDeltaLabel = computed(() => {
  if (!activity.value?.delta) return ''
  return shareDeltaLabel(activity.value.weekendShare, activity.value.delta.weekendShare)
})
const eveningDeltaLabel = computed(() => {
  if (!activity.value?.delta) return ''
  return shareDeltaLabel(activity.value.eveningShare, activity.value.delta.eveningShare)
})

const historyRows = computed<HistoryRow[]>(() => {
  const history = Array.isArray(props.history) ? props.history : []
  return history.map((entry, idx) => {
    const previous = history[idx + 1]
    const deltaHours = previous ? Number(entry.totalHours) - Number(previous.totalHours) : null
    const deltaPercent = previous && Number(previous.totalHours) !== 0
      ? (Number(deltaHours) / Number(previous.totalHours)) * 100
      : null

    const coreMetrics: HistoryMetric[] = []
    if (summaryConfig.value.showTotal) {
      coreMetrics.push({ label: 'Total', value: `${n2(entry.totalHours)} h` })
    }
    if (summaryConfig.value.showAverage) {
      coreMetrics.push({ label: `Avg/day (${modeLabel.value})`, value: `${n2(entry.avgDay)} h` })
      coreMetrics.push({ label: 'Avg/event', value: `${n2(entry.avgEvent)} h` })
    }
    if (summaryConfig.value.showMedian) {
      coreMetrics.push({ label: 'Median/day', value: `${n2(entry.medianDay)} h` })
    }
    if (summaryConfig.value.showBalance) {
      coreMetrics.push({ label: 'Balance index', value: entry.balanceIndex == null ? '—' : entry.balanceIndex.toFixed(2) })
    }

    const paceMetrics: HistoryMetric[] = []
    if (summaryConfig.value.showWorkday) {
      paceMetrics.push({
        label: 'Workdays',
        value: `${n2(entry.workdayAvg)} h avg · ${n2(entry.workdayMedian)} h median`,
      })
    }
    if (summaryConfig.value.showWeekend) {
      const share = summaryConfig.value.showWeekendShare && entry.weekendShare != null
        ? ` (${n1(entry.weekendShare)}%)`
        : ''
      paceMetrics.push({
        label: 'Weekend',
        value: `${n2(entry.weekendAvg)} h avg · ${n2(entry.weekendMedian)} h median${share}`,
      })
    }

    const categoryMetrics: HistoryMetric[] = []
    if (summaryConfig.value.showTopCategory) {
      categoryMetrics.push({ label: 'Top category', value: formatTopCategory(entry.topCategory) })
    }
    if (summaryConfig.value.showCalendarSummary) {
      categoryMetrics.push({
        label: `${entry.activeCalendars} calendars`,
        value: entry.calendarSummary || '—',
      })
    }

    const patternMetrics: HistoryMetric[] = []
    if (summaryConfig.value.showBusiest) {
      patternMetrics.push({ label: 'Busiest', value: formatBusiest(entry.busiest) })
    }
    if (showHistoryCoreMetrics.value) {
      patternMetrics.push({ label: 'Events', value: String(entry.activity?.events ?? 0) })
      patternMetrics.push({ label: 'Active days', value: String(entry.activity?.activeDays ?? 0) })
      patternMetrics.push({ label: 'Typical', value: formatTypical(entry.activity?.typicalStart, entry.activity?.typicalEnd) })
    }
    if (showActivityDetails.value) {
      patternMetrics.push({
        label: 'Weekend share',
        value: entry.activity?.weekendShare == null ? '—' : `${n1(entry.activity.weekendShare)}%`,
      })
      patternMetrics.push({
        label: 'Evening share',
        value: entry.activity?.eveningShare == null ? '—' : `${n1(entry.activity.eveningShare)}%`,
      })
      patternMetrics.push({
        label: 'Earliest/Late',
        value: formatEarliestLatest(entry.activity?.earliestStart, entry.activity?.latestEnd),
      })
      patternMetrics.push({ label: 'Overlaps', value: String(entry.activity?.overlapEvents ?? 0) })
      patternMetrics.push({ label: 'Longest', value: formatLongest(entry.activity?.longestSession) })
      patternMetrics.push({ label: 'Last day off', value: entry.activity?.lastDayOff || '—' })
      patternMetrics.push({ label: 'Last half day', value: entry.activity?.lastHalfDayOff || '—' })
    }

    const sections: HistorySection[] = [
      { key: 'core', label: 'Core', metrics: coreMetrics },
      { key: 'pace', label: 'Pace', metrics: paceMetrics },
      { key: 'category', label: historyGroupLabel.value, metrics: categoryMetrics },
      { key: 'pattern', label: 'Pattern', metrics: patternMetrics },
    ].filter((section) => section.metrics.length > 0)

    return {
      offset: entry.offset,
      label: entry.label || `Offset ${formatOffset(entry.offset)}`,
      range: formatRangeSpan(entry.rangeStart, entry.rangeEnd),
      totalHours: `${n2(entry.totalHours)} h`,
      avgDay: `${n2(entry.avgDay)} h`,
      balanceIndex: entry.balanceIndex == null ? '—' : entry.balanceIndex.toFixed(2),
      weekendShare: entry.weekendShare == null ? '—' : `${n1(entry.weekendShare)}%`,
      topCategoryBrief: formatTopCategoryBrief(entry.topCategory),
      deltaHours: formatSignedHours(deltaHours),
      deltaPercent: formatSignedPercent(deltaPercent),
      sections,
    }
  })
})

const activeAccordionOffset = ref<number | null>(null)
watch(
  historyRows,
  (rows) => {
    if (!rows.length) {
      activeAccordionOffset.value = null
      return
    }
    if (!rows.some((row) => row.offset === activeAccordionOffset.value)) {
      activeAccordionOffset.value = rows[0].offset
    }
  },
  { immediate: true },
)

function isAccordionOpen(offset: number) {
  return activeAccordionOffset.value === offset
}

function toggleAccordion(offset: number) {
  activeAccordionOffset.value = activeAccordionOffset.value === offset ? null : offset
}

function n1(v: unknown) {
  return Number(v ?? 0).toFixed(1)
}
function n2(v: unknown) {
  return Number(v ?? 0).toFixed(2)
}

function timeOf(value: string | null | undefined) {
  if (!value) return ''
  if (/^\d{2}:\d{2}$/.test(value)) return value
  return formatTime(value)
}

function statusClass(status: 'on_track' | 'at_risk' | 'behind' | 'done' | 'none' | string | undefined): string {
  switch (status) {
    case 'on_track': return 'status-on'
    case 'at_risk': return 'status-risk'
    case 'behind': return 'status-behind'
    case 'done': return 'status-done'
  default: return 'status-none'
  }
}

function pct(value: number | null | undefined) {
  if (value == null) return '0.0%'
  const num = Math.max(0, Math.min(100, Number(value)))
  return `${num.toFixed(1)}%`
}

function formatOffset(offset: number) {
  if (offset === 0) return '0'
  return offset > 0 ? `+${offset}` : `${offset}`
}

function formatRangeSpan(startValue?: string, endValue?: string) {
  if (!startValue || !endValue) return ''
  return formatDateRange(startValue, endValue, { month: 'short', day: 'numeric' })
}

function formatBusiest(busiest: { date?: string; hours?: number } | null) {
  if (!busiest?.date) return '—'
  const hours = Number(busiest?.hours ?? 0)
  const label = formatDateOnly(busiest.date, { month: 'short', day: 'numeric' }) || busiest.date
  return `${label} · ${n2(hours)} h`
}

function formatTopCategory(cat: HistoryEntry['topCategory']) {
  if (!cat) return '—'
  const targetPart = cat.targetHours > 0 ? ` (${Math.round(cat.percent)}% of ${n2(cat.targetHours)} h)` : ''
  return `${cat.label} — ${n2(cat.actualHours)} h${targetPart}`
}

function formatTopCategoryBrief(cat: HistoryEntry['topCategory']) {
  if (!cat) return '—'
  return `${cat.label} ${Math.round(cat.percent)}%`
}

function formatSignedHours(value: number | null) {
  if (value == null || !Number.isFinite(value)) return ''
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${n2(Math.abs(value))} h`
}

function formatSignedPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return ''
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${Math.abs(value).toFixed(1)}%`
}

function formatTypical(start?: string | null, end?: string | null) {
  const s = timeOf(start || null)
  const e = timeOf(end || null)
  if (s && e) return `${s}–${e}`
  if (s) return `${s}→`
  if (e) return `→${e}`
  return '—'
}

function formatEarliestLatest(earliest?: string | null, latest?: string | null) {
  const s = timeOf(earliest || null)
  const e = timeOf(latest || null)
  if (!s && !e) return '—'
  return `${s || '—'} / ${e || '—'}`
}

function formatLongest(value?: number | null) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)} h`
}

function shareDeltaLabel(current: number | null | undefined, delta: number | null | undefined) {
  if (delta == null || current == null) return ''
  const prev = current - delta
  return `Δ vs. offset ${comparisonOffsetLabel.value} → ${pct(prev)}`
}
</script>

<style scoped>
.card.time-summary {
  display: flex;
  flex-direction: column;
  gap: var(--widget-gap, 6px);
  font-size: var(--widget-font, 13px);
  color: var(--muted);
  --widget-pad: calc(14px * var(--widget-space, 1));
  padding: var(--widget-pad, 14px);
}
.today-highlight{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:calc(10px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  border-radius:calc(10px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--brand, #2563eb) 14%, transparent);
  border:1px solid color-mix(in oklab, var(--brand, #2563eb), transparent 70%);
  color: var(--fg);
}
.today-label{
  font-size:calc(12px * var(--widget-scale, 1));
  text-transform:uppercase;
  letter-spacing:0.04em;
  color: color-mix(in oklab, var(--fg), transparent 35%);
}
.today-value{
  font-size:calc(18px * var(--widget-scale, 1));
  font-weight:700;
  letter-spacing:-0.02em;
}
.today-cats{
  display:flex;
  flex-wrap:wrap;
  gap:calc(8px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  font-size:calc(12px * var(--widget-scale, 1));
  color: var(--fg);
}
.today-cat{
  display:inline-flex;
  align-items:center;
  gap:calc(6px * var(--widget-space, 1));
  padding:calc(4px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius:calc(8px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--card, #fff), transparent 6%);
  border:1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 30%);
}
.today-cat .dot{
  width:calc(9px * var(--widget-space, 1));
  height:calc(9px * var(--widget-space, 1));
  border-radius:50%;
  box-shadow:0 0 0 1px color-mix(in oklab, var(--fg) 10%, transparent);
}
.today-cat .unassigned-hint{ font-size:calc(11px * var(--widget-scale,1)); color:var(--muted); cursor:default; opacity:.7 }
.today-cat .name{
  font-weight:600;
}
.today-cat .value{
  color: var(--muted);
}
.time-summary-firstline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--widget-gap, 8px);
  font-size: var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
  color: var(--fg);
  font-weight: 600;
}
.mode-pill {
  display: inline-flex;
  align-items: center;
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  font-size: calc(11px * var(--widget-scale, 1));
  font-weight: 600;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 18%, white);
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.time-summary-metrics {
  display: grid;
  gap: calc(4px * var(--widget-space, 1));
  margin: 0;
  padding: 0;
  list-style: none;
}
.time-summary-metrics li {
  display: flex;
  flex-wrap: wrap;
  gap: calc(4px * var(--widget-space, 1));
  color: var(--muted);
}
.time-summary-metrics strong {
  color: var(--fg);
  font-size: calc(14px * var(--widget-scale, 1));
}
.time-summary-inline {
  font-size: calc(13px * var(--widget-scale, 1));
  color: var(--fg);
}
.time-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: calc(4px * var(--widget-space, 1));
  line-height: 1.4;
  color: var(--muted);
}
.time-summary-row .label {
  color: var(--fg);
  font-weight: 600;
}
.time-summary-row.calendars {
  word-break: break-word;
}
.time-summary-row .sep {
  color: var(--muted);
}
.time-summary-row .hint {
  color: var(--muted);
}
.time-summary-row .share {
  color: var(--muted);
}
.time-summary-row.top-category {
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
}
.time-summary-activity {
  margin-top: calc(6px * var(--widget-space, 1));
  padding-top: calc(6px * var(--widget-space, 1));
  border-top: 1px solid var(--line);
  display: grid;
  gap: calc(2px * var(--widget-space, 1));
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--muted);
}
.time-summary-activity__title {
  font-weight: 600;
  color: var(--fg);
}
.time-summary-activity__line {
  display: flex;
  flex-wrap: wrap;
  gap: calc(6px * var(--widget-space, 1));
}
.time-summary-activity__delta {
  color: var(--muted);
}
.time-summary-history {
  margin-top: calc(8px * var(--widget-space, 1));
  padding-top: calc(8px * var(--widget-space, 1));
  border-top: 1px solid var(--line);
  display: grid;
  gap: calc(8px * var(--widget-space, 1));
}
.time-summary-history--empty {
  gap: calc(10px * var(--widget-space, 1));
}
.time-summary-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(8px * var(--widget-space, 1));
}
.time-summary-history__title {
  font-weight: 600;
  color: var(--fg);
}
.time-summary-history__mode {
  font-size: calc(11px * var(--widget-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.time-summary-history__empty {
  display: grid;
  gap: calc(4px * var(--widget-space, 1));
  padding: calc(10px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  border-radius: calc(12px * var(--widget-space, 1));
  border: 1px dashed color-mix(in oklab, var(--line, #e5e7eb), transparent 10%);
  background: color-mix(in oklab, var(--card, #fff), transparent 4%);
}
.time-summary-history__empty-title {
  color: var(--fg);
  font-weight: 600;
}
.time-summary-history__empty-copy {
  color: var(--muted);
  line-height: 1.45;
}
.time-summary-history__timeline {
  display: grid;
  gap: calc(10px * var(--widget-space, 1));
}
.history-timeline-entry {
  border: 1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 20%);
  border-radius: calc(12px * var(--widget-space, 1));
  padding: calc(10px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--card, #fff), transparent 6%);
}
.history-timeline-entry__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1)) calc(10px * var(--widget-space, 1));
  margin-bottom: calc(8px * var(--widget-space, 1));
}
.history-timeline-entry__title {
  font-weight: 600;
  color: var(--fg);
}
.history-timeline-entry__range {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.history-timeline-entry__delta {
  margin-left: auto;
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.history-timeline-entry__metrics {
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}
.history-timeline-cell {
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--widget-space, 1));
}
.history-timeline-cell__label {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.history-timeline-cell__value {
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--fg);
  font-weight: 600;
}

.time-summary-history__accordion {
  display: grid;
  gap: calc(10px * var(--widget-space, 1));
}
.history-accordion-entry {
  border: 1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 20%);
  border-radius: calc(12px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--card, #fff), transparent 6%);
}

.history-accordion-entry__header {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: calc(10px * var(--widget-space, 1));
  cursor: pointer;
}
.history-accordion-entry__title {
  font-weight: 600;
  color: var(--fg);
}
.history-accordion-entry__range {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.history-accordion-entry__summary {
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--fg);
  font-weight: 600;
}
.history-accordion-entry__delta {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.history-accordion-entry__caret {
  font-size: calc(14px * var(--widget-scale, 1));
  color: var(--muted);
  line-height: 1;
}
.history-accordion-entry__body {
  border-top: 1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 25%);
  padding: calc(8px * var(--widget-space, 1)) calc(10px * var(--widget-space, 1)) calc(10px * var(--widget-space, 1));
  display: grid;
  gap: calc(8px * var(--widget-space, 1));
}
.history-accordion-group {
  display: grid;
  gap: calc(4px * var(--widget-space, 1));
}
.history-accordion-group__title {
  font-size: calc(11px * var(--widget-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.history-accordion-group__metrics {
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.history-accordion-group__metric {
  display: grid;
  gap: calc(2px * var(--widget-space, 1));
}
.history-accordion-group__metric-label {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.history-accordion-group__metric-value {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--fg);
  font-weight: 600;
}
.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: calc(4px * var(--widget-space, 1));
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  font-size: calc(11px * var(--widget-scale, 1));
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.status-on {
  background: color-mix(in srgb, var(--brand) 20%, white);
  color: var(--brand);
}
.status-risk {
  background: color-mix(in srgb, #f97316 20%, white);
  color: #f97316;
}
.status-behind {
  background: color-mix(in srgb, #ef4444 20%, white);
  color: #ef4444;
}
.status-done {
  background: color-mix(in srgb, var(--pos) 25%, white);
  color: var(--pos);
}
.status-none {
  background: color-mix(in srgb, var(--muted) 12%, white);
  color: var(--muted);
}
</style>
