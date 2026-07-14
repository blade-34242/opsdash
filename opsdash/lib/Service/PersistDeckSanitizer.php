<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class PersistDeckSanitizer {
    private const MAX_DECK_BOARD_ID = 100000;

    /**
     * @param mixed $value
     * @param array<string,mixed> $defaults
     * @return array<string,mixed>
     */
    public function sanitize($value, array $defaults): array {
        if (!is_array($value)) {
            return $defaults;
        }
        $allowedFilters = [
            'all',
            'mine',
            'focus_all',
            'focus_mine',
            'backlog_all',
            'backlog_mine',
            'open_all',
            'open_mine',
            'done_all',
            'done_mine',
            'archived_all',
            'archived_mine',
        ];
        $defaultFilter = in_array(($value['defaultFilter'] ?? 'all'), $allowedFilters, true)
            ? $value['defaultFilter']
            : 'all';
        $hiddenBoards = [];
        if (!empty($value['hiddenBoards']) && is_array($value['hiddenBoards'])) {
            foreach ($value['hiddenBoards'] as $id) {
                $validated = filter_var($id, FILTER_VALIDATE_INT, [
                    'options' => ['min_range' => 1, 'max_range' => self::MAX_DECK_BOARD_ID],
                ]);
                if ($validated === false) {
                    continue;
                }
                $clamped = $this->clampDeckBoardId((int)$validated);
                if ($clamped !== null) {
                    $hiddenBoards[] = $clamped;
                }
            }
            $hiddenBoards = array_values(array_unique($hiddenBoards));
        }
        $mineMode = 'assignee';
        if (isset($value['mineMode']) && is_string($value['mineMode'])) {
            $mode = $value['mineMode'];
            if (in_array($mode, ['assignee', 'creator', 'both'], true)) {
                $mineMode = $mode;
            }
        }
        $ticker = $defaults['ticker'];
        if (isset($value['ticker']) && is_array($value['ticker'])) {
            $ticker = [
                'autoScroll' => array_key_exists('autoScroll', $value['ticker'])
                    ? $this->normalizeBool($value['ticker']['autoScroll'], $defaults['ticker']['autoScroll'])
                    : $defaults['ticker']['autoScroll'],
                'intervalSeconds' => $this->clampInt(
                    $value['ticker']['intervalSeconds'] ?? $defaults['ticker']['intervalSeconds'],
                    3,
                    10,
                    $defaults['ticker']['intervalSeconds']
                ),
                'showBoardBadges' => array_key_exists('showBoardBadges', $value['ticker'])
                    ? $this->normalizeBool($value['ticker']['showBoardBadges'], $defaults['ticker']['showBoardBadges'])
                    : $defaults['ticker']['showBoardBadges'],
            ];
        }
        return [
            'enabled' => array_key_exists('enabled', $value) ? $this->normalizeBool($value['enabled'], $defaults['enabled']) : $defaults['enabled'],
            'filtersEnabled' => array_key_exists('filtersEnabled', $value) ? $this->normalizeBool($value['filtersEnabled'], $defaults['filtersEnabled']) : $defaults['filtersEnabled'],
            'defaultFilter' => $defaultFilter,
            'hiddenBoards' => $hiddenBoards,
            'mineMode' => $mineMode,
            'solvedIncludesArchived' => array_key_exists('solvedIncludesArchived', $value)
                ? $this->normalizeBool($value['solvedIncludesArchived'], $defaults['solvedIncludesArchived'])
                : $defaults['solvedIncludesArchived'],
            'ticker' => $ticker,
        ];
    }

    private function normalizeBool(mixed $value, bool $default): bool {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            $filtered = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            if ($filtered !== null) {
                return $filtered;
            }
        }
        if (is_int($value)) {
            if ($value === 1) {
                return true;
            }
            if ($value === 0) {
                return false;
            }
            return $default;
        }
        if (is_float($value)) {
            if ($value === 1.0) {
                return true;
            }
            if ($value === 0.0) {
                return false;
            }
            return $default;
        }
        return $default;
    }

    private function clampDeckBoardId(int $id): ?int {
        if ($id <= 0 || $id > self::MAX_DECK_BOARD_ID) {
            return null;
        }
        return $id;
    }

    private function clampInt(mixed $value, int $min, int $max, int $fallback): int {
        if (!is_numeric($value)) {
            return $fallback;
        }
        $n = (int)floor((float)$value);
        if ($n < $min) {
            return $min;
        }
        if ($n > $max) {
            return $max;
        }
        return $n;
    }
}
