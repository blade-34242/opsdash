<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewStatsTrendService {
    public function __construct(
        private OverviewHistoryService $historyService,
    ) {}

    /**
     * @param array{
     *   range: string,
     *   offset: int,
     *   from: \DateTimeImmutable,
     *   to: \DateTimeImmutable,
     *   currentByDay: array<string, array<string, mixed>>,
     *   includeAll: bool,
     *   selectedIds: string[],
     *   calendars: array<int, object>,
     *   principal: string,
     *   userTz: \DateTimeZone,
     *   trendLookback: int,
     *   weekStart: int,
     *   precomputedDaysWorked: array<int,int>,
     *   mapCalToCategory: callable,
     *   allDayHours: float,
     *   categoryMeta: array<string, array{id: string, label: string}>,
     *   analysisTo?: \DateTimeImmutable
     * } $context
     * @return array{dayOffTrend: array<int, array<string, mixed>>, balanceHistory: array<int, array<string, mixed>>}
     */
    public function build(array $context): array {
        $range = (string)$context['range'];
        $offset = (int)$context['offset'];
        $from = $context['from'];
        $to = $context['to'];
        $currentByDay = $context['currentByDay'];
        $includeAll = (bool)$context['includeAll'];
        $selectedIds = $context['selectedIds'];
        $calendars = $context['calendars'];
        $principal = (string)$context['principal'];
        $userTz = $context['userTz'];
        $trendLookback = (int)$context['trendLookback'];
        $weekStart = (int)($context['weekStart'] ?? 1);
        $precomputedDaysWorked = $context['precomputedDaysWorked'] ?? [];
        $mapCalToCategory = $context['mapCalToCategory'];
        $allDayHours = (float)$context['allDayHours'];
        $categoryMeta = $context['categoryMeta'];
        $analysisTo = $context['analysisTo'] ?? $to;

        $dayOffTrend = $this->historyService->buildDayOffTrend(
            $range,
            $offset,
            $from,
            $to,
            $analysisTo,
            $currentByDay,
            $includeAll,
            $selectedIds,
            $calendars,
            $principal,
            $userTz,
            $trendLookback,
            $weekStart,
            $precomputedDaysWorked,
        );

        $balanceHistory = $this->historyService->buildBalanceHistory(
            $range,
            $offset,
            $trendLookback,
            $calendars,
            $includeAll,
            $selectedIds,
            $principal,
            $mapCalToCategory,
            $userTz,
            $allDayHours,
            $categoryMeta,
            $weekStart,
        );

        return [
            'dayOffTrend' => $dayOffTrend,
            'balanceHistory' => $balanceHistory,
        ];
    }
}
