<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\ICacheFactory;

/**
 * Simple per-user rate limiter for the expensive /loadData endpoint.
 *
 * Uses the distributed cache (Redis/APCu via ICacheFactory) so the limit
 * applies across multiple PHP-FPM workers. Falls open on cache misses so
 * a cold cache never blocks legitimate requests.
 */
final class LoadRateLimiter {
    private const CACHE_NAMESPACE = 'opsdash_ratelimit';
    private const DEFAULT_MIN_INTERVAL_SECONDS = 2;
    private const DEFAULT_BURST_MAX = 5;
    private const DEFAULT_BURST_WINDOW_SECONDS = 10;

    public function __construct(
        private ICacheFactory $cacheFactory,
    ) {}

    /**
     * Returns true if the request should be allowed through, false if it should be throttled.
     *
     * Uses a two-layer check:
     *   1. Minimum interval between any two requests (stops hammering).
     *   2. Burst window: at most MAX_BURST requests per BURST_WINDOW seconds.
     */
    public function allow(string $uid): bool {
        if (!$this->cacheFactory->isAvailable()) {
            return true;
        }

        try {
            $cache = $this->cacheFactory->createDistributed(self::CACHE_NAMESPACE);
            $now = time();

            // --- min-interval check ---
            $intervalKey = 'last_' . $uid;
            $lastSeen = $cache->get($intervalKey);
            if ($lastSeen !== null && ($now - (int)$lastSeen) < self::DEFAULT_MIN_INTERVAL_SECONDS) {
                return false;
            }
            $cache->set($intervalKey, $now, self::DEFAULT_BURST_WINDOW_SECONDS * 2);

            // --- burst check ---
            $burstKey = 'burst_' . $uid . '_' . (int)floor($now / self::DEFAULT_BURST_WINDOW_SECONDS);
            $count = (int)($cache->get($burstKey) ?? 0);
            if ($count >= self::DEFAULT_BURST_MAX) {
                return false;
            }
            $cache->set($burstKey, $count + 1, self::DEFAULT_BURST_WINDOW_SECONDS * 2);

            return true;
        } catch (\Throwable) {
            // Fail open: if cache is broken, don't block users.
            return true;
        }
    }
}
