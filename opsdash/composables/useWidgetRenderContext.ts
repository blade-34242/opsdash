import { computed, type ComputedRef } from 'vue'
import type { WidgetRenderContext } from '../src/services/widgetsRegistry'

type ValueRef<T> = { value: T }

type DeckBoard = { id: number; title: string; color?: string }

interface WidgetRenderContextDeps {
  timeSummary: ValueRef<any>
  activeDayMode: ValueRef<'active' | 'all'>
  targetsSummary: ValueRef<any>
  targetsConfig: ValueRef<any>
  stats: any
  byDay: ValueRef<any[]>
  byCal: ValueRef<any[]>
  groupsById: ValueRef<Record<string, number>>
  calendarGroupsWithToday: ValueRef<any[]>
  balanceOverview: ValueRef<any>
  balanceCardConfig: ValueRef<any>
  rangeLabel: ValueRef<string>
  range: ValueRef<'week' | 'month'>
  offset: ValueRef<number>
  from: ValueRef<string>
  to: ValueRef<string>
  trendLookbackWeeks: ValueRef<number>
  balanceNote: ValueRef<string>
  activitySummary: ValueRef<any>
  activityCardConfig: ValueRef<any>
  activityDayOffTrend: ValueRef<any>
  deckSummaryBuckets: ValueRef<any>
  deckLoading: ValueRef<boolean>
  deckError: ValueRef<any>
  deckTickerConfig: ValueRef<any>
  deckFilter: ValueRef<any>
  setDeckFilter: (filter: any) => void
  deckSettings: ValueRef<any>
  deckUrl: ValueRef<string>
  deckCards: ValueRef<any[]>
  uid: ValueRef<string>
  notesPrev: ValueRef<string>
  notesCurrDraft: ValueRef<string>
  notesHistory: ValueRef<Array<{ id: string; label: string; title: string; content: string }>>
  notesLabelPrev: ValueRef<string>
  notesLabelCurr: ValueRef<string>
  notesLabelPrevTitle: ValueRef<string>
  notesLabelCurrTitle: ValueRef<string>
  isSavingNote: ValueRef<boolean>
  saveNotes: () => Promise<void>
  isLoading: ValueRef<boolean>
  isInitialLoading: ValueRef<boolean>
  isRefreshing: ValueRef<boolean>
  hasInitialLoad: ValueRef<boolean>
  isLayoutEditing: ValueRef<boolean>
  updateWidgetOptions: (id: string, key: string, value: any) => void
  charts: ValueRef<any>
  calendarChartData: ValueRef<any>
  categoryChartsById: ValueRef<Record<string, { pie: any | null; stacked: any | null }>>
  calendarGroups: ValueRef<any[]>
  calendars: ValueRef<any[]>
  calendarCategoryMap: ValueRef<Record<string, string>>
  categoryColorMap: ValueRef<Record<string, string>>
  colorsById: ValueRef<Record<string, string>>
  colorsByName: ValueRef<Record<string, string>>
  currentTargets: ValueRef<Record<string, number>>
  targetsWeek: ValueRef<Record<string, number>>
  selected: ValueRef<string[]>
  calendarTodayHours: ValueRef<Record<string, number>>
  onboardingStrategy: ValueRef<string | null>
  activePreset?: ValueRef<string | null>
}

function buildDeckBoards(cards: any[]): DeckBoard[] {
  return Array.from(
    cards.reduce((acc, card) => {
      if (card.boardId == null) return acc
      if (!acc.has(card.boardId)) {
        acc.set(card.boardId, { id: card.boardId, title: card.boardTitle, color: card.boardColor })
      }
      return acc
    }, new Map<number, DeckBoard>()).values(),
  )
}

export function useWidgetRenderContext(deps: WidgetRenderContextDeps): {
  widgetContext: ComputedRef<WidgetRenderContext>
} {
  const widgetContext = computed<WidgetRenderContext>(() => ({
    summary: deps.timeSummary.value,
    activeDayMode: deps.activeDayMode.value,
    targetsSummary: deps.targetsSummary.value,
    targetsConfig: deps.targetsConfig.value,
    stats: deps.stats,
    byDay: deps.byDay.value,
    byCal: deps.byCal.value,
    groupsById: deps.groupsById.value,
    groups: deps.calendarGroupsWithToday.value,
    balanceOverview: deps.balanceOverview.value,
    balanceConfig: deps.balanceCardConfig.value,
    rangeLabel: deps.rangeLabel.value,
    rangeMode: deps.range.value,
    offset: deps.offset.value,
    from: deps.from.value,
    to: deps.to.value,
    lookbackWeeks: deps.trendLookbackWeeks.value,
    balanceNote: deps.balanceNote.value,
    activitySummary: deps.activitySummary.value,
    activityConfig: deps.activityCardConfig.value,
    activityDayOffTrend: deps.activityDayOffTrend.value,
    activityTrendUnit: deps.range.value === 'month' ? 'mo' : 'wk',
    activityDayOffLookback: deps.trendLookbackWeeks.value,
    deckBuckets: deps.deckSummaryBuckets.value,
    deckRangeLabel: deps.rangeLabel.value,
    deckLoading: deps.deckLoading.value,
    deckError: deps.deckError.value,
    deckTicker: deps.deckTickerConfig.value,
    deckFilter: deps.deckFilter.value,
    onDeckFilter: (filter: any) => deps.setDeckFilter(filter),
    deckShowBoardBadges: deps.deckSettings.value?.ticker?.showBoardBadges !== false,
    deckUrl: deps.deckUrl.value,
    deckCards: deps.deckCards.value,
    deckBoards: buildDeckBoards(deps.deckCards.value || []),
    uid: deps.uid.value,
    notesPrev: deps.notesPrev.value,
    notesCurr: deps.notesCurrDraft.value,
    notesHistory: deps.notesHistory.value,
    notesLabelPrev: deps.notesLabelPrev.value,
    notesLabelCurr: deps.notesLabelCurr.value,
    notesLabelPrevTitle: deps.notesLabelPrevTitle.value,
    notesLabelCurrTitle: deps.notesLabelCurrTitle.value,
    isSavingNote: deps.isSavingNote.value,
    onSaveNote: () => deps.saveNotes(),
    onUpdateNotes: (val: string) => {
      deps.notesCurrDraft.value = val
    },
    isLoading: deps.isLoading.value,
    isInitialLoading: deps.isInitialLoading.value,
    isRefreshing: deps.isRefreshing.value,
    hasInitialLoad: deps.hasInitialLoad.value,
    isLayoutEditing: deps.isLayoutEditing.value,
    onUpdateWidgetOptions: (id: string, key: string, value: any) => {
      deps.updateWidgetOptions(id, key, value)
    },
    charts: deps.charts.value,
    calendarChartData: deps.calendarChartData.value,
    categoryChartsById: deps.categoryChartsById.value,
    calendarGroups: deps.calendarGroups.value,
    calendars: deps.calendars.value,
    calendarCategoryMap: deps.calendarCategoryMap.value,
    categoryColorMap: deps.categoryColorMap.value,
    colorsById: deps.colorsById.value,
    colorsByName: deps.colorsByName.value,
    currentTargets: deps.currentTargets.value,
    targetsWeek: deps.targetsWeek.value,
    selected: deps.selected.value,
    calendarTodayHours: deps.calendarTodayHours.value,
    onboardingStrategy: deps.onboardingStrategy.value,
    activePreset: deps.activePreset?.value ?? null,
  }))

  return { widgetContext }
}
