<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\CalendarColorService;
use OCA\Opsdash\Service\CalendarParsingService;
use OCA\Opsdash\Service\DashboardDefaultsService;
use OCA\Opsdash\Service\OverviewAggregationService;
use OCA\Opsdash\Service\OverviewBalanceService;
use OCA\Opsdash\Service\OverviewChartsBuilder;
use OCA\Opsdash\Service\OverviewCorePayloadComposer;
use OCA\Opsdash\Service\OverviewDataService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCA\Opsdash\Service\OverviewIncludeResolver;
use OCA\Opsdash\Service\OverviewLoadCacheService;
use OCA\Opsdash\Service\OverviewLoadContextService;
use OCA\Opsdash\Service\OverviewLoadResponseComposer;
use OCA\Opsdash\Service\OverviewLoadService;
use OCA\Opsdash\Service\OverviewSelectionService;
use OCA\Opsdash\Service\OverviewStatsDeltaService;
use OCA\Opsdash\Service\OverviewStatsKpiService;
use OCA\Opsdash\Service\OverviewStatsHistoryService;
use OCA\Opsdash\Service\OverviewStatsService;
use OCA\Opsdash\Service\OverviewStatsTrendService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserConfigService;
use OCP\Calendar\IManager;
use OCP\ICache;
use OCP\ICacheFactory;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class OverviewLoadServiceTest extends TestCase {
  private string|false $prevEnabled;

  protected function setUp(): void {
    parent::setUp();
    $this->prevEnabled = getenv('OPSDASH_CACHE_ENABLED');
    putenv('OPSDASH_CACHE_ENABLED=0');
  }

  protected function tearDown(): void {
    if ($this->prevEnabled === false) {
      putenv('OPSDASH_CACHE_ENABLED');
    } else {
      putenv('OPSDASH_CACHE_ENABLED=' . $this->prevEnabled);
    }
    parent::tearDown();
  }

  public function testLoadReturnsCorePayloadWhenDataNotRequested(): void {
    $config = new LoadConfigStub();
    $calendarAccess = new LoadCalendarAccess([
      new LoadCalendarStub('cal-1', 'Personal', '#abc'),
      new LoadCalendarStub('cal-2', 'Work', '#112233'),
    ]);

    $persistSanitizer = new PersistSanitizer();
    $userConfig = new UserConfigService($config, $persistSanitizer, $this->createMock(LoggerInterface::class));
    $includeResolver = new OverviewIncludeResolver();
    $cacheService = new OverviewLoadCacheService(
      new LoadCacheFactory(),
      $config,
      $userConfig,
      $includeResolver,
      $this->createMock(LoggerInterface::class),
    );

    $dataService = $this->buildDataService($calendarAccess, $config);
    $contextService = new OverviewLoadContextService(
      $calendarAccess,
      new CalendarColorService(),
      $persistSanitizer,
      $userConfig,
      new OverviewSelectionService(),
      $includeResolver,
      new DashboardDefaultsService(),
      $config,
    );
    $responseComposer = new OverviewLoadResponseComposer(new OverviewCorePayloadComposer());
    $loadService = new OverviewLoadService(
      $this->createMock(LoggerInterface::class),
      $dataService,
      $cacheService,
      $contextService,
      $responseComposer,
    );

    $payload = $loadService->load('opsdash', 'admin', [
      'range' => 'week',
      'offset' => 0,
      'provided' => false,
      'cals' => null,
      'debug' => false,
      'forceReset' => false,
      'include' => ['core'],
    ]);

    $this->assertTrue($payload['ok']);
    $this->assertSame('week', $payload['meta']['range']);
    $this->assertSame(['cal-1', 'cal-2'], $payload['selected']);
    $this->assertSame('UTC', $payload['userSettings']['timezone']);
    $this->assertArrayHasKey('calendars', $payload);
    $this->assertArrayHasKey('colors', $payload);
    $this->assertArrayNotHasKey('byDay', $payload);
  }

  public function testLoadReturnsDebugDisabledWhenRequestedWithoutDebugMode(): void {
    $config = new LoadConfigStub();
    $calendarAccess = new LoadCalendarAccess([
      new LoadCalendarStub('cal-1', 'Personal', '#abc'),
    ]);
    $persistSanitizer = new PersistSanitizer();
    $userConfig = new UserConfigService($config, $persistSanitizer, $this->createMock(LoggerInterface::class));
    $includeResolver = new OverviewIncludeResolver();
    $cacheService = new OverviewLoadCacheService(
      new LoadCacheFactory(),
      $config,
      $userConfig,
      $includeResolver,
      $this->createMock(LoggerInterface::class),
    );

    $dataService = $this->buildDataService($calendarAccess, $config);
    $contextService = new OverviewLoadContextService(
      $calendarAccess,
      new CalendarColorService(),
      $persistSanitizer,
      $userConfig,
      new OverviewSelectionService(),
      $includeResolver,
      new DashboardDefaultsService(),
      $config,
    );
    $responseComposer = new OverviewLoadResponseComposer(new OverviewCorePayloadComposer());
    $loadService = new OverviewLoadService(
      $this->createMock(LoggerInterface::class),
      $dataService,
      $cacheService,
      $contextService,
      $responseComposer,
    );

    $payload = $loadService->load('opsdash', 'admin', [
      'range' => 'week',
      'offset' => 0,
      'provided' => false,
      'cals' => null,
      'debug' => true,
      'forceReset' => false,
      'include' => ['debug'],
    ]);

    $this->assertSame(['enabled' => false], $payload['debug']);
  }

  private function buildDataService(CalendarAccessService $calendarAccess, IConfig $config): OverviewDataService {
    $calendarParsing = new CalendarParsingService();
    $manager = new class implements IManager {};
    $collector = new OverviewEventsCollector($manager, $calendarParsing, $this->createMock(LoggerInterface::class));
    $history = new OverviewHistoryService($calendarAccess, $collector);
    $aggregation = new OverviewAggregationService();
    $historyService = new OverviewStatsHistoryService(
      new OverviewStatsDeltaService($calendarAccess, $history, $collector, $aggregation),
      new OverviewStatsTrendService($history),
    );
    $statsService = new OverviewStatsService(
      new OverviewStatsKpiService(),
      $historyService,
      new OverviewBalanceService(),
    );
    return new OverviewDataService(
      $collector,
      $aggregation,
      new OverviewChartsBuilder(),
      $statsService,
      $calendarAccess,
    );
  }
}

