<?php
declare(strict_types=1);

namespace OCA\Opsdash\Command;

use OCA\Opsdash\Service\ReportScheduleService;
use OCP\IUserManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'opsdash:report:send-scheduled',
    description: 'Run the scheduled Opsdash recap sender.',
    hidden: false,
)]
class SendScheduledReportsCommand extends Command {
    protected static $defaultName = 'opsdash:report:send-scheduled';

    public function __construct(
        private ReportScheduleService $reportScheduleService,
        private IUserManager $userManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->setDescription('Run the scheduled Opsdash recap sender.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'Only process a single user ID');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int {
        $uid = trim((string)$input->getOption('user'));
        if ($uid !== '' && $this->userManager->get($uid) === null) {
            $output->writeln('<error>[opsdash] User not found.</error>');
            return Command::FAILURE;
        }

        $result = $this->reportScheduleService->runScheduled('opsdash', $uid !== '' ? $uid : null);
        foreach ((array)($result['results'] ?? []) as $row) {
            $output->writeln(sprintf(
                '<info>[opsdash]</info> %s %s :: %s',
                (string)($row['uid'] ?? 'unknown'),
                (string)($row['mode'] ?? 'mode'),
                (string)($row['status'] ?? 'status'),
            ));
        }
        $output->writeln(sprintf(
            '<info>[opsdash]</info> scanned=%d eligible=%d sent=%d skipped=%d failed=%d',
            (int)($result['scanned'] ?? 0),
            (int)($result['eligible'] ?? 0),
            (int)($result['sent'] ?? 0),
            (int)($result['skipped'] ?? 0),
            (int)($result['failed'] ?? 0),
        ));

        return ((int)($result['failed'] ?? 0)) > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
