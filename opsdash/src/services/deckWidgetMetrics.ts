import type { DeckCardSummary } from './deck'
import { buildDeckTagOptions, cardHasTag, type DeckTagOption } from './deckTags'
import { formatDateKey, parseDateTime } from './dateTime'
import type { DeckFilterMode, DeckMineMode } from './reporting'

export type DeckCustomFilter = {
  id: string
  label: string
  labelIds?: string[]
  labels?: string[]
  assignees?: string[]
}

export type DeckStatsMetric =
  | 'open_now'
  | 'overdue_now'
  | 'unassigned_open'
  | 'mine_open'
  | 'created_in_range'
  | 'completed_in_range'
  | 'due_in_range'
  | 'done_now'
  | 'archived_now'

export type DeckStatsScope = 'all' | 'mine' | 'unassigned'

export type DeckStatsRow = {
  key: DeckStatsMetric
  label: string
  hint: string
  value: number
}

export const ALL_DECK_STATS_METRICS: DeckStatsMetric[] = [
  'open_now',
  'overdue_now',
  'unassigned_open',
  'mine_open',
  'created_in_range',
  'completed_in_range',
  'due_in_range',
  'done_now',
  'archived_now',
]

export const DEFAULT_DECK_STATS_METRICS: DeckStatsMetric[] = [
  'open_now',
  'overdue_now',
  'created_in_range',
  'completed_in_range',
  'due_in_range',
]

export function parseDeckNumericIds(input: any): number[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    )
  }
  if (typeof input === 'string') {
    return parseDeckNumericIds(input.split(','))
  }
  return []
}

export function parseDeckTagIds(input: any): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((value) => String(value ?? '').trim())
          .filter(Boolean),
      ),
    )
  }
  if (typeof input === 'string') {
    return parseDeckTagIds(input.split(','))
  }
  return []
}

export function parseDeckStatsMetrics(input: any, fallback = DEFAULT_DECK_STATS_METRICS): DeckStatsMetric[] {
  const raw = Array.isArray(input)
    ? input
    : (typeof input === 'string' ? input.split(',') : [])
  const allowed = new Set<DeckStatsMetric>(ALL_DECK_STATS_METRICS)
  const parsed = Array.from(
    new Set(
      raw
        .map((value) => String(value ?? '').trim() as DeckStatsMetric)
        .filter((value): value is DeckStatsMetric => allowed.has(value)),
    ),
  )
  return parsed.length ? parsed : [...fallback]
}

export function normalizeDeckCustomFilters(input: any): DeckCustomFilter[] {
  let raw: any[] = []
  if (Array.isArray(input)) {
    raw = input
  } else if (typeof input === 'string' && input.trim() !== '') {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) raw = parsed
    } catch {
      raw = []
    }
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const label = String(item.label || item.name || '').trim()
      if (!label) return null
      const id = slugify(String(item.id || label))
      const labelIds = Array.isArray(item.labelIds)
        ? item.labelIds.map((v) => String(v).trim()).filter(Boolean)
        : []
      const labels = Array.isArray(item.labels)
        ? item.labels.map((v) => String(v).trim()).filter(Boolean)
        : []
      const assignees = Array.isArray(item.assignees)
        ? item.assignees.map((v) => String(v).trim()).filter(Boolean)
        : []
      return { id, label, labelIds, labels, assignees }
    })
    .filter(Boolean) as DeckCustomFilter[]
}

export function buildDeckMineMatcher(uid: string, mode: DeckMineMode) {
  const userId = uid.trim().toLowerCase()
  return (card: DeckCardSummary) => {
    if (!userId) return false
    const assigneeMatch = (card.assignees || []).some(
      (assignee: any) => typeof assignee.uid === 'string' && assignee.uid.toLowerCase() === userId,
    )
    const creatorMatch = typeof card.createdBy === 'string' && card.createdBy.trim().toLowerCase() === userId
    const doneMatch = typeof card.doneBy === 'string' && card.doneBy.trim().toLowerCase() === userId
    if (mode === 'creator') return creatorMatch || doneMatch
    if (mode === 'assignee') return assigneeMatch || doneMatch
    return assigneeMatch || creatorMatch || doneMatch
  }
}

