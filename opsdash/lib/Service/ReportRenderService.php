<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IURLGenerator;
use OCP\Mail\IMailer;

final class ReportRenderService {
    public function __construct(
        private IMailer $mailer,
        private IURLGenerator $urlGenerator,
    ) {
    }

    /**
     * @param array<string,mixed> $summary
     * @param array<string,mixed> $reportingConfig
     * @return array{subject:string,plain:string,html:string}
     */
    public function render(array $summary, array $reportingConfig, string $displayName): array {
        $rangeLabel = ($summary['range'] ?? 'week') === 'month' ? 'Monthly' : 'Weekly';
        $periodLabel = sprintf('%s to %s', (string)($summary['from'] ?? ''), (string)($summary['to'] ?? ''));
        $reportVariant = $this->resolveReportVariant($summary);
        $reportVariantLabel = $this->reportVariantLabel($reportVariant);
        $activePreset = trim((string)($summary['active_preset'] ?? ''));

        $subject = sprintf('Opsdash recap · %s · %s', $rangeLabel, $periodLabel);

        $selectedLabels = array_values(array_map('strval', $summary['selected_labels'] ?? []));
        $selectedLine = empty($selectedLabels)
            ? 'None'
            : implode(', ', array_map([$this, 'escape'], $selectedLabels));
        $topCalendar = is_array($summary['top_calendar'] ?? null) ? $summary['top_calendar'] : null;
        $topCategory = is_array($summary['top_category'] ?? null) ? $summary['top_category'] : null;
        $targets = is_array($summary['targets'] ?? null) ? $summary['targets'] : [];
        $targetTotal = is_array($targets['total'] ?? null) ? $targets['total'] : [];
        $calendarRows = is_array($targets['calendars'] ?? null) ? $targets['calendars'] : [];
        $categoryRows = is_array($targets['categories'] ?? null) ? $targets['categories'] : [];
        $balance = is_array($summary['balance'] ?? null) ? $summary['balance'] : [];
        $balanceWarnings = array_values(array_map('strval', $balance['warnings'] ?? []));
        $notes = is_array($summary['notes'] ?? null) ? $summary['notes'] : [];
        $busiestDay = is_array($summary['busiest_day'] ?? null) ? $summary['busiest_day'] : null;
        $longestSession = is_array($summary['longest_session'] ?? null) ? $summary['longest_session'] : null;

        $template = $this->mailer->createEMailTemplate('opsdash.report.test');
        $template->setSubject($subject);
        $template->addHeader();
        $template->addHeading('Opsdash recap');
        $template->addBodyText(
            $this->renderHeroHtml($summary, $reportVariant, $displayName, $rangeLabel, $periodLabel, $selectedLine, $reportVariantLabel, $activePreset),
            $this->renderHeroPlain($displayName, $rangeLabel, $periodLabel, $selectedLine, $reportVariantLabel, $activePreset),
        );

        switch ($reportVariant) {
            case 'calendar_goals':
                $template->addBodyText(
                    $this->renderKpiGridHtml($this->calendarGoalKpis($summary, $topCalendar)),
                    $this->renderKpiGridPlain('KPI snapshot', $this->calendarGoalKpis($summary, $topCalendar)),
                );
                $template->addBodyText(
                    $this->renderTargetBoardHtml('Calendar targets', 'Per-calendar progress for the selected recap period.', $targetTotal, $calendarRows, 'Calendar'),
                    $this->renderTargetBoardPlain('Calendar targets', $targetTotal, $calendarRows),
                );
                $template->addBodyText(
                    $this->renderActivityHtml($summary, $busiestDay, $longestSession),
                    $this->renderActivityPlain($summary, $busiestDay, $longestSession),
                );
                break;

            case 'category_and_calendar_goals':
                $template->addBodyText(
                    $this->renderKpiGridHtml($this->categoryGoalKpis($summary, $topCalendar, $topCategory)),
                    $this->renderKpiGridPlain('KPI snapshot', $this->categoryGoalKpis($summary, $topCalendar, $topCategory)),
                );
                $template->addBodyText(
                    $this->renderTargetBoardHtml('Targets &amp; pace', 'Category targets and pacing signals for this recap window.', $targetTotal, $categoryRows, 'Category'),
                    $this->renderTargetBoardPlain('Targets & pace', $targetTotal, $categoryRows),
                );
                $template->addBodyText(
                    $this->renderBalanceHtml($balance, $balanceWarnings),
                    $this->renderBalancePlain($balance, $balanceWarnings),
                );
                $template->addBodyText(
                    $this->renderActivityHtml($summary, $busiestDay, $longestSession),
                    $this->renderActivityPlain($summary, $busiestDay, $longestSession),
                );
                break;

            case 'single_goal':
            default:
                $template->addBodyText(
                    $this->renderKpiGridHtml($this->singleGoalKpis($summary, $topCalendar)),
                    $this->renderKpiGridPlain('KPI snapshot', $this->singleGoalKpis($summary, $topCalendar)),
                );
                $template->addBodyText(
                    $this->renderProgressHtml($targetTotal),
                    $this->renderProgressPlain($targetTotal),
                );
                $template->addBodyText(
                    $this->renderActivityHtml($summary, $busiestDay, $longestSession),
                    $this->renderActivityPlain($summary, $busiestDay, $longestSession),
                );
                break;
        }

        $template->addBodyText(
            $this->renderNotesHtml($notes, $reportingConfig),
            $this->renderNotesPlain($notes, $reportingConfig),
        );
        $template->addBodyButton(
            'Open Opsdash overview',
            $this->urlGenerator->linkToRouteAbsolute('opsdash.overview.index'),
        );
        $template->addFooter('You\'re receiving this because you have automatic recaps enabled in Opsdash.');

        return [
            'subject' => $template->renderSubject(),
            'plain' => $template->renderText(),
            'html' => $template->renderHtml(),
        ];
    }

