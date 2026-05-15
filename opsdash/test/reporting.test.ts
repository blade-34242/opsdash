import { describe, it, expect } from 'vitest'

import { createDefaultDeckSettings, createDefaultReportingConfig, normalizeDeckSettings, normalizeReportingConfig } from '../src/services/reporting'

describe('Deck feature settings', () => {
  it('provides sane defaults', () => {
    const defaults = createDefaultDeckSettings()
    expect(defaults.enabled).toBe(true)
    expect(defaults.filtersEnabled).toBe(true)
    expect(defaults.defaultFilter).toBe('all')
    expect(defaults.hiddenBoards).toEqual([])
    expect(defaults.mineMode).toBe('assignee')
    expect(defaults.solvedIncludesArchived).toBe(true)
    expect(defaults.ticker).toMatchObject({ autoScroll: true, intervalSeconds: 5, showBoardBadges: true })
  })

  it('normalizes hidden boards and default filter', () => {
    const normalized = normalizeDeckSettings({
      enabled: false,
      filtersEnabled: false,
      defaultFilter: 'done_mine',
      hiddenBoards: [3, '5', 'foo', -4, 0, 3],
      mineMode: 'creator',
      solvedIncludesArchived: false,
      ticker: { autoScroll: false, intervalSeconds: 12, showBoardBadges: false },
    })

    expect(normalized.enabled).toBe(false)
    expect(normalized.filtersEnabled).toBe(false)
    expect(normalized.defaultFilter).toBe('done_mine')
    expect(normalized.hiddenBoards).toEqual([3, 5])
    expect(normalized.mineMode).toBe('creator')
    expect(normalized.solvedIncludesArchived).toBe(false)
    expect(normalized.ticker).toEqual({ autoScroll: false, intervalSeconds: 10, showBoardBadges: false })
  })
})

describe('Reporting config', () => {
  it('provides recap-focused defaults', () => {
    const defaults = createDefaultReportingConfig()
    expect(defaults.enabled).toBe(false)
    expect(defaults.modes.week).toEqual({
      enabled: true,
      delivery: 'final',
      sendTimeLocal: '06:00',
    })
    expect(defaults.modes.month).toEqual({
      enabled: false,
      delivery: 'checkpoint_final',
      sendTimeLocal: '18:00',
    })
  })

  it('normalizes legacy cadence into delivery modes', () => {
    const normalized = normalizeReportingConfig({
      enabled: true,
      schedule: 'week',
      interim: 'midweek',
    })

    expect(normalized.enabled).toBe(true)
    expect(normalized.modes.week).toEqual({
      enabled: true,
      delivery: 'checkpoint_final',
      sendTimeLocal: '06:00',
    })
    expect(normalized.modes.month).toEqual({
      enabled: false,
      delivery: 'checkpoint_final',
      sendTimeLocal: '18:00',
    })
  })
})
