<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\OverviewIncludeResolver;
use OCA\Opsdash\Service\OverviewLoadCacheService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserConfigService;
use OCP\ICache;
use OCP\ICacheFactory;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class OverviewLoadCacheServiceTest extends TestCase {
  private string|false $prevEnabled;
  private string|false $prevTtl;

  protected function setUp(): void {
    parent::setUp();
    $this->prevEnabled = getenv('OPSDASH_CACHE_ENABLED');
    $this->prevTtl = getenv('OPSDASH_CACHE_TTL');
  }

  protected function tearDown(): void {
    if ($this->prevEnabled === false) {
      putenv('OPSDASH_CACHE_ENABLED');
    } else {
      putenv('OPSDASH_CACHE_ENABLED=' . $this->prevEnabled);
    }
    if ($this->prevTtl === false) {
      putenv('OPSDASH_CACHE_TTL');
    } else {
      putenv('OPSDASH_CACHE_TTL=' . $this->prevTtl);
    }
    parent::tearDown();
  }

  public function testIsCacheEnabledUsesEnv(): void {
    putenv('OPSDASH_CACHE_ENABLED=0');

    $service = $this->buildService('1');
    $this->assertFalse($service->isCacheEnabled('opsdash'));
  }

  public function testCacheTtlReadsEnvAndClamps(): void {
    putenv('OPSDASH_CACHE_TTL=-5');
    $service = $this->buildService('60');
    $this->assertSame(0, $service->cacheTtl('opsdash'));

    putenv('OPSDASH_CACHE_TTL=15');
    $this->assertSame(15, $service->cacheTtl('opsdash'));
  }

  public function testCoreCacheTtlIsMinOfCoreAndConfig(): void {
    putenv('OPSDASH_CACHE_TTL=60');
    $service = $this->buildService('60');
    $this->assertSame(30, $service->coreCacheTtl('opsdash'));
  }

  public function testWriteAndReadCoreCache(): void {
    putenv('OPSDASH_CACHE_TTL=10');
    $service = $this->buildService('10');
    $includes = ['calendars' => true];
    $payload = ['calendars' => [['id' => 'cal-1']]];

    $storedAt = $service->writeCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1, $payload);
    $this->assertIsInt($storedAt);

    $cached = $service->readCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1);
    $this->assertNotNull($cached);
    $this->assertSame($payload, $cached['payload']);
    $this->assertSame($storedAt, $cached['storedAt']);
  }

  public function testCoreCacheVersionBumpInvalidatesPreviousCoreEntry(): void {
    putenv('OPSDASH_CACHE_TTL=10');
    $service = $this->buildService('10');
    $includes = ['calendars' => true];
    $payload = ['calendars' => [['id' => 'cal-1']]];

    $service->writeCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1, $payload);
    $this->assertNotNull($service->readCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1));

    $service->bumpUserCoreCacheVersion('opsdash', 'admin');
    $this->assertNull($service->readCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1));

    $service->writeCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1, $payload);
    $this->assertNotNull($service->readCoreCache('opsdash', 'admin', $includes, 'UTC', 'en', 1));
  }

  public function testWriteAndReadDataCache(): void {
    putenv('OPSDASH_CACHE_TTL=10');
    $service = $this->buildService('10');
    $payload = ['byDay' => []];
    $meta = ['truncated' => false];

    $storedAt = $service->writeDataCache(
      'opsdash',
      'admin',
      'week',
      0,
      ['cal-1'],
      ['cal-1' => 0],
      ['cal-1' => 12],
      ['cal-1' => 48],
      ['totalHours' => 48],
      ['enabled' => false],
      ['enabled' => true],
      ['stats' => true],
      'UTC',
      'en',
      1,
      $payload,
      $meta,
    );
    $this->assertIsInt($storedAt);

    $cached = $service->readDataCache(
      'opsdash',
      'admin',
      'week',
      0,
      ['cal-1'],
      ['cal-1' => 0],
      ['cal-1' => 12],
      ['cal-1' => 48],
      ['totalHours' => 48],
      ['enabled' => false],
      ['enabled' => true],
      ['stats' => true],
      'UTC',
      'en',
      1,
    );
    $this->assertNotNull($cached);
    $this->assertSame($payload, $cached['payload']);
    $this->assertSame($meta, $cached['meta']);
  }

  public function testDataCacheDoesNotReuseNormalDataForLookbackRequests(): void {
    putenv('OPSDASH_CACHE_TTL=10');
    $service = $this->buildService('10');
    $baseIncludes = ['data' => true, 'stats' => true, 'byCal' => true, 'byDay' => true, 'longest' => true, 'charts' => true];
    $lookbackIncludes = [...$baseIncludes, 'lookback' => true];

    $service->writeDataCache(
      'opsdash', 'admin', 'week', 0, ['cal-1'], ['cal-1' => 0], ['cal-1' => 12], ['cal-1' => 48],
      ['totalHours' => 48], ['enabled' => false], ['enabled' => true], $baseIncludes, 'UTC', 'en', 1,
      ['charts' => ['perDaySeries' => []]], ['truncated' => false],
    );

    $this->assertNull($service->readDataCache(
      'opsdash', 'admin', 'week', 0, ['cal-1'], ['cal-1' => 0], ['cal-1' => 12], ['cal-1' => 48],
      ['totalHours' => 48], ['enabled' => false], ['enabled' => true], $lookbackIncludes, 'UTC', 'en', 1,
    ));
  }

  private function buildService(string $cacheEnabledValue): OverviewLoadCacheService {
    $cache = new FakeCache();
    $factory = new FakeCacheFactory($cache);

    $config = new CacheConfigStub($cacheEnabledValue);
    $logger = $this->createMock(LoggerInterface::class);
    $userConfig = new UserConfigService($config, new PersistSanitizer(), $logger);

    return new OverviewLoadCacheService(
      $factory,
      $config,
      $userConfig,
      new OverviewIncludeResolver(),
      $logger,
    );
  }
}

final class FakeCache implements ICache {
  /** @var array<string,mixed> */
  private array $store = [];

  public function get(string $key) {
    return $this->store[$key] ?? null;
  }

  public function set(string $key, $value, int $ttl = 0): bool {
    $this->store[$key] = $value;
    return true;
  }

  public function hasKey(string $key): bool {
    return array_key_exists($key, $this->store);
  }
}

final class FakeCacheFactory implements ICacheFactory {
  public function __construct(private ICache $cache) {}

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

final class CacheConfigStub implements IConfig {
  /** @var array<string,string> */
  private array $userValues = [];

  public function __construct(private string $cacheEnabled) {}

  public function getAppValue(string $appName, string $key, string $default = ''): string {
    if ($key === 'cache_enabled') {
      return $this->cacheEnabled;
    }
    return $default;
  }

  public function getUserValue(string $userId, string $appName, string $key, string $default = ''): string {
    $idx = $userId . ':' . $appName . ':' . $key;
    return $this->userValues[$idx] ?? $default;
  }

  public function setUserValue(string $userId, string $appName, string $key, string $value): void {
    $idx = $userId . ':' . $appName . ':' . $key;
    $this->userValues[$idx] = $value;
  }

  public function getSystemValue(string $key, $default = null): mixed {
    if ($key === 'loglevel') {
      return 2;
    }
    return $default;
  }
}
