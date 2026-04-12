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
  heightMode: 'auto',
  label: 'Deck cards',
  baseTitle,
  configurable: true,
  defaultOptions: {
    allowMine: true,
    includeArchived: true,
    includeCompleted: true,
    autoScroll: true,
    intervalSeconds: 5,
    showCount: true,
    minFilterCount: 0,
    autoTagsEnabled: true,
    compactList: false,
    customFilters: [],
    filters: [
      'open_all',
      'open_mine',
      'done_all',
      'done_mine',
      'archived_all',
      'archived_mine',
      'due_all',
      'due_mine',
      'due_today_all',
      'due_today_mine',
      'created_today_all',
      'created_today_mine',
    ],
    defaultFilter: 'open_all',
    mineMode: 'assignee',
  },
  controls: [
    { key: 'boardIds', label: 'Boards to include', type: 'multiselect', options: [] },
    { key: 'stackIds', label: 'Stacks to include', type: 'multiselect', options: [] },
    { key: 'filters', label: 'Filters to show', type: 'multiselect', options: [] },
    { key: 'autoTagsEnabled', label: 'Auto tag filters', type: 'toggle' },
    { key: 'allowMine', label: 'Allow mine filters', type: 'toggle' },
    { key: 'mineMode', label: 'Mine mode', type: 'select', options: [
      { value: 'assignee', label: 'Assignee' },
      { value: 'creator', label: 'Creator' },
      { value: 'both', label: 'Assignee + Creator' },
    ] },
    { key: 'includeArchived', label: 'Include archived cards', type: 'toggle' },
    { key: 'includeCompleted', label: 'Include completed cards', type: 'toggle' },
    { key: 'autoScroll', label: 'Auto-scroll list', type: 'toggle' },
    { key: 'intervalSeconds', label: 'Scroll every (s)', type: 'number', min: 3, max: 10, step: 1 },
    { key: 'showCount', label: 'Show count pill', type: 'toggle' },
    { key: 'minFilterCount', label: 'Min filter count', type: 'number', min: 0, max: 999, step: 1 },
    { key: 'compactList', label: 'Compact list', type: 'toggle' },
    { key: 'customFilters', label: 'Custom filters', type: 'filterbuilder' },
  ],
  dynamicControls: (options, ctx) => {
    const filters = parseFilters(options.filters ?? options.defaultOptions?.filters)
    const filterSelect = {
      key: 'defaultFilter',
      label: 'Default filter',
      type: 'select',
      options: filters.map((f: any) => ({ value: f, label: prettyFilterLabel(f) })),
    }
    const filterChoices = [
      { value: 'all', label: prettyFilterLabel('all') },
      { value: 'open_all', label: prettyFilterLabel('open_all') },
      { value: 'open_mine', label: prettyFilterLabel('open_mine') },
      { value: 'done_all', label: prettyFilterLabel('done_all') },
      { value: 'done_mine', label: prettyFilterLabel('done_mine') },
      { value: 'archived_all', label: prettyFilterLabel('archived_all') },
      { value: 'archived_mine', label: prettyFilterLabel('archived_mine') },
      { value: 'due_all', label: prettyFilterLabel('due_all') },
      { value: 'due_mine', label: prettyFilterLabel('due_mine') },
      { value: 'due_today_all', label: prettyFilterLabel('due_today_all') },
      { value: 'due_today_mine', label: prettyFilterLabel('due_today_mine') },
      { value: 'created_today_all', label: prettyFilterLabel('created_today_all') },
      { value: 'created_today_mine', label: prettyFilterLabel('created_today_mine') },
      { value: 'created_range_all', label: prettyFilterLabel('created_range_all') },
      { value: 'created_range_mine', label: prettyFilterLabel('created_range_mine') },
    ]
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
      { key: 'filters', label: 'Filters', type: 'multiselect', options: filterChoices },
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
      compactList: def.options?.compactList === true,
      autoTagsEnabled: def.options?.autoTagsEnabled !== false,
      autoTagSelection: Array.isArray(def.options?.autoTagSelection)
        ? def.options?.autoTagSelection
        : undefined,
      showHeader: def.options?.showHeader !== false,
      customFilters,
      editable: ctx.isLayoutEditing === true,
      onUpdateFilters: (values: any) => ctx.onUpdateWidgetOptions?.(def.id, 'filters', values),
    }
  },
}
