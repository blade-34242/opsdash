<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\LoadRateLimiter;
use OCP\ICacheFactory;
use OCP\ICache;
use PHPUnit\Framework\TestCase;

final class LoadRateLimiterTest extends TestCase {
    private function makeCache(bool $available, array &$store = []): ICacheFactory {
        $cache = $this->createMock(ICache::class);

        $cache->method('get')->willReturnCallback(function (string $key) use (&$store) {
            return $store[$key] ?? null;
        });
        $cache->method('set')->willReturnCallback(function (string $key, $value) use (&$store): bool {
            $store[$key] = $value;
            return true;
        });

        $factory = $this->createMock(ICacheFactory::class);
        $factory->method('isAvailable')->willReturn($available);
        $factory->method('createDistributed')->willReturn($cache);

        return $factory;
    }

    public function testAllowsFirstRequest(): void {
        $factory = $this->makeCache(true);
        $limiter = new LoadRateLimiter($factory);
        $this->assertTrue($limiter->allow('user1'));
    }

    public function testBlocksImmediateRepeat(): void {
        $store = [];
        $factory = $this->makeCache(true, $store);
        $limiter = new LoadRateLimiter($factory);

        $this->assertTrue($limiter->allow('user1'));
        $this->assertFalse($limiter->allow('user1'), 'Second immediate request should be throttled');
    }

    public function testUsersAreIsolated(): void {
        $store = [];
        $factory = $this->makeCache(true, $store);
        $limiter = new LoadRateLimiter($factory);

        $this->assertTrue($limiter->allow('user1'));
        $this->assertTrue($limiter->allow('user2'), 'Different user should not be throttled');
    }

    public function testFailsOpenWhenCacheUnavailable(): void {
        $factory = $this->makeCache(false);
        $limiter = new LoadRateLimiter($factory);

        $this->assertTrue($limiter->allow('user1'));
        $this->assertTrue($limiter->allow('user1'), 'Should always allow when cache unavailable');
    }

    public function testBurstLimitBlocks(): void {
        $store = [];
        $factory = $this->createMock(ICacheFactory::class);
        $factory->method('isAvailable')->willReturn(true);

        $cache = $this->createMock(ICache::class);
        $factory->method('createDistributed')->willReturn($cache);

        // Simulate: min-interval never blocks (last seen is long ago), but burst count is maxed.
        $cache->method('get')->willReturnCallback(function (string $key) use (&$store) {
            if (str_starts_with($key, 'last_')) {
                return time() - 10; // old enough to pass min-interval
            }
            if (str_starts_with($key, 'burst_')) {
                return 5; // at the limit
            }
            return null;
        });
        $cache->method('set')->willReturn(true);

        $limiter = new LoadRateLimiter($factory);
        $this->assertFalse($limiter->allow('user1'), 'Should block when burst counter is at max');
    }

    public function testFailsOpenOnCacheException(): void {
        $factory = $this->createMock(ICacheFactory::class);
        $factory->method('isAvailable')->willReturn(true);
        $factory->method('createDistributed')->willThrowException(new \RuntimeException('cache down'));

        $limiter = new LoadRateLimiter($factory);
        $this->assertTrue($limiter->allow('user1'), 'Should fail open on cache error');
    }
}
