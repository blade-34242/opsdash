import { describe, it, expect } from 'vitest'

import { computeForecast, computeMomentumRate } from '../src/services/targets/forecast'
import { createDefaultTargetsConfig } from '../src/services/targets/config'
import type { TargetsProgress, PaceInfo } from '../src/services/targets/progress'

describe('targets forecast helpers', () => {
  it('computes momentum rate from the most recent N days', () => {
    const dailyHours = new Map<string, number>([
      ['2025-03-01', 1],
      ['2025-03-02', 3],
      ['2025-03-03', 5],
      ['2025-03-04', 7],
    ])
    expect(computeMomentumRate(dailyHours, 2)).toBe(6)
    expect(computeMomentumRate(dailyHours, 3)).toBeCloseTo(5, 4)
  })

  it('builds a forecast band using padding and primary method', () => {
    const config = createDefaultTargetsConfig()
    config.forecast.methodPrimary = 'momentum'
    config.forecast.momentumLastNDays = 2
    config.forecast.padding = 2

    const dailyHours = new Map<string, number>([
      ['2025-03-01', 2],
      ['2025-03-02', 4],
      ['2025-03-03', 3],
      ['2025-03-04', 5],
    ])

    const totalProgress: TargetsProgress = {
      id: 'total',
      label: 'Total',
      actualHours: 20,
      plannedHours: 0,
      targetHours: 40,
      percent: 50,
      deltaHours: 0,
      remainingHours: 20,
      needPerDay: 0,
      daysLeft: 5,
      calendarPercent: 50,
      gap: 0,
      status: 'on_track',
      statusLabel: 'On Track',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const pace: PaceInfo = {
      totalEligible: 10,
      elapsedEligible: 5,
      daysLeft: 5,
      calendarPercent: 50,
    }

    const forecast = computeForecast({ config, totalProgress, dailyHours, pace })

    expect(forecast.primaryMethod).toBe('momentum')
    expect(forecast.primary).toBe(40)
    expect(forecast.bandLow).toBe(38)
    expect(forecast.bandHigh).toBe(42)
    expect(forecast.text).toBe('Momentum ±2h ≈ 38–42 h')
  })
})
