<?php
declare(strict_types=1);

namespace OCA\Opsdash\Command;

use OCA\Opsdash\Service\ReportSummaryService;
use OCP\IUserManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'opsdash:report',
    description: 'Generate a lightweight Opsdash report snapshot for a user.',
    hidden: false,
)]
class ReportCommand extends Command {
    protected static $defaultName = 'opsdash:report';

    public function __construct(
        private ReportSummaryService $reportSummaryService,
        private IUserManager $userManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->setDescription('Generate a lightweight Opsdash report snapshot for a user.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'User ID to report on')
            ->addOption('range', null, InputOption::VALUE_REQUIRED, 'Range: week or month', 'week')
            ->addOption('offset', null, InputOption::VALUE_REQUIRED, 'Range offset (-24..24)', '0')
            ->addOption('cals', null, InputOption::VALUE_OPTIONAL, 'Comma-separated calendar ids (optional)')
            ->addOption('format', null, InputOption::VALUE_REQUIRED, 'Output format: text or json', 'text');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int {
        $uid = trim((string)$input->getOption('user'));
        if ($uid === '') {
            $output->writeln('<error>[opsdash] --user is required.</error>');
            return Command::FAILURE;
        }
        if ($this->userManager->get($uid) === null) {
            $output->writeln('<error>[opsdash] User not found.</error>');
            return Command::FAILURE;
        }

        $range = strtolower((string)$input->getOption('range'));
        if ($range !== 'month') {
            $range = 'week';
        }
        $offset = (int)$input->getOption('offset');

        $calsCsv = (string)$input->getOption('cals');
        $requested = trim($calsCsv) !== ''
            ? array_values(array_filter(explode(',', $calsCsv), static fn ($x) => $x !== ''))
            : null;

        $summary = $this->reportSummaryService->build(
            'opsdash',
            $uid,
            $range,
            $offset,
            $requested,
        );

        $format = strtolower((string)$input->getOption('format'));
        if ($format === 'json') {
            $output->writeln(json_encode($summary, JSON_PRETTY_PRINT));
            return Command::SUCCESS;
        }

        $output->writeln(sprintf(
            '<info>[opsdash]</info> Report for %s (%s, offset %d)',
            $uid,
            ucfirst($range),
            $offset,
        ));
        $output->writeln(sprintf('Range: %s → %s', $summary['from'], $summary['to']));
        $output->writeln(sprintf('Total hours: %.2f', $summary['total_hours']));
        $output->writeln(sprintf('Events: %d', $summary['events']));
        $output->writeln(sprintf('Active days: %d', $summary['active_days']));
        $output->writeln(sprintf('Avg/day: %.2f', $summary['avg_per_day']));
        $output->writeln(sprintf('Avg/event: %.2f', $summary['avg_per_event']));
        $topCategory = is_array($summary['top_category'] ?? null) ? $summary['top_category'] : null;
        $topCalendar = is_array($summary['top_calendar'] ?? null) ? $summary['top_calendar'] : null;
        if ($topCategory) {
            $output->writeln(sprintf('Top category: %s (%.2f h)', $topCategory['label'], $topCategory['hours']));
        }
        if ($topCalendar) {
            $output->writeln(sprintf('Top calendar: %s (%.2f h)', $topCalendar['label'], $topCalendar['hours']));
        }

        return Command::SUCCESS;
    }
}
