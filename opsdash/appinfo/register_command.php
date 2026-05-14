<?php
declare(strict_types=1);

use OCA\Opsdash\Command\ReportCommand;
use OCA\Opsdash\Command\SendScheduledReportsCommand;
use OCA\Opsdash\Command\SendReportMatrixCommand;
use OCA\Opsdash\Command\SeedDeckCommand;
use OCP\Server;

/** @var \Symfony\Component\Console\Application $application */
$application->add(Server::get(ReportCommand::class));
$application->add(Server::get(SendScheduledReportsCommand::class));
$application->add(Server::get(SendReportMatrixCommand::class));
$application->add(Server::get(SeedDeckCommand::class));
