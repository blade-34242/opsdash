<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\OverviewController;
use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\CalendarColorService;
use OCA\Opsdash\Service\CalendarParsingService;
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
use OCA\Opsdash\Service\LoadRateLimiter;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserConfigService;
use OCA\Opsdash\Service\ViteAssetsService;
use OCP\AppFramework\Http;
use OCP\Calendar\IManager;
use OCP\ICacheFactory;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use OCA\Opsdash\Service\DashboardDefaultsService;

class OverviewControllerTest extends TestCase {
  private OverviewController $controller;
  private OverviewLoadService $loadService;
  private OverviewLoadCacheService $cacheService;
  private IConfig $config;
  private IRequest $request;
  private IUserSession $userSession;
  private string|int|null $previousRequestMethod;
  private string|int|null $previousQueryString;

  protected function setUp(): void {
    parent::setUp();

    $this->previousRequestMethod = $_SERVER['REQUEST_METHOD'] ?? null;
    $this->previousQueryString = $_SERVER['QUERY_STRING'] ?? null;

    $request = $this->createMock(IRequest::class);
    $calendarManager = $this->createMock(IManager::class);
    $logger = $this->createMock(LoggerInterface::class);
    $userSession = $this->createMock(IUserSession::class);
    $this->config = $this->createMock(IConfig::class);
    $cacheFactory = $this->createMock(ICacheFactory::class);

    $this->request = $request;
    $this->userSession = $userSession;

    $viteAssetsService = new ViteAssetsService();
    $calendarAccess = new CalendarAccessService($calendarManager, $this->config, $logger);
    $calendarParsing = new CalendarParsingService();
    $calendarColors = new CalendarColorService();
    $sanitizer = new PersistSanitizer();
    $userConfigService = new UserConfigService($this->config, $sanitizer, $logger);
    $selection = new OverviewSelectionService();
    $collector = new OverviewEventsCollector($calendarManager, $calendarParsing, $logger);
    $history = new OverviewHistoryService($calendarAccess, $collector);
    $aggregation = new OverviewAggregationService();
    $chartsBuilder = new OverviewChartsBuilder();
    $balanceService = new OverviewBalanceService();
    $kpiService = new OverviewStatsKpiService();
    $deltaService = new OverviewStatsDeltaService($calendarAccess, $history, $collector, $aggregation);
    $trendService = new OverviewStatsTrendService($history);
    $historyService = new OverviewStatsHistoryService($deltaService, $trendService);
    $statsService = new OverviewStatsService($kpiService, $historyService, $balanceService);
    $dataService = new OverviewDataService(
      $collector,
      $aggregation,
      $chartsBuilder,
      $statsService,
      $calendarAccess,
    );
    $includeResolver = new OverviewIncludeResolver();
    $coreComposer = new OverviewCorePayloadComposer();
    $cacheService = new OverviewLoadCacheService(
      $cacheFactory,
      $this->config,
      $userConfigService,
      $includeResolver,
      $logger,
    );
    $this->cacheService = $cacheService;

    $contextService = new OverviewLoadContextService(
      $calendarAccess,
      $calendarColors,
      $sanitizer,
      $userConfigService,
      $selection,
      $includeResolver,
      new DashboardDefaultsService(),
      $this->config,
    );
    $responseComposer = new OverviewLoadResponseComposer($coreComposer);

    $this->loadService = new OverviewLoadService(
      $logger,
      $dataService,
      $cacheService,
      $contextService,
      $responseComposer,
    );

    $dashboardDefaultsService = new DashboardDefaultsService();
    $rateLimiter = new LoadRateLimiter($cacheFactory);
    $this->controller = new OverviewController(
      'opsdash',
      $request,
      $logger,
      $userSession,
      $this->config,
      $viteAssetsService,
      $userConfigService,
      $this->loadService,
      $includeResolver,
      $dashboardDefaultsService,
      $rateLimiter,
    );
  }

  protected function tearDown(): void {
    if ($this->previousRequestMethod === null) {
      unset($_SERVER['REQUEST_METHOD']);
    } else {
      $_SERVER['REQUEST_METHOD'] = $this->previousRequestMethod;
    }
    if ($this->previousQueryString === null) {
      unset($_SERVER['QUERY_STRING']);
    } else {
      $_SERVER['QUERY_STRING'] = $this->previousQueryString;
    }
    parent::tearDown();
  }