    private function resolveReportVariant(array $summary): string {
        $variant = (string)($summary['report_variant'] ?? '');
        return match ($variant) {
            'calendar_goals', 'category_and_calendar_goals' => $variant,
            default => 'single_goal',
        };
    }

    private function reportVariantLabel(string $variant): string {
        return match ($variant) {
            'calendar_goals' => 'Calendar Goals',
            'category_and_calendar_goals' => 'Calendar + Category Goals',
            default => 'Single Goal',
        };
    }

    /**
     * @return array<int,array{label:string,value:string,detail:string}>
     */
    private function singleGoalKpis(array $summary, ?array $topCalendar): array {
        $cards = [
            ['label' => 'Total hours', 'value' => $this->formatHours((float)($summary['total_hours'] ?? 0.0)), 'detail' => 'Tracked in this period'],
            ['label' => 'Target progress', 'value' => $this->formatPercent((float)($summary['targets']['total']['percent'] ?? 0.0)) . '%', 'detail' => $this->statusLabel((string)($summary['targets']['total']['status'] ?? 'none'))],
            ['label' => 'Remaining', 'value' => $this->formatHours((float)($summary['targets']['total']['remaining'] ?? 0.0)), 'detail' => 'Still needed to hit the total goal'],
            ['label' => 'Active days', 'value' => (string)(int)($summary['active_days'] ?? 0), 'detail' => 'Days with tracked activity'],
            ['label' => 'Events', 'value' => (string)(int)($summary['events'] ?? 0), 'detail' => 'Captured events'],
            ['label' => 'Avg / day', 'value' => $this->formatHours((float)($summary['avg_per_day'] ?? 0.0)), 'detail' => 'Across active days'],
        ];
        if ($topCalendar) {
            $cards[] = ['label' => 'Top calendar', 'value' => (string)($topCalendar['label'] ?? ''), 'detail' => $this->formatHours((float)($topCalendar['hours'] ?? 0.0))];
        }
        return $cards;
    }

    /**
     * @return array<int,array{label:string,value:string,detail:string}>
     */
    private function calendarGoalKpis(array $summary, ?array $topCalendar): array {
        $cards = [
            ['label' => 'Total hours', 'value' => $this->formatHours((float)($summary['total_hours'] ?? 0.0)), 'detail' => 'Tracked across selected calendars'],
            ['label' => 'Calendar pace', 'value' => $this->formatPercent((float)($summary['targets']['total']['percent'] ?? 0.0)) . '%', 'detail' => $this->statusLabel((string)($summary['targets']['total']['status'] ?? 'none'))],
            ['label' => 'Future planned', 'value' => $this->formatHours((float)($summary['future_hours'] ?? 0.0)), 'detail' => 'Still scheduled ahead'],
            ['label' => 'Active days', 'value' => (string)(int)($summary['active_days'] ?? 0), 'detail' => 'Days with tracked activity'],
            ['label' => 'Avg / event', 'value' => $this->formatHours((float)($summary['avg_per_event'] ?? 0.0)), 'detail' => 'Typical event size'],
            ['label' => 'Selected calendars', 'value' => (string)(int)($summary['selected_count'] ?? 0), 'detail' => 'Included in this recap'],
        ];
        if ($topCalendar) {
            $cards[] = ['label' => 'Top calendar', 'value' => (string)($topCalendar['label'] ?? ''), 'detail' => $this->formatHours((float)($topCalendar['hours'] ?? 0.0))];
        }
        return $cards;
    }

