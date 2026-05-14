<?php

declare(strict_types=1);

namespace Symfony\Component\Console\Attribute;

#[\Attribute(\Attribute::TARGET_CLASS)]
final class AsCommand {
	public function __construct(
		public string $name,
		public string $description = '',
		public bool $hidden = false,
	) {
	}
}
