<?php
declare(strict_types=1);

namespace OCA\Opsdash\BackgroundJob;

use OCA\Opsdash\Service\ReportScheduleService;
use OCP\AppFramework\Utility\ITimeFactory;
use OCP\BackgroundJob\IJob;
use OCP\BackgroundJob\TimedJob;
use Psr\Log\LoggerInterface;

final class ScheduledReportJob extends TimedJob {
    public function __construct(
        ITimeFactory $time,
        private ReportScheduleService $reportScheduleService,
        private LoggerInterface $logger,
    ) {
        parent::__construct($time);
        $this->setInterval(1800);
        $this->setTimeSensitivity(IJob::TIME_INSENSITIVE);
        $this->setAllowParallelRuns(false);
    }

    protected function run($argument): void {
        $result = $this->reportScheduleService->runScheduled('opsdash');
        $this->logger->info('opsdash scheduled report run completed', [
            'app' => 'opsdash',
            'scanned' => $result['scanned'] ?? 0,
            'eligible' => $result['eligible'] ?? 0,
            'sent' => $result['sent'] ?? 0,
            'skipped' => $result['skipped'] ?? 0,
            'failed' => $result['failed'] ?? 0,
        ]);
    }
}