    /**
     * @return array<int,array{label:string,value:string,detail:string}>
     */
    private function categoryGoalKpis(array $summary, ?array $topCalendar, ?array $topCategory): array {
        $cards = [
            ['label' => 'Total hours', 'value' => $this->formatHours((float)($summary['total_hours'] ?? 0.0)), 'detail' => 'Tracked in this period'],
            ['label' => 'Target progress', 'value' => $this->formatPercent((float)($summary['targets']['total']['percent'] ?? 0.0)) . '%', 'detail' => $this->statusLabel((string)($summary['targets']['total']['status'] ?? 'none'))],
            ['label' => 'Balance index', 'value' => $this->formatIndex((float)($summary['balance']['index'] ?? 0.0)), 'detail' => 'Time mix health'],
            ['label' => 'Active days', 'value' => (string)(int)($summary['active_days'] ?? 0), 'detail' => 'Days with tracked activity'],
            ['label' => 'Future planned', 'value' => $this->formatHours((float)($summary['future_hours'] ?? 0.0)), 'detail' => 'Still scheduled ahead'],
            ['label' => 'Events', 'value' => (string)(int)($summary['events'] ?? 0), 'detail' => 'Captured events'],
        ];
        if ($topCalendar) {
            $cards[] = ['label' => 'Top calendar', 'value' => (string)($topCalendar['label'] ?? ''), 'detail' => $this->formatHours((float)($topCalendar['hours'] ?? 0.0))];
        }
        if ($topCategory) {
            $cards[] = ['label' => 'Top category', 'value' => (string)($topCategory['label'] ?? ''), 'detail' => $this->formatHours((float)($topCategory['hours'] ?? 0.0))];
        }
        return $cards;
    }

    private function renderHeroHtml(
        array $summary,
        string $reportVariant,
        string $displayName,
        string $rangeLabel,
        string $periodLabel,
        string $selectedLine,
        string $reportVariantLabel,
        string $activePreset = '',
    ): string {
        switch ($reportVariant) {
            case 'calendar_goals':
                $stats = [
                    ['Total hours',    $this->formatHours((float)($summary['total_hours'] ?? 0.0)),                              '#22d3ee'],
                    ['Calendar pace',  $this->formatPercent((float)($summary['targets']['total']['percent'] ?? 0.0)) . '%',      '#c4b5fd'],
                    ['Active days',    (string)(int)($summary['active_days'] ?? 0),                                              '#ffffff'],
                    ['Future planned', $this->formatHours((float)($summary['future_hours'] ?? 0.0)),                             '#fcd34d'],
                ];
                break;
            case 'category_and_calendar_goals':
                $stats = [
                    ['Total hours',    $this->formatHours((float)($summary['total_hours'] ?? 0.0)),                              '#22d3ee'],
                    ['Target',         $this->formatPercent((float)($summary['targets']['total']['percent'] ?? 0.0)) . '%',      '#c4b5fd'],
                    ['Active days',    (string)(int)($summary['active_days'] ?? 0),                                              '#ffffff'],
                    ['Balance index',  $this->formatIndex((float)($summary['balance']['index'] ?? 0.0)),                         '#fcd34d'],
                ];
                break;
            default:
                $stats = [
                    ['Total hours', $this->formatHours((float)($summary['total_hours'] ?? 0.0)),                                 '#22d3ee'],
                    ['Target',      $this->formatPercent((float)($summary['targets']['total']['percent'] ?? 0.0)) . '%',         '#c4b5fd'],
                    ['Active days', (string)(int)($summary['active_days'] ?? 0),                                                 '#ffffff'],
                    ['Events',      (string)(int)($summary['events'] ?? 0),                                                      '#fcd34d'],
                ];
        }

        $statCells = '';
        foreach ($stats as $i => [$label, $value, $color]) {
            $pr = $i < 3 ? 'padding-right:6px;' : '';
            $statCells .= sprintf(
                '<td style="width:25%%;vertical-align:top;%s">
                    <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px 10px;">
                        <div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:5px;">%s</div>
                        <div style="font-size:20px;font-weight:800;color:%s;line-height:1;">%s</div>
                    </div>
                </td>',
                $pr,
                $this->escape($label),
                $color,
                $this->escape($value),
            );
        }

        $presetPillHtml = $activePreset !== ''
            ? sprintf(
                '<div style="margin-bottom:14px;">
                    <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);font-size:11px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.04em;">%s</span>
                </div>',
                $this->escape($activePreset),
              )
            : '';

