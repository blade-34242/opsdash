<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCA\Opsdash\Service\Validation\NumberConstraints;
use OCA\Opsdash\Service\Validation\NumberValidator;
use OCA\Opsdash\Service\Validation\ValidationIssue;
use OCA\Opsdash\Service\Validation\ValidationResult;
use OCP\IL10N;

class TargetsService {
    public function __construct(
        private IL10N $l10n,
    ) {
    }

    public function defaultTargetsConfig(): array {
        return [
            'totalHours' => 48,
            'categories' => [
                [
                    'id' => 'work',
                    'label' => 'Work',
                    'targetHours' => 32,
                    'includeWeekend' => false,
                    'paceMode' => 'days_only',
                    'groupIds' => [1],
                ],
                [
                    'id' => 'hobby',
                    'label' => 'Hobby',
                    'targetHours' => 6,
                    'includeWeekend' => true,
                    'paceMode' => 'days_only',
                    'groupIds' => [2],
                ],
                [
                    'id' => 'sport',
                    'label' => 'Sport',
                    'targetHours' => 4,
                    'includeWeekend' => true,
                    'paceMode' => 'days_only',
                    'groupIds' => [3],
                ],
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
            'ui' => [
                'showTotalDelta' => true,
                'showNeedPerDay' => true,
                'showCategoryBlocks' => true,
                'badges' => true,
                'includeWeekendToggle' => true,
                'showCalendarCharts' => true,
                'showCategoryCharts' => true,
            ],
            'allDayHours' => 8.0,
            'timeSummary' => [
                'showTotal' => true,
                'showAverage' => true,
                'showMedian' => true,
                'showBusiest' => true,
                'showWorkday' => true,
                'showWeekend' => true,
                'showWeekendShare' => true,
                'showCalendarSummary' => true,
                'showTopCategory' => true,
                'showBalance' => true,
            ],
            'activityCard' => $this->defaultActivityCardConfig(),
            'balance' => $this->defaultBalanceConfig(),
            'includeZeroDaysInStats' => false,
        ];
    }

    public function defaultActivityCardConfig(): array {
        return [
            'showWeekendShare' => true,
            'showEveningShare' => true,
            'showEarliestLatest' => true,
            'showOverlaps' => true,
            'showLongestSession' => true,
            'showLastDayOff' => true,
            'showDayOffTrend' => true,
            'showHint' => true,
        ];
    }

    public function defaultBalanceConfig(): array {
        return [
            'categories' => ['work', 'hobby', 'sport'],
            'useCategoryMapping' => true,
            'index' => ['method' => 'simple_range', 'basis' => 'category'],
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
            'ui' => [
                'showNotes' => false,
            ],
        ];
    }

    /**
     * @param mixed $cfg
     */
    public function cleanTargetsConfig($cfg, array &$errors, array &$warnings, string $prefix = 'targets_config'): array {
        $base = $this->defaultTargetsConfig();
        if (!is_array($cfg)) {
            return $base;
        }

        $out = $base;

        if (isset($cfg['totalHours'])) {
            $out['totalHours'] = $this->sanitizeNumberOrDefault(
                $cfg['totalHours'],
                new NumberConstraints(0.0, 10000.0, 0.5, 2),
                $out['totalHours'],
                $prefix . '.totalHours',
                $errors,
                $warnings
            );
        }

        if (isset($cfg['categories']) && is_array($cfg['categories'])) {
            $categories = [];
            foreach ($cfg['categories'] as $index => $cat) {
                if (!is_array($cat)) {
                    continue;
                }
                $catId = substr((string)($cat['id'] ?? ''), 0, 64);
                if ($catId === '') {
                    $catId = substr((string)($cat['label'] ?? ''), 0, 64);
                }
                if ($catId === '') {
                    $catId = 'cat-' . $index;
                }
                $categories[] = [
                    'id' => $catId,
                    'label' => substr((string)($cat['label'] ?? ucwords(str_replace('_', ' ', $catId))), 0, 120),
                    'targetHours' => $this->sanitizeNumberOrDefault(
                        $cat['targetHours'] ?? null,
                        new NumberConstraints(0.0, 10000.0, 0.25, 2),
                        0.0,
                        $prefix . '.categories.' . $catId . '.targetHours',
                        $errors,
                        $warnings
                    ),
                    'includeWeekend' => !empty($cat['includeWeekend']),
                    'paceMode' => in_array($cat['paceMode'] ?? '', ['time_aware'], true) ? 'time_aware' : 'days_only',
                    'groupIds' => isset($cat['groupIds']) && is_array($cat['groupIds'])
                        ? array_values(array_filter(array_map(static fn ($n) => (int)$n, $cat['groupIds']), static fn ($n) => $n >= 0 && $n <= 9))
                        : [],
                ];
            }
            if (!empty($categories)) {
                $out['categories'] = $categories;
            }
        }

        if (isset($cfg['pace']) && is_array($cfg['pace'])) {
            $pace = $cfg['pace'];
            $out['pace']['includeWeekendTotal'] = !empty($pace['includeWeekendTotal']);
            if (isset($pace['mode']) && $pace['mode'] === 'time_aware') {
                $out['pace']['mode'] = 'time_aware';
            }
            if (isset($pace['thresholds']) && is_array($pace['thresholds'])) {
                $thr = $pace['thresholds'];
                if (array_key_exists('onTrack', $thr)) {
                    $out['pace']['thresholds']['onTrack'] = $this->sanitizeNumberOrDefault(
                        $thr['onTrack'],
                        new NumberConstraints(-100.0, 100.0, 0.5, 1),
                        (float)$out['pace']['thresholds']['onTrack'],
                        $prefix . '.pace.thresholds.onTrack',
                        $errors,
                        $warnings
                    );
                }
                if (array_key_exists('atRisk', $thr)) {
                    $out['pace']['thresholds']['atRisk'] = $this->sanitizeNumberOrDefault(
                        $thr['atRisk'],
                        new NumberConstraints(-100.0, 100.0, 0.5, 1),
                        (float)$out['pace']['thresholds']['atRisk'],
                        $prefix . '.pace.thresholds.atRisk',
                        $errors,
                        $warnings
                    );
                }
            }
        }

        if (isset($cfg['forecast']) && is_array($cfg['forecast'])) {
            $forecast = $cfg['forecast'];
            if (isset($forecast['methodPrimary']) && $forecast['methodPrimary'] === 'momentum') {
                $out['forecast']['methodPrimary'] = 'momentum';
            }
            if (isset($forecast['momentumLastNDays'])) {
                $out['forecast']['momentumLastNDays'] = (int)round($this->sanitizeNumberOrDefault(
                    $forecast['momentumLastNDays'],
                    new NumberConstraints(1.0, 14.0, 1.0, 0),
                    (float)$out['forecast']['momentumLastNDays'],
                    $prefix . '.forecast.momentumLastNDays',
                    $errors,
                    $warnings
                ));
            }
            if (isset($forecast['padding'])) {
                $out['forecast']['padding'] = $this->sanitizeNumberOrDefault(
                    $forecast['padding'],
                    new NumberConstraints(0.0, 100.0, 0.1, 2),
                    $out['forecast']['padding'],
                    $prefix . '.forecast.padding',
                    $errors,
                    $warnings
                );
            }
        }

        if (isset($cfg['ui']) && is_array($cfg['ui'])) {
            $ui = $cfg['ui'];
            foreach ($out['ui'] as $key => $val) {
                if (array_key_exists($key, $ui)) {
                    $out['ui'][$key] = !empty($ui[$key]);
                }
            }
        }

        if (isset($cfg['timeSummary']) && is_array($cfg['timeSummary'])) {
            $ts = $cfg['timeSummary'];
            foreach ($out['timeSummary'] as $key => $val) {
                if (array_key_exists($key, $ts)) {
                    $out['timeSummary'][$key] = !empty($ts[$key]);
                }
            }
        }

        if (array_key_exists('allDayHours', $cfg)) {
            $out['allDayHours'] = $this->sanitizeNumberOrDefault(
                $cfg['allDayHours'],
                new NumberConstraints(0.0, 24.0, 0.25, 2),
                (float)$out['allDayHours'],
                $prefix . '.allDayHours',
                $errors,
                $warnings
            );
        }

        if (isset($cfg['includeZeroDaysInStats'])) {
            $out['includeZeroDaysInStats'] = !empty($cfg['includeZeroDaysInStats']);
        }

        if (isset($cfg['activityCard'])) {
            $out['activityCard'] = $this->cleanActivityCardConfig($cfg['activityCard']);
        }

        if (isset($cfg['balance'])) {
            $out['balance'] = $this->cleanBalanceConfig($cfg['balance'], $out['categories'], $errors, $warnings, $prefix . '.balance');
        }

        return $out;
    }

    /**
     * @param mixed $cfg
     */
    public function cleanActivityCardConfig($cfg): array {
        $base = $this->defaultActivityCardConfig();
        if (!is_array($cfg)) {
            return $base;
        }
        $result = $base;
        foreach (array_keys($base) as $key) {
            if (array_key_exists($key, $cfg)) {
                $result[$key] = !empty($cfg[$key]);
            }
        }
        return $result;
    }

    /**
     * @param mixed $cfg
     * @param array<int,array<string,mixed>> $categories
     */
    public function cleanBalanceConfig($cfg, array $categories, array &$errors, array &$warnings, string $prefix): array {
        $base = $this->defaultBalanceConfig();
        $result = $base;

        $available = [];
        foreach ($categories as $cat) {
            if (!is_array($cat)) {
                continue;
            }
            $id = substr((string)($cat['id'] ?? ''), 0, 64);
            if ($id !== '') {
                $available[] = $id;
            }
        }

        if (!is_array($cfg)) {
            if (!empty($available)) {
                $result['categories'] = array_slice($available, 0, count($result['categories']));
            }
            return $result;
        }

        $orderSource = isset($cfg['categories']) && is_array($cfg['categories']) ? $cfg['categories'] : $base['categories'];
        $order = [];
        foreach ($orderSource as $rawId) {
            $id = substr((string)$rawId, 0, 64);
            if ($id === '') {
                continue;
            }
            if (!empty($available) && !in_array($id, $available, true)) {
                continue;
            }
            if (!in_array($id, $order, true)) {
                $order[] = $id;
            }
        }
        if (empty($order)) {
            $order = !empty($available) ? array_slice($available, 0, count($base['categories'])) : $base['categories'];
        }
        $result['categories'] = $order;
        $result['useCategoryMapping'] = !empty($cfg['useCategoryMapping']);

        $method = (string)($cfg['index']['method'] ?? $base['index']['method']);
        $result['index']['method'] = $method === 'shannon_evenness' ? 'shannon_evenness' : 'simple_range';
        $basis = strtolower((string)($cfg['index']['basis'] ?? $base['index']['basis'] ?? 'category'));
        if (in_array($basis, ['off', 'category', 'calendar', 'both'], true)) {
            $result['index']['basis'] = $basis;
        }
        if (!$result['useCategoryMapping'] && $result['index']['basis'] === 'category') {
            $result['index']['basis'] = 'calendar';
        }

        if (isset($cfg['thresholds']) && is_array($cfg['thresholds'])) {
            $thr = $cfg['thresholds'];
            $map = [
                'noticeAbove' => 'noticeAbove',
                'noticeBelow' => 'noticeBelow',
                'warnAbove' => 'warnAbove',
                'warnBelow' => 'warnBelow',
            ];
            foreach ($map as $src => $dst) {
                if (isset($thr[$src])) {
                    $result['thresholds'][$dst] = $this->sanitizeNumberOrDefault(
                        $thr[$src],
                        new NumberConstraints(0.0, 1.0, 0.01, 2),
                        $result['thresholds'][$dst],
                        $prefix . '.thresholds.' . $dst,
                        $errors,
                        $warnings
                    );
                }
            }
            if (isset($thr['warnIndex'])) {
                $result['thresholds']['warnIndex'] = $this->sanitizeNumberOrDefault(
                    $thr['warnIndex'],
                    new NumberConstraints(0.0, 1.0, 0.01, 2),
                    $result['thresholds']['warnIndex'],
                    $prefix . '.thresholds.warnIndex',
                    $errors,
                    $warnings
                );
            }
        }

        if (isset($cfg['relations']['displayMode'])) {
            $displayMode = (string)$cfg['relations']['displayMode'];
            $result['relations']['displayMode'] = $displayMode === 'factor' ? 'factor' : 'ratio';
        }

        if (isset($cfg['trend']) && is_array($cfg['trend'])) {
            $lookback = $this->sanitizeNumberOrDefault(
                $cfg['trend']['lookbackWeeks'] ?? null,
                new NumberConstraints(1.0, 6.0, 1.0, 0),
                (float)$result['trend']['lookbackWeeks'],
                $prefix . '.trend.lookbackWeeks',
                $errors,
                $warnings
            );
            $result['trend']['lookbackWeeks'] = (int)round($lookback);
        }

        if (isset($cfg['dayparts']) && is_array($cfg['dayparts'])) {
            $result['dayparts']['enabled'] = !empty($cfg['dayparts']['enabled']);
        }

        if (isset($cfg['ui']) && is_array($cfg['ui'])) {
            $ui = $cfg['ui'];
            if (array_key_exists('showNotes', $ui)) {
                $result['ui']['showNotes'] = !empty($ui['showNotes']);
            }
        }

        return $result;
    }

    /**
     * @param array<string,mixed> $src
     * @param array<string,int> $allowedSet
     */
    public function cleanTargets(array $src, array $allowedSet, array &$errors, array &$warnings, string $fieldPrefix): array {
        $constraints = new NumberConstraints(0.0, 10000.0, 0.25);
        $out = [];
        foreach ($src as $k => $v) {
            $id = substr((string)$k, 0, 128);
            if (!isset($allowedSet[$id])) {
                continue;
            }
            $field = $fieldPrefix . $id;
            $result = NumberValidator::validate($v, $constraints);
            $this->recordNumberIssues($field, $v, $constraints, $result, $errors, $warnings);
            if ($result->hasErrors()) {
                continue;
            }
            $value = $result->getValue();
            if ($value === null) {
                continue;
            }
            $out[$id] = $value;
        }
        return $out;
    }

    /**
     * @param array<string,mixed> $src
     * @param array<string,int> $allowedSet
     * @param string[] $allIds
     */
    public function cleanGroups(array $src, array $allowedSet, array $allIds, array &$errors, string $fieldPrefix): array {
        $out = [];
        foreach ($src as $k => $v) {
            $id = substr((string)$k, 0, 128);
            if (!isset($allowedSet[$id])) {
                continue;
            }
            $field = $fieldPrefix . $id;
            if (!is_numeric($v)) {
                $this->pushIssue(
                    $errors,
                    $field,
                    $this->t('Enter a whole number between 0 and 9'),
                    'error',
                    $v,
                    ['type' => 'integer', 'min' => 0, 'max' => 9],
                    'invalid_group'
                );
                continue;
            }
            $n = (int)$v;
            if ($n < 0 || $n > 9) {
                $this->pushIssue(
                    $errors,
                    $field,
                    $this->t('Group must be between 0 and 9'),
                    'error',
                    $v,
                    ['type' => 'integer', 'min' => 0, 'max' => 9],
                    'invalid_group'
                );
                continue;
            }
            $out[$id] = $n;
        }
        foreach ($allIds as $id) {
            if (!isset($out[$id])) {
                $out[$id] = 0;
            }
        }
        return $out;
    }

    public function sanitizeNumberOrDefault(mixed $value, NumberConstraints $constraints, float $default, string $field, array &$errors, array &$warnings): float {
        $result = NumberValidator::validate($value, $constraints);
        $this->recordNumberIssues($field, $value, $constraints, $result, $errors, $warnings);
        if ($result->hasErrors()) {
            return $default;
        }
        $sanitized = $result->getValue();
        return $sanitized === null ? $default : $sanitized;
    }

    public function recordNumberIssues(string $field, mixed $rawValue, NumberConstraints $constraints, ValidationResult $result, array &$errors, array &$warnings): void {
        foreach ($result->getIssues() as $issue) {
            $code = $issue->code ?? ($issue->severity === 'warning' ? 'number_adjusted' : 'invalid_number');
            $message = $this->translateNumberIssue($issue, $constraints);
            if ($issue->severity === 'error') {
                $this->pushIssue(
                    $errors,
                    $field,
                    $message,
                    'error',
                    $rawValue,
                    $this->describeNumberConstraints($constraints),
                    $code
                );
            } elseif ($issue->severity === 'warning') {
                $this->pushIssue(
                    $warnings,
                    $field,
                    $message,
                    'warning',
                    $rawValue,
                    $this->describeNumberConstraints($constraints),
                    $code,
                    $result->getValue()
                );
            }
        }
    }

    public function pushIssue(array &$bucket, string $field, string $message, string $severity, mixed $received = null, ?array $expected = null, ?string $code = null, mixed $adjusted = null): void {
        $entry = [
            'field' => $field,
            'message' => $message,
            'severity' => $severity,
        ];
        if ($code !== null) {
            $entry['code'] = $code;
        }
        if ($expected !== null) {
            $entry['expected'] = $expected;
        }
        if ($received !== null) {
            $entry['received'] = $this->stringifyValue($received);
        }
        if ($adjusted !== null) {
            $entry['adjusted'] = $adjusted;
        }
        $bucket[] = $entry;
    }

    public function describeNumberConstraints(NumberConstraints $constraints): array {
        $ctx = [];
        if ($constraints->min !== null) {
            $ctx['min'] = $constraints->min;
        }
        if ($constraints->max !== null) {
            $ctx['max'] = $constraints->max;
        }
        if ($constraints->step !== null && $constraints->step > 0) {
            $ctx['step'] = $constraints->step;
        }
        if ($constraints->precision !== null) {
            $ctx['precision'] = $constraints->precision;
        }
        if ($constraints->allowEmpty) {
            $ctx['allowEmpty'] = true;
        }
        return $ctx;
    }

    public function formatConstraintSummary(array $ctx): string {
        $parts = [];
        if (isset($ctx['min']) && isset($ctx['max'])) {
            $parts[] = $this->t('Allowed range %s – %s', [$ctx['min'], $ctx['max']]);
        } elseif (isset($ctx['min'])) {
            $parts[] = $this->t('Minimum %s', [$ctx['min']]);
        } elseif (isset($ctx['max'])) {
            $parts[] = $this->t('Maximum %s', [$ctx['max']]);
        }
        if (isset($ctx['step'])) {
            $parts[] = $this->t('step %s', [$ctx['step']]);
        }
        return implode(', ', $parts);
    }

    public function translateNumberIssue(ValidationIssue $issue, NumberConstraints $constraints): string {
        $code = $issue->code ?? ($issue->severity === 'warning' ? 'number_adjusted' : 'invalid_number');
        $ctx = !empty($issue->context) ? $issue->context : $this->describeNumberConstraints($constraints);
        return match ($code) {
            'number_required' => $this->t('Enter a number'),
            'number_invalid' => $this->t('Enter a valid number'),
            'number_adjusted' => $this->translateAdjustedMessage($ctx),
            default => $issue->message,
        };
    }

    public function translateAdjustedMessage(array $ctx): string {
        $summary = $this->formatConstraintSummary($ctx);
        if ($summary === '') {
            return $this->t('Adjusted to allowed value');
        }
        return $this->t('Adjusted to allowed value (%s)', [$summary]);
    }

    public function stringifyValue(mixed $value): string {
        if (is_string($value) || is_numeric($value)) {
            return (string)$value;
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if ($value === null) {
            return 'null';
        }
        if (is_array($value)) {
            return 'array';
        }
        if (is_object($value)) {
            return 'object';
        }
        return gettype($value);
    }

    public function createValidationErrorPayload(array $errors, array $warnings = []): array {
        $payload = [
            'ok' => false,
            'message' => $this->t('Validation failed'),
            'errors' => array_values($errors),
        ];
        if (!empty($warnings)) {
            $payload['warnings'] = array_values($warnings);
        }
        return $payload;
    }

    private function t(string $text, array $params = []): string {
        return $this->l10n->t($text, $params);
    }
}