export function filterDeckBaseCards(cards: DeckCardSummary[], opts: {
  boardIds?: Array<number | string>
  stackIds?: Array<number | string>
  includeArchived?: boolean
  includeCompleted?: boolean
}): DeckCardSummary[] {
  const boardSet = new Set(parseDeckNumericIds(opts.boardIds))
  const stackSet = new Set(parseDeckNumericIds(opts.stackIds))
  const allowArchived = opts.includeArchived !== false
  const includeCompleted = opts.includeCompleted !== false

  return (cards || []).filter((card) => {
    if (boardSet.size && !boardSet.has(Number(card.boardId))) return false
    if (stackSet.size && !stackSet.has(Number(card.stackId))) return false
    if (!allowArchived && card.status === 'archived') return false
    if (!includeCompleted && card.status === 'done') return false
    return true
  })
}

export function buildDeckStackOptions(cards: DeckCardSummary[]): Array<{
  value: number
  label: string
  count: number
  contextLabel?: string
  contextColor?: string
}> {
  const counts = new Map<number, { label: string; count: number; boardTitle: string; boardColor?: string }>()
  cards.forEach((card) => {
    const id = Number(card.stackId)
    if (!Number.isInteger(id) || id <= 0) return
    const entry = counts.get(id) || {
      label: String(card.stackTitle || `Stack ${id}`),
      count: 0,
      boardTitle: String(card.boardTitle || ''),
      boardColor: card.boardColor,
    }
    entry.count += 1
    counts.set(id, entry)
  })
  return Array.from(counts.entries())
    .map(([value, data]) => ({
      value,
      label: data.label,
      count: data.count,
      contextLabel: data.boardTitle || undefined,
      contextColor: data.boardColor || undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function buildDeckTagControlOptions(cards: DeckCardSummary[], selection?: string[] | null): DeckTagOption[] {
  const options = buildDeckTagOptions(cards)
  const active = selection?.length
    ? new Set(selection.map((value) => String(value)))
    : null
  if (!active) return options
  return options.filter((option) => active.has(option.value))
}

export function filterDeckStatsPopulation(cards: DeckCardSummary[], opts: {
  scope?: DeckStatsScope
  uid?: string
  mineMode?: DeckMineMode
  tagIds?: string[]
}): DeckCardSummary[] {
  const scope = opts.scope || 'all'
  const mineMatch = buildDeckMineMatcher(opts.uid || '', opts.mineMode || 'assignee')
  const tags = parseDeckTagIds(opts.tagIds)
  return cards.filter((card) => {
    if (scope === 'mine' && !mineMatch(card)) return false
    if (scope === 'unassigned' && (card.assignees || []).length > 0) return false
    if (tags.length && !tags.some((tag) => cardHasTag(card, tag))) return false
    return true
  })
}

export function filterDeckCardsForMode(mode: DeckFilterMode, cleaned: DeckCardSummary[], opts: {
  uid?: string
  mineMode?: DeckMineMode
  from?: string
  to?: string
  includeCompleted?: boolean
  includeArchivedInDone?: boolean
  customFilters?: DeckCustomFilter[]
}): DeckCardSummary[] {
  const mineMatch = buildDeckMineMatcher(opts.uid || '', opts.mineMode || 'assignee')
  const includeArchivedInDone = opts.includeArchivedInDone === true
  const includeCompleted = opts.includeCompleted !== false
  if (mode === 'all') return cleaned
  if (mode === 'mine') return cleaned.filter((card) => mineMatch(card))
  if (mode.startsWith('created_today')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isCreatedToday(card)
    })
  }
  if (mode.startsWith('created_range')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isCreatedInRange(card, opts.from, opts.to)
    })
  }
  if (mode.startsWith('due_today')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isDueToday(card)
    })
  }
  if (mode.startsWith('due_')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isDueInRange(card, opts.from, opts.to)
    })
  }
  if (mode.startsWith('custom_')) {
    const key = mode.slice('custom_'.length)
    const custom = (opts.customFilters || []).find((f) => f.id === key)
    if (!custom) return []
    return cleaned.filter((card) => matchesCustomFilter(card, custom, mineMatch))
  }
  if (mode.startsWith('tag_')) {
    return cleaned.filter((card) => cardHasTag(card, mode))
  }
  if (mode.includes('_')) {
    const [statusKey, scope] = mode.split('_') as ['open' | 'done' | 'archived' | 'due', 'all' | 'mine']
    return cleaned.filter((card) => {
      const statusOk = deckStatusMatches(card, statusKey, includeArchivedInDone, includeCompleted)
      const mineOk = scope === 'all' ? true : mineMatch(card)
      return statusOk && mineOk
    })
  }
  return cleaned
}

