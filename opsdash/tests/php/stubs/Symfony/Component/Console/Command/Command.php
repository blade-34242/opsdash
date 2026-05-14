<?php

declare(strict_types=1);

namespace Symfony\Component\Console\Command;

abstract class Command {
	public const SUCCESS = 0;
	public const FAILURE = 1;

	protected static $defaultName;

	public function __construct() {
	}

	protected function setDescription(string $description): self {
		return $this;
	}

	protected function addOption(string $name, ?string $shortcut = null, $mode = null, string $description = '', $default = null): self {
		return $this;
	}
}
