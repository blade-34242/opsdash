import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DeckCardsWidget from '../src/components/widgets/deck/DeckCardsWidget.vue'

const stubs = {
  NcEmptyContent: { template: '<div class="stub-empty"></div>' },
  NcLoadingIcon: { template: '<div class="stub-loading"></div>' },
}

describe('DeckCardsWidget', () => {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const rangeFrom = new Date(now - 7 * dayMs).toISOString().slice(0, 10)
  const rangeTo = new Date(now + 7 * dayMs).toISOString().slice(0, 10)
  const cards = [
    {
      id: 1,
      title: 'Open mine today',
      boardId: 1,
      boardTitle: 'A',
      status: 'active',
      match: 'due',
      assignees: [{ uid: 'me' }],
      labels: [],
      createdTs: now,
    },
    {
      id: 2,
      title: 'Done other',
      boardId: 2,
      boardTitle: 'B',
      status: 'done',
      match: 'completed',
      assignees: [{ uid: 'other' }],
      labels: [],
      createdTs: now,
    },
    {
      id: 3,
      title: 'Archived other',
      boardId: 1,
      boardTitle: 'A',
      status: 'archived',
      match: 'due',
      assignees: [{ uid: 'me' }],
      labels: [],
      createdTs: now,
    },
  ]

  it('filters by created_today_mine and boardIds', async () => {
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        uid: 'me',
        filters: ['created_today_mine', 'all'],
        defaultFilter: 'created_today_mine',
        boardIds: [1],
      },
      global: { stubs },
    })

    expect(wrapper.findAll('.deck-card').length).toBe(1)
    expect(wrapper.find('.deck-card__title').text()).toBe('Open mine today')
  })

  it('filters cards by stackIds before applying the active filter', () => {
    const withStacks = cards.map((card, index) => ({
      ...card,
      stackId: index === 0 ? 101 : 102,
      stackTitle: index === 0 ? 'Doing' : 'Done',
    }))
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: withStacks,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        stackIds: [101],
      },
      global: { stubs },
    })

    expect(wrapper.findAll('.deck-card').length).toBe(1)
    expect(wrapper.find('.deck-card__title').text()).toBe('Open mine today')
  })

  it('adds auto tag filters with counts', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Urgent card',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
      {
        id: 11,
        title: 'Second urgent',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }, { id: 12, title: 'Backlog' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        autoTagsEnabled: true,
      },
      global: { stubs },
    })
    const buttons = wrapper.findAll('.deck-filter-btn')
    const urgent = buttons.find((btn) => btn.text().includes('Urgent'))
    expect(urgent).toBeTruthy()
    expect(urgent?.text()).toContain('2')
  })

  it('respects tag filter selection', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Urgent card',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
      {
        id: 11,
        title: 'Backlog card',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 12, title: 'Backlog' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        autoTagsEnabled: true,
        autoTagSelection: ['tag_11'],
      },
      global: { stubs },
    })
    const labels = wrapper.findAll('.deck-filter-btn').map((btn) => btn.text())
    expect(labels.some((text) => text.includes('Urgent'))).toBe(true)
    expect(labels.some((text) => text.includes('Backlog'))).toBe(false)
  })

  it('filters by tag when selected', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Urgent card',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
      {
        id: 11,
        title: 'Backlog card',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 12, title: 'Backlog' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'tag_11',
        autoTagsEnabled: true,
      },
      global: { stubs },
    })
    const cardsShown = wrapper.findAll('.deck-card')
    expect(cardsShown.length).toBe(1)
    expect(cardsShown[0].find('.deck-card__title').text()).toBe('Urgent card')
  })

  it('skips auto tag filters when disabled', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Urgent card',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        autoTagsEnabled: false,
      },
      global: { stubs },
    })
    const labels = wrapper.findAll('.deck-filter-btn').map((btn) => btn.text())
    expect(labels.some((text) => text.includes('Urgent'))).toBe(false)
  })

  it('counts tags using cleaned cards', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Active urgent',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
      {
        id: 11,
        title: 'Done urgent',
        boardId: 1,
        boardTitle: 'A',
        status: 'done',
        match: 'completed',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
      {
        id: 12,
        title: 'Archived urgent',
        boardId: 1,
        boardTitle: 'A',
        status: 'archived',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        includeArchived: false,
        includeCompleted: false,
      },
      global: { stubs },
    })
    const buttons = wrapper.findAll('.deck-filter-btn')
    const urgent = buttons.find((btn) => btn.text().includes('Urgent'))
    expect(urgent).toBeTruthy()
    expect(urgent?.text()).toContain('1')
  })

  it('limits tag filters to selected boards', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Board A tag',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Alpha' }],
        createdTs: now,
      },
      {
        id: 11,
        title: 'Board B tag',
        boardId: 2,
        boardTitle: 'B',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 12, title: 'Beta' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        boardIds: [1],
        autoTagsEnabled: true,
      },
      global: { stubs },
    })
    const labels = wrapper.findAll('.deck-filter-btn').map((btn) => btn.text())
    expect(labels.some((text) => text.includes('Alpha'))).toBe(true)
    expect(labels.some((text) => text.includes('Beta'))).toBe(false)
  })

  it('falls back to default filters when tag filter is unavailable', () => {
    const taggedCards = [
      {
        id: 10,
        title: 'Tag one',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 11, title: 'Urgent' }],
        createdTs: now,
      },
      {
        id: 11,
        title: 'Tag two',
        boardId: 1,
        boardTitle: 'A',
        status: 'active',
        match: 'due',
        assignees: [],
        labels: [{ id: 12, title: 'Backlog' }],
        createdTs: now,
      },
    ]
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards: taggedCards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'tag_11',
        autoTagsEnabled: false,
      },
      global: { stubs },
    })
    expect(wrapper.findAll('.deck-card').length).toBe(2)
  })

  it('renders a compact list when enabled', () => {
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        filters: ['all'],
        defaultFilter: 'all',
        compactList: true,
      },
      global: { stubs },
    })
    expect(wrapper.find('.deck-panel--compact').exists()).toBe(true)
    expect(wrapper.find('.deck-card__row').exists()).toBe(true)
  })

  it('hides filters below minFilterCount and falls back from hidden default filter', () => {
    const noThreshold = mount(DeckCardsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        filters: ['open_all', 'due_all', 'done_all', 'archived_all'],
        defaultFilter: 'done_all',
        includeCompleted: false,
        includeArchived: false,
        minFilterCount: 0,
      },
      global: { stubs },
    })

    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        filters: ['open_all', 'due_all', 'done_all', 'archived_all'],
        defaultFilter: 'done_all',
        includeCompleted: false,
        includeArchived: false,
        minFilterCount: 1,
      },
      global: { stubs },
    })

    const noThresholdLabels = noThreshold.findAll('.deck-filter-btn').map((btn) => btn.text())
    const labels = wrapper.findAll('.deck-filter-btn').map((btn) => btn.text())
    expect(noThresholdLabels.some((text) => text.includes('Done · All'))).toBe(true)
    expect(labels.some((text) => text.includes('Done · All'))).toBe(false)
    expect(labels.some((text) => text.includes('Archived · All'))).toBe(false)
    expect(wrapper.findAll('.deck-card').length).toBe(1)
  })

  it('hydrates created_range filters without runtime initialization errors', () => {
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        filters: ['created_range_all', 'all'],
        defaultFilter: 'created_range_all',
        from: rangeFrom,
        to: rangeTo,
      },
      global: { stubs },
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findAll('.deck-card').length).toBeGreaterThan(0)
  })
})
