<?php
declare(strict_types=1);

use OCA\Opsdash\Command\ReportCommand;
use OCA\Opsdash\Command\SendScheduledReportsCommand;
use OCA\Opsdash\Command\SendReportVariantsCommand;
use OCA\Opsdash\Command\SeedDeckCommand;
use OCP\Server;

/** @var \Symfony\Component\Console\Application $application */
$application->add(Server::get(ReportCommand::class));
$application->add(Server::get(SendScheduledReportsCommand::class));
$application->add(Server::get(SendReportVariantsCommand::class));
$application->add(Server::get(SeedDeckCommand::class));