        return sprintf(
            '<div style="background:linear-gradient(145deg,#0f1f35 0%%,#1e3a5f 55%%,#0c4a78 100%%);border-radius:16px;padding:28px 26px 24px;color:#ffffff;">
                <div style="font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px;">%s recap</div>
                <div style="font-size:30px;line-height:1.05;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;">%s</div>
                %s<div style="font-size:14px;color:rgba(255,255,255,.55);margin-bottom:22px;">Hey %s — here\'s how your %s went.</div>
                <table role="presentation" style="width:100%%;border-collapse:collapse;"><tr>%s</tr></table>
                <table role="presentation" style="width:100%%;border-collapse:collapse;margin-top:14px;">
                    <tr>
                        <td style="width:60%%;padding-right:6px;vertical-align:top;">
                            <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);">
                                <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:3px;">Calendars</div>
                                <div style="font-size:12px;color:rgba(255,255,255,.8);line-height:1.4;">%s</div>
                            </div>
                        </td>
                        <td style="width:40%%;vertical-align:top;">
                            <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);">
                                <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:3px;">Model</div>
                                <div style="font-size:12px;color:rgba(255,255,255,.8);">%s</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>',
            $this->escape($rangeLabel),
            $this->escape($periodLabel),
            $presetPillHtml,
            $this->escape($displayName !== '' ? $displayName : 'there'),
            $this->escape(strtolower($rangeLabel)),
            $statCells,
            $selectedLine,
            $this->escape($reportVariantLabel),
        );
    }

    private function renderHeroPlain(
        string $displayName,
        string $rangeLabel,
        string $periodLabel,
        string $selectedLine,
        string $reportVariantLabel,
        string $activePreset = '',
    ): string {
        $lines = [
            sprintf('Hey %s,', $displayName !== '' ? $displayName : 'there'),
            '',
            sprintf('%s recap · %s', $rangeLabel, $periodLabel),
        ];
        if ($activePreset !== '') {
            $lines[] = sprintf('Profile: %s', $activePreset);
        }
        $lines[] = sprintf('Calendars: %s', $selectedLine);
        $lines[] = sprintf('Model: %s', $reportVariantLabel);
        return implode(PHP_EOL, $lines);
    }

    /**
     * @param array<int,array{label:string,value:string,detail:string}> $cards
     */
    private function renderKpiGridHtml(array $cards): string {
        // TimeSummaryCard style — single white card with label/value rows
        $rows = '';
        foreach ($cards as $i => $card) {
            $borderTop = $i > 0 ? 'border-top:1px solid #f1f5f9;' : '';
            $rows .= sprintf(
                '<tr>
                    <td style="padding:9px 0;%s vertical-align:middle;">
                        <span style="font-size:13px;color:#64748b;">%s</span>
                    </td>
                    <td style="padding:9px 0;%s vertical-align:middle;text-align:right;">
                        <div style="font-size:13px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">%s</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:1px;">%s</div>
                    </td>
                </tr>',
                $borderTop,
                $this->escape($card['label']),
                $borderTop,
                $this->escape($card['value']),
                $this->escape($card['detail']),
            );
        }

        $inner = $this->widgetTitle('Time summary', 'Key metrics for this recap period')
            . sprintf('<table role="presentation" style="width:100%%;border-collapse:collapse;">%s</table>', $rows);

        return $this->widgetCard($inner);
    }

    /**
     * @param array<int,array{label:string,value:string,detail:string}> $cards
     */
    private function renderKpiGridPlain(string $title, array $cards): string {
        $lines = [$title];
        foreach ($cards as $card) {
            $lines[] = sprintf('%s: %s (%s)', $card['label'], $card['value'], $card['detail']);
        }
        return implode(PHP_EOL, $lines);
    }

    /**
     * @param array<string,mixed> $targetTotal
     */
    private function renderProgressHtml(array $targetTotal): string {
        // TimeTargetsCard single-goal style
        $pct       = (float)($targetTotal['percent'] ?? 0.0);
        $status    = (string)($targetTotal['status'] ?? 'none');
        $bar       = min(100, (int)round($pct));
        [$pillBg, $pillColor, $barColor] = $this->statusStyles($status);
        $actual    = $this->escape($this->formatHours((float)($targetTotal['actual'] ?? 0.0)));
        $target    = $this->escape($this->formatHours((float)($targetTotal['target'] ?? 0.0)));
        $remaining = $this->escape($this->formatHours((float)($targetTotal['remaining'] ?? 0.0)));
        $pctText   = $this->escape($this->formatPercent($pct));
        $statusTxt = $this->escape($this->statusLabel($status));

        $inner = $this->widgetTitle('Targets')
            // total line: actual / target
            . sprintf(
                '<div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1;margin-bottom:4px;">
                    %s <span style="font-size:14px;color:#94a3b8;font-weight:400;">/ %s</span>
                </div>',
                $actual, $target,
            )
            // progress bar
            . $this->progressBar($bar, $barColor, '10px 0 8px')
            // footer: percent · status · remaining
            . sprintf(
                '<div style="font-size:13px;color:#0f172a;">
                    <span style="font-weight:700;font-variant-numeric:tabular-nums;">%s%%</span>
                    <span style="margin:0 6px;color:#cbd5e1;">·</span>
                    %s
                    <span style="margin-left:6px;color:#94a3b8;">· remaining %s</span>
                </div>',
                $pctText,
                $this->statusPill($statusTxt, $pillBg, $pillColor),
                $remaining,
            );

        return $this->widgetCard($inner);
    }

    /**
     * @param array<string,mixed> $targetTotal
     */
    private function renderProgressPlain(array $targetTotal): string {
        return implode(PHP_EOL, [
            'Goal progress',
            sprintf(
                'Total: %s / %s (%s%%) · %s · remaining %s',
                $this->formatHours((float)($targetTotal['actual'] ?? 0.0)),
                $this->formatHours((float)($targetTotal['target'] ?? 0.0)),
                $this->formatPercent((float)($targetTotal['percent'] ?? 0.0)),
                $this->statusLabel((string)($targetTotal['status'] ?? 'none')),
                $this->formatHours((float)($targetTotal['remaining'] ?? 0.0)),
            ),
        ]);
    }

    /**
     * @param array<string,mixed> $targetTotal
     * @param array<int,array<string,mixed>> $rows
     */
    private function renderTargetBoardHtml(string $title, string $intro, array $targetTotal, array $rows, string $rowLabel): string {
        // TimeTargetsCard style: total summary + per-row category/calendar blocks with dot, bar, status
        $totalStatus = (string)($targetTotal['status'] ?? 'none');
        $totalPct    = (float)($targetTotal['percent'] ?? 0.0);
        $totalBar    = min(100, (int)round($totalPct));
        [$tPillBg, $tPillColor, $tBarColor] = $this->statusStyles($totalStatus);

        // Total line
        $totalHtml = sprintf(
            '<table role="presentation" style="width:100%%;border-collapse:collapse;margin-bottom:4px;">
                <tr>
                    <td style="vertical-align:middle;">
                        <span style="font-size:22px;font-weight:800;color:#0f172a;">%s</span>
                        <span style="font-size:13px;color:#94a3b8;margin-left:4px;">/ %s</span>
                    </td>
                    <td style="vertical-align:middle;text-align:right;">
                        <span style="font-size:13px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">%s%%</span>
                        <span style="margin-left:6px;">%s</span>
                    </td>
                </tr>
            </table>',
            $this->escape($this->formatHours((float)($targetTotal['actual'] ?? 0.0))),
            $this->escape($this->formatHours((float)($targetTotal['target'] ?? 0.0))),
            $this->escape($this->formatPercent($totalPct)),
            $this->statusPill($this->escape($this->statusLabel($totalStatus)), $tPillBg, $tPillColor),
        )
        . $this->progressBar($totalBar, $tBarColor, '0 0 16px');

        // Per-row blocks (up to 5 rows)
        $rowsHtml = '';
        $sliced = array_slice($rows, 0, 5);
        if (empty($sliced)) {
            $rowsHtml = sprintf(
                '<div style="padding:12px 0;font-size:13px;color:#94a3b8;">No %s targets configured.</div>',
                strtolower($this->escape($rowLabel)),
            );
        } else {
            foreach ($sliced as $row) {
                $pct    = (float)($row['percent'] ?? 0.0);
                $status = (string)($row['status'] ?? 'none');
                $bar    = min(100, (int)round($pct));
                [$pillBg, $pillColor, $barColor] = $this->statusStyles($status);

                // Try to use a color dot if a hex color is available on the row
                $dotColor = (string)($row['color'] ?? '#94a3b8');
                if (!preg_match('/^#[0-9a-fA-F]{3,6}$/', $dotColor)) {
                    $dotColor = '#94a3b8';
                }

                $rowsHtml .= sprintf(
                    '<div style="padding:12px 0;border-top:1px solid #f1f5f9;">
                        <table role="presentation" style="width:100%%;border-collapse:collapse;margin-bottom:6px;">
                            <tr>
                                <td style="vertical-align:middle;">
                                    <span style="display:inline-block;width:9px;height:9px;border-radius:50%%;background:%s;vertical-align:middle;margin-right:6px;"></span>
                                    <span style="font-size:13px;font-weight:600;color:#0f172a;vertical-align:middle;">%s</span>
                                </td>
                                <td style="vertical-align:middle;text-align:right;white-space:nowrap;">
                                    <span style="font-size:12px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">%s%%</span>
                                    <span style="margin-left:5px;">%s</span>
                                </td>
                            </tr>
                        </table>
                        %s
                        <div style="font-size:12px;color:#64748b;margin-top:5px;font-variant-numeric:tabular-nums;">
                            <strong style="color:#0f172a;">%s</strong> / %s
                        </div>
                    </div>',
                    $dotColor,
                    $this->escape((string)($row['label'] ?? $rowLabel)),
                    $this->escape($this->formatPercent($pct)),
                    $this->statusPill($this->escape($this->statusLabel($status)), $pillBg, $pillColor),
                    $this->progressBar($bar, $barColor, '0', '6px'),
                    $this->escape($this->formatHours((float)($row['actual'] ?? 0.0))),
                    $this->escape($this->formatHours((float)($row['target'] ?? 0.0))),
                );
            }
        }

        $inner = $this->widgetTitle($this->unescapeAmp($title), $intro)
            . $totalHtml
            . $rowsHtml;

        return $this->widgetCard($inner);
    }

    /**
     * @param array<string,mixed> $targetTotal
     * @param array<int,array<string,mixed>> $rows
     */
    private function renderTargetBoardPlain(string $title, array $targetTotal, array $rows): string {
        $lines = [
            $title,
            sprintf(
                'Total: %s / %s (%s%%) · %s · remaining %s',
                $this->formatHours((float)($targetTotal['actual'] ?? 0.0)),
                $this->formatHours((float)($targetTotal['target'] ?? 0.0)),
                $this->formatPercent((float)($targetTotal['percent'] ?? 0.0)),
                $this->statusLabel((string)($targetTotal['status'] ?? 'none')),
                $this->formatHours((float)($targetTotal['remaining'] ?? 0.0)),
            ),
        ];
        foreach (array_slice($rows, 0, 5) as $row) {
            $lines[] = sprintf(
                '%s: %s / %s (%s%%) · %s',
                (string)($row['label'] ?? 'Row'),
                $this->formatHours((float)($row['actual'] ?? 0.0)),
                $this->formatHours((float)($row['target'] ?? 0.0)),
                $this->formatPercent((float)($row['percent'] ?? 0.0)),
                $this->statusLabel((string)($row['status'] ?? 'none')),
            );
        }
        return implode(PHP_EOL, $lines);
    }

    /**
     * @param array<string,mixed> $balance
     * @param string[] $balanceWarnings
     */
    private function renderBalanceHtml(array $balance, array $balanceWarnings): string {
        // BalanceIndexCard style: index ring on left, messages on right
        $index = (float)($balance['index'] ?? 0.0);
        $indexDisplay = $this->escape($this->formatIndex($index));

        // Pick index ring color matching app thresholds
        if ($index >= 0.85) {
            $ringColor   = '#22c55e';
            $ringBg      = '#dcfce7';
            $ringText    = '#15803d';
        } elseif ($index >= 0.65) {
            $ringColor   = '#f59e0b';
            $ringBg      = '#fef3c7';
            $ringText    = '#b45309';
        } else {
            $ringColor   = '#ef4444';
            $ringBg      = '#fee2e2';
            $ringText    = '#dc2626';
        }

        // Warnings
        if ($balanceWarnings === []) {
            $warningsHtml = '<div style="padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-left:3px solid #22c55e;border-radius:8px;font-size:12px;color:#15803d;line-height:1.5;">No balance warnings for this period.</div>';
        } else {
            $warningsHtml = '';
            foreach ($balanceWarnings as $warning) {
                $warningsHtml .= sprintf(
                    '<div style="padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #f59e0b;border-radius:8px;font-size:12px;color:#78350f;line-height:1.5;margin-bottom:6px;">%s</div>',
                    $this->escape($warning),
                );
            }
        }

        // Index badge: outer circle (colored border), inner white circle, value centred
        $badgeHtml = sprintf(
            '<div style="display:inline-block;width:56px;height:56px;border-radius:50%%;background:%s;border:3px solid %s;text-align:center;line-height:50px;">
                <span style="font-size:16px;font-weight:800;color:%s;line-height:50px;">%s</span>
            </div>',
            $ringBg,
            $ringColor,
            $ringText,
            $indexDisplay,
        );

        $inner = $this->widgetTitle('Balance index', 'Time mix health for this recap period')
            . sprintf(
                '<table role="presentation" style="width:100%%;border-collapse:collapse;">
                    <tr>
                        <td style="width:72px;vertical-align:top;padding-right:16px;padding-top:2px;">
                            %s
                            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;text-align:center;margin-top:6px;">Index</div>
                        </td>
                        <td style="vertical-align:top;">%s</td>
                    </tr>
                </table>',
                $badgeHtml,
                $warningsHtml,
            );

        return $this->widgetCard($inner);
    }

    /**
     * @param array<string,mixed> $balance
     * @param string[] $balanceWarnings
     */
    private function renderBalancePlain(array $balance, array $balanceWarnings): string {
        $lines = [
            'Balance',
            sprintf('Balance index: %s', $this->formatIndex((float)($balance['index'] ?? 0.0))),
        ];
        if ($balanceWarnings === []) {
            $lines[] = 'Warnings: none';
        } else {
            foreach ($balanceWarnings as $warning) {
                $lines[] = '- ' . $warning;
            }
        }
        return implode(PHP_EOL, $lines);
    }

    /**
     * @param array<string,mixed> $summary
     * @param array<string,mixed>|null $busiestDay
     * @param array<string,mixed>|null $longestSession
     */
    private function renderActivityHtml(array $summary, ?array $busiestDay, ?array $longestSession): string {
        // TimeSummaryCard activity section style: clean label/value rows
        $daysOff = (int)($summary['days_off'] ?? 0);

        $busiestValue  = $busiestDay ? $this->escape((string)($busiestDay['date'] ?? '—')) : '—';
        $busiestDetail = $busiestDay
            ? $this->escape(sprintf('%s · %d events', $this->formatHours((float)($busiestDay['hours'] ?? 0.0)), (int)($busiestDay['events'] ?? 0)))
            : 'No standout day';

        $longestLabel  = $longestSession
            ? $this->escape((string)(($longestSession['summary'] ?? '') ?: ($longestSession['calendar'] ?? '—')))
            : '—';
        $longestDetail = $longestSession
            ? $this->escape(sprintf('%s · %s', $this->formatHours((float)($longestSession['hours'] ?? 0.0)), (string)($longestSession['start'] ?? '')))
            : 'No long session found';

        $metaStyle  = 'font-size:13px;color:#64748b;';
        $valueStyle = 'font-size:13px;font-weight:700;color:#0f172a;';
        $subStyle   = 'font-size:11px;color:#94a3b8;margin-top:2px;';

        $rows = sprintf(
            '<tr>
                <td style="padding:9px 0;vertical-align:middle;width:38%%;">
                    <span style="%s">Days off</span>
                </td>
                <td style="padding:9px 0;vertical-align:middle;text-align:right;">
                    <div style="%s">%d</div>
                    <div style="%s">Quiet days in this period</div>
                </td>
            </tr>
            <tr>
                <td style="padding:9px 0;border-top:1px solid #f1f5f9;vertical-align:top;width:38%%;">
                    <span style="%s">Busiest day</span>
                </td>
                <td style="padding:9px 0;border-top:1px solid #f1f5f9;vertical-align:top;text-align:right;">
                    <div style="%s">%s</div>
                    <div style="%s">%s</div>
                </td>
            </tr>
            <tr>
                <td style="padding:9px 0;border-top:1px solid #f1f5f9;vertical-align:top;width:38%%;">
                    <span style="%s">Longest session</span>
                </td>
                <td style="padding:9px 0;border-top:1px solid #f1f5f9;vertical-align:top;text-align:right;">
                    <div style="%s">%s</div>
                    <div style="%s">%s</div>
                </td>
            </tr>',
            $metaStyle,
            $valueStyle, $daysOff,
            $subStyle,

            $metaStyle,
            $valueStyle, $busiestValue,
            $subStyle, $busiestDetail,

            $metaStyle,
            $valueStyle, $longestLabel,
            $subStyle, $longestDetail,
        );

        $inner = $this->widgetTitle('Activity highlights')
            . sprintf('<table role="presentation" style="width:100%%;border-collapse:collapse;">%s</table>', $rows);

        return $this->widgetCard($inner);
    }

    /**
     * @param array<string,mixed> $summary
     * @param array<string,mixed>|null $busiestDay
     * @param array<string,mixed>|null $longestSession
     */
    private function renderActivityPlain(array $summary, ?array $busiestDay, ?array $longestSession): string {
        $lines = [
            'Activity',
            sprintf('Days off: %d', (int)($summary['days_off'] ?? 0)),
            $busiestDay
                ? sprintf('Busiest day: %s (%s, %d events)', (string)($busiestDay['date'] ?? ''), $this->formatHours((float)($busiestDay['hours'] ?? 0.0)), (int)($busiestDay['events'] ?? 0))
                : 'Busiest day: —',
            $longestSession
                ? sprintf('Longest session: %s (%s, %s)', (string)(($longestSession['summary'] ?? '') ?: ($longestSession['calendar'] ?? '')), $this->formatHours((float)($longestSession['hours'] ?? 0.0)), (string)($longestSession['start'] ?? ''))
                : 'Longest session: —',
        ];
        return implode(PHP_EOL, $lines);
    }

    /**
     * @param array<string,mixed> $notes
     * @param array<string,mixed> $reportingConfig
     */
    private function renderNotesHtml(array $notes, array $reportingConfig): string {
        $current  = trim((string)($notes['current'] ?? ''));
        $previous = trim((string)($notes['previous'] ?? ''));
        if ($current === '' && $previous === '') {
            return '';
        }

        $blocks = '';
        if ($current !== '') {
            $blocks .= sprintf(
                '<div style="%s">
                    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">This period</div>
                    <div style="font-size:13px;line-height:1.65;color:#34506a;">%s</div>
                </div>',
                $previous !== '' ? 'margin-bottom:14px;' : '',
                nl2br($this->escape($current)),
            );
        }
        if ($previous !== '') {
            $blocks .= sprintf(
                '<div%s>
                    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Previous period</div>
                    <div style="font-size:13px;line-height:1.65;color:#34506a;">%s</div>
                </div>',
                $current !== '' ? ' style="border-top:1px solid #f1f5f9;padding-top:14px;"' : '',
                nl2br($this->escape($previous)),
            );
        }

        return $this->widgetCard(
            $this->widgetTitle('Notes') . $blocks
        );
    }

    /**
     * @param array<string,mixed> $notes
     * @param array<string,mixed> $reportingConfig
     */
    private function renderNotesPlain(array $notes, array $reportingConfig): string {
        $current  = trim((string)($notes['current'] ?? ''));
        $previous = trim((string)($notes['previous'] ?? ''));
        if ($current === '' && $previous === '') {
            return '';
        }
        $lines = ['Notes'];
        if ($current !== '') {
            $lines[] = 'This period: ' . $current;
        }
        if ($previous !== '') {
            $lines[] = 'Previous period: ' . $previous;
        }
        return implode(PHP_EOL, $lines);
    }

    private function formatHours(float $hours): string {
        return number_format($hours, 2, '.', '') . ' h';
    }

    private function formatPercent(float $percent): string {
        return number_format($percent, 1, '.', '');
    }

    private function formatIndex(float $index): string {
        return number_format($index, 2, '.', '');
    }

    /**
     * @param array<string,mixed> $reportingConfig
     */
    private function renderModePrefsPlain(array $reportingConfig): string {
        $parts = [];
        $modes = is_array($reportingConfig['modes'] ?? null) ? $reportingConfig['modes'] : [];
        foreach (['week' => 'week', 'month' => 'month'] as $key => $label) {
            $mode = is_array($modes[$key] ?? null) ? $modes[$key] : [];
            $parts[] = sprintf(
                '%s=%s/%s/reminder-%s',
                $label,
                !empty($mode['enabled']) ? 'on' : 'off',
                $this->cadenceLabel((string)($mode['cadence'] ?? 'end')),
                (string)($mode['reminderLead'] ?? 'none'),
            );
        }
        return implode(', ', $parts);
    }

    private function cadenceLabel(string $cadence): string {
        return match ($cadence) {
            'daily' => 'daily',
            'mid' => 'mid',
            default => 'end',
        };
    }

    private function statusLabel(string $status): string {
        return match ($status) {
            'on_track' => 'On Track',
            'at_risk' => 'At Risk',
            'behind' => 'Behind',
            'done' => 'Done',
            default => '—',
        };
    }

    /**
     * @return array{0:string,1:string,2:string} [pillBg, pillColor, barColor]
     */
    private function statusStyles(string $status): array {
        return match ($status) {
            'done', 'on_track' => ['#dcfce7', '#15803d', 'linear-gradient(90deg,#22c55e,#4ade80)'],
            'at_risk'          => ['#fef3c7', '#b45309', 'linear-gradient(90deg,#f59e0b,#fbbf24)'],
            'behind'           => ['#fee2e2', '#dc2626', 'linear-gradient(90deg,#ef4444,#f87171)'],
            default            => ['#e0f2fe', '#0369a1', 'linear-gradient(90deg,#0ea5e9,#38bdf8)'],
        };
    }

    private function widgetCard(string $content, string $marginTop = '20px'): string {
        return sprintf(
            '<div style="margin-top:%s;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;background:#ffffff;">%s</div>',
            $marginTop,
            $content,
        );
    }

    private function widgetTitle(string $title, string $subtitle = ''): string {
        $sub = $subtitle !== ''
            ? sprintf('<div style="font-size:12px;color:#64748b;margin-top:2px;">%s</div>', $this->escape($subtitle))
            : '';
        return sprintf(
            '<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;">%s</div>%s
            </div>',
            $this->escape($title),
            $sub,
        );
    }

    private function progressBar(int $pct, string $barColor, string $margin = '0', string $height = '7px'): string {
        return sprintf(
            '<div style="background:#f1f5f9;border-radius:999px;height:%s;overflow:hidden;margin:%s;">
                <div style="width:%d%%;height:100%%;background:%s;border-radius:999px;"></div>
            </div>',
            $height,
            $margin,
            $pct,
            $barColor,
        );
    }

    private function statusPill(string $label, string $bg, string $color): string {
        return sprintf(
            '<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:%s;color:%s;">%s</span>',
            $bg,
            $color,
            $label,
        );
    }

    private function unescapeAmp(string $value): string {
        return str_replace('&amp;', '&', $value);
    }

    private function escape(string $value): string {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
