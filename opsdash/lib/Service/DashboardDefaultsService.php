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
    public function createDefaultTabs(string $mode): array {
        if ($mode === 'pro') {
            return $this->buildProTabs();
        }
        $preset = $mode === 'quick'
            ? $this->buildQuickPreset()
            : $this->buildStandardPreset();
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
                            'layout' => ['width' => 'full', 'height' => 'xl', 'order' => 10],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-time_summary_lookback-3',
                            'type' => 'time_summary_lookback',
                            'options' => [
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
                                'mode' => 'active',
                                'showToday' => true,
                                'showActivity' => true,
                                'showHistoryCoreMetrics' => true,
                                'historyView' => 'pills',
                                'showActivityDetails' => true,
                                'showDelta' => true,
                                'scale' => 'md',
                                'heightMode' => 'auto',
                            ],
                            'layout' => ['width' => 'full', 'height' => 'l', 'order' => 20],
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
                                'reverseOrder' => false,
                                'heightMode' => 'auto',
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
                                'heightMode' => 'auto',
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
                                'heightMode' => 'auto',
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
                                'heightMode' => 'auto',
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
                            'id' => 'widget-note_editor-1768297159393',
                            'type' => 'note_editor',
                            'options' => [],
                            'layout' => ['width' => 'half', 'height' => 'l', 'order' => 69],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-note_snippet-1768297161989',
                            'type' => 'note_snippet',
                            'options' => [],
                            'layout' => ['width' => 'quarter', 'height' => 'm', 'order' => 79],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-deck_cards-1768297173746',
                            'type' => 'deck_cards',
                            'options' => [
                                'allowMine' => true,
                                'includeArchived' => true,
                                'includeCompleted' => true,
                                'autoScroll' => true,
                                'intervalSeconds' => 5,
                                'showCount' => true,
                                'minFilterCount' => 0,
                                'autoTagsEnabled' => true,
                                'compactList' => true,
                                'customFilters' => [],
                                'filters' => [
                                    'open_all',
                                    'open_mine',
                                    'done_all',
                                    'done_mine',
                                    'archived_all',
                                    'archived_mine',
                                    'due_all',
                                    'due_mine',
                                    'due_today_all',
                                    'due_today_mine',
                                    'created_today_all',
                                    'created_today_mine',
                                ],
                                'defaultFilter' => 'open_all',
                                'mineMode' => 'assignee',
                            ],
                            'layout' => ['width' => 'full', 'height' => 'xl', 'order' => 89],
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
        $widgets = [];
        $i = 0;
        $widgets[] = $this->buildWidget('targets_v2', [
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
            'showHeader' => false,
            'scale' => 'lg'
        ], ['width' => 'half', 'height' => 'l', 'order' => 10], ++$i);
        $widgets[] = $this->buildWidget('time_summary_overview', [
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
            'mode' => 'active',
            'showToday' => true,
            'showActivity' => true,
            'showHistoryCoreMetrics' => true,
            'historyView' => 'accordion',
            'showActivityDetails' => true,
            'showDelta' => true,
            'scale' => 'md',
            'heightMode' => 'auto'
        ], ['width' => 'half', 'height' => 'l', 'order' => 20], ++$i);
        $widgets[] = $this->buildWidget('time_summary_lookback', [
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
            'mode' => 'active',
            'showToday' => true,
            'showActivity' => true,
            'showHistoryCoreMetrics' => true,
            'historyView' => 'list',
            'showActivityDetails' => true,
            'showDelta' => true,
            'scale' => 'md'
        ], ['width' => 'half', 'height' => 'l', 'order' => 25], ++$i);
        $widgets[] = $this->buildWidget('balance_index', [
            'showTrend' => true,
            'showMessages' => true,
            'showConfig' => false,
            'indexBasis' => 'category',
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.3,
            'warnBelow' => 0.3,
            'warnIndex' => 0.6,
            'messageDensity' => 'normal',
            'trendColor' => '#2563EB',
            'showCurrent' => true,
            'labelMode' => 'period',
            'reverseOrder' => false,
            'lookbackWeeks' => 3,
            'reverseTrend' => false
        ], ['width' => 'half', 'height' => 'm', 'order' => 30], ++$i);
        $widgets[] = $this->buildWidget('dayoff_trend', [
            'reverseOrder' => false,
            'labelMode' => 'period',
            'interpretation' => 'more_off_positive',
            'toneLowColor' => '#dc2626',
            'toneHighColor' => '#16a34a',
        ], ['width' => 'half', 'height' => 's', 'order' => 40], ++$i);
        $widgets[] = $this->buildWidget('deck_stats', [
            'scope' => 'all',
            'mineMode' => 'assignee',
            'includeArchived' => true,
            'includeCompleted' => true,
            'metrics' => [
                'open_now',
                'overdue_now',
                'created_in_range',
                'completed_in_range',
                'due_in_range',
            ],
            'heightMode' => 'auto',
        ], ['width' => 'half', 'height' => 'm', 'order' => 55], ++$i);
        $widgets[] = $this->buildWidget('chart_pie', [
            'showLegend' => true,
            'showLabels' => true,
            'compact' => false,
            'filterMode' => 'calendar',
            'filterIds' => [],
            'heightMode' => 'auto',
        ], ['width' => 'half', 'height' => 'm', 'order' => 45], ++$i);
        $widgets[] = $this->buildWidget('calendar_table', [
            'calendarFilter' => [],
            'compact' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 56], ++$i);
        $widgets[] = $this->buildWidget('chart_stacked', [
            'showLegend' => true,
            'showLabels' => false,
            'compact' => false,
            'forecastMode' => 'total',
            'filterMode' => 'calendar',
            'filterIds' => [],
            'heightMode' => 'auto',
        ], ['width' => 'full', 'height' => 'l', 'order' => 57], ++$i);
        $widgets[] = $this->buildWidget('chart_per_day', [
            'showLabels' => false,
            'compact' => false,
            'reverseOrder' => false,
            'forecastMode' => 'total',
            'filterMode' => 'calendar',
            'filterIds' => [],
            'heightMode' => 'auto',
        ], ['width' => 'half', 'height' => 'xl', 'order' => 58], ++$i);
        $widgets[] = $this->buildWidget('chart_dow', [
            'showLabels' => true,
            'compact' => false,
            'reverseOrder' => false,
            'forecastMode' => 'total',
            'filterMode' => 'calendar',
            'filterIds' => [],
            'heightMode' => 'auto',
        ], ['width' => 'half', 'height' => 'm', 'order' => 58.5], ++$i);
        $widgets[] = $this->buildWidget('chart_hod', [
            'showHint' => false,
            'showLegend' => true,
            'lookbackMode' => 'overlay',
            'compact' => false,
            'reverseOrder' => false,
            'heightMode' => 'auto',
        ], ['width' => 'full', 'height' => 'l', 'order' => 59], ++$i);
        $widgets[] = $this->buildWidget('deck_cards', [
            'allowMine' => true,
            'includeArchived' => true,
            'includeCompleted' => true,
            'autoScroll' => true,
            'intervalSeconds' => 5,
            'showCount' => true,
            'minFilterCount' => 0,
            'autoTagsEnabled' => true,
            'compactList' => true,
            'customFilters' => [],
            'filters' => [
                'open_all',
                'open_mine',
                'done_all',
                'done_mine',
                'archived_all',
                'archived_mine',
                'due_all',
                'due_mine',
                'due_today_all',
                'due_today_mine',
                'created_today_all',
                'created_today_mine',
            ],
            'defaultFilter' => 'open_all',
            'mineMode' => 'assignee',
        ], ['width' => 'full', 'height' => 'm', 'order' => 69], ++$i);
        return $widgets;
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
                    'mode' => 'active',
                    'showToday' => true,
                    'showActivity' => true,
                    'showHistoryCoreMetrics' => true,
                    'historyView' => 'accordion',
                    'showActivityDetails' => true,
                    'showDelta' => true,
                    'scale' => 'md',
                    'heightMode' => 'auto',
                ],
                'layout' => ['width' => 'half', 'height' => 'xl', 'order' => 20],
                'version' => 1,
            ],
            [
                'id' => 'widget-deck_stats-1768297160410',
                'type' => 'deck_stats',
                'options' => [
                    'scope' => 'all',
                    'mineMode' => 'assignee',
                    'includeArchived' => true,
                    'includeCompleted' => true,
                    'metrics' => [
                        'open_now',
                        'overdue_now',
                        'mine_open',
                        'created_in_range',
                        'completed_in_range',
                        'due_in_range',
                    ],
                    'heightMode' => 'auto',
                ],
                'layout' => ['width' => 'half', 'height' => 'm', 'order' => 30],
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
                    'lookbackWeeks' => 6,
                    'reverseTrend' => false,
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
                    'toneLowColor' => '#dc2626',
                    'toneHighColor' => '#16a34a',
                    'lookback' => 6,
                    'showBadges' => true,
                    'scale' => 'xl',
                    'dense' => true,
                ],
                'layout' => ['width' => 'full', 'height' => 'm', 'order' => 60],
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
