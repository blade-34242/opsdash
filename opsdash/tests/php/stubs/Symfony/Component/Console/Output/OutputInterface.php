<?php

declare(strict_types=1);

namespace Symfony\Component\Console\Output;

interface OutputInterface {
	public function writeln(string $messages);
}
