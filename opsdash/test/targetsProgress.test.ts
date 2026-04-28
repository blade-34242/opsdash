import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { computePaceInfo, progressPercent } from '../src/services/targets/progress'

describe('targets progress helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-05T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('skips zero-hour days when includeZeroDays=false', () => {
    const start = new Date('2025-03-03T00:00:00Z')
    const end = new Date('2025-03-09T23:59:59Z')
    const dailyHours = new Map<string, number>([
      ['2025-03-03', 0],
      ['2025-03-04', 2],
      ['2025-03-05', 0],
    ])

    const pace = computePaceInfo({
      includeWeekend: false,
      mode: 'days_only',
      includeZeroDays: false,
      start,
      end,
      dailyHours,
    })

    expect(pace.totalEligible).toBe(5)
    expect(pace.elapsedEligible).toBeCloseTo(1, 4)
    expect(pace.daysLeft).toBeCloseTo(4, 4)
    expect(pace.calendarPercent).toBeCloseTo(20, 2)
  })

  it('keeps over-target percentages above 200%', () => {
    expect(progressPercent(25, 10)).toBe(250)
  })
})
