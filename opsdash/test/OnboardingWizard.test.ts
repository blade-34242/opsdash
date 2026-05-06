import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, it, expect, vi } from 'vitest'

const { postJsonMock, fetchDeckBoardsMetaMock } = vi.hoisted(() => ({
  postJsonMock: vi.fn(),
  fetchDeckBoardsMetaMock: vi.fn(),
}))

vi.mock('../composables/useOcHttp', () => ({
  useOcHttp: () => ({
    route: (name: string) => `/${name}`,
    postJson: postJsonMock,
  }),
}))

vi.mock('../src/services/deck', () => ({
  fetchDeckBoardsMeta: fetchDeckBoardsMetaMock,
}))

import OnboardingWizard from '../src/components/onboarding/OnboardingWizard.vue'

function mountWizard(overrides: Record<string, any> = {}) {
  return mount(OnboardingWizard, {
    props: {
      visible: true,
      calendars: [{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }],
      initialSelection: ['cal-1'],
      initialStrategy: 'total_only',
      onboardingVersion: 1,
      saving: false,
      closable: true,
      initialThemePreference: 'auto',
      systemTheme: 'light',
      initialAllDayHours: 8,
      initialTotalHours: 40,
      hasExistingConfig: true,
      snapshotSaving: false,
      snapshotNotice: null,
      ...overrides,
    },
  })
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    postJsonMock.mockReset()
    fetchDeckBoardsMetaMock.mockReset()
    postJsonMock.mockResolvedValue({
      charts: { perDaySeries: { series: [] } },
      byCal: [],
    })
    fetchDeckBoardsMetaMock.mockResolvedValue([])
  })

  it('locks body scroll while visible', async () => {
    const wrapper = mountWizard()
    expect(document.body.classList.contains('opsdash-onboarding-lock')).toBe(true)
    expect(document.body.dataset.opsdashOnboarding).toBe('1')

    await wrapper.setProps({ visible: false })
    expect(document.body.classList.contains('opsdash-onboarding-lock')).toBe(false)
    expect(document.body.dataset.opsdashOnboarding).toBeUndefined()

    wrapper.unmount()
    expect(document.body.classList.contains('opsdash-onboarding-lock')).toBe(false)
  })

  it('disables the snapshot button while saving', async () => {
    const wrapper = mountWizard({ snapshotSaving: true })
    const button = wrapper.find('.config-warning button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('renders snapshot notices when provided', () => {
    const wrapper = mountWizard({
      snapshotNotice: { type: 'success', message: 'Profile saved' },
    })
    const notice = wrapper.find('.snapshot-notice')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('Profile saved')
  })

  it('honors startStep and allows jumping via step pills', async () => {
    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'full_granular',
    })
    const arrows = wrapper.findAll('.step-arrow')
    const labels = arrows.map((p) => p.text())
    expect(labels.some((label) => label.includes('Goals'))).toBe(true)
    const goalsArrow = arrows.find((p) => p.text().includes('Goals'))
    expect(goalsArrow?.classes()).toContain('current')

    const calendarsArrow = arrows.find((p) => p.text().includes('Calendars'))
    await calendarsArrow?.trigger('click')
    await flushPromises()
    expect(wrapper.find('.step-arrow.current').text()).toContain('Calendars')
  })

  it('shows global trend lookback choices in preferences after opening the editor', async () => {
    const wrapper = mountWizard({
      startStep: 'preferences',
      initialTargetsConfig: { balanceTrendLookback: 5 },
    })
    const lookbackRow = wrapper.findAll('.field-row').find((row) => row.text().includes('Trend lookback'))
    const openButton = lookbackRow?.findAll('button').find((button) => button.text().includes('Choose'))
    await openButton?.trigger('click')

    const editor = wrapper.find('.editor-card')
    expect(editor.exists()).toBe(true)
    expect(editor.text()).toContain('Open trend lookback selection')
    expect(editor.text()).toContain('5 weeks')
  })

  it('uses a dedicated deck boards step', () => {
    const wrapper = mountWizard({
      startStep: 'deck',
    })
    expect(wrapper.find('.step-arrow.current').text()).toContain('Deck')
    expect(wrapper.text()).toContain('Select Deck boards to include')
  })

  it('continues to calendars on strategy card double click', async () => {
    const wrapper = mountWizard({
      startStep: 'strategy',
      initialStrategy: 'total_only',
    })

    const card = wrapper.findAll('.strategy-route-card').find((node) => node.text().includes('Calendar Goals'))
    await card?.trigger('dblclick')
    await flushPromises()

    expect(wrapper.find('.step-arrow.current').text()).toContain('Calendars')
  })

  it('auto-saves before continuing to the next step', async () => {
    const persistStep = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountWizard({
      startStep: 'strategy',
      initialStrategy: 'total_only',
      persistStep,
    })

    const continueButton = wrapper.findAll('button').find((button) => button.text().includes('Continue'))
    await continueButton?.trigger('click')
    await flushPromises()

    expect(persistStep).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.step-arrow.current').text()).toContain('Calendars')
  })

  it('loads goal suggestions from previous weeks instead of future weeks', async () => {
    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'full_granular',
      calendars: [
        { id: 'cal-1', displayname: 'Primary', color: '#ff0000' },
        { id: 'cal-2', displayname: 'Secondary', color: '#00ff00' },
      ],
      initialSelection: ['cal-1', 'cal-2'],
    })

    await flushPromises()

    const loadCalls = postJsonMock.mock.calls
      .map((call) => call[1])
      .filter((payload) => payload?.range === 'week' && Array.isArray(payload?.include) && payload.include.includes('data'))
    const offsets = loadCalls.map((payload) => payload.offset)

    expect(new Set(offsets)).toEqual(new Set([-1, -2, -3, -4, -5, -6]))
    expect(offsets.every((offset) => offset < 0)).toBe(true)

    wrapper.unmount()
  })

  it('shows suggestions in single goal mode from recent history', async () => {
    postJsonMock.mockResolvedValue({
      charts: {
        perDaySeries: {
          series: [
            { id: 'cal-1', data: [6] },
          ],
        },
      },
      byCal: [{ id: 'cal-1', total_hours: 6 }],
    })

    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'total_only',
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Suggested from recent activity:')
    expect(wrapper.text()).toContain('6.0 h / week')
  })

  it('applies the single goal suggestion when clicked', async () => {
    postJsonMock.mockResolvedValue({
      charts: {
        perDaySeries: {
          series: [
            { id: 'cal-1', data: [6] },
          ],
        },
      },
      byCal: [{ id: 'cal-1', total_hours: 6 }],
    })

    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'total_only',
    })

    await flushPromises()

    const suggestion = wrapper.findAll('button').find((button) => button.text().includes('6.0 h / week'))
    expect(suggestion).toBeTruthy()
    await suggestion?.trigger('click')
    await flushPromises()

    const weeklyInput = wrapper.find('.goal-single__editor input[type="number"]')
    expect((weeklyInput.element as HTMLInputElement).value).toBe('6')
  })

  it('shows category suggestions when existing assignments map calendars to a category', async () => {
    postJsonMock.mockResolvedValue({
      charts: {
        perDaySeries: {
          series: [
            { id: 'cal-1', data: [6] },
            { id: 'cal-2', data: [2] },
          ],
        },
      },
      byCal: [
        { id: 'cal-1', total_hours: 6 },
        { id: 'cal-2', total_hours: 2 },
      ],
    })

    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'full_granular',
      calendars: [
        { id: 'cal-1', displayname: 'Primary', color: '#ff0000' },
        { id: 'cal-2', displayname: 'Secondary', color: '#00ff00' },
      ],
      initialSelection: ['cal-1', 'cal-2'],
      initialCategories: [
        {
          id: 'work',
          label: 'Work',
          targetHours: 12,
          includeWeekend: false,
          paceMode: 'days_only',
          color: '#2563EB',
        },
      ],
      initialAssignments: {
        'cal-1': 'work',
        'cal-2': 'work',
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Suggested 8.0 h')
  })

  it('applies the calendar suggestion when clicked in calendar goals mode', async () => {
    postJsonMock.mockResolvedValue({
      charts: {
        perDaySeries: {
          series: [
            { id: 'cal-1', data: [6] },
          ],
        },
      },
      byCal: [{ id: 'cal-1', total_hours: 6 }],
    })

    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'total_plus_categories',
      calendars: [
        { id: 'cal-1', displayname: 'Primary', color: '#ff0000' },
      ],
      initialSelection: ['cal-1'],
    })

    await flushPromises()

    const suggestion = wrapper.findAll('button').find((button) => button.text().includes('Suggested 6.0 h'))
    expect(suggestion).toBeTruthy()
    await suggestion?.trigger('click')
    await flushPromises()

    const targetInput = wrapper.find('.goal-calendar-row .input-unit input[type="number"]')
    expect((targetInput.element as HTMLInputElement).value).toBe('6')
  })

  it('applies the category suggestion when clicked in granular mode', async () => {
    postJsonMock.mockResolvedValue({
      charts: {
        perDaySeries: {
          series: [
            { id: 'cal-1', data: [6] },
            { id: 'cal-2', data: [2] },
          ],
        },
      },
      byCal: [
        { id: 'cal-1', total_hours: 6 },
        { id: 'cal-2', total_hours: 2 },
      ],
    })

    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'full_granular',
      calendars: [
        { id: 'cal-1', displayname: 'Primary', color: '#ff0000' },
        { id: 'cal-2', displayname: 'Secondary', color: '#00ff00' },
      ],
      initialSelection: ['cal-1', 'cal-2'],
      initialCategories: [
        {
          id: 'work',
          label: 'Work',
          targetHours: 12,
          includeWeekend: false,
          paceMode: 'days_only',
          color: '#2563EB',
        },
      ],
      initialAssignments: {
        'cal-1': 'work',
        'cal-2': 'work',
      },
    })

    await flushPromises()

    const suggestion = wrapper.findAll('button').find((button) => button.text().includes('Suggested 8.0 h'))
    expect(suggestion).toBeTruthy()
    await suggestion?.trigger('click')
    await flushPromises()

    const targetInput = wrapper.find('.goal-inline-target input[type="number"]')
    expect((targetInput.element as HTMLInputElement).value).toBe('8')
  })

  it('auto-saves before closing the wizard', async () => {
    const persistStep = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountWizard({
      startStep: 'preferences',
      persistStep,
    })

    await wrapper.find('.close-btn').trigger('click')
    await flushPromises()

    expect(persistStep).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('continues to review on dashboard card double click', async () => {
    const wrapper = mountWizard({
      startStep: 'dashboard',
      initialDashboardMode: 'standard',
    })

    const card = wrapper.findAll('.dashboard-preset-card').find((node) => node.text().includes('Advanced'))
    await card?.trigger('dblclick')
    await flushPromises()

    expect(wrapper.find('.step-arrow.current').text()).toContain('Review')
  })

  it('completes quick setup from intro with the default onboarding payload', async () => {
    const wrapper = mountWizard({
      hasExistingConfig: false,
      initialSelection: [],
    })

    const quickCard = wrapper.findAll('.intro-route-card').find((card) => card.text().includes('Quick setup'))
    await quickCard?.trigger('click')
    const continueButton = wrapper.findAll('button').find((button) => button.text().includes('Continue'))
    await continueButton?.trigger('click')

    const complete = wrapper.emitted('complete')
    expect(complete).toBeTruthy()
    expect(complete?.[0]?.[0]?.strategy).toBe('total_plus_categories')
    expect(complete?.[0]?.[0]?.dashboardMode).toBe('standard')
    expect(complete?.[0]?.[0]?.selected).toEqual(['cal-1'])
  })

  it('renders the new onboarding step order', () => {
    const wrapper = mountWizard()
    const labels = wrapper.findAll('.step-arrow__label').map((node) => node.text())
    expect(labels).toEqual(['Intro', 'Strategy', 'Calendars', 'Deck', 'Goals', 'Preferences', 'Dashboard', 'Review'])
  })

  it('removes category mix trend from single goal dashboard presets', async () => {
    const wrapper = mountWizard({
      startStep: 'review',
      initialStrategy: 'total_only',
      initialDashboardMode: 'pro',
    })

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('Start dashboard'))
    await startButton?.trigger('click')

    const payload = wrapper.emitted('complete')?.[0]?.[0]
    const widgetTypes = (payload?.widgets?.tabs || []).flatMap((tab: any) => (tab.widgets || []).map((widget: any) => widget.type))
    expect(widgetTypes).not.toContain('category_mix_trend')
    expect(widgetTypes).toContain('balance_index')
  })

  it('removes category mix trend from calendar goals dashboard presets', async () => {
    const wrapper = mountWizard({
      startStep: 'review',
      initialStrategy: 'total_plus_categories',
      initialDashboardMode: 'pro',
    })

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('Start dashboard'))
    await startButton?.trigger('click')

    const payload = wrapper.emitted('complete')?.[0]?.[0]
    const widgetTypes = (payload?.widgets?.tabs || []).flatMap((tab: any) => (tab.widgets || []).map((widget: any) => widget.type))
    expect(widgetTypes).not.toContain('category_mix_trend')
    expect(widgetTypes).toContain('balance_index')
    expect(payload?.targetsConfig?.balance?.useCategoryMapping).toBe(false)
    expect(payload?.targetsConfig?.balance?.index?.basis).toBe('calendar')
  })

  it('keeps category mix trend for calendar plus category goals', async () => {
    const wrapper = mountWizard({
      startStep: 'review',
      initialStrategy: 'full_granular',
      initialDashboardMode: 'pro',
    })

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('Start dashboard'))
    await startButton?.trigger('click')

    const payload = wrapper.emitted('complete')?.[0]?.[0]
    const widgetTypes = (payload?.widgets?.tabs || []).flatMap((tab: any) => (tab.widgets || []).map((widget: any) => widget.type))
    expect(widgetTypes).toContain('category_mix_trend')
  })
})
