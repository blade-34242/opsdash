<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use DateTimeImmutable;
use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\CalendarParsingService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCP\Calendar\IManager;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class OverviewHistoryServiceTest extends TestCase {
  public function testBuildDayOffTrendUsesCurrentByDayAndPrecomputedHistory(): void {
    $calendarService = new class() extends CalendarAccessService {
      public function __construct() {}
      public function rangeBounds(string $range, int $offset, ?\DateTimeZone $tz = null, ?int $weekStart = null): array {
        if ($range === 'week' && $offset === -1) {
          return [
            new DateTimeImmutable('2024-12-30T00:00:00Z'),
            new DateTimeImmutable('2025-01-05T23:59:59Z'),
          ];
        }
        return [
          new DateTimeImmutable('2025-01-06T00:00:00Z'),
          new DateTimeImmutable('2025-01-12T23:59:59Z'),
        ];
      }
    };

    $manager = $this->createMock(IManager::class);
    $logger = $this->createMock(LoggerInterface::class);
    $collector = new OverviewEventsCollector($manager, new CalendarParsingService(), $logger);
    $service = new OverviewHistoryService($calendarService, $collector);

    $currentByDay = [
      '2025-01-06' => ['date' => '2025-01-06', 'total_hours' => 1.0],
      '2025-01-07' => ['date' => '2025-01-07', 'total_hours' => 2.0],
    ];

    $trend = $service->buildDayOffTrend(
      range: 'week',
      offset: 0,
      currentFrom: new DateTimeImmutable('2025-01-06T00:00:00Z'),
      currentTo: new DateTimeImmutable('2025-01-12T23:59:59Z'),
      analysisTo: new DateTimeImmutable('2025-01-08T12:00:00Z'),
      currentByDay: $currentByDay,
      includeAll: false,
      selectedIds: ['cal-a'],
      calendars: [],
      principal: 'principals/users/admin',
      userTz: new \DateTimeZone('UTC'),
      lookbackWeeks: 1,
      precomputedDaysWorked: [1 => 3],
    );

    $this->assertCount(2, $trend);
    $this->assertSame(0, $trend[0]['offset']);
    $this->assertSame('This week', $trend[0]['label']);
    $this->assertSame(3, $trend[0]['totalDays']);
    $this->assertSame(2, $trend[0]['daysWorked']);
    $this->assertSame(1, $trend[0]['daysOff']);
    $this->assertSame('2025-01-08', $trend[0]['to']);

    $this->assertSame(1, $trend[1]['offset']);
    $this->assertSame('-1 wk', $trend[1]['label']);
    $this->assertSame(7, $trend[1]['totalDays']);
    $this->assertSame(3, $trend[1]['daysWorked']);
    $this->assertSame(4, $trend[1]['daysOff']);
  }

  public function testCollectCategoryTotalsForRangeRespectsSelection(): void {
    $manager = new class() implements IManager {
      public array $responses = [];
      public function newQuery(string $principal): object {
        return new class() {
          public string $calendar = '';
          public function addSearchCalendar(string $calendar): void { $this->calendar = $calendar; }
          public function setTimerangeStart($from): void {}
          public function setTimerangeEnd($to): void {}
        };
      }
      public function searchForPrincipal(object $q): array {
        return $this->responses[$q->calendar] ?? [];
      }
    };

    $manager->responses = [
      'cal-a' => array_fill(0, 2, ['id' => 1]),
      'cal-b' => array_fill(0, 3, ['id' => 2]),
    ];

    $calendarService = new class() extends CalendarAccessService {
      public function __construct() {}
    };
    $calendarParsing = new class() extends CalendarParsingService {
      public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        return array_map(
          fn ($row) => [
            'calendar' => $calendarName,
            'calendar_id' => $calendarId,
            'hours' => 1.0,
            'allday' => false,
            'start' => '2025-01-01 00:00:00',
          ],
          $raw,
        );
      }
    };

    $logger = $this->createMock(LoggerInterface::class);
    $collector = new OverviewEventsCollector($manager, $calendarParsing, $logger);
    $service = new OverviewHistoryService($calendarService, $collector);

    $calA = new class() {
      public function getUri(): string { return 'cal-a'; }
      public function getDisplayName(): string { return 'A'; }
    };
    $calB = new class() {
      public function getUri(): string { return 'cal-b'; }
      public function getDisplayName(): string { return 'B'; }
    };

    $categoryMeta = [
      'work' => ['id' => 'work', 'label' => 'Work'],
      '__uncategorized__' => ['id' => '__uncategorized__', 'label' => 'Unassigned'],
    ];
    $mapCalToCategory = fn (string $calId) => $calId === 'cal-a' ? 'work' : '__uncategorized__';

    $res = $service->collectCategoryTotalsForRange(
      from: new DateTimeImmutable('2025-01-01T00:00:00Z'),
      to: new DateTimeImmutable('2025-01-08T00:00:00Z'),
      categoryMeta: $categoryMeta,
      calendars: [$calA, $calB],
      includeAll: false,
      selectedIds: ['cal-a'],
      principal: 'principals/users/admin',
      mapCalToCategory: $mapCalToCategory,
      userTz: new \DateTimeZone('UTC'),
      allDayHours: 8.0,
      captureDays: true,
    );

    $this->assertSame(2, $res['events']);
    $this->assertSame(2.0, $res['total']);
    $this->assertSame(2.0, $res['totals']['work']);
    $this->assertSame(0.0, $res['totals']['__uncategorized__']);
    $this->assertSame(['2025-01-01'], $res['daysSeen']);
  }

  public function testCollectCategoryTotalsFallsBackToTimedDurationWhenHoursMissing(): void {
    $manager = new class() implements IManager {
      public function newQuery(string $principal): object {
        return new class() {
          public string $calendar = '';
          public function addSearchCalendar(string $calendar): void { $this->calendar = $calendar; }
          public function setTimerangeStart($from): void {}
          public function setTimerangeEnd($to): void {}
        };
      }
      public function searchForPrincipal(object $q): array {
        return [['id' => 1]];
      }
    };

    $calendarService = new class() extends CalendarAccessService {
      public function __construct() {}
    };
    $calendarParsing = new class() extends CalendarParsingService {
      public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        return [[
          'calendar' => $calendarName,
          'calendar_id' => $calendarId,
          'hours' => 0.0,
          'allday' => false,
          'start' => '2025-01-01T09:00:00Z',
          'end' => '2025-01-01T11:30:00Z',
          'startTz' => 'UTC',
          'endTz' => 'UTC',
        ]];
      }
    };

    $logger = $this->createMock(LoggerInterface::class);
    $collector = new OverviewEventsCollector($manager, $calendarParsing, $logger);
    $service = new OverviewHistoryService($calendarService, $collector);

    $calA = new class() {
      public function getUri(): string { return 'cal-a'; }
      public function getDisplayName(): string { return 'A'; }
    };

    $categoryMeta = [
      'work' => ['id' => 'work', 'label' => 'Work'],
      '__uncategorized__' => ['id' => '__uncategorized__', 'label' => 'Unassigned'],
    ];
    $mapCalToCategory = fn (string $calId) => $calId === 'cal-a' ? 'work' : '__uncategorized__';

    $res = $service->collectCategoryTotalsForRange(
      from: new DateTimeImmutable('2025-01-01T00:00:00Z'),
      to: new DateTimeImmutable('2025-01-08T00:00:00Z'),
      categoryMeta: $categoryMeta,
      calendars: [$calA],
      includeAll: true,
      selectedIds: [],
      principal: 'principals/users/admin',
      mapCalToCategory: $mapCalToCategory,
      userTz: new \DateTimeZone('UTC'),
      allDayHours: 8.0,
      captureDays: false,
    );

    $this->assertSame(1, $res['events']);
    $this->assertSame(2.5, $res['total']);
    $this->assertSame(2.5, $res['totals']['work']);
    $this->assertSame(0.0, $res['totals']['__uncategorized__']);
  }
}