export function computeDeckMetric(metric: DeckStatsMetric, cards: DeckCardSummary[], opts: {
  uid?: string
  mineMode?: DeckMineMode
  from?: string
  to?: string
}): number {
  const mineMatch = buildDeckMineMatcher(opts.uid || '', opts.mineMode || 'assignee')
  switch (metric) {
    case 'open_now':
      return cards.filter((card) => card.status === 'active').length
    case 'overdue_now':
      return cards.filter((card) => isOverdue(card)).length
    case 'unassigned_open':
      return cards.filter((card) => card.status === 'active' && (card.assignees || []).length === 0).length
    case 'mine_open':
      return cards.filter((card) => card.status === 'active' && mineMatch(card)).length
    case 'created_in_range':
      return cards.filter((card) => isCreatedInRange(card, opts.from, opts.to)).length
    case 'completed_in_range':
      return cards.filter((card) => isCompletedInRange(card, opts.from, opts.to)).length
    case 'due_in_range':
      return cards.filter((card) => isDueInRange(card, opts.from, opts.to)).length
    case 'done_now':
      return cards.filter((card) => card.status === 'done').length
    case 'archived_now':
      return cards.filter((card) => card.status === 'archived').length
    default:
      return 0
  }
}

export function buildDeckStatsRows(cards: DeckCardSummary[], opts: {
  boardIds?: Array<number | string>
  stackIds?: Array<number | string>
  includeArchived?: boolean
  includeCompleted?: boolean
  scope?: DeckStatsScope
  uid?: string
  mineMode?: DeckMineMode
  tagIds?: string[]
  metrics?: DeckStatsMetric[]
  from?: string
  to?: string
  rangeLabel?: string
}): DeckStatsRow[] {
  const baseCards = filterDeckBaseCards(cards, {
    boardIds: opts.boardIds,
    stackIds: opts.stackIds,
    includeArchived: opts.includeArchived,
    includeCompleted: opts.includeCompleted,
  })
  const scopedCards = filterDeckStatsPopulation(baseCards, {
    scope: opts.scope,
    uid: opts.uid,
    mineMode: opts.mineMode,
    tagIds: opts.tagIds,
  })
  const metrics = parseDeckStatsMetrics(opts.metrics)
  return metrics.map((metric) => ({
    key: metric,
    label: deckMetricLabel(metric),
    hint: deckMetricHint(metric, opts.rangeLabel || ''),
    value: computeDeckMetric(metric, scopedCards, {
      uid: opts.uid,
      mineMode: opts.mineMode,
      from: opts.from,
      to: opts.to,
    }),
  }))
}

export function deckMetricLabel(metric: DeckStatsMetric): string {
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

export function deckMetricHint(metric: DeckStatsMetric, rangeLabel: string): string {
  switch (metric) {
    case 'open_now':
    case 'overdue_now':
    case 'unassigned_open':
    case 'mine_open':
    case 'done_now':
    case 'archived_now':
      return 'Current snapshot'
    case 'created_in_range':
    case 'completed_in_range':
    case 'due_in_range':
      return rangeLabel ? `Within ${rangeLabel.toLowerCase()}` : 'Within current range'
    default:
      return ''
  }
}

export function describeDeckSelection(opts: {
  boardIds?: Array<number | string>
  stackIds?: Array<number | string>
  tagIds?: string[]
  scope?: DeckStatsScope
}): string {
  const parts: string[] = []
  const boards = parseDeckNumericIds(opts.boardIds)
  const stacks = parseDeckNumericIds(opts.stackIds)
  const tags = parseDeckTagIds(opts.tagIds)
  if (boards.length) {
    parts.push(`${boards.length} board${boards.length === 1 ? '' : 's'}`)
  }
  if (stacks.length) {
    parts.push(`${stacks.length} stack${stacks.length === 1 ? '' : 's'}`)
  }
  if (tags.length) {
    parts.push(`${tags.length} tag${tags.length === 1 ? '' : 's'}`)
  }
  if (opts.scope === 'mine') parts.push('Mine')
  if (opts.scope === 'unassigned') parts.push('Unassigned')
  return parts.join(' · ')
}

function deckStatusMatches(
  card: DeckCardSummary,
  status: 'open' | 'done' | 'archived' | 'due',
  includeArchivedInDone: boolean,
  includeCompleted: boolean,
) {
  if (status === 'open') return card.status === 'active'
  if (status === 'archived') return card.status === 'archived'
  if (status === 'done') {
    if (!includeCompleted) return false
    if (card.status === 'done') return true
    return includeArchivedInDone && card.status === 'archived' && includeCompleted
  }
  if (status === 'due') return isDueInRange(card)
  return false
}

function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = parseDateTime(trimmed)
  return parsed ? formatDateKey(parsed) : null
}

