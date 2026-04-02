import { describe, expect, it } from 'vitest'

import {
  buildDeckStackOptions,
  buildDeckStatsRows,
  filterDeckBaseCards,
  filterDeckCardsForMode,
  filterDeckStatsPopulation,
  parseDeckStatsMetrics,
} from '../src/services/deckWidgetMetrics'

const now = Date.now()
const dayMs = 24 * 60 * 60 * 1000
const weekFrom = new Date(now - 3 * dayMs).toISOString().slice(0, 10)
const weekTo = new Date(now + 3 * dayMs).toISOString().slice(0, 10)

const cards = [
  {
    id: 1,
    title: 'Mine open',
    boardId: 1,
    boardTitle: 'Work',
    boardColor: '#2563eb',
    stackId: 101,
    stackTitle: 'Doing',
    status: 'active',
    archived: false,
    match: 'due',
    labels: [{ id: 11, title: 'Urgent' }],
    assignees: [{ uid: 'me' }],
    createdTs: now - dayMs,
    dueTs: now - dayMs,
    createdBy: 'me',
  },
  {
    id: 2,
    title: 'Unassigned fresh',
    boardId: 1,
    boardTitle: 'Work',
    boardColor: '#2563eb',
    stackId: 102,
    stackTitle: 'Inbox',
    status: 'active',
    archived: false,
    match: 'due',
    labels: [{ id: 12, title: 'Backlog' }],
    assignees: [],
    createdTs: now,
    dueTs: now + dayMs,
    createdBy: 'other',
  },
  {
    id: 3,
    title: 'Done card',
    boardId: 2,
    boardTitle: 'Personal',
    boardColor: '#10b981',
    stackId: 201,
    stackTitle: 'Done',
    status: 'done',
    archived: false,
    match: 'completed',
    labels: [],
    assignees: [{ uid: 'other' }],
    createdTs: now - 2 * dayMs,
    doneTs: now - dayMs,
    createdBy: 'other',
    doneBy: 'me',
  },
  {
    id: 4,
    title: 'Archived card',
    boardId: 2,
    boardTitle: 'Personal',
    boardColor: '#10b981',
    stackId: 202,
    stackTitle: 'Archive',
    status: 'archived',
    archived: true,
    match: 'completed',
    labels: [],
    assignees: [],
    createdTs: now - 10 * dayMs,
    doneTs: now - 5 * dayMs,
    createdBy: 'other',
  },
]

describe('deckWidgetMetrics', () => {
  it('filters cards by board and stack', () => {
    const filtered = filterDeckBaseCards(cards as any, { boardIds: [1], stackIds: [102] })
    expect(filtered.map((card) => card.id)).toEqual([2])
  })

  it('builds stack options with board context', () => {
    const options = buildDeckStackOptions(cards as any)
    expect(options.map((option) => option.label)).toContain('Doing')
    expect(options.find((option) => option.value === 101)?.contextLabel).toBe('Work')
  })

  it('uses shared mode filtering for range-based filters', () => {
    const filtered = filterDeckCardsForMode('created_range_all', cards as any, {
      from: weekFrom,
      to: weekTo,
      uid: 'me',
      mineMode: 'assignee',
      includeCompleted: true,
      includeArchivedInDone: true,
    })
    expect(filtered.map((card) => card.id)).toEqual([1, 2, 3])
  })

  it('filters stat populations by scope and tags', () => {
    const filtered = filterDeckStatsPopulation(cards as any, {
      scope: 'mine',
      uid: 'me',
      mineMode: 'assignee',
      tagIds: ['tag_11'],
    })
    expect(filtered.map((card) => card.id)).toEqual([1])
  })

  it('builds compact stat rows from the configured metrics', () => {
    const rows = buildDeckStatsRows(cards as any, {
      metrics: ['open_now', 'overdue_now', 'completed_in_range', 'archived_now'],
      from: weekFrom,
      to: weekTo,
      uid: 'me',
      mineMode: 'assignee',
      includeArchived: true,
      includeCompleted: true,
      rangeLabel: 'This week',
    })
    expect(rows).toEqual([
      { key: 'open_now', label: 'Open now', hint: 'Current snapshot', value: 2 },
      { key: 'overdue_now', label: 'Overdue now', hint: 'Current snapshot', value: 1 },
      { key: 'completed_in_range', label: 'Completed in range', hint: 'Within this week', value: 1 },
      { key: 'archived_now', label: 'Archived now', hint: 'Current snapshot', value: 1 },
    ])
  })

  it('falls back to the default stat metrics when the config is empty', () => {
    expect(parseDeckStatsMetrics([])).toEqual([
      'open_now',
      'overdue_now',
      'created_in_range',
      'completed_in_range',
      'due_in_range',
    ])
  })
})
