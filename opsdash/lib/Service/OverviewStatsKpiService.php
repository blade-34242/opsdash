<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewStatsKpiService {
    /**
     * @param array{
     *   from: \DateTimeImmutable,
     *   to: \DateTimeImmutable,
     *   analysisTo: \DateTimeImmutable,
     *   userTz: \DateTimeZone,
     *   byDay: array<string, array<string, mixed>>,
     *   byCalList: array<int, array<string, mixed>>,
     *   totalHours: float,
     *   futureTotalHours: float,
     *   daysCount: int,
     *   avgPerDay: float,
     *   avgPerEvent: float,
     *   hod: array<string, array<int, float>>,
     *   dowOrder: string[],
     *   eventsCount: int,
     *   overlapCount: int,
     *   earliestStartTs: int|null,
     *   latestEndTs: int|null,
     *   longestSessionHours: float,
     *   currentPeriodClipped: bool,
     *   currentCutoff: string|null,
     *   todayActualHours: float,
     *   todayFutureHours: float
     * } $context
     * @return array<string, mixed>
     */
    public function build(array $context): array {
        $from = $context['from'];
        $to = $context['to'];
        $analysisTo = ($context['analysisTo'] ?? null) instanceof \DateTimeImmutable
            ? $context['analysisTo']
            : $to;
        $userTz = $context['userTz'];
        $byDay = $context['byDay'];
        $byCalList = $context['byCalList'];
        $totalHours = (float)$context['totalHours'];
        $futureTotalHours = (float)($context['futureTotalHours'] ?? 0.0);
        $daysCount = (int)$context['daysCount'];
        $avgPerDay = (float)$context['avgPerDay'];
        $avgPerEvent = (float)$context['avgPerEvent'];
        $hod = $context['hod'];
        $dowOrder = $context['dowOrder'];
        $eventsCount = (int)$context['eventsCount'];
        $overlapCount = (int)$context['overlapCount'];
        $earliestStartTs = $context['earliestStartTs'];
        $latestEndTs = $context['latestEndTs'];
        $longestSessionHours = (float)$context['longestSessionHours'];
        $currentPeriodClipped = (bool)($context['currentPeriodClipped'] ?? false);
        $currentCutoff = $context['currentCutoff'] ?? null;
        $todayActualHours = (float)($context['todayActualHours'] ?? 0.0);
        $todayFutureHours = (float)($context['todayFutureHours'] ?? 0.0);

        $activeDays = $daysCount;
        $busiest = null;
        if (!empty($byDay)) {
            $tmp = $byDay;
            usort($tmp, fn($a, $b) => ($b['total_hours'] <=> $a['total_hours']));
            $busiest = ['date' => $tmp[0]['date'], 'hours' => round($tmp[0]['total_hours'], 2)];
        }

        $dayHours = array_map(fn($x) => (float)$x['total_hours'], array_values($byDay));
        sort($dayHours);
        $medianPerDay = count($dayHours)
            ? (count($dayHours) % 2
                ? $dayHours[intdiv(count($dayHours), 2)]
                : ($dayHours[count($dayHours) / 2 - 1] + $dayHours[count($dayHours) / 2]) / 2)
            : 0.0;
        $medianPerDay = round($medianPerDay, 2);

        $topCal = !empty($byCalList) ? [
            'calendar' => $byCalList[0]['calendar'],
            'share' => $totalHours > 0 ? round(100 * $byCalList[0]['total_hours'] / $totalHours, 1) : 0.0,
        ] : null;

        $vmaxRow = array_fill(0, 24, 0.0);
        foreach ($dowOrder as $dow) {
            $row = $hod[$dow] ?? [];
            for ($i = 0; $i < 24; $i++) {
                $vmaxRow[$i] += (float)($row[$i] ?? 0.0);
            }
        }
        $threshold = 0.25;
        $typStart = null;
        $typEnd = null;
        for ($i = 0; $i < 24; $i++) {
            if ($vmaxRow[$i] >= $threshold) {
                $typStart = $i;
                break;
            }
        }
        for ($i = 23; $i >= 0; $i--) {
            if ($vmaxRow[$i] >= $threshold) {
                $typEnd = $i + 1;
                break;
            }
        }
        $typStart = $typStart !== null ? sprintf('%02d:00', $typStart) : null;
        $typEnd = $typEnd !== null ? sprintf('%02d:00', $typEnd) : null;

        $totalWeekend = array_sum($hod['Sat'] ?? []) + array_sum($hod['Sun'] ?? []);
        $totalEvening = 0.0;
        for ($i = 18; $i < 24; $i++) {
            foreach ($dowOrder as $d) {
                $totalEvening += (float)($hod[$d][$i] ?? 0.0);
            }
        }
        $weekendShare = $totalHours > 0 ? round(100 * $totalWeekend / $totalHours, 1) : 0.0;
        $eveningShare = $totalHours > 0 ? round(100 * $totalEvening / $totalHours, 1) : 0.0;

        $earliestStart = $earliestStartTs !== null
            ? (new \DateTimeImmutable('@' . $earliestStartTs))->setTimezone($userTz)->format(\DateTimeInterface::ATOM)
            : null;
        $latestEnd = $latestEndTs !== null
            ? (new \DateTimeImmutable('@' . $latestEndTs))->setTimezone($userTz)->format(\DateTimeInterface::ATOM)
            : null;
        $longestSession = round($longestSessionHours, 2);

        $halfThreshold = 4.0;
        $lastDayOff = null;
        $lastHalfDay = null;
        $cursor = $analysisTo instanceof \DateTimeImmutable ? $analysisTo : $to;
        if ($cursor->getTimestamp() < $from->getTimestamp()) {
            $cursor = $from;
        }
        while ($cursor->getTimestamp() >= $from->getTimestamp()) {
            $key = $cursor->format('Y-m-d');
            $dayTotal = isset($byDay[$key]) ? (float)$byDay[$key]['total_hours'] : 0.0;
            if ($lastDayOff === null && $dayTotal <= 0.01) {
                $lastDayOff = $key;
            }
            if ($lastHalfDay === null && $dayTotal > 0.01 && $dayTotal <= $halfThreshold) {
                $lastHalfDay = $key;
            }
            if ($lastDayOff !== null && $lastHalfDay !== null) {
                break;
            }
            $nextCursor = $cursor->modify('-1 day');
            if ($nextCursor->getTimestamp() === $cursor->getTimestamp()) {
                break;
            }
            $cursor = $nextCursor;
        }

        return [
            'total_hours' => round($totalHours, 2),
            'future_hours' => round($futureTotalHours, 2),
            'avg_per_day' => round($avgPerDay, 2),
            'avg_per_event' => round($avgPerEvent, 2),
            'events' => $eventsCount,
            'active_days' => $activeDays,
            'busiest_day' => $busiest,
            'median_per_day' => $medianPerDay,
            'top_calendar' => $topCal,
            'typical_start' => $typStart,
            'typical_end' => $typEnd,
            'earliest_start' => $earliestStart,
            'latest_end' => $latestEnd,
            'longest_session' => $longestSession,
            'last_day_off' => $lastDayOff,
            'last_half_day_off' => $lastHalfDay,
            'weekend_share' => $weekendShare,
            'evening_share' => $eveningShare,
            'overlap_events' => $overlapCount,
            'current_period_clipped' => $currentPeriodClipped,
            'current_cutoff' => $currentCutoff,
            'today_actual_hours' => round($todayActualHours, 2),
            'today_future_hours' => round($todayFutureHours, 2),
        ];
    }
}
