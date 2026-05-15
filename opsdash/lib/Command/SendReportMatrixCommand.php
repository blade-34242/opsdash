<?php
declare(strict_types=1);

namespace OCA\Opsdash\Command;

use OCA\Opsdash\Service\ReportDeliveryService;
use OCP\IUserManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'opsdash:report:send-matrix',
    description: 'Send an Opsdash recap email for a user using their real data.',
    hidden: false,
)]
class SendReportMatrixCommand extends Command {
    protected static $defaultName = 'opsdash:report:send-matrix';

    public function __construct(
        private ReportDeliveryService $reportDeliveryService,
        private IUserManager $userManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->setDescription('Send an Opsdash recap email for a user using their real data.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'User ID')
            ->addOption('mode', null, InputOption::VALUE_REQUIRED, 'Range: week or month', 'week')
            ->addOption('offset', null, InputOption::VALUE_REQUIRED, 'Period offset (-24..24)', '0');
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

        $mode = strtolower(trim((string)$input->getOption('mode')));
        if (!in_array($mode, ['week', 'month'], true)) {
            $output->writeln('<error>[opsdash] --mode must be "week" or "month".</error>');
            return Command::FAILURE;
        }

        $offset = max(-24, min(24, (int)$input->getOption('offset')));

        $result = $this->reportDeliveryService->sendTestReport(
            appName: 'opsdash',
            uid: $uid,
            range: $mode,
            offset: $offset,
        );

        $output->writeln(sprintf(
            '<info>[opsdash]</info> sent to %s :: %s',
            $result['email'],
            $result['subject'],
        ));

        return Command::SUCCESS;
    }
}
