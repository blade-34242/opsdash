<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\CalendarParsingService;
use OCA\Opsdash\Service\OverviewAggregationService;
use OCA\Opsdash\Service\OverviewBalanceService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCA\Opsdash\Service\OverviewStatsDeltaService;
use OCA\Opsdash\Service\OverviewStatsHistoryService;
use OCA\Opsdash\Service\OverviewStatsKpiService;
use OCA\Opsdash\Service\OverviewStatsService;
use OCA\Opsdash\Service\OverviewStatsTrendService;
use OCP\Calendar\IManager;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class OverviewStatsServiceTest extends TestCase {
  public function testBuildCombinesOutputsAndAppliesFallbackColors(): void {
    $calendarAccess = new StatsCalendarAccess([
      -1 => [
        new \DateTimeImmutable('2023-12-25 00:00:00', new \DateTimeZone('UTC')),
        new \DateTimeImmutable('2023-12-31 23:59:59', new \DateTimeZone('UTC')),
      ],
      0 => [
        new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC')),
        new \DateTimeImmutable('2024-01-07 23:59:59', new \DateTimeZone('UTC')),
      ],
    ]);

    $calendarParsing = new EmptyStatsCalendarParsingService();
    $manager = new StatsCalendarManager();
    $collector = new OverviewEventsCollector($manager, $calendarParsing, $this->createMock(LoggerInterface::class));
    $history = new OverviewHistoryService($calendarAccess, $collector);
    $aggregation = new OverviewAggregationService();

    $historyService = new OverviewStatsHistoryService(
      new OverviewStatsDeltaService($calendarAccess, $history, $collector, $aggregation),
      new OverviewStatsTrendService($history),
    );
    $stats = new OverviewStatsService(
      new OverviewStatsKpiService(),
      $historyService,
      new OverviewBalanceService(),
    );

    $context = [
      'range' => 'week',
      'offset' => 0,
      'from' => new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC')),
      'to' => new \DateTimeImmutable('2024-01-07 23:59:59', new \DateTimeZone('UTC')),
      'principal' => 'principals/users/admin',
      'calendars' => [new StatsCalendarStub('cal-1')],
      'includeAll' => true,
      'selectedIds' => [],
      'mapCalToCategory' => fn (string $id): string => 'work',
      'userTz' => new \DateTimeZone('UTC'),
      'allDayHours' => 8.0,
      'categoryMeta' => ['work' => ['id' => 'work', 'label' => 'Work']],
      'targetsConfig' => [
        'categories' => [
          ['id' => 'work', 'label' => 'Work', 'targetHours' => 10, 'includeWeekend' => false],
        ],
        'balance' => [
          'categories' => ['work'],
          'useCategoryMapping' => true,
          'index' => ['method' => 'simple_range', 'basis' => 'category'],
          'thresholds' => [
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.30,
            'warnBelow' => 0.30,
            'warnIndex' => 0.60,
          ],
          'relations' => ['displayMode' => 'ratio'],
          'trend' => ['lookbackWeeks' => 1],
          'dayparts' => ['enabled' => false],
          'ui' => ['showNotes' => false],
        ],
      ],
      'targetsWeek' => ['cal-1' => 10],
      'targetsMonth' => ['cal-1' => 40],
      'byCalMap' => [
        'cal-1' => ['id' => 'cal-1', 'calendar' => 'Work', 'events_count' => 2, 'total_hours' => 4.0],
      ],
      'idToName' => ['cal-1' => 'Work'],
      'categoryTotals' => ['work' => 4.0],
      'categoryColors' => ['work' => ''],
      'perDayByCat' => [
        '2024-01-02' => ['work' => 2.0],
        '2024-01-03' => ['work' => 2.0],
      ],
      'totalHours' => 4.0,
      'futureTotalHours' => 1.5,
      'byCalList' => [
        ['calendar' => 'Work', 'total_hours' => 4.0, 'future_hours' => 1.5],
      ],
      'byDay' => [
        '2024-01-02' => ['date' => '2024-01-02', 'total_hours' => 2.0, 'future_hours' => 0.0],
        '2024-01-03' => ['date' => '2024-01-03', 'total_hours' => 2.0, 'future_hours' => 1.5],
      ],
      'hod' => [
        'Mon' => array_fill(0, 24, 0.0),
        'Tue' => array_replace(array_fill(0, 24, 0.0), [9 => 2.0]),
        'Wed' => array_replace(array_fill(0, 24, 0.0), [10 => 2.0]),
        'Thu' => array_fill(0, 24, 0.0),
        'Fri' => array_fill(0, 24, 0.0),
        'Sat' => array_fill(0, 24, 0.0),
        'Sun' => array_fill(0, 24, 0.0),
      ],
      'dowOrder' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      'eventsCount' => 2,
      'daysCount' => 2,
      'avgPerDay' => 2.0,
      'avgPerEvent' => 2.0,
      'overlapCount' => 0,
      'earliestStartTs' => null,
      'latestEndTs' => null,
      'longestSessionHours' => 2.0,
      'trendLookback' => 1,
      'maxPerCal' => 2000,
      'maxTotal' => 5000,
      'colorsById' => ['cal-1' => '#112233'],
      'weekStart' => 1,
      'analysisTo' => new \DateTimeImmutable('2024-01-03 12:00:00', new \DateTimeZone('UTC')),
      'currentPeriodClipped' => true,
      'currentCutoff' => '2024-01-03T12:00:00+00:00',
      'todayActualHours' => 2.0,
      'todayFutureHours' => 1.5,
    ];

    $result = $stats->build($context);

    $this->assertSame(4.0, $result['total_hours']);
    $this->assertSame(1.5, $result['future_hours']);
    $this->assertSame(4.0, $result['delta']['total_hours']);
    $this->assertSame('#2563eb', $result['balance_overview']['categories'][0]['color']);
    $this->assertNotEmpty($result['day_off_trend']);
  }
}

