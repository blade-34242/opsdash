<?php
declare(strict_types=1);

namespace OCA\Opsdash\AppInfo;

use OCA\Opsdash\BackgroundJob\ScheduledReportJob;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\BackgroundJob\IJobList;
// (metrics/admin settings removed)

class Application extends App implements IBootstrap {
    public function __construct() {
        parent::__construct('opsdash');
    }

    public function register(IRegistrationContext $context): void {
        // Console commands are registered from appinfo/register_command.php for
        // compatibility with the Nextcloud console loaders used across our
        // supported versions.
    }

    public function boot(IBootContext $context): void {
        // Navigation is declared via appinfo/navigation.xml.
        /** @var IJobList $jobList */
        $jobList = $context->getServerContainer()->get(IJobList::class);
        $jobs = [];
        foreach ($jobList->getJobsIterator(ScheduledReportJob::class, 10, 0) as $job) {
            $jobs[] = $job;
        }
        if ($jobs === []) {
            $jobList->add(ScheduledReportJob::class);
            return;
        }
        foreach (array_slice($jobs, 1) as $duplicateJob) {
            $jobList->removeById($duplicateJob->getId());
        }
    }
}
