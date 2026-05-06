import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

import DeckCardsPanel from '../src/components/panels/DeckCardsPanel.vue'

const cards = [
  {
    id: 'c1',
    title: 'Prep Opsdash Deck sync',
    status: 'active',
    match: 'due' as const,
    due: '2025-03-12T10:00:00Z',
    done: null,
    boardId: 'b1',
    boardTitle: 'Opsdash Deck QA',
    boardColor: '#2563EB',
    stackTitle: 'Inbox',
    labels: [{ id: 'l1', title: 'Ops', color: '#F97316' }],
    assignees: [{ id: 'u1', uid: 'qa', displayName: 'QA User' }],
  },
  {
    id: 'c2',
    title: 'Archive completed Ops tasks',
    status: 'done',
    match: 'completed' as const,
    due: null,
    done: '2025-03-05T08:00:00Z',
    boardId: 'b1',
    boardTitle: 'Opsdash Deck QA',
    boardColor: '#2563EB',
    stackTitle: 'Done',
    labels: [],
    assignees: [],
  },
]

const mountPanel = (overrides: Record<string, unknown> = {}) => {
  return mount(DeckCardsPanel, {
    props: {
      cards,
      loading: false,
      rangeLabel: 'Week',
      deckUrl: '/apps/deck/',
      lastFetchedAt: '2025-03-10T12:00:00Z',
      filter: 'all',
      canFilterMine: true,
      showHeader: true,
      ...overrides,
    },
    global: {
      stubs: {
        NcEmptyContent: {
          template: '<div class="stub-empty"><slot /></div>',
        },
        NcLoadingIcon: {
          template: '<div class="stub-loading"></div>',
        },
      },
    },
  })
}