final class StatsCalendarAccess extends CalendarAccessService {
  /** @var array<int, array{0:\DateTimeImmutable,1:\DateTimeImmutable}> */
  private array $bounds;

  public function __construct(array $bounds) {
    parent::__construct(
      new class implements IManager {},
      new class implements IConfig {
        public function getAppValue(string $appName, string $key, string $default = ''): string { return $default; }
        public function getUserValue(string $userId, string $appName, string $key, string $default = ''): string { return $default; }
        public function setUserValue(string $userId, string $appName, string $key, string $value): void {}
      },
      new class implements LoggerInterface {
        public function emergency($message, array $context = []): void {}
        public function alert($message, array $context = []): void {}
        public function critical($message, array $context = []): void {}
        public function error($message, array $context = []): void {}
        public function warning($message, array $context = []): void {}
        public function notice($message, array $context = []): void {}
        public function info($message, array $context = []): void {}
        public function debug($message, array $context = []): void {}
        public function log($level, $message, array $context = []): void {}
      },
    );
    $this->bounds = $bounds;
  }

  public function rangeBounds(string $range, int $offset, ?\DateTimeZone $tz = null, ?int $weekStart = null): array {
    return $this->bounds[$offset];
  }
}

final class StatsCalendarManager implements IManager {
  public function newQuery(string $principal): object {
    return new class() {
      public function addSearchCalendar(string $calendar): void {}
      public function setTimerangeStart(\DateTimeInterface $from): void {}
      public function setTimerangeEnd(\DateTimeInterface $to): void {}
    };
  }

  public function searchForPrincipal(object $query): array {
    return [[]];
  }
}

final class EmptyStatsCalendarParsingService extends CalendarParsingService {
  public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
    return [];
  }
}

final class StatsCalendarStub {
  public function __construct(private string $uri) {}
  public function getUri(): string { return $this->uri; }
  public function getDisplayName(): string { return $this->uri; }
}