final class LoadCalendarAccess extends CalendarAccessService {
  /** @var array<int, object> */
  private array $calendars;

  public function __construct(array $calendars) {
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
    $this->calendars = $calendars;
  }

  public function getCalendarsFor(string $uid): array {
    return $this->calendars;
  }

  public function resolveUserTimezone(string $uid): \DateTimeZone {
    return new \DateTimeZone('UTC');
  }

  public function resolveUserWeekStart(string $uid): int {
    return 1;
  }

  public function rangeBounds(string $range, int $offset, ?\DateTimeZone $tz = null, ?int $weekStart = null): array {
    return [
      new \DateTimeImmutable('2024-01-01 00:00:00', new \DateTimeZone('UTC')),
      new \DateTimeImmutable('2024-01-07 23:59:59', new \DateTimeZone('UTC')),
    ];
  }
}

final class LoadCalendarStub {
  public function __construct(
    private string $uri,
    private string $displayName,
    private string $displayColor,
  ) {}

  public function getUri(): string { return $this->uri; }
  public function getDisplayName(): string { return $this->displayName; }
  public function getDisplayColor(): string { return $this->displayColor; }
}

final class LoadConfigStub implements IConfig {
  public function getAppValue(string $appName, string $key, string $default = ''): string { return $default; }
  public function getUserValue(string $userId, string $appName, string $key, string $default = ''): string {
    if ($key === 'selected_cals') {
      return '__UNSET__';
    }
    return $default;
  }
  public function setUserValue(string $userId, string $appName, string $key, string $value): void {}
  public function getSystemValue(string $key, $default = null): mixed {
    if ($key === 'loglevel') {
      return 2;
    }
    return $default;
  }
}

final class LoadCacheFactory implements ICacheFactory {
  private ICache $cache;

  public function __construct() {
    $this->cache = new class implements ICache {
      private array $store = [];
      public function get(string $key) { return $this->store[$key] ?? null; }
      public function set(string $key, $value, int $ttl = 0): bool { $this->store[$key] = $value; return true; }
      public function hasKey(string $key): bool { return array_key_exists($key, $this->store); }
    };
  }

  public function isAvailable(): bool { return true; }
  public function isLocalCacheAvailable(): bool { return true; }

  public function createLocal(string $prefix = ''): ICache {
    return $this->cache;
  }

  public function createDistributed(string $prefix = ''): ICache {
    return $this->cache;
  }

  public function createInMemory(int $capacity = 512): ICache {
    return $this->cache;
  }
}
