<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewIncludeResolver {
    private const INCLUDE_ALIASES = [
        'all' => 'all',
        'core' => 'core',
        'data' => 'data',
        'debug' => 'debug',
        'calendars' => 'calendars',
        'selected' => 'selected',
        'colors' => 'colors',
        'groups' => 'groups',
        'targets' => 'targets',
        'targetsconfig' => 'targetsConfig',
        'themepreference' => 'themePreference',
        'reportingconfig' => 'reportingConfig',
        'decksettings' => 'deckSettings',
        'widgets' => 'widgets',
        'onboarding' => 'onboarding',
        'usersettings' => 'userSettings',
        'stats' => 'stats',
        'bycal' => 'byCal',
        'byday' => 'byDay',
        'longest' => 'longest',
        'charts' => 'charts',
        'lookback' => 'lookback',
    ];

    private const CORE_KEYS = [
        'userSettings',
        'calendars',
        'selected',
        'colors',
        'groups',
        'targets',
        'targetsConfig',
        'themePreference',
        'reportingConfig',
        'deckSettings',
        'widgets',
        'onboarding',
    ];

    private const DATA_KEYS = [
        'data',
        'stats',
        'byCal',
        'byDay',
        'longest',
        'charts',
        'lookback',
    ];

    /**
     * @param array<int,string> $include
     * @return array<string,bool>
     */
    public function resolve(array $include): array {
        $set = [];
        foreach ($include as $raw) {
            $key = strtolower(trim((string)$raw));
            if ($key === '') {
                continue;
            }
            if (isset(self::INCLUDE_ALIASES[$key])) {
                $set[self::INCLUDE_ALIASES[$key]] = true;
            }
        }
        if (isset($set['core'])) {
            foreach (self::CORE_KEYS as $key) {
                $set[$key] = true;
            }
        }
        if (isset($set['data'])) {
            foreach (['stats', 'byCal', 'byDay', 'longest', 'charts'] as $key) {
                $set[$key] = true;
            }
        }
        return $set;
    }

    /**
     * @param array<int,mixed> $values
     * @return array<int,string>
     */
    public function sanitizeInputList(array $values, int $max): array {
        $out = [];
        foreach ($values as $value) {
            $key = strtolower(trim((string)$value));
            if ($key === '') {
                continue;
            }
            if (!isset(self::INCLUDE_ALIASES[$key])) {
                continue;
            }
            $out[] = self::INCLUDE_ALIASES[$key];
            if (count($out) >= $max) {
                break;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * @param array<string,bool> $includes
     * @return array{includeAll: bool, includeDebugRequested: bool, includeLookback: bool, includeCharts: bool, includeData: bool}
     */
    public function buildFlags(array $includes): array {
        $includeAll = empty($includes) || isset($includes['all']);
        $includeDebugRequested = $includeAll || isset($includes['debug']);
        $includeLookback = isset($includes['lookback']);
        $includeCharts = $includeAll
            || isset($includes['charts'])
            || isset($includes['data'])
            || $includeLookback;
        $includeData = $includeAll
            || isset($includes['data'])
            || isset($includes['stats'])
            || isset($includes['byCal'])
            || isset($includes['byDay'])
            || isset($includes['longest'])
            || isset($includes['charts'])
            || $includeLookback;

        return [
            'includeAll' => $includeAll,
            'includeDebugRequested' => $includeDebugRequested,
            'includeLookback' => $includeLookback,
            'includeCharts' => $includeCharts,
            'includeData' => $includeData,
        ];
    }

    /**
     * @param array<string,bool> $includes
     * @return array<string,bool>
     */
    public function normalizeForCache(array $includes, string $scope): array {
        $includeAll = empty($includes) || isset($includes['all']);
        if ($includeAll) {
            return ['all' => true];
        }
        $allowed = $scope === 'core' ? self::CORE_KEYS : self::DATA_KEYS;
        $set = array_intersect_key($includes, array_fill_keys($allowed, true));
        // `data` expands to the regular data payload, but not to optional
        // lookback history. Keep the requested keys distinct so a cached
        // normal response can never satisfy a later `data + lookback` load.
        ksort($set);
        return $set;
    }

    /**
     * @return array<int,string>
     */
    public function coreKeys(): array {
        return self::CORE_KEYS;
    }
}
