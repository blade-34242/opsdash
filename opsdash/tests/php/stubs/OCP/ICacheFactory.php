<?php

declare(strict_types=1);

namespace OCP;

interface ICacheFactory {
	public function isAvailable(): bool;
	public function isLocalCacheAvailable(): bool;
	public function createLocal(string $prefix = ''): ICache;
	public function createDistributed(string $prefix = ''): ICache;
	public function createInMemory(int $capacity = 512): ICache;
}