  public function testCacheEnabledHonorsAppConfig(): void {
    $prevEnv = getenv('OPSDASH_CACHE_ENABLED');
    putenv('OPSDASH_CACHE_ENABLED');

    try {
      $this->config
        ->method('getAppValue')
        ->with('opsdash', 'cache_enabled', '1')
        ->willReturn('0');

    $this->assertFalse($this->cacheService->isCacheEnabled('opsdash'));
    } finally {
      if ($prevEnv === false) {
        putenv('OPSDASH_CACHE_ENABLED');
      } else {
        putenv('OPSDASH_CACHE_ENABLED=' . $prevEnv);
      }
    }
  }

  public function testCacheKeyChangesWhenConfigChanges(): void {
    $method = new \ReflectionMethod(OverviewLoadCacheService::class, 'buildLoadCacheKey');
    $method->setAccessible(true);

    $baseArgs = [
      'data',
      'admin',
      'week',
      0,
      ['cal-1'],
      ['cal-1' => 0],
      ['cal-1' => 10],
      ['cal-1' => 40],
      ['totalHours' => 40],
      ['enabled' => false],
      ['enabled' => true],
      [],
      'UTC',
      'en',
      1,
    ];

    $keyA = $method->invoke($this->cacheService, ...$baseArgs);
    $changed = $baseArgs;
    $changed[8] = ['totalHours' => 45];
    $keyB = $method->invoke($this->cacheService, ...$changed);

    $this->assertNotSame($keyA, $keyB);
  }

