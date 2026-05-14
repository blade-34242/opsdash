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
                    $appName,
                    $uid,
                    $modeKey,
                    0,
                    null,
                    null,
                    null,
                    null,
                    'scheduled_' . $dispatch['cadenceLabel'],
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
     * @return array<string,string>|null
     */
    private function resolveDispatchContext(
        string $uid,
        string $modeKey,
        array $modeConfig,
        \DateTimeImmutable $now,
        int $weekStart,
    ): ?array {
        $range = $modeKey === 'month' ? 'month' : 'week';
        [$from, $to] = $this->calendarAccess->rangeBounds($range, 0, $now->getTimezone(), $weekStart);
        $todayKey = $now->format('Y-m-d');
        $periodKey = $from->format('Y-m-d') . '_' . $to->format('Y-m-d');
        $cadence = (string)($modeConfig['cadence'] ?? 'end');

        if ($cadence === 'daily') {
            return [
                'dispatchKey' => $periodKey . ':daily:' . $todayKey,
                'cadenceLabel' => $modeKey . '_daily',
            ];
        }

        $mid = $this->midpointDate($from, $to);
        if ($cadence === 'mid') {
            if ($todayKey !== $mid->format('Y-m-d')) {
                return null;
            }
            return [
                'dispatchKey' => $periodKey . ':mid',
                'cadenceLabel' => $modeKey . '_mid',
            ];
        }

        if ($todayKey !== $to->format('Y-m-d')) {
            return null;
        }
        return [
            'dispatchKey' => $periodKey . ':end',
            'cadenceLabel' => $modeKey . '_end',
        ];
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
