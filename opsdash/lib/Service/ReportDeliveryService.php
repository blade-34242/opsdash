<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IUserManager;
use OCP\Mail\IMailer;

class ReportDeliveryService {
    public function __construct(
        private ReportSummaryService $reportSummaryService,
        private ReportRenderService $reportRenderService,
        private UserConfigService $userConfigService,
        private PersistSanitizer $persistSanitizer,
        private IUserManager $userManager,
        private IMailer $mailer,
    ) {
    }

    /**
     * @param string[]|null $requestedCals
     * @param array<string,mixed>|null $groupsOverride
     * @param array<string,mixed>|null $targetsConfigOverride
     * @param array<string,mixed>|null $reportingConfigOverride
     * @return array{email:string,subject:string,summary:array<string,mixed>}
     */
    public function sendTestReport(
        string $appName,
        string $uid,
        string $range = 'week',
        int $offset = 0,
        ?array $requestedCals = null,
        ?array $groupsOverride = null,
        ?array $targetsConfigOverride = null,
        ?array $reportingConfigOverride = null,
        ?string $reportVariantOverride = null,
    ): array {
        $summary = $this->reportSummaryService->build(
            $appName,
            $uid,
            $range,
            $offset,
            $requestedCals,
            $groupsOverride,
            $targetsConfigOverride,
        );
        if ($reportVariantOverride !== null && $reportVariantOverride !== '') {
            $summary['report_variant'] = $reportVariantOverride;
        }
        return $this->sendPreparedReport(
            $appName,
            $uid,
            $summary,
            $reportingConfigOverride,
            $reportVariantOverride,
        );
    }

    /**
     * @param array<string,mixed> $summary
     * @param array<string,mixed>|null $reportingConfigOverride
     * @return array{email:string,subject:string,summary:array<string,mixed>}
     */
    public function sendPreparedReport(
        string $appName,
        string $uid,
        array $summary,
        ?array $reportingConfigOverride = null,
        ?string $reportVariantOverride = null,
    ): array {
        $user = $this->userManager->get($uid);
        if ($user === null) {
            throw new \InvalidArgumentException('User not found.');
        }

        $email = trim((string)($user->getEMailAddress() ?? ''));
        if ($email === '') {
            throw new \InvalidArgumentException('No email address is configured for this user.');
        }

        $reportingConfig = $reportingConfigOverride !== null
            ? $this->persistSanitizer->sanitizeReportingConfig($reportingConfigOverride)
            : $this->userConfigService->readReportingConfig($appName, $uid);

        if ($reportVariantOverride !== null && $reportVariantOverride !== '') {
            $summary['report_variant'] = $reportVariantOverride;
        }

        $rendered = $this->reportRenderService->render(
            $summary,
            $reportingConfig,
            (string)$user->getDisplayName(),
        );

        $message = $this->mailer->createMessage();
        $message->setTo([$email => (string)$user->getDisplayName()]);
        $message->setSubject($rendered['subject']);
        $message->setPlainBody($rendered['plain']);
        $message->setHtmlBody($rendered['html']);

        $failedRecipients = $this->mailer->send($message);
        if (!empty($failedRecipients)) {
            throw new \RuntimeException('Mail backend reported failed recipients: ' . implode(', ', $failedRecipients));
        }

        return [
            'email' => $email,
            'subject' => $rendered['subject'],
            'summary' => $summary,
        ];
    }
}
