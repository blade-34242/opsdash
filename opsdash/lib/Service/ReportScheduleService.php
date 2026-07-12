<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IConfig;
use OCP\IUser;
use OCP\IUserManager;
use Psr\Log\LoggerInterface;

class ReportScheduleService {
    private const STATE_KEY = 'report_delivery_state';

    public function __construct(
        private IUserManager $userManager,
        private UserConfigService $userConfigService,
        private ReportDeliveryService $reportDeliveryService,
        private IConfig $config,
        private CalendarAccessService $calendarAccess,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * @return array<string,mixed>
     */
    public function runScheduled(string $appName, ?string $uidFilter = null, ?\DateTimeImmutable $now = null): array {
        $now ??= new \DateTimeImmutable('now');
        $stats = [
            'scanned' => 0,
            'eligible' => 0,
            'sent' => 0,
            'skipped' => 0,
            'failed' => 0,
            'results' => [],
        ];

        if ($uidFilter !== null && $uidFilter !== '') {
            $user = $this->userManager->get($uidFilter);
            if ($user !== null) {
                $stats['scanned']++;
                $result = $this->processUser($appName, $user, $now);
                $this->mergeStats($stats, $result);
            }
            return $stats;
        }

        $this->userManager->callForAllUsers(function (IUser $user) use ($appName, $now, &$stats): void {
            $stats['scanned']++;
            $result = $this->processUser($appName, $user, $now);
            $this->mergeStats($stats, $result);
        });

        return $stats;
    }

    /**
     * @return array<string,mixed>
     */
    private function processUser(string $appName, IUser $user, \DateTimeImmutable $now): array {
        $uid = $user->getUID();
        $reportingConfig = $this->userConfigService->readReportingConfig($appName, $uid);
        if (empty($reportingConfig['enabled'])) {
            return ['eligible' => 0, 'sent' => 0, 'skipped' => 1, 'failed' => 0, 'results' => []];
        }

        $state = $this->readDeliveryState($uid, $appName);
        $userTz = $this->calendarAccess->resolveUserTimezone($uid);
        $weekStart = $this->calendarAccess->resolveUserWeekStart($uid);
        $userNow = $now->setTimezone($userTz);

        $results = [];
        $eligible = 0;
        $sent = 0;
        $skipped = 0;
        $failed = 0;

        $modes = is_array($reportingConfig['modes'] ?? null) ? $reportingConfig['modes'] : [];
        foreach (['week', 'month'] as $modeKey) {
            $modeConfig = is_array($modes[$modeKey] ?? null) ? $modes[$modeKey] : [];
            if (empty($modeConfig['enabled'])) {
                $skipped++;
                continue;
            }
            $eligible++;

            $dispatch = $this->resolveDispatchContext($uid, $modeKey, $modeConfig, $userNow, $weekStart);
            if ($dispatch === null) {
                $skipped++;
                continue;
            }

            $modeState = is_array($state[$modeKey] ?? null) ? $state[$modeKey] : [];
            if (($modeState['lastSentKey'] ?? '') === $dispatch['dispatchKey']) {
                $skipped++;
                $results[] = [
                    'uid' => $uid,
                    'mode' => $modeKey,
                    'status' => 'duplicate',
                    'dispatchKey' => $dispatch['dispatchKey'],
                ];
                continue;
            }

            try {
                $sendResult = $this->reportDeliveryService->sendTestReport(
                    appName: $appName,
                    uid: $uid,
                    range: $modeKey,
                    offset: (int)($dispatch['rangeOffset'] ?? 0),
                    requestedCals: null,
                    groupsOverride: null,
                    targetsConfigOverride: null,
                    reportingConfigOverride: null,
                    reportVariantOverride: null,
                );
                $state[$modeKey] = [
                    'lastSentKey' => $dispatch['dispatchKey'],
                    'lastSentAt' => $userNow->format(\DateTimeInterface::ATOM),
                    'lastError' => '',
                    'lastErrorAt' => '',
                ];
                $this->writeDeliveryState($uid, $appName, $state);
                $sent++;
                $results[] = [
                    'uid' => $uid,
                    'mode' => $modeKey,
                    'status' => 'sent',
                    'dispatchKey' => $dispatch['dispatchKey'],
                    'subject' => $sendResult['subject'],
                ];
            } catch (\Throwable $e) {
                $state[$modeKey] = [
                    'lastSentKey' => (string)($modeState['lastSentKey'] ?? ''),
                    'lastSentAt' => (string)($modeState['lastSentAt'] ?? ''),
                    'lastError' => $e->getMessage(),
                    'lastErrorAt' => $userNow->format(\DateTimeInterface::ATOM),
                ];
                $this->writeDeliveryState($uid, $appName, $state);
                $failed++;
                $results[] = [
                    'uid' => $uid,
                    'mode' => $modeKey,
                    'status' => 'failed',
                    'dispatchKey' => $dispatch['dispatchKey'],
                    'error' => $e->getMessage(),
                ];
                $this->logger->error('opsdash scheduled report send failed: ' . $e->getMessage(), [
                    'app' => $appName,
                    'uid' => $uid,
                    'mode' => $modeKey,
                    'exception' => $e,
                ]);
            }
        }

        return [
            'eligible' => $eligible,
            'sent' => $sent,
            'skipped' => $skipped,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    /**
     * @param array<string,mixed> $stats
     * @param array<string,mixed> $result
     */
    private function mergeStats(array &$stats, array $result): void {
        $stats['eligible'] += (int)($result['eligible'] ?? 0);
        $stats['sent'] += (int)($result['sent'] ?? 0);
        $stats['skipped'] += (int)($result['skipped'] ?? 0);
        $stats['failed'] += (int)($result['failed'] ?? 0);
        foreach ((array)($result['results'] ?? []) as $row) {
            $stats['results'][] = $row;
        }
    }

    /**
     * @param array<string,mixed> $modeConfig
     * @return array<string,int|string>|null
     */
    private function resolveDispatchContext(
        string $uid,
        string $modeKey,
        array $modeConfig,
        \DateTimeImmutable $now,
        int $weekStart,
    ): ?array {
        $range = $modeKey === 'month' ? 'month' : 'week';
        $delivery = (string)($modeConfig['delivery'] ?? (($modeConfig['cadence'] ?? null) === 'mid' ? 'checkpoint_final' : 'final'));
        if ($delivery !== 'checkpoint_final') {
            $delivery = 'final';
        }
        $sendTime = $this->normalizeSendTime((string)($modeConfig['sendTimeLocal'] ?? ($modeKey === 'month' ? '18:00' : '06:00')));
        if (!$this->isSendTimeReached($now, $sendTime)) {
            return null;
        }

        [$currentFrom, $currentTo] = $this->calendarAccess->rangeBounds($range, 0, $now->getTimezone(), $weekStart);
        $todayKey = $now->format('Y-m-d');

        if ($delivery === 'checkpoint_final') {
            $mid = $this->midpointDate($currentFrom, $currentTo);
            if ($todayKey === $mid->format('Y-m-d')) {
                $periodKey = $currentFrom->format('Y-m-d') . '_' . $currentTo->format('Y-m-d');
                return [
                    'dispatchKey' => $periodKey . ':checkpoint',
                    'cadenceLabel' => $modeKey . '_checkpoint',
                    'rangeOffset' => 0,
                ];
            }
        }

        if (!$this->isFinalDispatchWindow($modeKey, $currentFrom, $now)) {
            return null;
        }

        [$previousFrom, $previousTo] = $this->calendarAccess->rangeBounds($range, -1, $now->getTimezone(), $weekStart);
        $periodKey = $previousFrom->format('Y-m-d') . '_' . $previousTo->format('Y-m-d');
        return [
            'dispatchKey' => $periodKey . ':final',
            'cadenceLabel' => $modeKey . '_final',
            'rangeOffset' => -1,
        ];
    }

    private function normalizeSendTime(string $value): string {
        $value = trim($value);
        if (preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $value)) {
            return $value;
        }
        return '06:00';
    }

    private function isSendTimeReached(\DateTimeImmutable $now, string $sendTime): bool {
        [$hours, $minutes] = array_map('intval', explode(':', $sendTime, 2));
        $sendAt = $now->setTime($hours, $minutes, 0);
        return $now >= $sendAt;
    }

    private function isFinalDispatchWindow(string $modeKey, \DateTimeImmutable $currentFrom, \DateTimeImmutable $now): bool {
        $daysSinceCurrentStart = (int)$currentFrom->setTime(0, 0, 0)->diff($now->setTime(0, 0, 0))->format('%r%a');
        if ($daysSinceCurrentStart < 0) {
            return false;
        }
        $maxCatchupDays = $modeKey === 'month' ? 7 : 1;
        return $daysSinceCurrentStart <= $maxCatchupDays;
    }

    private function midpointDate(\DateTimeImmutable $from, \DateTimeImmutable $to): \DateTimeImmutable {
        $days = max(0, (int)$from->diff($to)->format('%a'));
        return $from->modify('+' . (int)floor($days / 2) . ' days');
    }

    /**
     * @return array<string,mixed>
     */
    private function readDeliveryState(string $uid, string $appName): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $appName, self::STATE_KEY, '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return $this->normalizeDeliveryState($decoded);
                }
            }
        } catch (\Throwable) {
        }
        return $this->normalizeDeliveryState([]);
    }

    /**
     * @param array<string,mixed> $state
     */
    private function writeDeliveryState(string $uid, string $appName, array $state): void {
        $this->config->setUserValue($uid, $appName, self::STATE_KEY, json_encode($this->normalizeDeliveryState($state), JSON_THROW_ON_ERROR));
    }

    /**
     * @param array<string,mixed> $state
     * @return array<string,mixed>
     */
    private function normalizeDeliveryState(array $state): array {
        $out = [];
        foreach (['week', 'month'] as $modeKey) {
            $row = is_array($state[$modeKey] ?? null) ? $state[$modeKey] : [];
            $out[$modeKey] = [
                'lastSentKey' => substr((string)($row['lastSentKey'] ?? ''), 0, 128),
                'lastSentAt' => substr((string)($row['lastSentAt'] ?? ''), 0, 128),
                'lastError' => substr((string)($row['lastError'] ?? ''), 0, 512),
                'lastErrorAt' => substr((string)($row['lastErrorAt'] ?? ''), 0, 128),
            ];
        }
        return $out;
    }
}
