import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DeckStatsWidget from '../src/components/widgets/deck/DeckStatsWidget.vue'

const now = Date.now()
const dayMs = 24 * 60 * 60 * 1000
const rangeFrom = new Date(now - 2 * dayMs).toISOString().slice(0, 10)
const rangeTo = new Date(now + 2 * dayMs).toISOString().slice(0, 10)

const cards = [
  {
    id: 1,
    title: 'Open mine',
    boardId: 1,
    boardTitle: 'Work',
    stackId: 101,
    stackTitle: 'Doing',
    status: 'active',
    archived: false,
    match: 'due',
    labels: [],
    assignees: [{ uid: 'me' }],
    createdTs: now - dayMs,
    dueTs: now - dayMs,
    createdBy: 'me',
  },
  {
    id: 2,
    title: 'Done item',
    boardId: 1,
    boardTitle: 'Work',
    stackId: 102,
    stackTitle: 'Done',
    status: 'done',
    archived: false,
    match: 'completed',
    labels: [],
    assignees: [],
    createdTs: now - dayMs,
    doneTs: now,
    createdBy: 'other',
  },
]

describe('DeckStatsWidget', () => {
  it('renders configured metric rows', () => {
    const wrapper = mount(DeckStatsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        from: rangeFrom,
        to: rangeTo,
        uid: 'me',
        metrics: ['open_now', 'completed_in_range'],
        selectionText: '1 board · Mine',
      },
    })

    const rows = wrapper.findAll('.deck-stats-widget__row')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('Open now')
    expect(wrapper.text()).toContain('Completed in range')
    expect(wrapper.text()).toContain('1 board · Mine')
    expect(rows[0].find('.deck-stats-widget__value').text()).toBe('1')
    expect(rows[1].find('.deck-stats-widget__value').text()).toBe('1')
  })

  it('hides the header when configured', () => {
    const wrapper = mount(DeckStatsWidget, {
      props: {
        cards,
        rangeLabel: 'This month',
        metrics: ['open_now'],
        showHeader: false,
      },
    })
    expect(wrapper.find('.deck-stats-widget__header').exists()).toBe(false)
  })
})