function dateKeyForTs(ts?: number | null): string | null {
  if (ts == null) return null
  return formatDateKey(new Date(ts))
}

function isCreatedToday(card: DeckCardSummary) {
  const key = dateKeyForTs(card.createdTs)
  if (!key) return false
  return key === formatDateKey(new Date())
}

function isCreatedInRange(card: DeckCardSummary, from?: string, to?: string) {
  return dateKeyInRange(dateKeyForTs(card.createdTs), from, to)
}

function isCompletedInRange(card: DeckCardSummary, from?: string, to?: string) {
  return dateKeyInRange(dateKeyForTs(card.doneTs), from, to)
}

function isDueInRange(card: DeckCardSummary, from?: string, to?: string) {
  return dateKeyInRange(dateKeyForTs(card.dueTs), from, to)
}

function isDueToday(card: DeckCardSummary) {
  const dueKey = dateKeyForTs(card.dueTs ?? null)
  if (!dueKey) return false
  return dueKey === formatDateKey(new Date())
}

function isOverdue(card: DeckCardSummary) {
  if (card.status !== 'active') return false
  const dueKey = dateKeyForTs(card.dueTs ?? null)
  if (!dueKey) return false
  return dueKey < formatDateKey(new Date())
}

function dateKeyInRange(cardKey: string | null, from?: string, to?: string) {
  const fromKey = normalizeDateKey(from || null)
  const toKey = normalizeDateKey(to || null)
  if (!cardKey || !fromKey || !toKey) return false
  return cardKey >= fromKey && cardKey <= toKey
}

function matchesCustomFilter(
  card: DeckCardSummary,
  filter: { labelIds?: string[]; labels?: string[]; assignees?: string[] },
  mineMatch: (card: DeckCardSummary) => boolean,
): boolean {
  const labelIds = (filter.labelIds || []).map((id) => id.trim().toLowerCase()).filter(Boolean)
  const labels = (filter.labels || []).map((label) => label.trim().toLowerCase()).filter(Boolean)
  const assignees = (filter.assignees || []).map((assignee) => assignee.trim().toLowerCase()).filter(Boolean)
  const hasLabelIds = labelIds.length > 0
  const hasLabels = labels.length > 0
  const hasAssignees = assignees.length > 0
  if (!hasLabelIds && !hasLabels && !hasAssignees) return false

  let labelOk = true
  if (hasLabelIds || hasLabels) {
    const cardLabelIds = (card.labels || [])
      .map((label) => (label.id != null ? String(label.id).trim().toLowerCase() : ''))
      .filter(Boolean)
    const cardLabels = (card.labels || [])
      .map((label) => String(label.title || '').trim().toLowerCase())
      .filter(Boolean)
    labelOk =
      (!hasLabelIds || labelIds.some((id) => cardLabelIds.includes(id))) &&
      (!hasLabels || labels.some((label) => cardLabels.includes(label)))
  }

  let assigneeOk = true
  if (hasAssignees) {
    const cardAssignees = (card.assignees || [])
      .map((assignee) => String(assignee.uid || '').trim().toLowerCase())
      .filter(Boolean)
    assigneeOk = assignees.some((uid) => cardAssignees.includes(uid))
    if (!assigneeOk && assignees.includes('me')) {
      assigneeOk = mineMatch(card)
    }
    if (!assigneeOk && assignees.includes('unassigned')) {
      assigneeOk = cardAssignees.length === 0
    }
  }

  return labelOk && assigneeOk
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
