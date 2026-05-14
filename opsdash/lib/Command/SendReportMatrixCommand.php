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
    description: 'Send the full Opsdash test report matrix for a user.',
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
            ->setDescription('Send the full Opsdash test report matrix for a user.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'User ID to report on')
            ->addOption('offset', null, InputOption::VALUE_REQUIRED, 'Range offset (-24..24)', '0');
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

        $offset = max(-24, min(24, (int)$input->getOption('offset')));
        $requestedCals = [
            'opsdash-work',
            'opsdash-meetings',
            'opsdash-personal',
            'opsdash-learning',
            'opsdash-sport',
            'opsdash-recovery',
        ];
        $groupsOverride = [
            'opsdash-work' => 1,
            'opsdash-meetings' => 1,
            'opsdash-personal' => 2,
            'opsdash-learning' => 2,
            'opsdash-sport' => 3,
            'opsdash-recovery' => 3,
        ];
        $targetsConfig = [
            'totalHours' => 40,
            'allDayHours' => 8,
            'categories' => [
                ['id' => 'work', 'label' => 'Work', 'targetHours' => 24, 'includeWeekend' => false, 'paceMode' => 'days_only', 'groupIds' => [1]],
                ['id' => 'hobby', 'label' => 'Hobby', 'targetHours' => 10, 'includeWeekend' => true, 'paceMode' => 'days_only', 'groupIds' => [2]],
                ['id' => 'sport', 'label' => 'Sport', 'targetHours' => 6, 'includeWeekend' => true, 'paceMode' => 'days_only', 'groupIds' => [3]],
            ],
            'pace' => [
                'includeWeekendTotal' => true,
                'mode' => 'days_only',
                'thresholds' => ['onTrack' => -2, 'atRisk' => -10],
            ],
            'forecast' => [
                'methodPrimary' => 'linear',
                'momentumLastNDays' => 2,
                'padding' => 1.5,
            ],
            'balance' => [
                'categories' => ['work', 'hobby', 'sport'],
                'useCategoryMapping' => true,
                'thresholds' => [
                    'noticeAbove' => 0.15,
                    'noticeBelow' => 0.15,
                    'warnAbove' => 0.30,
                    'warnBelow' => 0.30,
                    'warnIndex' => 0.60,
                ],
                'relations' => ['displayMode' => 'ratio'],
                'trend' => ['lookbackWeeks' => 3],
                'dayparts' => ['enabled' => false],
                'ui' => ['showNotes' => true],
            ],
        ];

        $cases = [
            'week_daily' => ['range' => 'week', 'reporting' => $this->reportingConfig(true, 'daily', '1d', false, 'end', '2d')],
            'week_mid' => ['range' => 'week', 'reporting' => $this->reportingConfig(true, 'mid', '1d', false, 'end', '2d')],
            'week_end' => ['range' => 'week', 'reporting' => $this->reportingConfig(true, 'end', '2d', false, 'end', '2d')],
            'month_daily' => ['range' => 'month', 'reporting' => $this->reportingConfig(false, 'end', '1d', true, 'daily', '1d')],
            'month_mid' => ['range' => 'month', 'reporting' => $this->reportingConfig(false, 'end', '1d', true, 'mid', '1d')],
            'month_end' => ['range' => 'month', 'reporting' => $this->reportingConfig(false, 'end', '1d', true, 'end', '2d')],
            'both_week' => ['range' => 'week', 'reporting' => $this->reportingConfig(true, 'mid', '1d', true, 'end', '2d')],
            'both_month' => ['range' => 'month', 'reporting' => $this->reportingConfig(true, 'mid', '1d', true, 'end', '2d')],
        ];

        foreach ($cases as $label => $case) {
            $result = $this->reportDeliveryService->sendTestReport(
                'opsdash',
                $uid,
                (string)$case['range'],
                $offset,
                $requestedCals,
                $groupsOverride,
                $targetsConfig,
                $case['reporting'],
                $label,
            );
            $output->writeln(sprintf(
                '<info>[opsdash]</info> %s -> %s :: %s',
                $label,
                $result['email'],
                $result['subject'],
            ));
        }

        return Command::SUCCESS;
    }

    /**
     * @return array<string,mixed>
     */
    private function reportingConfig(
        bool $weekEnabled,
        string $weekCadence,
        string $weekReminder,
        bool $monthEnabled,
        string $monthCadence,
        string $monthReminder,
    ): array {
        return [
            'enabled' => true,
            'modes' => [
                'week' => [
                    'enabled' => $weekEnabled,
                    'cadence' => $weekCadence,
                    'reminderLead' => $weekReminder,
                ],
                'month' => [
                    'enabled' => $monthEnabled,
                    'cadence' => $monthCadence,
                    'reminderLead' => $monthReminder,
                ],
            ],
            'alertOnRisk' => true,
            'riskThreshold' => 0.85,
            'notifyEmail' => true,
            'notifyNotification' => true,
        ];
    }
}