describe('DeckCardsPanel', () => {
  it('renders cards with status/board/assignee info and last fetched label', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('Deck cards')
    expect(wrapper.text()).toContain('Updated')
    expect(wrapper.text()).toContain('Prep Opsdash Deck sync')
    expect(wrapper.text()).toContain('Active')
    expect(wrapper.text()).toContain('Due')
    expect(wrapper.text()).toContain('Opsdash Deck QA')
    expect(wrapper.text()).toContain('Inbox')
    expect(wrapper.text()).toContain('QA User')

    const doneStatus = wrapper.findAll('.deck-card__status').at(1)
    expect(doneStatus?.text()).toBe('Done')
  })

  it('emits filter updates and disables "My cards" when not allowed', async () => {
    const wrapper = mountPanel({ canFilterMine: false, filtersEnabled: true })
    const filterGroup = wrapper.find('[aria-label="Deck card filters"]')
    expect(filterGroup.exists()).toBe(true)

    const buttons = filterGroup.findAll('button.deck-filter-btn')
    expect(buttons.length).toBeGreaterThan(2)
    const mineButtons = buttons.filter((btn) => btn.text().includes('Mine'))
    mineButtons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())

    await buttons[0].trigger('click')
    await mineButtons[0].trigger('click')
    const emissions = wrapper.emitted('update:filter') ?? []
    expect(emissions).toEqual([['all']]) // mine click ignored due to disabled
  })

  it('shows empty state and refresh emits when clicked', async () => {
    const wrapper = mountPanel({ cards: [], loading: false })
    expect(wrapper.find('.deck-card-list').exists()).toBe(false)
    expect(wrapper.find('.stub-empty').exists()).toBe(true)

    await wrapper.find('button.deck-panel__refresh').trigger('click')
    expect(wrapper.emitted().refresh).toBeTruthy()
  })

  it('renders filter counts when provided', () => {
    const wrapper = mountPanel({
      filtersEnabled: true,
      filterOptions: [
        { value: 'open_all', label: 'Open · All', mine: false, count: 2 },
        { value: 'done_all', label: 'Done · All', mine: false, count: 1 },
      ],
    })
    const counts = wrapper.findAll('.deck-filter-count')
    expect(counts.length).toBe(2)
    expect(counts[0].text()).toBe('2')
    expect(counts[1].text()).toBe('1')
  })

  it('renders context label and board color marker for duplicate tag filters', () => {
    const wrapper = mountPanel({
      filtersEnabled: true,
      filterOptions: [
        {
          value: 'open_all',
          label: 'Open · All',
          mine: false,
          count: 2,
        },
        {
          value: 'tag_11' as any,
          label: 'Ops',
          mine: false,
          count: 4,
          contextLabel: 'Opsdash Product Delivery',
          contextColor: '#2563EB',
        },
      ],
    })
    expect(wrapper.text()).toContain('Opsdash Product Delivery')
    const dot = wrapper.find('.deck-filter-board-dot')
    expect(dot.exists()).toBe(true)
    expect(dot.attributes('style')).toContain('background-color: rgb(37, 99, 235)')
  })

  it('renders error message when provided', () => {
    const wrapper = mountPanel({ error: 'Deck unavailable', cards: [] })
    expect(wrapper.find('.deck-panel__error').text()).toContain('Deck unavailable')
  })

  it('shows loading state instead of cards or error', () => {
    const wrapper = mountPanel({ loading: true, cards: [], error: 'Should not show' })
    expect(wrapper.find('.deck-panel__loading').exists()).toBe(true)
    expect(wrapper.find('.deck-card-list').exists()).toBe(false)
    expect(wrapper.find('.deck-panel__error').exists()).toBe(false)
  })

  it('hides filters when disabled', () => {
    const wrapper = mountPanel({ filtersEnabled: false })
    expect(wrapper.find('[aria-label="Deck card filters"]').exists()).toBe(false)
  })

  it('falls back to range label when last fetched is missing/invalid', () => {
    const wrapper = mountPanel({ lastFetchedAt: 'not-a-date' })
    expect(wrapper.text()).toContain('Showing week selection')
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mountPanel({ showHeader: false })
    expect(wrapper.find('.deck-panel__header').exists()).toBe(false)
  })

  it('emits reorder event when filters are dragged in edit mode', async () => {
    const wrapper = mountPanel({
      filtersEnabled: true,
      editable: true,
      orderableValues: ['open_all', 'done_all', 'archived_all'],
      filterOptions: [
        { value: 'open_all', label: 'Open · All', mine: false },
        { value: 'done_all', label: 'Done · All', mine: false },
        { value: 'archived_all', label: 'Archived · All', mine: false },
      ],
    })

    const buttons = wrapper.findAll('button.deck-filter-btn')
    const dataTransfer = { effectAllowed: '', setData: vi.fn() }
    await buttons[0].trigger('dragstart', { dataTransfer })
    await buttons[2].trigger('drop')

    const emissions = wrapper.emitted('reorder:filters') ?? []
    expect(emissions.length).toBe(1)
    expect(emissions[0]).toEqual([['done_all', 'archived_all', 'open_all']])
  })

  it('sanitizes unsafe board and label colors, keeps valid hex', () => {
    const maliciousCards = [
      {
        id: 'c3',
        title: 'Test card',
        status: 'active',
        match: 'due' as const,
        due: null,
        done: null,
        boardId: 'b2',
        boardTitle: 'Board',
        boardColor: 'red; } body { display:none',
        stackTitle: 'Stack',
        labels: [{ id: 'l2', title: 'Bad', color: 'url(https://evil.com)' }],
        assignees: [],
      },
      {
        id: 'c4',
        title: 'Safe card',
        status: 'active',
        match: 'due' as const,
        due: null,
        done: null,
        boardId: 'b3',
        boardTitle: 'Board',
        boardColor: '#2563EB',
        stackTitle: 'Stack',
        labels: [{ id: 'l3', title: 'Ok', color: '#F97316' }],
        assignees: [],
      },
    ]
    const wrapper = mountPanel({ cards: maliciousCards })
    const boardSpans = wrapper.findAll('.deck-card__board')
    const labelSpans = wrapper.findAll('.deck-card__label')

    // Unsafe board color falls back to CSS var; the malicious string must not appear.
    const badBoardStyle = boardSpans[0]?.attributes('style') ?? ''
    expect(badBoardStyle).not.toContain('display')
    expect(badBoardStyle).not.toContain('evil.com')
    expect(badBoardStyle).not.toContain('red; }')

    // Safe hex board color passes through (jsdom renders hex as rgb()).
    const goodBoardStyle = boardSpans[1]?.attributes('style') ?? ''
    expect(goodBoardStyle).toContain('37, 99, 235')

    // Safe hex label color passes through (c4's label is labelSpans[1]).
    const goodLabelStyle = labelSpans[1]?.attributes('style') ?? ''
    expect(goodLabelStyle).toContain('249, 115, 22')
  })
})
