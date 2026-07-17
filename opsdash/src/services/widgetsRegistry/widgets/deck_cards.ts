import { defineAsyncComponent } from 'vue'

const DeckCardsWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/deck/DeckCardsWidget.vue').then((m) => m.default),
)

import { buildTitle, parseBoardIds, parseFilters, prettyFilterLabel } from '../helpers'
import type { RegistryEntry } from '../types'
import {
  buildDeckStackOptions,
  buildDeckTagControlOptions,
  filterDeckBaseCards,
  normalizeDeckCustomFilters,
  parseDeckNumericIds,
} from '../../deckWidgetMetrics'

const baseTitle = 'Deck cards'

export const deckCardsEntry: RegistryEntry = {
  component: DeckCardsWidget,
  defaultLayout: { width: 'half', height: 'm', order: 52 },
  // A Deck card list must retain its configured grid height so its body can
  // scroll; auto height would expand the dashboard for every matching card.
  heightMode: 'fixed',
  label: 'Deck cards',
  category: 'Tasks' as const,
  baseTitle,
  configurable: true,
  defaultOptions: {
    allowMine: true,
    includeArchived: true,
    includeCompleted: true,
    autoScroll: false,
    intervalSeconds: 5,
    showCount: true,
    minFilterCount: 0,
    maxVisible: 8,
    autoTagsEnabled: true,
    compactList: false,
    customFilters: [],
    filters: [
      'focus_all',
      'focus_mine',
      'backlog_all',
      'backlog_mine',
      'all',
    ],
    defaultFilter: 'focus_all',
    mineMode: 'assignee',
  },
  controls: [
    { key: 'boardIds', label: 'Boards to include', type: 'multiselect', options: [] },
    { key: 'stackIds', label: 'Stacks to include', type: 'multiselect', options: [] },
    { key: 'maxVisible', label: 'Cards before expand', type: 'number', min: 3, max: 50, step: 1 },
    { key: 'compactList', label: 'Compact list', type: 'toggle' },
  ],
  dynamicControls: (options, ctx) => {
    const filters = parseFilters(options.filters ?? options.defaultOptions?.filters)
    const filterSelect = {
      key: 'defaultFilter',
      label: 'Start with',
      type: 'select',
      options: ['focus_all', 'focus_mine', 'backlog_all', 'backlog_mine', 'all']
        .filter((value) => filters.includes(value))
        .map((value) => ({ value, label: prettyFilterLabel(value) })),
    }
    const boardOptions = Array.isArray(ctx.deckBoards)
      ? ctx.deckBoards.map((b: any) => ({ value: b.id, label: b.title || `Board ${b.id}` }))
      : []
    const cards = Array.isArray(ctx.deckCards) ? ctx.deckCards : []
    const boardIds = Array.isArray(options.boardIds) ? options.boardIds : parseBoardIds(options.boardIds)
    const stackIds = parseDeckNumericIds(options.stackIds)
    const baseForStacks = filterDeckBaseCards(cards, {
      boardIds,
      includeArchived: options.includeArchived !== false,
      includeCompleted: options.includeCompleted !== false,
    })
    const cleaned = filterDeckBaseCards(baseForStacks, {
      stackIds,
      includeArchived: options.includeArchived !== false,
      includeCompleted: options.includeCompleted !== false,
    })
    const stackOptions = buildDeckStackOptions(baseForStacks)
    const tagOptions = buildDeckTagControlOptions(cleaned)
    const tagControls = []
    if (options.autoTagsEnabled !== false && tagOptions.length) {
      tagControls.push({
        key: 'autoTagSelection',
        label: 'Tag filters',
        type: 'taglist',
        options: tagOptions,
        hint: 'Uncheck tags to hide their filters. Counts reflect the current cards.',
      })
    }
    return [
      filterSelect,
      { key: 'boardIds', label: 'Boards', type: 'multiselect', options: boardOptions },
      { key: 'stackIds', label: 'Stacks', type: 'multiselect', options: stackOptions },
      ...tagControls,
    ]
  },
  buildProps: (def, ctx) => {
    const filters = parseFilters(def.options?.filters ?? def.options?.defaultOptions?.filters) as any[]
    const boardIds = Array.isArray(def.options?.boardIds)
      ? def.options.boardIds
      : parseBoardIds(def.options?.boardIds)
    const stackIds = parseDeckNumericIds(def.options?.stackIds)
    const defaultFilter = filters.includes(def.options?.defaultFilter) ? def.options?.defaultFilter : (filters[0] || 'all')
    const customFilters = normalizeDeckCustomFilters(def.options?.customFilters)
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
      cards: ctx.deckCards || [],
      rangeLabel: ctx.deckRangeLabel || ctx.rangeLabel || '',
      from: ctx.from,
      to: ctx.to,
      uid: ctx.uid,
      deckUrl: ctx.deckUrl,
      lastFetchedAt: ctx.deckRangeLabel,
      loading: ctx.deckLoading,
      error: ctx.deckError,
      boardIds,
      stackIds,
      filters,
      defaultFilter,
      allowMine: def.options?.allowMine !== false,
      mineMode: def.options?.mineMode || 'assignee',
      includeArchived: def.options?.includeArchived !== false,
      includeCompleted: def.options?.includeCompleted !== false,
      autoScroll: def.options?.autoScroll !== false,
      intervalSeconds: def.options?.intervalSeconds ?? 5,
      showCount: def.options?.showCount !== false,
      minFilterCount: Number(def.options?.minFilterCount ?? 0),
      maxVisible: Number(def.options?.maxVisible ?? 8),
      compactList: def.options?.compactList === true,
      autoTagsEnabled: def.options?.autoTagsEnabled !== false,
      autoTagSelection: Array.isArray(def.options?.autoTagSelection)
        ? def.options?.autoTagSelection
        : undefined,
      showHeader: def.options?.showHeader !== false,
      customFilters,
      editable: ctx.isLayoutEditing === true,
      onDeckCardsChanged: ctx.onDeckCardsChanged,
      onUpdateFilters: (values: any) => ctx.onUpdateWidgetOptions?.(def.id, 'filters', values),
    }
  },
}
