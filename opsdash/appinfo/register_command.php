<?php
declare(strict_types=1);

use OCA\Opsdash\Command\ReportCommand;
use OCA\Opsdash\Command\RemoveNotesCommand;
use OCP\Server;

/** @var \Symfony\Component\Console\Application $application */
$application->add(Server::get(ReportCommand::class));
$application->add(Server::get(RemoveNotesCommand::class));
