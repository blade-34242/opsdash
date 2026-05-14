<?php

declare(strict_types=1);

namespace OCP;

interface IURLGenerator {
	public function linkToRouteAbsolute(string $route, array $params = []): string;
}
