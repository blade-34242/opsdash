<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class DashboardDefaultsService {
    /**
     * @return array{
     *   quick: array<int, array<string,mixed>>,
     *   standard: array<int, array<string,mixed>>,
     *   pro: array<int, array<string,mixed>>
     * }
     */
    public function getPresets(): array {
        return [
            'quick' => $this->buildQuickPreset(),
            'standard' => $this->buildStandardPreset(),
            'pro' => $this->buildProPreset(),
        ];
    }

    /**
     * @return array{tabs: array<int, array{id: string, label: string, widgets: array<int, array<string,mixed>>}>, defaultTabId: string}
     */
    public function createDefaultTabs(string $mode, string $strategy = ''): array {
        if ($mode === 'pro') {
            return $this->buildProTabs();
        }
        $preset = $mode === 'quick'
            ? $this->buildQuickPreset()
            : $this->buildStandardPresetForStrategy($strategy);
        return [
            'tabs' => [
                [
                    'id' => 'tab-1',
                    'label' => 'Overview',
                    'widgets' => $preset,
                ],
            ],
            'defaultTabId' => 'tab-1',
        ];
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildStandardPresetForStrategy(string $strategy): array {
        $allowedByStrategy = [
            'total_only' => ['targets_v2', 'time_summary_overview', 'dayoff_trend'],
            'total_plus_categories' => [
                'targets_v2', 'time_summary_overview', 'dayoff_trend', 'chart_pie',
                'calendar_table', 'chart_stacked',
            ],
        ];
        $allowed = $allowedByStrategy[$strategy] ?? null;
        $preset = $this->buildStandardPreset();
        if ($allowed === null) {
            return $preset;
        }
        return array_values(array_filter(
            $preset,
            static fn (array $widget): bool => in_array((string)($widget['type'] ?? ''), $allowed, true),
        ));
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildQuickPreset(): array {
        // "quick" maps to the empty dashboard mode: one tab with no widgets.
        return [];
    }

    /**
     * @return array{tabs: array<int, array{id: string, label: string, widgets: array<int, array<string,mixed>>}>, defaultTabId: string}
     */
    private function buildProTabs(): array {
        return [
            'tabs' => [
                [
                    'id' => 'tab-1',
                    'label' => 'Overview',
                    'widgets' => $this->buildProPreset(),
                ],
                [
                    'id' => 'tab-mjp2ziuq',
                    'label' => 'Table',
                    'widgets' => [
                        [
                            'id' => 'widget-calendar_table-1768128709761',
                            'type' => 'calendar_table',
                            'options' => [
                                'calendarFilter' => [],
                                'compact' => false,
                                'scale' => 'xl',
                            ],
                            'layout' => ['width' => 'full', 'height' => 'xl', 'order' => 20],
                            'version' => 1,
                        ],
                    ],
                ],
                [
                    'id' => 'tab-mk4vuh6c',
                    'label' => 'Charts',
                    'widgets' => [
                        [
                            'id' => 'widget-chart_pie-112jzy',
                            'type' => 'chart_pie',
                            'options' => [
                                'showLegend' => true,
                                'showLabels' => true,
                                'compact' => false,
                                'filterMode' => 'category',
                                'filterIds' => [],
                            ],
                            'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 58],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_pie-1768128829168',
                            'type' => 'chart_pie',
                            'options' => [
                                'showLegend' => true,
                                'showLabels' => true,
                                'compact' => false,
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                            ],
                            'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 57],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_stacked-2ttp7b',
                            'type' => 'chart_stacked',
                            'options' => [
                                'showLegend' => true,
                                'showLabels' => false,
                                'compact' => false,
                                'forecastMode' => 'total',
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                            ],
                            'layout' => ['width' => 'full', 'height' => 'xl', 'order' => 59],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_per_day-5tpozm',
                            'type' => 'chart_per_day',
                            'options' => [
                                'showLabels' => false,
                                'compact' => false,
                                'reverseOrder' => false,
                                'forecastMode' => 'total',
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                            ],
                            'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 59.5],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_dow-za4squ',
                            'type' => 'chart_dow',
                            'options' => [
                                'showLabels' => true,
                                'compact' => false,
                                'reverseOrder' => false,
                                'forecastMode' => 'total',
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                            ],
                            'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 59.8],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_hod-9rg0fn',
                            'type' => 'chart_hod',
                            'options' => [
                                'showHint' => true,
                                'showLegend' => true,
                                'lookbackMode' => 'overlay',
                                'compact' => true,
                                'reverseOrder' => false,
                            ],
                            'layout' => ['width' => 'full', 'height' => 'l', 'order' => 60],
                            'version' => 1,
                        ],
                    ],
                ],
                [
                    'id' => 'tab-mk4w4rau',
                    'label' => 'Workspace',
                    'widgets' => [
                        [
                            'id' => 'widget-deck_stats-1768297160410',
                            'type' => 'deck_stats',
                            'options' => [
                                'scope' => 'all', 'mineMode' => 'assignee',
                                'includeArchived' => true, 'includeCompleted' => true,
                                'metrics' => ['open_now', 'overdue_now', 'mine_open', 'created_in_range', 'completed_in_range', 'due_in_range'],
                            ],
                            'layout' => ['width' => 'quarter', 'height' => 'xl', 'order' => 78],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-deck_cards-1768297173746',
                            'type' => 'deck_cards',
                            'options' => [
                                'allowMine' => true,
                                'includeArchived' => true,
                                'includeCompleted' => true,
                                'autoScroll' => false,
                                'intervalSeconds' => 5,
                                'showCount' => true,
                                'minFilterCount' => 1,
                                'maxVisible' => 8,
                                'autoTagsEnabled' => true,
                                'compactList' => false,
                                'customFilters' => [],
                                'filters' => [
                                    'focus_all',
                                    'focus_mine',
                                    'backlog_all',
                                    'backlog_mine',
                                    'all',
                                ],
                                'defaultFilter' => 'focus_all',
                                'mineMode' => 'assignee',
                            ],
                            'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 89],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-calendar_stats-1784281692933',
                            'type' => 'calendar_stats',
                            'options' => ['metrics' => ['tracked_hours', 'planned_later', 'event_count', 'average_event_duration']],
                            'layout' => ['width' => 'quarter', 'height' => 'xl', 'order' => 99],
                            'version' => 1,
                        ],
                    ],
                ],
            ],
            'defaultTabId' => 'tab-1',
        ];
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildStandardPreset(): array {
        return [
            [
                'id' => 'widget-targets_v2-1',
                'type' => 'targets_v2',
                'options' => [
                    'showLegend' => true,
                    'showDelta' => true,
                    'showForecast' => true,
                    'showPace' => true,
                    'neverFinishedMode' => false,
                    'showToday' => true,
                    'showTotalDelta' => true,
                    'showNeedPerDay' => true,
                    'showCategoryBlocks' => true,
                    'badges' => true,
                    'includeWeekendToggle' => true,
                    'includeZeroDaysInStats' => false,
                    'useLocalConfig' => false,
                ],
                'layout' => ['width' => 'half', 'height' => 'l', 'order' => 10],
                'version' => 1,
            ],
            [
                'id' => 'widget-time_summary_overview-2',
                'type' => 'time_summary_overview',
                'options' => [
                    'heightMode' => 'auto',
                    'defaultView' => 'auto',
                    'showDailyKpis' => true,
                    'showWeekMiniChart' => true,
                    'showEmptyLanes' => true,
                    'maxLanes' => 4,
                    'showActivityNote' => true,
                    'showRangeInTitle' => false,
                ],
                'layout' => ['width' => 'half', 'height' => 'l', 'order' => 20],
                'version' => 1,
            ],
            [
                'id' => 'widget-balance_index-4',
                'type' => 'balance_index',
                'options' => [
                    'showConfig' => false,
                    'showTrend' => true,
                    'showMessages' => true,
                    'showCurrent' => true,
                    'reverseOrder' => false,
                    'messageDensity' => 'normal',
                    'indexBasis' => 'category',
                    'labelMode' => 'period',
                    'noticeAbove' => 0.15,
                    'noticeBelow' => 0.15,
                    'warnAbove' => 0.3,
                    'warnBelow' => 0.3,
                    'warnIndex' => 0.6,
                    'trendColor' => '#2563EB',
                ],
                'layout' => ['width' => 'half', 'height' => 'm', 'order' => 30],
                'version' => 1,
            ],
            [
                'id' => 'widget-dayoff_trend-5',
                'type' => 'dayoff_trend',
                'options' => [
                    'reverseOrder' => false,
                    'labelMode' => 'period',
                    'interpretation' => 'more_off_positive',
                    'toneLowColor' => '#DC2626',
                    'toneHighColor' => '#16A34A',
                ],
                'layout' => ['width' => 'half', 'height' => 's', 'order' => 40],
                'version' => 1,
            ],
            [
                'id' => 'widget-chart_pie-7',
                'type' => 'chart_pie',
                'options' => [
                    'heightMode' => 'auto',
                    'showLegend' => true,
                    'showLabels' => true,
                    'compact' => false,
                    'filterMode' => 'calendar',
                    'filterIds' => [],
                ],
                'layout' => ['width' => 'half', 'height' => 'm', 'order' => 45],
                'version' => 1,
            ],
            [
                'id' => 'widget-calendar_table-8',
                'type' => 'calendar_table',
                'options' => [
                    'calendarFilter' => [],
                    'compact' => false,
                ],
                'layout' => ['width' => 'full', 'height' => 'l', 'order' => 56],
                'version' => 1,
            ],
            [
                'id' => 'widget-chart_stacked-9',
                'type' => 'chart_stacked',
                'options' => [
                    'heightMode' => 'auto',
                    'showLegend' => true,
                    'showLabels' => false,
                    'compact' => false,
                    'forecastMode' => 'total',
                    'filterMode' => 'calendar',
                    'filterIds' => [],
                ],
                'layout' => ['width' => 'full', 'height' => 'l', 'order' => 57],
                'version' => 1,
            ],
            [
                'id' => 'widget-chart_per_day-10',
                'type' => 'chart_per_day',
                'options' => [
                    'showLabels' => false,
                    'compact' => false,
                    'reverseOrder' => false,
                    'forecastMode' => 'total',
                    'filterMode' => 'calendar',
                    'filterIds' => [],
                ],
                'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 58],
                'version' => 1,
            ],
            [
                'id' => 'widget-chart_dow-11',
                'type' => 'chart_dow',
                'options' => [
                    'showLabels' => true,
                    'compact' => false,
                    'reverseOrder' => false,
                    'forecastMode' => 'total',
                    'filterMode' => 'calendar',
                    'filterIds' => [],
                ],
                'layout' => ['width' => 'half', 'height' => 'm', 'order' => 58.5],
                'version' => 1,
            ],
            [
                'id' => 'widget-chart_hod-12',
                'type' => 'chart_hod',
                'options' => [
                    'showLegend' => true,
                    'showHint' => false,
                    'compact' => false,
                    'reverseOrder' => false,
                    'lookbackMode' => 'overlay',
                ],
                'layout' => ['width' => 'full', 'height' => 'l', 'order' => 59],
                'version' => 1,
            ],
            [
                'id' => 'widget-category_mix_trend-standard',
                'type' => 'category_mix_trend',
                'options' => [
                    'density' => 'normal', 'labelMode' => 'period', 'colorMode' => 'hybrid',
                    'trendIndicator' => 'none', 'squareCells' => false, 'reverseOrder' => false,
                    'showHeader' => true, 'showBadge' => true, 'shareLowColor' => '#E2E8F0',
                    'shareHighColor' => '#60A5FA', 'toneLowColor' => '#E11D48', 'toneHighColor' => '#10B981',
                ],
                'layout' => ['width' => 'full', 'height' => 'm', 'order' => 79],
                'version' => 1,
            ],
        ];
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildProPreset(): array {
        return [
            [
                'id' => 'widget-targets_v2-1',
                'type' => 'targets_v2',
                'options' => [
                    'showLegend' => true,
                    'showDelta' => true,
                    'showForecast' => true,
                    'showPace' => true,
                    'neverFinishedMode' => false,
                    'showToday' => true,
                    'showTotalDelta' => true,
                    'showNeedPerDay' => true,
                    'showCategoryBlocks' => true,
                    'badges' => true,
                    'includeWeekendToggle' => true,
                    'includeZeroDaysInStats' => false,
                    'useLocalConfig' => false,
                    'localConfig' => null,
                    'scale' => 'md',
                    'heightMode' => 'auto',
                ],
                'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 10],
                'version' => 1,
            ],
            [
                'id' => 'widget-time_summary_overview-2',
                'type' => 'time_summary_overview',
                'options' => [
                    'defaultView' => 'auto',
                    'showDailyKpis' => true,
                    'showWeekMiniChart' => true,
                    'showEmptyLanes' => false,
                    'maxLanes' => 4,
                    'showActivityNote' => true,
                    'showRangeInTitle' => false,
                    'scale' => 'md',
                    'heightMode' => 'auto',
                ],
                'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 20],
                'version' => 1,
            ],
            [
                'id' => 'widget-balance_index-4',
                'type' => 'balance_index',
                'options' => [
                    'showTrend' => true,
                    'showMessages' => true,
                    'showConfig' => false,
                    'indexBasis' => 'both',
                    'noticeAbove' => 0.15,
                    'noticeBelow' => 0.15,
                    'warnAbove' => 0.3,
                    'warnBelow' => 0.3,
                    'warnIndex' => 0.6,
                    'messageDensity' => 'many',
                    'trendColor' => '#2563EB',
                    'showCurrent' => true,
                    'labelMode' => 'period',
                    'reverseOrder' => false,
                    'scale' => 'xl',
                ],
                'layout' => ['width' => 'full', 'height' => 'l', 'order' => 40],
                'version' => 1,
            ],
            [
                'id' => 'widget-dayoff_trend-5',
                'type' => 'dayoff_trend',
                'options' => [
                    'reverseOrder' => false,
                    'labelMode' => 'period',
                    'interpretation' => 'more_off_positive',
                    'toneLowColor' => '#DC2626',
                    'toneHighColor' => '#16A34A',
                    'ignoreCalendarIds' => [],
                    'ignoreCategoryIds' => [],
                    'scale' => 'xl',
                    'dense' => true,
                ],
                'layout' => ['width' => 'full', 'height' => 'm', 'order' => 60],
                'version' => 1,
            ],
            [
                'id' => 'widget-category_mix_trend-1784279284521',
                'type' => 'category_mix_trend',
                'options' => [
                    'density' => 'normal', 'labelMode' => 'period', 'colorMode' => 'hybrid',
                    'trendIndicator' => 'none', 'squareCells' => false, 'reverseOrder' => false,
                    'showHeader' => true, 'showBadge' => true, 'shareLowColor' => '#E2E8F0',
                    'shareHighColor' => '#60A5FA', 'toneLowColor' => '#E11D48', 'toneHighColor' => '#10B981',
                ],
                'layout' => ['width' => 'full', 'height' => 'm', 'order' => 70],
                'version' => 1,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $options
     * @param array<string,mixed> $layout
     * @return array<string,mixed>
     */
    private function buildWidget(string $type, array $options, array $layout, int $index): array {
        return [
            'id' => sprintf('widget-%s-%d', $type, $index),
            'type' => $type,
            'options' => $options,
            'layout' => [
                'width' => (string)($layout['width'] ?? 'full'),
                'height' => (string)($layout['height'] ?? 'm'),
                'order' => is_numeric($layout['order'] ?? null) ? (float)$layout['order'] : 0.0,
            ],
            'version' => 1,
        ];
    }
}
