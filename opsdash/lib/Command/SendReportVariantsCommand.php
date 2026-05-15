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
    name: 'opsdash:report:send-variants',
    description: 'Send Opsdash recap variants for a user using goal-type and period combinations.',
    hidden: false,
)]
class SendReportVariantsCommand extends Command {
    protected static $defaultName = 'opsdash:report:send-variants';

    public function __construct(
        private ReportDeliveryService $reportDeliveryService,
        private IUserManager $userManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->setDescription('Send Opsdash recap variants for a user using goal-type and period combinations.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'User ID')
            ->addOption('range', null, InputOption::VALUE_REQUIRED, 'Range: all, week or month', 'all')
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

        $rangeMode = strtolower(trim((string)($input->getOption('range') ?? 'all')));
        if (!in_array($rangeMode, ['all', 'week', 'month'], true)) {
            $output->writeln('<error>[opsdash] --range must be "all", "week" or "month".</error>');
            return Command::FAILURE;
        }

        $offset = max(-24, min(24, (int)$input->getOption('offset')));

        $goalVariants = [
            'single_goal' => 'single_goal',
            'calendar_goals' => 'calendar_goals',
            'category_and_calendar_goals' => 'category_and_calendar_goals',
        ];
        $ranges = $rangeMode === 'all' ? ['week', 'month'] : [$rangeMode];

        foreach ($ranges as $range) {
            foreach ($goalVariants as $variantLabel => $variantName) {
                $result = $this->reportDeliveryService->sendTestReport(
                    appName: 'opsdash',
                    uid: $uid,
                    range: $range,
                    offset: $offset,
                    reportVariantOverride: $variantName,
                    reportingConfigOverride: null,
                    variantLabel: $variantName . '_' . $range,
                );

                $output->writeln(sprintf(
                    '<info>[opsdash]</info> %s_%s -> %s :: %s',
                    $variantLabel,
                    $range,
                    $result['email'],
                    $result['subject'],
                ));
            }
        }

        return Command::SUCCESS;
    }
}
