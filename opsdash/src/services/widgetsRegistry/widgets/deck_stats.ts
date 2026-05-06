import { defineAsyncComponent } from 'vue'

const DeckStatsWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/deck/DeckStatsWidget.vue').then((m) => m.default),
)

import { buildTitle, parseBoardIds } from '../helpers'
import type { RegistryEntry } from '../types'
import {
  ALL_DECK_STATS_METRICS,
  DEFAULT_DECK_STATS_METRICS,
  buildDeckStackOptions,
  buildDeckTagControlOptions,
  describeDeckSelection,
  filterDeckBaseCards,
  parseDeckNumericIds,
  parseDeckStatsMetrics,
  parseDeckTagIds,
} from '../../deckWidgetMetrics'

const baseTitle = 'Deck stats'

export const deckStatsEntry: RegistryEntry = {
  component: DeckStatsWidget,
  defaultLayout: { width: 'half', height: 'm', order: 53 },
  label: 'Deck stats',
  category: 'Tasks' as const,
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'all',
    mineMode: 'assignee',
    includeArchived: true,
    includeCompleted: true,
    metrics: [...DEFAULT_DECK_STATS_METRICS],
  },
  controls: [
    { key: 'boardIds', label: 'Boards to include', type: 'multiselect', options: [] },
    { key: 'stackIds', label: 'Stacks to include', type: 'multiselect', options: [] },
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      options: [
        { value: 'all', label: 'All cards' },
        { value: 'mine', label: 'Mine' },
        { value: 'unassigned', label: 'Unassigned' },
      ],
    },
    {
      key: 'mineMode',
      label: 'Mine mode',
      type: 'select',
      options: [
        { value: 'assignee', label: 'Assignee' },
        { value: 'creator', label: 'Creator' },
        { value: 'both', label: 'Assignee + Creator' },
      ],
    },
    { key: 'includeArchived', label: 'Include archived cards', type: 'toggle' },
    { key: 'includeCompleted', label: 'Include completed cards', type: 'toggle' },
    { key: 'metrics', label: 'Metrics', type: 'multiselect', options: [] },
  ],
  dynamicControls: (options, ctx) => {
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
    return [
      { key: 'boardIds', label: 'Boards', type: 'multiselect', options: boardOptions },
      { key: 'stackIds', label: 'Stacks', type: 'multiselect', options: stackOptions },
      {
        key: 'metrics',
        label: 'Metrics',
        type: 'multiselect',
        options: ALL_DECK_STATS_METRICS.map((metric) => ({
          value: metric,
          label: metricLabel(metric),
        })),
      },
      ...(tagOptions.length
        ? [{
            key: 'tagIds',
            label: 'Tags',
            type: 'taglist',
            options: tagOptions,
            hint: 'All tags are included by default. Uncheck tags to narrow the stat population.',
          }]
        : []),
    ]
  },
  buildProps: (def, ctx) => {
    const boardIds = Array.isArray(def.options?.boardIds)
      ? def.options.boardIds
      : parseBoardIds(def.options?.boardIds)
    const stackIds = parseDeckNumericIds(def.options?.stackIds)
    const tagIds = parseDeckTagIds(def.options?.tagIds)
    const metrics = parseDeckStatsMetrics(def.options?.metrics)
    const scope = def.options?.scope === 'mine' || def.options?.scope === 'unassigned'
      ? def.options.scope
      : 'all'
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
      cards: ctx.deckCards || [],
      rangeLabel: ctx.deckRangeLabel || ctx.rangeLabel || '',
      from: ctx.from,
      to: ctx.to,
      uid: ctx.uid,
      loading: ctx.deckLoading,
      error: ctx.deckError,
      boardIds,
      stackIds,
      tagIds,
      metrics,
      scope,
      mineMode: def.options?.mineMode || 'assignee',
      includeArchived: def.options?.includeArchived !== false,
      includeCompleted: def.options?.includeCompleted !== false,
      showHeader: def.options?.showHeader !== false,
      selectionText: describeDeckSelection({ boardIds, stackIds, tagIds, scope }),
    }
  },
}

function metricLabel(metric: string): string {
  switch (metric) {
    case 'open_now': return 'Open now'
    case 'overdue_now': return 'Overdue now'
    case 'unassigned_open': return 'Unassigned open'
    case 'mine_open': return 'Mine open'
    case 'created_in_range': return 'Created in range'
    case 'completed_in_range': return 'Completed in range'
    case 'due_in_range': return 'Due in range'
    case 'done_now': return 'Done now'
    case 'archived_now': return 'Archived now'
    default: return metric
  }
}
