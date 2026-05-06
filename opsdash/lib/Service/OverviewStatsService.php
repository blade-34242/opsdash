<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewStatsService {
    public function __construct(
        private OverviewStatsKpiService $kpiService,
        private OverviewStatsHistoryService $historyService,
        private OverviewBalanceService $balanceService,
    ) {}

    /**
     * @param array{
     *   range: string,
     *   offset: int,
     *   from: \DateTimeImmutable,
     *   to: \DateTimeImmutable,
     *   principal: string,
     *   calendars: array<int, object>,
     *   includeAll: bool,
     *   selectedIds: string[],
     *   mapCalToCategory: callable,
     *   userTz: \DateTimeZone,
     *   allDayHours: float,
     *   categoryMeta: array<string, array{id: string, label: string}>,
     *   targetsConfig: array<string, mixed>,
     *   targetsWeek: array<string, mixed>,
     *   targetsMonth: array<string, mixed>,
     *   byCalMap: array<string, mixed>,
     *   idToName: array<string, string>,
     *   categoryTotals: array<string, float>,
     *   categoryColors: array<string, string>,
     *   perDayByCat: array<string, array<string, float>>,
     *   totalHours: float,
     *   futureTotalHours: float,
     *   byCalList: array<int, array<string, mixed>>,
     *   byDay: array<string, array<string, mixed>>,
     *   hod: array<string, array<int, float>>,
     *   dowOrder: string[],
     *   eventsCount: int,
     *   daysCount: int,
     *   avgPerDay: float,
     *   avgPerEvent: float,
     *   overlapCount: int,
     *   earliestStartTs: int|null,
     *   latestEndTs: int|null,
     *   longestSessionHours: float,
     *   trendLookback: int,
     *   maxPerCal: int,
     *   maxTotal: int,
     *   colorsById: array<string, string>,
     *   weekStart: int,
     *   analysisTo: \DateTimeImmutable,
     *   currentPeriodClipped: bool,
     *   currentCutoff: string|null,
     *   todayActualHours: float,
     *   todayFutureHours: float
     * } $context
     * @return array<string, mixed>
     */
    public function build(array $context): array {
        $range = (string)$context['range'];
        $offset = (int)$context['offset'];
        $from = $context['from'];
        $to = $context['to'];
        $principal = (string)$context['principal'];
        $cals = $context['calendars'];
        $includeAll = (bool)$context['includeAll'];
        $selectedIds = $context['selectedIds'];
        $mapCalToCategory = $context['mapCalToCategory'];
        $userTz = $context['userTz'];
        $allDayHours = (float)$context['allDayHours'];
        $categoryMeta = $context['categoryMeta'];
        $targetsConfig = $context['targetsConfig'];
        $targetsWeek = $context['targetsWeek'];
        $targetsMonth = $context['targetsMonth'];
        $byCalMap = $context['byCalMap'];
        $idToName = $context['idToName'];
        $categoryTotals = $context['categoryTotals'];
        $categoryColors = $context['categoryColors'];
        $perDayByCat = $context['perDayByCat'];
        $totalHours = (float)$context['totalHours'];
        $futureTotalHours = (float)($context['futureTotalHours'] ?? 0.0);
        $byCalList = $context['byCalList'];
        $byDay = $context['byDay'];
        $hod = $context['hod'];
        $dowOrder = $context['dowOrder'];
        $eventsCount = (int)$context['eventsCount'];
        $daysCount = (int)$context['daysCount'];
        $avgPerDay = (float)$context['avgPerDay'];
        $avgPerEvent = (float)$context['avgPerEvent'];
        $overlapCount = (int)$context['overlapCount'];
        $earliestStartTs = $context['earliestStartTs'];
        $latestEndTs = $context['latestEndTs'];
        $longestSessionHours = (float)$context['longestSessionHours'];
        $trendLookback = (int)$context['trendLookback'];
        $maxPerCal = (int)$context['maxPerCal'];
        $maxTotal = (int)$context['maxTotal'];
        $colorsById = $context['colorsById'];
        $weekStart = (int)($context['weekStart'] ?? 1);
        $analysisTo = $context['analysisTo'];
        $currentPeriodClipped = (bool)($context['currentPeriodClipped'] ?? false);
        $currentCutoff = $context['currentCutoff'] ?? null;
        $todayActualHours = (float)($context['todayActualHours'] ?? 0.0);
        $todayFutureHours = (float)($context['todayFutureHours'] ?? 0.0);

        $kpi = $this->kpiService->build([
            'from' => $from,
            'to' => $to,
            'analysisTo' => $analysisTo,
            'userTz' => $userTz,
            'byDay' => $byDay,
            'byCalList' => $byCalList,
            'totalHours' => $totalHours,
            'futureTotalHours' => $futureTotalHours,
            'daysCount' => $daysCount,
            'avgPerDay' => $avgPerDay,
            'avgPerEvent' => $avgPerEvent,
            'hod' => $hod,
            'dowOrder' => $dowOrder,
            'eventsCount' => $eventsCount,
            'overlapCount' => $overlapCount,
            'earliestStartTs' => $earliestStartTs,
            'latestEndTs' => $latestEndTs,
            'longestSessionHours' => $longestSessionHours,
            'currentPeriodClipped' => $currentPeriodClipped,
            'currentCutoff' => $currentCutoff,
            'todayActualHours' => $todayActualHours,
            'todayFutureHours' => $todayFutureHours,
        ]);

        $historyInfo = $this->historyService->build([
            'range' => $range,
            'offset' => $offset,
            'from' => $from,
            'to' => $to,
            'principal' => $principal,
            'calendars' => $cals,
            'includeAll' => $includeAll,
            'selectedIds' => $selectedIds,
            'mapCalToCategory' => $mapCalToCategory,
            'userTz' => $userTz,
            'allDayHours' => $allDayHours,
            'categoryMeta' => $categoryMeta,
            'targetsConfig' => $targetsConfig,
            'targetsWeek' => $targetsWeek,
            'targetsMonth' => $targetsMonth,
            'idToName' => $idToName,
            'maxPerCal' => $maxPerCal,
            'maxTotal' => $maxTotal,
            'colorsById' => $colorsById,
            'weekStart' => $weekStart,
            'currentTotalHours' => $totalHours,
            'currentAvgPerDay' => $avgPerDay,
            'currentAvgPerEvent' => $avgPerEvent,
            'currentEventsCount' => $eventsCount,
            'currentWeekendShare' => $kpi['weekend_share'],
            'currentEveningShare' => $kpi['evening_share'],
            'currentByDay' => $byDay,
            'trendLookback' => $trendLookback,
            'analysisTo' => $analysisTo,
        ]);
        $categoryTotalsPrev = $historyInfo['categoryTotalsPrev'];
        $prevTotal = $historyInfo['prevTotal'];

        // Normalize category colors fallback
        foreach ($categoryColors as $catId => $color) {
            if (!$color) {
                $categoryColors[$catId] = '#2563eb';
            }
        }

        $balanceConfig = $targetsConfig['balance'];
        $dayOffTrend = $historyInfo['dayOffTrend'];
        $trendHistory = $historyInfo['balanceHistory'];

        $balance = $this->balanceService->build(
            range: $range,
            targetsConfig: $targetsConfig,
            targetsWeek: $targetsWeek,
            targetsMonth: $targetsMonth,
            byCalMap: $byCalMap,
            idToName: $idToName,
            categoryMeta: $categoryMeta,
            categoryTotals: $categoryTotals,
            totalHours: $totalHours,
            categoryTotalsPrev: $categoryTotalsPrev,
            prevTotal: $prevTotal,
            categoryColors: $categoryColors,
            balanceConfig: $balanceConfig,
            perDayByCat: $perDayByCat,
            from: $from,
            to: $to,
            trendHistory: $trendHistory,
        );
        $balanceIndex = $balance['balanceIndex'];
        $balanceOverview = $balance['balanceOverview'];

        return [
            ...$kpi,
            'delta' => $historyInfo['delta'],
            'balance_index' => round($balanceIndex, 3),
            'balance_overview' => $balanceOverview,
            'day_off_trend' => $dayOffTrend,
        ];
    }
}
