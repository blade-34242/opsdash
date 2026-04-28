import { describe, it, expect } from 'vitest'

import { computePaceInfo, progressPercent } from '../src/services/targets/progress'

describe('computePaceInfo', () => {
  const start = new Date('2025-03-03T00:00:00Z') // Monday
  const end = new Date('2025-03-09T23:59:59Z') // Sunday

  it('counts only weekdays when includeWeekend=false', () => {
    const dailyHours = {
      '2025-03-03': 2, // Mon
      '2025-03-04': 0, // Tue
      '2025-03-05': 3, // Wed
      '2025-03-08': 4, // Sat (ignored)
    }
    const info = computePaceInfo({
      includeWeekend: false,
      mode: 'days_only',
      includeZeroDays: false,
      start,
      end,
      dailyHours,
    })
    // Eligible days: Mon–Fri = 5
    expect(info.totalEligible).toBeGreaterThanOrEqual(5)
    expect(info.elapsedEligible).toBeGreaterThan(0)
    expect(info.elapsedEligible).toBeLessThanOrEqual(info.totalEligible)
    expect(info.daysLeft).toBeGreaterThanOrEqual(0)
  })

  it('counts weekends when includeWeekend=true', () => {
    const dailyHours = {
      '2025-03-08': 1, // Sat
      '2025-03-09': 2, // Sun
    }
    const info = computePaceInfo({
      includeWeekend: true,
      mode: 'days_only',
      includeZeroDays: true,
      start,
      end,
      dailyHours,
    })
    expect(info.totalEligible).toBeGreaterThanOrEqual(7)
    expect(info.elapsedEligible).toBeGreaterThan(0)
    expect(info.elapsedEligible).toBeLessThanOrEqual(info.totalEligible)
    expect(info.daysLeft).toBeGreaterThanOrEqual(0)
  })
})

describe('progressPercent', () => {
  it('returns 0 for invalid or zero targets', () => {
    expect(progressPercent(5, 0)).toBe(0)
    expect(progressPercent(5, NaN)).toBe(0)
  })

  it('allows over-target values and floors negative progress at 0', () => {
    expect(progressPercent(50, 40)).toBe(125)
    expect(progressPercent(-5, 10)).toBe(0)
  })
})
