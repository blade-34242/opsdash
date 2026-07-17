import { describe, expect, it } from 'vitest'
import { buildCalendarStatsRows, parseCalendarStatsMetrics } from '../src/services/calendarStats'

describe('calendarStats', () => {
  it('builds elapsed and planned metrics from the loaded calendar rows', () => {
    const rows = buildCalendarStatsRows([
      { total_hours: 4.25, future_hours: 1.5, events_count: 2 },
      { total_hours: 2, future_hours: 0, events_count: 1 },
    ], ['tracked_hours', 'planned_later', 'total_with_planned', 'event_count', 'average_event_duration'], 'Week')

    expect(rows.map((row) => row.value)).toEqual(['6.3 h', '1.5 h', '7.8 h', '3', '2.1 h'])
    expect(rows[2].hint).toBe('Within week')
  })

  it('keeps only supported metric ids and falls back to defaults', () => {
    expect(parseCalendarStatsMetrics(['event_count', 'unknown', 'event_count'])).toEqual(['event_count'])
    expect(parseCalendarStatsMetrics([])).toEqual(['tracked_hours', 'planned_later', 'event_count', 'average_event_duration'])
  })
})
