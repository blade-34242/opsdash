<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class PersistOnboardingSanitizer {
    /**
     * @param mixed $state
     * @param array<string,mixed> $defaults
     * @return array<string,mixed>
     */
    public function sanitize($state, array $defaults): array {
        $result = $defaults;
        if (!is_array($state)) {
            return $result;
        }
        $result['completed'] = !empty($state['completed']);
        $version = (int)($state['version'] ?? 0);
        if ($version < 0) {
            $version = 0;
        } elseif ($version > 1000) {
            $version = 1000;
        }
        $result['version'] = $version;
        $strategy = trim((string)($state['strategy'] ?? ''));
        $result['strategy'] = substr($strategy, 0, 64);
        $completedAt = trim((string)($state['completed_at'] ?? ''));
        if ($completedAt !== '') {
            $result['completed_at'] = substr($completedAt, 0, 32);
        }
        $dashboardMode = trim((string)($state['dashboardMode'] ?? ''));
        if ($dashboardMode === 'quick' || $dashboardMode === 'standard' || $dashboardMode === 'pro') {
            $result['dashboardMode'] = $dashboardMode;
        }
        $releaseNotesSeenVersion = trim((string)($state['releaseNotesSeenVersion'] ?? ''));
        if ($releaseNotesSeenVersion !== '') {
            $releaseNotesSeenVersion = preg_replace('/^v/i', '', $releaseNotesSeenVersion) ?? $releaseNotesSeenVersion;
            $result['releaseNotesSeenVersion'] = substr($releaseNotesSeenVersion, 0, 32);
        }
        return $result;
    }
}
