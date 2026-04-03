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
                            'layout' => [
                                'width' => 'full',
                                'height' => 'xl',
                                'order' => 20,
                            ],
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
                                'filterMode' => 'category',
                                'filterIds' => [],
                                'showLegend' => true,
                                'showLabels' => true,
                                'compact' => false,
                            ],
                            'layout' => [
                                'width' => 'half',
                                'height' => 'xl',
                                'order' => 58,
                            ],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_pie-1768128829168',
                            'type' => 'chart_pie',
                            'options' => [
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                                'showLegend' => true,
                                'showLabels' => true,
                                'compact' => false,
                            ],
                            'layout' => [
                                'width' => 'half',
                                'height' => 'xl',
                                'order' => 57,
                            ],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_stacked-2ttp7b',
                            'type' => 'chart_stacked',
                            'options' => [
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                                'showLegend' => true,
                                'showLabels' => false,
                                'compact' => false,
                                'forecastMode' => 'total',
                            ],
                            'layout' => [
                                'width' => 'full',
                                'height' => 'xl',
                                'order' => 59,
                            ],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_per_day-5tpozm',
                            'type' => 'chart_per_day',
                            'options' => [
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                                'showLabels' => false,
                                'compact' => false,
                                'forecastMode' => 'total',
                            ],
                            'layout' => [
                                'width' => 'half',
                                'height' => 'xl',
                                'order' => 59.5,
                            ],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-chart_dow-za4squ',
                            'type' => 'chart_dow',
                            'options' => [
                                'filterMode' => 'calendar',
                                'filterIds' => [],
                                'showLabels' => true,
                                'compact' => false,
                                'forecastMode' => 'total',
                            ],
                            'layout' => [
                                'width' => 'half',
                                'height' => 'xl',
                                'order' => 59.8,
                            ],
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
                            ],
                            'layout' => [
                                'width' => 'full',
                                'height' => 'l',
                                'order' => 60,
                            ],
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
                            'layout' => [
                                'width' => 'half',
                                'height' => 'l',
                                'order' => 69,
                            ],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-deck_stats-1768297160410',
                            'type' => 'deck_stats',
                            'options' => [
                                'includeArchived' => true,
                                'includeCompleted' => true,
                                'scope' => 'all',
                                'mineMode' => 'assignee',
                                'metrics' => [
                                    'open_now',
                                    'overdue_now',
                                    'mine_open',
                                    'created_in_range',
                                    'completed_in_range',
                                    'due_in_range',
                                ],
                            ],
                            'layout' => [
                                'width' => 'quarter',
                                'height' => 'm',
                                'order' => 78,
                            ],
                            'version' => 1,
                        ],
                        [
                            'id' => 'widget-note_snippet-1768297161989',
                            'type' => 'note_snippet',
                            'options' => [],
                            'layout' => [
                                'width' => 'quarter',
                                'height' => 'm',
                                'order' => 79,
                            ],
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
                            'layout' => [
                                'width' => 'full',
                                'height' => 'xl',
                                'order' => 89,
                            ],
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
            'showForecast' => true,
            'showHeader' => false,
            'showLegend' => true,
            'showDelta' => true,
            'showPace' => true,
            'showToday' => true,
            'scale' => 'lg',
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
            'scale' => 'md',
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
            'historyView' => 'list',
            'showHistoryCoreMetrics' => true,
            'showActivityDetails' => true,
            'showDelta' => true,
            'scale' => 'md',
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
            'lookbackWeeks' => 3,
            'messageDensity' => 'normal',
            'trendColor' => '#2563EB',
            'showCurrent' => true,
            'labelMode' => 'period',
            'reverseTrend' => false,
        ], ['width' => 'half', 'height' => 'm', 'order' => 30], ++$i);
        $widgets[] = $this->buildWidget('dayoff_trend', [], ['width' => 'half', 'height' => 's', 'order' => 40], ++$i);
        $widgets[] = $this->buildWidget('deck_stats', [
            'includeArchived' => true,
            'includeCompleted' => true,
            'scope' => 'all',
            'mineMode' => 'assignee',
            'metrics' => [
                'open_now',
                'overdue_now',
                'created_in_range',
                'completed_in_range',
                'due_in_range',
            ],
        ], ['width' => 'half', 'height' => 'm', 'order' => 45], ++$i);
        $widgets[] = $this->buildWidget('category_mix_trend', [
            'lookbackWeeks' => 3,
            'density' => 'normal',
            'labelMode' => 'period',
            'colorMode' => 'hybrid',
            'squareCells' => false,
            'showHeader' => true,
            'showBadge' => true,
        ], ['width' => 'full', 'height' => 'l', 'order' => 50], ++$i);
        $widgets[] = $this->buildWidget('calendar_table', [], ['width' => 'full', 'height' => 'l', 'order' => 55], ++$i);
        $widgets[] = $this->buildWidget('chart_pie', [
            'scope' => 'calendar',
            'showLegend' => true,
            'showLabels' => true,
        ], ['width' => 'half', 'height' => 'm', 'order' => 56], ++$i);
        $widgets[] = $this->buildWidget('chart_stacked', [
            'scope' => 'calendar',
            'showLegend' => true,
            'showLabels' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 57], ++$i);
        $widgets[] = $this->buildWidget('chart_per_day', [
            'scope' => 'calendar',
            'showLabels' => false,
        ], ['width' => 'half', 'height' => 'm', 'order' => 58], ++$i);
        $widgets[] = $this->buildWidget('chart_dow', [
            'scope' => 'calendar',
            'showLabels' => true,
        ], ['width' => 'half', 'height' => 'm', 'order' => 58.5], ++$i);
        $widgets[] = $this->buildWidget('chart_hod', [
            'showHint' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 59], ++$i);
        return $widgets;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildProPreset(): array {
        $widgets = [];
        $i = 0;
        $widgets[] = $this->buildWidget('targets_v2', [
            'showForecast' => true,
            'showPace' => true,
            'useLocalConfig' => false,
            'localConfig' => null,
            'showCategoryBlocks' => true,
            'scale' => 'sm',
        ], ['width' => 'half', 'height' => 'xl', 'order' => 10], ++$i);
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
            'showActivityDetails' => true,
            'scale' => 'md',
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
            'historyView' => 'pills',
            'showHistoryCoreMetrics' => true,
            'showActivityDetails' => true,
            'showDelta' => true,
            'scale' => 'md',
        ], ['width' => 'half', 'height' => 'l', 'order' => 25], ++$i);
        $widgets[] = $this->buildWidget('balance_index', [
            'showTrend' => true,
            'showMessages' => true,
            'showConfig' => false,
            'indexBasis' => 'both',
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.3,
            'warnBelow' => 0.3,
            'warnIndex' => 0.6,
            'lookbackWeeks' => 6,
            'messageDensity' => 'many',
            'trendColor' => '#2563EB',
            'showCurrent' => true,
            'labelMode' => 'period',
            'reverseTrend' => false,
            'scale' => 'xl',
        ], ['width' => 'full', 'height' => 'l', 'order' => 30], ++$i);
        $widgets[] = $this->buildWidget('dayoff_trend', [
            'lookback' => 6,
            'showBadges' => true,
            'labelMode' => 'period',
            'toneLowColor' => '#dc2626',
            'toneHighColor' => '#16a34a',
            'scale' => 'xl',
            'dense' => true,
        ], ['width' => 'full', 'height' => 'm', 'order' => 40], ++$i);
        $widgets[] = $this->buildWidget('category_mix_trend', [
            'lookbackWeeks' => 3,
            'density' => 'normal',
            'labelMode' => 'period',
            'colorMode' => 'hybrid',
            'squareCells' => false,
            'showHeader' => true,
            'showBadge' => true,
        ], ['width' => 'full', 'height' => 'l', 'order' => 50], ++$i);
        return $widgets;
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
