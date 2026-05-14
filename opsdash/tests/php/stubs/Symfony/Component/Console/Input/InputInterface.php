<?php

declare(strict_types=1);

namespace Symfony\Component\Console\Input;

interface InputInterface {
	public function getOption(string $name);
}
