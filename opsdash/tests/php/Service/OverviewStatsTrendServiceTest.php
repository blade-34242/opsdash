<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\CalendarParsingService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCA\Opsdash\Service\OverviewStatsTrendService;
use OCP\Calendar\IManager;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class OverviewStatsTrendServiceTest extends TestCase {
  public function testBuildReturnsTrendAndHistory(): void {
    $calendarAccess = new TrendCalendarAccess([
      0 => [
        new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC')),
        new \DateTimeImmutable('2024-01-07 23:59:59', new \DateTimeZone('UTC')),
      ],
      -1 => [
        new \DateTimeImmutable('2023-12-25 00:00:00', new \DateTimeZone('UTC')),
        new \DateTimeImmutable('2023-12-31 23:59:59', new \DateTimeZone('UTC')),
      ],
      -2 => [
        new \DateTimeImmutable('2023-12-18 00:00:00', new \DateTimeZone('UTC')),
        new \DateTimeImmutable('2023-12-24 23:59:59', new \DateTimeZone('UTC')),
      ],
    ]);

    $calendarParsing = new EmptyCalendarParsingService();
    $manager = new TrendCalendarManager();
    $collector = new OverviewEventsCollector($manager, $calendarParsing, $this->createMock(LoggerInterface::class));
    $history = new OverviewHistoryService($calendarAccess, $collector);
    $service = new OverviewStatsTrendService($history);

    $result = $service->build([
      'range' => 'week',
      'offset' => 0,
      'from' => new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC')),
      'to' => new \DateTimeImmutable('2024-01-07 23:59:59', new \DateTimeZone('UTC')),
      'currentByDay' => [],
      'includeAll' => true,
      'selectedIds' => [],
      'calendars' => [new TrendCalendarStub('cal-1')],
      'principal' => 'principals/users/admin',
      'userTz' => new \DateTimeZone('UTC'),
      'trendLookback' => 2,
      'weekStart' => 1,
      'precomputedDaysWorked' => [],
      'mapCalToCategory' => fn (string $id): string => 'work',
      'allDayHours' => 8.0,
      'categoryMeta' => ['work' => ['id' => 'work', 'label' => 'Work']],
      'targetsConfig' => [
        'categories' => [
          ['id' => 'work', 'label' => 'Work', 'targetHours' => 0, 'includeWeekend' => false, 'paceMode' => 'days_only', 'groupIds' => []],
        ],
        'balance' => [
          'categories' => ['work'],
          'useCategoryMapping' => true,
          'index' => ['method' => 'simple_range', 'basis' => 'category'],
          'thresholds' => [
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.3,
            'warnBelow' => 0.3,
            'warnIndex' => 0.6,
          ],
          'relations' => ['displayMode' => 'ratio'],
          'trend' => ['lookbackWeeks' => 3],
          'dayparts' => ['enabled' => false],
          'ui' => ['showNotes' => false],
        ],
      ],
      'targetsWeek' => ['work' => 0.0],
      'targetsMonth' => ['work' => 0.0],
      'idToName' => ['cal-1' => 'Calendar 1'],
    ]);

    $this->assertCount(3, $result['dayOffTrend']);
    $this->assertSame(7, $result['dayOffTrend'][0]['totalDays']);
    $this->assertSame(7, $result['dayOffTrend'][0]['daysOff']);
    $this->assertSame(0, $result['dayOffTrend'][0]['daysWorked']);

    $this->assertCount(2, $result['balanceHistory']);
    $this->assertSame(0.0, $result['balanceHistory'][0]['categories'][0]['share']);
  }
}

final class TrendCalendarAccess extends CalendarAccessService {
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

final class TrendCalendarManager implements IManager {
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

final class EmptyCalendarParsingService extends CalendarParsingService {
  public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
    return [];
  }
}

final class TrendCalendarStub {
  public function __construct(private string $uri) {}
  public function getUri(): string { return $this->uri; }
  public function getDisplayName(): string { return $this->uri; }
}