  public function testWeekOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/load-week-offset2.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('week', $fixture['meta']['range']);
    $this->assertSame(2, $fixture['meta']['offset']);
    $this->assertArrayNotHasKey('uid', $fixture['meta']);
    $this->assertIsArray($fixture['selected']);
    $this->assertNotEmpty($fixture['selected']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['from']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['to']);
    $this->assertArrayHasKey('targets', $fixture);
  }

  public function testMonthOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/load-month-offset1.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('month', $fixture['meta']['range']);
    $this->assertSame(1, $fixture['meta']['offset']);
    $this->assertArrayNotHasKey('uid', $fixture['meta']);
    $this->assertIsArray($fixture['selected']);
    $this->assertNotEmpty($fixture['selected']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['from']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['to']);
    $this->assertArrayHasKey('targets', $fixture);
  }

  public function testQaMonthFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/load-month-qa.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('month', $fixture['meta']['range']);
    $this->assertArrayNotHasKey('uid', $fixture['meta']);
    $this->assertArrayHasKey('colors', $fixture);
    $this->assertArrayHasKey('byDay', $fixture);
  }

  public function testQaWeekFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/load-week-qa.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('week', $fixture['meta']['range']);
    $this->assertArrayNotHasKey('uid', $fixture['meta']);
    $this->assertSame(['opsdash-focus'], $fixture['selected']);
    $this->assertArrayHasKey('colors', $fixture);
  }

  public function testPersistResponseFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/persist-response.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertSame(['personal', 'opsdash-focus'], $fixture['saved']);
    $this->assertSame('dark', $fixture['theme_preference_read']);
    $this->assertArrayHasKey('targets_config_read', $fixture);
    $this->assertArrayHasKey('balance', $fixture['targets_config_read']);
    $this->assertArrayHasKey('ui', $fixture['targets_config_read']['balance']);
    $this->assertArrayHasKey('showNotes', $fixture['targets_config_read']['balance']['ui']);
  }

  public function testPersistWeekOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/persist-week-offset1.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertSame(['personal'], $fixture['saved']);
    $this->assertArrayHasKey('targets_week_read', $fixture);
    $this->assertArrayHasKey('groups_read', $fixture);
  }

  public function testPersistReportingDeckFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/persist-reporting-deck.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertArrayHasKey('reporting_config_read', $fixture);
    $this->assertArrayHasKey('modes', $fixture['reporting_config_read']);
    $this->assertArrayHasKey('week', $fixture['reporting_config_read']['modes']);
    $this->assertArrayHasKey('month', $fixture['reporting_config_read']['modes']);
    $this->assertSame('mid', $fixture['reporting_config_read']['modes']['week']['cadence']);
    $this->assertSame('1d', $fixture['reporting_config_read']['modes']['week']['reminderLead']);
    $this->assertArrayHasKey('deck_settings_read', $fixture);
    $this->assertSame('mine', $fixture['deck_settings_read']['defaultFilter']);
    $this->assertSame([42], $fixture['deck_settings_read']['hiddenBoards']);
    $this->assertSame('assignee', $fixture['deck_settings_read']['mineMode']);
    $this->assertTrue($fixture['deck_settings_read']['solvedIncludesArchived']);
    $this->assertArrayHasKey('ticker', $fixture['deck_settings_read']);
  }

  public function testNotesFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/notes-week.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertArrayHasKey('current', $fixture['notes']);
    $this->assertArrayHasKey('previous', $fixture['notes']);
  }

  public function testNotesQaFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/notes-month-qa.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('month', $fixture['range']);
    $this->assertSame('qa', $fixture['user']);
    $this->assertArrayHasKey('current', $fixture['notes']);
    $this->assertArrayHasKey('previous', $fixture['notes']);
  }

  public function testLoadRejectsOversizedQueryString(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $_SERVER['QUERY_STRING'] = str_repeat('a', 4097);
    $this->request->method('getParam')->willReturnMap([
      ['range', 'week', 'week'],
      ['offset', 0, 0],
      ['cals', null, null],
      ['calsCsv', null, null],
      ['include', [], ['core']],
      ['debug', false, false],
      ['onboarding', null, null],
    ]);

    $response = $this->controller->load();
    $this->assertSame(Http::STATUS_REQUEST_URI_TOO_LONG, $response->getStatus());
    $this->assertSame(['message' => 'query too large'], $response->getData());
  }

  public function testLoadRejectsDataIncludeInGet(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $_SERVER['QUERY_STRING'] = 'include=stats';
    $this->request->method('getParam')->willReturnMap([
      ['range', 'week', 'week'],
      ['offset', 0, 0],
      ['cals', null, null],
      ['calsCsv', null, null],
      ['include', [], ['stats']],
      ['debug', false, false],
      ['onboarding', null, null],
    ]);

    $response = $this->controller->load();
    $this->assertSame(Http::STATUS_METHOD_NOT_ALLOWED, $response->getStatus());
    $this->assertSame(['message' => 'use POST to load data'], $response->getData());
  }

  public function testLoadRejectsUnauthorizedUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->load();
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
    $this->assertSame(['message' => 'unauthorized'], $response->getData());
  }

  public function testLoadDataRejectsUnauthorizedUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->loadData();
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
    $this->assertSame(['message' => 'unauthorized'], $response->getData());
  }

  public function testLoadDataRejectsInvalidRequestToken(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(false);
    $_SERVER['REQUEST_METHOD'] = 'POST';

    $response = $this->controller->loadData();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'invalid requesttoken'], $response->getData());
  }

  public function testLoadDataRejectsInvalidJson(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $_SERVER['REQUEST_METHOD'] = 'POST';

    OverviewControllerInputStream::setInput('not-json');
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', OverviewControllerInputStream::class);

    try {
      $response = $this->controller->loadData();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_BAD_REQUEST, $response->getStatus());
    $this->assertSame(['message' => 'invalid json'], $response->getData());
  }

  public function testLoadDataRejectsOversizedPayload(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $_SERVER['REQUEST_METHOD'] = 'POST';

    $payload = json_encode(['blob' => str_repeat('x', 270000)]);
    OverviewControllerInputStream::setInput($payload ?: '');
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', OverviewControllerInputStream::class);

    try {
      $response = $this->controller->loadData();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_REQUEST_ENTITY_TOO_LARGE, $response->getStatus());
    $this->assertSame(['message' => 'payload too large'], $response->getData());
  }

  public function testLoadDataRejectsMissingRequestToken(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $_SERVER['REQUEST_METHOD'] = 'POST';
    $this->request->method('getParam')->willReturnMap([
      ['requesttoken', '', ''],
    ]);

    $response = $this->controller->loadData();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'missing requesttoken'], $response->getData());
  }

  public function testLoadDataRejectsNonPostMethod(): void {
    $user = $this->createMock(\OCP\IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $_SERVER['REQUEST_METHOD'] = 'GET';

    $response = $this->controller->loadData();
    $this->assertSame(Http::STATUS_METHOD_NOT_ALLOWED, $response->getStatus());
    $this->assertSame(['message' => 'method not allowed'], $response->getData());
  }
}

final class OverviewControllerInputStream {
  public $context;

  private int $index = 0;
  private static string $input = '';

  public static function setInput(string $input): void {
    self::$input = $input;
  }

  public function stream_open(string $path, string $mode, int $options, ?string &$openedPath): bool {
    $this->index = 0;
    return true;
  }

  public function stream_read(int $count): string {
    $chunk = substr(self::$input, $this->index, $count);
    $this->index += strlen($chunk);
    return $chunk;
  }

  public function stream_eof(): bool {
    return $this->index >= strlen(self::$input);
  }

  public function stream_stat(): array {
    return [];
  }
}
