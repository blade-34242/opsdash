<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\OverviewStatsKpiService;
use PHPUnit\Framework\TestCase;

final class OverviewStatsKpiServiceTest extends TestCase {
  public function testBuildSummarizesKpis(): void {
    $service = new OverviewStatsKpiService();
    $from = new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC'));
    $to = new \DateTimeImmutable('2024-01-03 23:59:59', new \DateTimeZone('UTC'));

    $context = [
      'from' => $from,
      'to' => $to,
      'analysisTo' => $to,
      'userTz' => new \DateTimeZone('UTC'),
      'byDay' => [
        '2024-01-02' => ['date' => '2024-01-02', 'total_hours' => 0.0],
        '2024-01-03' => ['date' => '2024-01-03', 'total_hours' => 3.0],
      ],
      'byCalList' => [
        ['calendar' => 'Work', 'total_hours' => 4.0],
      ],
      'totalHours' => 4.0,
      'futureTotalHours' => 0.0,
      'daysCount' => 2,
      'avgPerDay' => 2.0,
      'avgPerEvent' => 1.0,
      'hod' => [
        'Mon' => array_fill(0, 24, 0.0),
        'Tue' => array_replace(array_fill(0, 24, 0.0), [9 => 1.0, 10 => 1.0]),
        'Wed' => array_fill(0, 24, 0.0),
        'Thu' => array_fill(0, 24, 0.0),
        'Fri' => array_fill(0, 24, 0.0),
        'Sat' => array_replace(array_fill(0, 24, 0.0), [10 => 1.0]),
        'Sun' => array_fill(0, 24, 0.0),
      ],
      'dowOrder' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      'eventsCount' => 4,
      'overlapCount' => 1,
      'earliestStartTs' => 1704096000,
      'latestEndTs' => 1704110400,
      'longestSessionHours' => 2.5,
      'currentPeriodClipped' => false,
      'currentCutoff' => null,
      'todayActualHours' => 0.0,
      'todayFutureHours' => 0.0,
    ];

    $stats = $service->build($context);

    $this->assertSame(4.0, $stats['total_hours']);
    $this->assertSame(2.0, $stats['avg_per_day']);
    $this->assertSame(1.0, $stats['avg_per_event']);
    $this->assertSame(4, $stats['events']);
    $this->assertSame(2, $stats['active_days']);
    $this->assertSame(['date' => '2024-01-03', 'hours' => 3.0], $stats['busiest_day']);
    $this->assertSame('09:00', $stats['typical_start']);
    $this->assertSame('11:00', $stats['typical_end']);
    $this->assertSame('2024-01-01T08:00:00+00:00', $stats['earliest_start']);
    $this->assertSame('2024-01-01T12:00:00+00:00', $stats['latest_end']);
    $this->assertSame(2.5, $stats['longest_session']);
    $this->assertSame('2024-01-02', $stats['last_day_off']);
    $this->assertSame('2024-01-03', $stats['last_half_day_off']);
    $this->assertSame(25.0, $stats['weekend_share']);
    $this->assertSame(0.0, $stats['evening_share']);
    $this->assertSame(1, $stats['overlap_events']);
    $this->assertSame(['calendar' => 'Work', 'share' => 100.0], $stats['top_calendar']);
    $this->assertSame(0.0, $stats['future_hours']);
  }

  public function testBuildStopsDayOffSearchAtAnalysisTo(): void {
    $service = new OverviewStatsKpiService();

    $stats = $service->build([
      'from' => new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC')),
      'to' => new \DateTimeImmutable('2024-01-05 23:59:59', new \DateTimeZone('UTC')),
      'analysisTo' => new \DateTimeImmutable('2024-01-03 12:00:00', new \DateTimeZone('UTC')),
      'userTz' => new \DateTimeZone('UTC'),
      'byDay' => [
        '2024-01-01' => ['date' => '2024-01-01', 'total_hours' => 5.0],
        '2024-01-02' => ['date' => '2024-01-02', 'total_hours' => 0.0],
        '2024-01-03' => ['date' => '2024-01-03', 'total_hours' => 1.0],
        '2024-01-04' => ['date' => '2024-01-04', 'total_hours' => 0.0],
        '2024-01-05' => ['date' => '2024-01-05', 'total_hours' => 0.0],
      ],
      'byCalList' => [],
      'totalHours' => 6.0,
      'futureTotalHours' => 4.0,
      'daysCount' => 2,
      'avgPerDay' => 3.0,
      'avgPerEvent' => 2.0,
      'hod' => [
        'Mon' => array_fill(0, 24, 0.0),
        'Tue' => array_fill(0, 24, 0.0),
        'Wed' => array_fill(0, 24, 0.0),
        'Thu' => array_fill(0, 24, 0.0),
        'Fri' => array_fill(0, 24, 0.0),
        'Sat' => array_fill(0, 24, 0.0),
        'Sun' => array_fill(0, 24, 0.0),
      ],
      'dowOrder' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      'eventsCount' => 3,
      'overlapCount' => 0,
      'earliestStartTs' => null,
      'latestEndTs' => null,
      'longestSessionHours' => 5.0,
      'currentPeriodClipped' => true,
      'currentCutoff' => '2024-01-03T12:00:00+00:00',
      'todayActualHours' => 1.0,
      'todayFutureHours' => 4.0,
    ]);

    $this->assertSame('2024-01-02', $stats['last_day_off']);
    $this->assertSame(4.0, $stats['future_hours']);
    $this->assertSame(1.0, $stats['today_actual_hours']);
    $this->assertSame(4.0, $stats['today_future_hours']);
  }
}
