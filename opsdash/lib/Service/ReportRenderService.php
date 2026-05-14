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
    public function render(array $summary, array $reportingConfig, string $displayName, string $variantLabel = ''): array {
        $rangeLabel = ($summary['range'] ?? 'week') === 'month' ? 'Monthly' : 'Weekly';
        $periodLabel = sprintf('%s to %s', (string)($summary['from'] ?? ''), (string)($summary['to'] ?? ''));
        $reportVariant = $this->resolveReportVariant($summary);
        $reportVariantLabel = $this->reportVariantLabel($reportVariant);

        $subject = sprintf('Opsdash test recap · %s · %s', $rangeLabel, $periodLabel);
        if ($variantLabel !== '') {
            $subject .= sprintf(' · %s', $variantLabel);
        }

        $selectedLabels = array_values(array_map('strval', $summary['selected_labels'] ?? []));
        $selectedLine = empty($selectedLabels) ? 'None' : implode(', ', $selectedLabels);
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
            $this->renderHeroHtml($displayName, $rangeLabel, $periodLabel, $selectedLine, $reportVariantLabel, $variantLabel),
            $this->renderHeroPlain($displayName, $rangeLabel, $periodLabel, $selectedLine, $reportVariantLabel, $variantLabel),
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
        $template->addFooter('Opsdash reporting test mail<br>Sent manually from Opsdash or via occ matrix run.');

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
        string $displayName,
        string $rangeLabel,
        string $periodLabel,
        string $selectedLine,
        string $reportVariantLabel,
        string $variantLabel,
    ): string {
        $variant = $variantLabel === '' ? '' : sprintf(
            '<span style="display:inline-block;margin-top:8px;padding:6px 10px;border-radius:999px;background:#eaf4fb;color:#0b5f93;font-size:12px;font-weight:700;letter-spacing:.02em;">Trigger · %s</span>',
            $this->escape($variantLabel),
        );
        return sprintf(
            '<div style="background:linear-gradient(135deg,#0b5f93 0%%,#1d87c5 100%%);border-radius:18px;padding:26px 28px;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.84;">%s recap</div>
                <div style="font-size:28px;line-height:1.15;font-weight:800;margin-top:8px;">%s</div>
                <div style="font-size:15px;line-height:1.55;margin-top:10px;opacity:.95;">Hello %s. This report follows the <strong>%s</strong> model and ignores dashboard layout presets, so the mail stays consistent even when the UI layout changes.</div>
                <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1 1 220px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.12);font-size:14px;line-height:1.55;">
                        <strong style="display:block;font-size:13px;letter-spacing:.04em;text-transform:uppercase;opacity:.82;">Report model</strong>
                        <span>%s</span>
                    </div>
                    <div style="flex:2 1 280px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.12);font-size:14px;line-height:1.55;">
                        <strong style="display:block;font-size:13px;letter-spacing:.04em;text-transform:uppercase;opacity:.82;">Selected calendars</strong>
                        <span>%s</span>
                    </div>
                </div>
                %s
            </div>',
            $this->escape($rangeLabel),
            $this->escape($periodLabel),
            $this->escape($displayName !== '' ? $displayName : 'there'),
            $this->escape($reportVariantLabel),
            $this->escape($reportVariantLabel),
            $this->escape($selectedLine),
            $variant,
        );
    }

    private function renderHeroPlain(
        string $displayName,
        string $rangeLabel,
        string $periodLabel,
        string $selectedLine,
        string $reportVariantLabel,
        string $variantLabel,
    ): string {
        $lines = [
            sprintf('Hello %s,', $displayName !== '' ? $displayName : 'there'),
            '',
            sprintf('%s recap for %s', $rangeLabel, $periodLabel),
            sprintf('Report model: %s', $reportVariantLabel),
            sprintf('Selected calendars: %s', $selectedLine),
        ];
        if ($variantLabel !== '') {
            $lines[] = sprintf('Trigger: %s', $variantLabel);
        }
        return implode(PHP_EOL, $lines);
    }

    /**
     * @param array<int,array{label:string,value:string,detail:string}> $cards
     */
    private function renderKpiGridHtml(array $cards): string {
        $htmlCards = array_map(function (array $card): string {
            return sprintf(
                '<td style="width:50%%;padding:0 8px 16px 8px;vertical-align:top;">
                    <div style="border:1px solid #dbe7f0;border-radius:16px;padding:16px 18px;background:#f8fbfd;">
                        <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#61758a;">%s</div>
                        <div style="font-size:24px;line-height:1.2;font-weight:800;color:#12344f;margin-top:8px;">%s</div>
                        <div style="font-size:13px;line-height:1.45;color:#5f7387;margin-top:6px;">%s</div>
                    </div>
                </td>',
                $this->escape($card['label']),
                $this->escape($card['value']),
                $this->escape($card['detail']),
            );
        }, $cards);

        $rows = [];
        for ($i = 0; $i < count($htmlCards); $i += 2) {
            $left = $htmlCards[$i];
            $right = $htmlCards[$i + 1] ?? '<td style="width:50%;padding:0 8px 16px 8px;vertical-align:top;"></td>';
            $rows[] = '<tr>' . $left . $right . '</tr>';
        }

        return '<div style="margin-top:22px;">
            <div style="font-size:20px;font-weight:800;color:#12344f;margin:0 0 14px 0;">KPI snapshot</div>
            <table role="presentation" style="width:100%;border-collapse:collapse;border-spacing:0;">' . implode('', $rows) . '</table>
        </div>';
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
        return sprintf(
            '<div style="margin-top:28px;border:1px solid #dbe7f0;border-radius:18px;padding:20px;background:#ffffff;">
                <div style="font-size:20px;font-weight:800;color:#12344f;">Goal progress</div>
                <div style="margin-top:10px;font-size:15px;line-height:1.55;color:#34506a;">A compact total-goal recap without calendar or category drill-down.</div>
                <div style="margin-top:18px;border-radius:16px;background:#f5f9fc;padding:18px 20px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#61758a;">Total target</div>
                    <div style="margin-top:6px;font-size:28px;font-weight:800;color:#12344f;">%s / %s</div>
                    <div style="margin-top:8px;font-size:14px;color:#34506a;">%s%% complete · %s · remaining %s</div>
                </div>
            </div>',
            $this->escape($this->formatHours((float)($targetTotal['actual'] ?? 0.0))),
            $this->escape($this->formatHours((float)($targetTotal['target'] ?? 0.0))),
            $this->escape($this->formatPercent((float)($targetTotal['percent'] ?? 0.0))),
            $this->escape($this->statusLabel((string)($targetTotal['status'] ?? 'none'))),
            $this->escape($this->formatHours((float)($targetTotal['remaining'] ?? 0.0))),
        );
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
        $tableRows = '';
        foreach (array_slice($this->sortTargets($rows), 0, 5) as $row) {
            $tableRows .= sprintf(
                '<tr>
                    <td style="padding:12px 14px;border-top:1px solid #e7edf3;font-weight:700;color:#12344f;">%s</td>
                    <td style="padding:12px 14px;border-top:1px solid #e7edf3;color:#34506a;">%s</td>
                    <td style="padding:12px 14px;border-top:1px solid #e7edf3;color:#34506a;">%s</td>
                    <td style="padding:12px 14px;border-top:1px solid #e7edf3;color:%s;font-weight:700;">%s</td>
                </tr>',
                $this->escape((string)($row['label'] ?? $rowLabel)),
                $this->escape(sprintf(
                    '%s / %s',
                    $this->formatHours((float)($row['actual'] ?? 0.0)),
                    $this->formatHours((float)($row['target'] ?? 0.0)),
                )),
                $this->escape(sprintf('%s%%', $this->formatPercent((float)($row['percent'] ?? 0.0)))),
                $this->statusColor((string)($row['status'] ?? 'none')),
                $this->escape($this->statusLabel((string)($row['status'] ?? 'none'))),
            );
        }
        if ($tableRows === '') {
            $tableRows = sprintf('<tr><td colspan="4" style="padding:12px 14px;border-top:1px solid #e7edf3;color:#61758a;">No %s targets configured.</td></tr>', strtolower($this->escape($rowLabel)));
        }

        return sprintf(
            '<div style="margin-top:28px;border:1px solid #dbe7f0;border-radius:18px;overflow:hidden;">
                <div style="padding:18px 20px;background:#f5f9fc;">
                    <div style="font-size:20px;font-weight:800;color:#12344f;">%s</div>
                    <div style="margin-top:8px;font-size:14px;line-height:1.55;color:#34506a;">%s</div>
                    <div style="margin-top:12px;font-size:15px;line-height:1.55;color:#34506a;">
                        <strong style="font-size:22px;color:#12344f;">%s / %s</strong><br>
                        %s%% complete · %s · remaining %s
                    </div>
                </div>
                <table role="presentation" style="width:100%%;border-collapse:collapse;border-spacing:0;background:#ffffff;">
                    <tr>
                        <th align="left" style="padding:12px 14px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#61758a;background:#ffffff;">%s</th>
                        <th align="left" style="padding:12px 14px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#61758a;background:#ffffff;">Actual / target</th>
                        <th align="left" style="padding:12px 14px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#61758a;background:#ffffff;">Progress</th>
                        <th align="left" style="padding:12px 14px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#61758a;background:#ffffff;">Status</th>
                    </tr>
                    %s
                </table>
            </div>',
            $title,
            $this->escape($intro),
            $this->escape($this->formatHours((float)($targetTotal['actual'] ?? 0.0))),
            $this->escape($this->formatHours((float)($targetTotal['target'] ?? 0.0))),
            $this->escape($this->formatPercent((float)($targetTotal['percent'] ?? 0.0))),
            $this->escape($this->statusLabel((string)($targetTotal['status'] ?? 'none'))),
            $this->escape($this->formatHours((float)($targetTotal['remaining'] ?? 0.0))),
            $this->escape($rowLabel),
            $tableRows,
        );
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
        foreach (array_slice($this->sortTargets($rows), 0, 5) as $row) {
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
        $warningHtml = '';
        if ($balanceWarnings === []) {
            $warningHtml = '<div style="margin-top:12px;color:#5b8b6d;background:#eff9f1;border:1px solid #d2ebd8;border-radius:12px;padding:12px 14px;">No balance warnings for this period.</div>';
        } else {
            foreach ($balanceWarnings as $warning) {
                $warningHtml .= sprintf(
                    '<div style="margin-top:10px;color:#7d4f08;background:#fff6df;border:1px solid #f0deaa;border-radius:12px;padding:12px 14px;">%s</div>',
                    $this->escape($warning),
                );
            }
        }

        return sprintf(
            '<div style="margin-top:28px;border:1px solid #dbe7f0;border-radius:18px;padding:18px 20px;background:#ffffff;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <div>
                        <div style="font-size:20px;font-weight:800;color:#12344f;">Balance</div>
                        <div style="font-size:14px;line-height:1.5;color:#61758a;margin-top:6px;">A quick health check on time mix and drift.</div>
                    </div>
                    <div style="min-width:150px;border-radius:14px;background:#f5f9fc;padding:14px 16px;">
                        <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#61758a;">Balance index</div>
                        <div style="font-size:28px;font-weight:800;color:#12344f;margin-top:4px;">%s</div>
                    </div>
                </div>
                %s
            </div>',
            $this->escape($this->formatIndex((float)($balance['index'] ?? 0.0))),
            $warningHtml,
        );
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
        $cards = [
            ['Days off', (string)(int)($summary['days_off'] ?? 0), 'Quiet days in this period'],
            [
                'Busiest day',
                $busiestDay ? (string)($busiestDay['date'] ?? '—') : '—',
                $busiestDay ? sprintf('%s · %d events', $this->formatHours((float)($busiestDay['hours'] ?? 0.0)), (int)($busiestDay['events'] ?? 0)) : 'No standout day',
            ],
            [
                'Longest session',
                $longestSession ? (string)(($longestSession['summary'] ?? '') ?: ($longestSession['calendar'] ?? '')) : '—',
                $longestSession ? sprintf('%s · %s', $this->formatHours((float)($longestSession['hours'] ?? 0.0)), (string)($longestSession['start'] ?? '')) : 'No long session found',
            ],
        ];

        $html = '<div style="margin-top:28px;"><div style="font-size:20px;font-weight:800;color:#12344f;margin:0 0 14px 0;">Activity</div><table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 12px;">';
        foreach ($cards as $card) {
            $html .= sprintf(
                '<tr>
                    <td style="padding:16px 18px;border:1px solid #dbe7f0;border-radius:16px;background:#f8fbfd;">
                        <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#61758a;">%s</div>
                        <div style="font-size:20px;font-weight:800;color:#12344f;margin-top:6px;">%s</div>
                        <div style="font-size:13px;line-height:1.45;color:#5f7387;margin-top:6px;">%s</div>
                    </td>
                </tr>',
                $this->escape((string)$card[0]),
                $this->escape((string)$card[1]),
                $this->escape((string)$card[2]),
            );
        }
        $html .= '</table></div>';
        return $html;
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
        return sprintf(
            '<div style="margin-top:28px;display:flex;gap:16px;flex-wrap:wrap;">
                <div style="flex:1 1 260px;border:1px solid #dbe7f0;border-radius:18px;padding:18px 20px;background:#ffffff;">
                    <div style="font-size:20px;font-weight:800;color:#12344f;">Notes</div>
                    <div style="margin-top:12px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#61758a;">This period</div>
                    <div style="margin-top:6px;font-size:14px;line-height:1.65;color:#34506a;">%s</div>
                    <div style="margin-top:14px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#61758a;">Previous period</div>
                    <div style="margin-top:6px;font-size:14px;line-height:1.65;color:#34506a;">%s</div>
                </div>
                <div style="flex:1 1 220px;border:1px solid #dbe7f0;border-radius:18px;padding:18px 20px;background:#f8fbfd;">
                    <div style="font-size:20px;font-weight:800;color:#12344f;">Delivery</div>
                    <div style="margin-top:12px;font-size:13px;line-height:1.6;color:#34506a;"><strong>Modes:</strong><br>%s</div>
                    <div style="margin-top:12px;font-size:13px;line-height:1.6;color:#34506a;"><strong>Signals:</strong><br>risk-alert=%s, email=%s, in-app=%s</div>
                </div>
            </div>',
            nl2br($this->escape(trim((string)($notes['current'] ?? '')) ?: '—')),
            nl2br($this->escape(trim((string)($notes['previous'] ?? '')) ?: '—')),
            nl2br($this->escape($this->renderModePrefsPlain($reportingConfig))),
            !empty($reportingConfig['alertOnRisk']) ? 'on' : 'off',
            !empty($reportingConfig['notifyEmail']) ? 'on' : 'off',
            !empty($reportingConfig['notifyNotification']) ? 'on' : 'off',
        );
    }

    /**
     * @param array<string,mixed> $notes
     * @param array<string,mixed> $reportingConfig
     */
    private function renderNotesPlain(array $notes, array $reportingConfig): string {
        return implode(PHP_EOL, [
            'Notes',
            'This period: ' . (trim((string)($notes['current'] ?? '')) ?: '—'),
            'Previous period: ' . (trim((string)($notes['previous'] ?? '')) ?: '—'),
            'Reporting prefs: ' . $this->renderModePrefsPlain($reportingConfig),
            sprintf(
                'Signals: risk-alert=%s, email=%s, in-app=%s',
                !empty($reportingConfig['alertOnRisk']) ? 'on' : 'off',
                !empty($reportingConfig['notifyEmail']) ? 'on' : 'off',
                !empty($reportingConfig['notifyNotification']) ? 'on' : 'off',
            ),
        ]);
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
     * @param array<int,array<string,mixed>> $rows
     * @return array<int,array<string,mixed>>
     */
    private function sortTargets(array $rows): array {
        usort($rows, function (array $a, array $b): int {
            return ((float)($a['percent'] ?? 0.0) <=> (float)($b['percent'] ?? 0.0));
        });
        return $rows;
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

    private function statusColor(string $status): string {
        return match ($status) {
            'on_track', 'done' => '#2f7a49',
            'at_risk' => '#b4690e',
            'behind' => '#b42424',
            default => '#61758a',
        };
    }

    private function escape(string $value): string {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
