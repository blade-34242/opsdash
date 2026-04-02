<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use DateInterval;
use Sabre\VObject\Reader;

class CalendarParsingService {
    /**
     * @param array<int,mixed> $raw
     * @return array<int,array<string,mixed>>
     */
    public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        $out = [];
        $count = 0;
        $maxRows = 5000;
        $maxIcsBytes = 200000;
        $icsParsed = false;
        $icsSkipped = 0;

        foreach ($raw as $row) {
            if (++$count > $maxRows) {
                break;
            }
            $rowAllDay = is_array($row) && array_key_exists('allday', $row) ? (bool)$row['allday'] : false;
            if (is_object($row)) {
                if ($row instanceof \ArrayObject) {
                    $row = $row->getArrayCopy();
                } elseif ($row instanceof \stdClass) {
                    $row = (array)$row;
                } elseif ($row instanceof \JsonSerializable) {
                    $serialized = $row->jsonSerialize();
                    if (is_array($serialized)) {
                        $row = $serialized;
                    }
                } else {
                    $direct = $this->extractEventFromObject($row, $calendarName, $calendarId, $rowAllDay);
                    if ($direct !== null) {
                        $out[] = $direct;
                        continue;
                    }
                    if (method_exists($row, 'toArray')) {
                        $tmp = $row->toArray();
                        if (is_array($tmp)) {
                            $row = $tmp;
                        }
                    }
                }
            }
            if (is_array($row) && isset($row['objects'])) {
                $objects = $row['objects'];
                if ($objects instanceof \ArrayObject) {
                    $objects = $objects->getArrayCopy();
                } elseif ($objects instanceof \stdClass) {
                    $objects = (array)$objects;
                }
                if (is_array($objects)) {
                    foreach ($objects as $payload) {
                        if ($payload instanceof \ArrayObject) {
                            $payload = $payload->getArrayCopy();
                        } elseif ($payload instanceof \stdClass) {
                            $payload = (array)$payload;
                        } elseif ($payload instanceof \JsonSerializable) {
                            $payload = $payload->jsonSerialize();
                        } elseif (is_object($payload) && method_exists($payload, 'toArray')) {
                            try {
                                $payload = $payload->toArray();
                            } catch (\Throwable) {
                                // ignore conversion failure
                            }
                        } elseif (is_object($payload) && method_exists($payload, 'serialize')) {
                            try {
                                $ics = $payload->serialize();
                                if (is_string($ics) && $ics !== '' && strlen($ics) < $maxIcsBytes) {
                                    try {
                                        $vobj = Reader::read($ics);
                                        if ($vobj && isset($vobj->VEVENT)) {
                                            foreach ($vobj->select('VEVENT') as $vevent) {
                                                $dtStart = $vevent->DTSTART?->getDateTime();
                                                $dtEnd = $this->resolveVEventEnd($vevent, $dtStart);
                                                if ($dtStart && $dtEnd) {
                                                    $summary = $this->extractVEventSummary($vevent);
                                                    $out[] = [
                                                        'calendar' => $calendarName,
                                                        'calendar_id' => $calendarId,
                                                        'summary' => $summary,
                                                        'title' => $summary,
                                                        'allday' => $rowAllDay,
                                                        'start' => $dtStart->format('Y-m-d H:i:s'),
                                                        'end' => $dtEnd->format('Y-m-d H:i:s'),
                                                    ];
                                                    $icsParsed = true;
                                                }
                                            }
                                        }
                                    } catch (\Throwable) {
                                        $icsSkipped++;
                                    }
                                    continue;
                                }
                            } catch (\Throwable) {
                                // ignore serialization failure
                            }
                        } elseif ($payload instanceof \Traversable) {
                            try {
                                $payload = iterator_to_array($payload);
                            } catch (\Throwable) {
                                // ignore conversion failure
                            }
                        } elseif (is_object($payload) && method_exists($payload, 'getIterator')) {
                            try {
                                $iter = $payload->getIterator();
                                if ($iter instanceof \Traversable) {
                                    $payload = iterator_to_array($iter);
                                }
                            } catch (\Throwable) {
                                // ignore conversion failure
                            }
                        }
                        if (!is_array($payload)) {
                            continue;
                        }
                        if (isset($payload['DTSTART'])) {
                            $start = $this->parseStructuredDate($payload['DTSTART']);
                            $end = isset($payload['DTEND'])
                                ? $this->parseStructuredDate($payload['DTEND'])
                                : null;
                            $duration = isset($payload['DURATION'])
                                ? $this->extractTextValue($payload['DURATION'])
                                : null;
                            if (!$end && $start && $duration !== null) {
                                try {
                                    $dtStart = new \DateTimeImmutable($start, new \DateTimeZone('UTC'));
                                    $interval = new DateInterval($duration);
                                    $end = $dtStart->add($interval)->format('Y-m-d H:i:s');
                                } catch (\Throwable) {
                                    $end = null;
                                }
                            }
                            if ($start && $end) {
                                $summary = isset($payload['SUMMARY'])
                                    ? ($this->extractTextValue($payload['SUMMARY']) ?? '')
                                    : '';
                                $out[] = [
                                    'calendar' => $calendarName,
                                    'calendar_id' => $calendarId,
                                    'summary' => $summary,
                                    'title' => $summary,
                                    'allday' => $rowAllDay,
                                    'start' => $start,
                                    'end' => $end,
                                ];
                                continue;
                            }
                        }
                        if (isset($payload['calendardata'])) {
                            $ics = $this->extractTextValue($payload['calendardata']) ?? '';
                            if ($ics !== '' && strlen($ics) < $maxIcsBytes) {
                                try {
                                    $vobj = Reader::read($ics);
                                    if ($vobj && isset($vobj->VEVENT)) {
                                        foreach ($vobj->select('VEVENT') as $vevent) {
                                            $dtStart = $vevent->DTSTART?->getDateTime();
                                            $dtEnd = $this->resolveVEventEnd($vevent, $dtStart);
                                            if ($dtStart && $dtEnd) {
                                                $summary = $this->extractVEventSummary($vevent);
                                                $out[] = [
                                                    'calendar' => $calendarName,
                                                    'calendar_id' => $calendarId,
                                                    'summary' => $summary,
                                                    'title' => $summary,
                                                    'allday' => $rowAllDay,
                                                    'start' => $dtStart->format('Y-m-d H:i:s'),
                                                    'end' => $dtEnd->format('Y-m-d H:i:s'),
                                                ];
                                                $icsParsed = true;
                                            }
                                        }
                                    }
                                } catch (\Throwable) {
                                    $icsSkipped++;
                                }
                                continue;
                            }
                            $icsSkipped++;
                        }

                        $start = $payload['start'] ?? null;
                        $end = $payload['end'] ?? null;
                        if ($start && $end) {
                            $summary = $this->extractTextValue($payload['summary'] ?? null) ?? '';
                            $out[] = [
                                'calendar' => $calendarName,
                                'calendar_id' => $calendarId,
                                'summary' => $summary,
                                'title' => $summary,
                                'allday' => $rowAllDay || !empty($payload['allday']),
                                'start' => is_string($start) ? $start : ($start['date'] ?? $start['datetime'] ?? ''),
                                'end' => is_string($end) ? $end : ($end['date'] ?? $end['datetime'] ?? ''),
                            ];
                        }
                    }
                }
                continue;
            }

            if (!is_array($row)) {
                continue;
            }
            if (array_key_exists('start', $row) && array_key_exists('end', $row)) {
                $start = $this->extractDateValue($row['start']);
                $end = $this->extractDateValue($row['end']);
                if ($start && $end) {
                    $summary = $this->extractTextValue($row['summary'] ?? null) ?? '';
                    $out[] = [
                        'calendar' => $calendarName,
                        'calendar_id' => $calendarId,
                        'summary' => $summary,
                        'title' => $summary,
                        'allday' => $rowAllDay || !empty($row['allday']),
                        'start' => $start,
                        'end' => $end,
                    ];
                    continue;
                }
            }
            $payload = $row['object'] ?? $row['calendardata'] ?? null;
            if ($payload) {
                $ics = $this->extractTextValue($payload) ?? '';
                if ($ics !== '' && strlen($ics) < $maxIcsBytes) {
                    try {
                        $vobj = Reader::read($ics);
                        if ($vobj && isset($vobj->VEVENT)) {
                            foreach ($vobj->select('VEVENT') as $vevent) {
                                $dtStart = $vevent->DTSTART?->getDateTime();
                                $dtEnd = $this->resolveVEventEnd($vevent, $dtStart);
                                if ($dtStart && $dtEnd) {
                                    $summary = $this->extractVEventSummary($vevent);
                                    $out[] = [
                                        'calendar' => $calendarName,
                                        'calendar_id' => $calendarId,
                                        'summary' => $summary,
                                        'title' => $summary,
                                        'allday' => $rowAllDay,
                                        'start' => $dtStart->format('Y-m-d H:i:s'),
                                        'end' => $dtEnd->format('Y-m-d H:i:s'),
                                    ];
                                    $icsParsed = true;
                                }
                            }
                        }
                    } catch (\Throwable) {
                        $icsSkipped++;
                    }
                    continue;
                }
                $icsSkipped++;
            }
        }

        if (!$icsParsed && $icsSkipped > 0) {
            // No parsable ICS rows, return empty set to avoid partial guesses.
            return [];
        }

        return $out;
    }

    private function parseStructuredDate(mixed $value): ?string {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }
        if (is_object($value)) {
            if (method_exists($value, 'getDateTime')) {
                try {
                    $dt = $value->getDateTime();
                    if ($dt instanceof \DateTimeInterface) {
                        return $dt->format('Y-m-d H:i:s');
                    }
                } catch (\Throwable) {}
            }
            if (method_exists($value, 'getValue')) {
                try {
                    $raw = $value->getValue();
                    if (is_string($raw) && $raw !== '') {
                        return $this->normalizeDateString($raw, null);
                    }
                } catch (\Throwable) {}
            }
            if (method_exists($value, '__toString')) {
                try {
                    $raw = (string)$value;
                    if ($raw !== '') {
                        return $this->normalizeDateString($raw, null);
                    }
                } catch (\Throwable) {}
            }
            if ($value instanceof \JsonSerializable) {
                $value = $value->jsonSerialize();
            }
            if (is_array($value)) {
                $candidate = $value[0] ?? null;
                if (is_array($candidate) && isset($candidate['date'])) {
                    $tzName = isset($candidate['timezone']) ? (string)$candidate['timezone'] : null;
                    return $this->normalizeDateString((string)$candidate['date'], $tzName ?: null);
                }
                if (is_string($candidate) && $candidate !== '') {
                    return $this->normalizeDateString($candidate, null);
                }
                if (isset($value['date'])) {
                    $tzName = isset($value['timezone']) ? (string)$value['timezone'] : null;
                    return $this->normalizeDateString((string)$value['date'], $tzName ?: null);
                }
                if (isset($value['datetime'])) {
                    $tzName = isset($value['timezone']) ? (string)$value['timezone'] : null;
                    return $this->normalizeDateString((string)$value['datetime'], $tzName ?: null);
                }
            }
        }
        if (is_string($value) && $value !== '') {
            return $this->normalizeDateString($value, null);
        }
        if (is_array($value)) {
            $candidate = $value[0] ?? null;
            if ($candidate instanceof \DateTimeInterface) {
                return $candidate->format('Y-m-d H:i:s');
            }
            if (is_object($candidate)) {
                if (method_exists($candidate, 'getDateTime')) {
                    try {
                        $dt = $candidate->getDateTime();
                        if ($dt instanceof \DateTimeInterface) {
                            return $dt->format('Y-m-d H:i:s');
                        }
                    } catch (\Throwable) {}
                }
                if (method_exists($candidate, 'getValue')) {
                    try {
                        $raw = $candidate->getValue();
                        if (is_string($raw) && $raw !== '') {
                            return $this->normalizeDateString($raw, null);
                        }
                    } catch (\Throwable) {}
                }
                if (method_exists($candidate, '__toString')) {
                    try {
                        $raw = (string)$candidate;
                        if ($raw !== '') {
                            return $this->normalizeDateString($raw, null);
                        }
                    } catch (\Throwable) {}
                }
            }
            if (is_array($candidate) && isset($candidate['date'])) {
                $tzName = isset($candidate['timezone']) ? (string)$candidate['timezone'] : null;
                return $this->normalizeDateString((string)$candidate['date'], $tzName ?: null);
            }
            if (is_string($candidate) && $candidate !== '') {
                return $this->normalizeDateString($candidate, null);
            }
        }
        return null;
    }

    private function extractEventFromObject(object $row, string $calendarName, ?string $calendarId, bool $rowAllDay): ?array {
        $start = $this->extractDateValue($this->readObjectValue($row, [
            'getStart', 'getStartDate', 'getStartDateTime', 'getDtStart', 'getDTStart',
        ], [
            'start', 'startDate', 'start_date', 'dtstart', 'dtStart',
        ]));
        $end = $this->extractDateValue($this->readObjectValue($row, [
            'getEnd', 'getEndDate', 'getEndDateTime', 'getDtEnd', 'getDTEnd',
        ], [
            'end', 'endDate', 'end_date', 'dtend', 'dtEnd',
        ]));
        if (!$start || !$end) {
            return null;
        }
        $summary = $this->extractTextValue($this->readObjectValue($row, [
            'getSummary', 'getTitle', 'getName',
        ], [
            'summary', 'title', 'name',
        ]) ?? '') ?? '';
        $allDay = $rowAllDay;
        $allDayRaw = $this->readObjectValue($row, [
            'isAllDay', 'isAllDayEvent', 'getAllDay', 'getIsAllDay',
        ], [
            'allday', 'allDay', 'all_day',
        ]);
        if ($allDayRaw !== null) {
            $allDay = (bool)$allDayRaw;
        }
        return [
            'calendar' => $calendarName,
            'calendar_id' => $calendarId,
            'summary' => $summary,
            'title' => $summary,
            'allday' => $allDay,
            'start' => $start,
            'end' => $end,
        ];
    }

    private function readObjectValue(object $row, array $methods, array $props): mixed {
        foreach ($methods as $method) {
            if (method_exists($row, $method)) {
                try {
                    return $row->{$method}();
                } catch (\Throwable) {
                    // ignore
                }
            }
        }
        foreach ($props as $prop) {
            if (isset($row->{$prop})) {
                return $row->{$prop};
            }
        }
        return null;
    }

    private function resolveVEventEnd(object $vevent, ?\DateTimeInterface $dtStart): ?\DateTimeInterface {
        $dtEnd = method_exists($vevent, '__get') || isset($vevent->DTEND)
            ? $vevent->DTEND?->getDateTime()
            : null;
        if ($dtEnd || !$dtStart) {
            return $dtEnd;
        }

        if (isset($vevent->DURATION)) {
            $duration = $this->extractTextValue($vevent->DURATION->getValue());
            if ($duration !== null) {
                try {
                    return (clone $dtStart)->add(new DateInterval($duration));
                } catch (\Throwable) {
                    // fall through to default duration
                }
            }
        }

        return (clone $dtStart)->modify('+1 hour');
    }

    private function extractVEventSummary(object $vevent): string {
        if (!isset($vevent->SUMMARY)) {
            return '';
        }

        return $this->extractTextValue($vevent->SUMMARY->getValue()) ?? '';
    }

    private function extractDateValue(mixed $value): ?string {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }
        if (is_string($value) && $value !== '') {
            return $this->normalizeDateString($value, null);
        }
        if (is_numeric($value)) {
            try {
                $dt = new \DateTimeImmutable('@' . (int)$value);
                return $dt->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                return null;
            }
        }
        if (is_array($value)) {
            if (isset($value['date'])) {
                $tzName = isset($value['timezone']) ? (string)$value['timezone'] : null;
                return $this->normalizeDateString((string)$value['date'], $tzName ?: null);
            }
            if (isset($value['datetime'])) {
                $tzName = isset($value['timezone']) ? (string)$value['timezone'] : null;
                return $this->normalizeDateString((string)$value['datetime'], $tzName ?: null);
            }
        }
        return null;
    }

    private function extractTextValue(mixed $value): ?string {
        if (is_string($value)) {
            return $value !== '' ? $value : null;
        }
        if (is_int($value) || is_float($value) || is_bool($value)) {
            return (string)$value;
        }
        if (is_array($value)) {
            if (array_key_exists(0, $value)) {
                return $this->extractTextValue($value[0]);
            }
            if (array_key_exists('value', $value)) {
                return $this->extractTextValue($value['value']);
            }
            return null;
        }
        if (is_object($value)) {
            if (method_exists($value, 'getValue')) {
                try {
                    return $this->extractTextValue($value->getValue());
                } catch (\Throwable) {
                    return null;
                }
            }
            if ($value instanceof \JsonSerializable) {
                try {
                    return $this->extractTextValue($value->jsonSerialize());
                } catch (\Throwable) {
                    return null;
                }
            }
            if (method_exists($value, '__toString')) {
                try {
                    $stringValue = (string)$value;
                    return $stringValue !== '' ? $stringValue : null;
                } catch (\Throwable) {
                    return null;
                }
            }
        }
        return null;
    }

    private function normalizeDateString(string $raw, ?string $tzName): ?string {
        try {
            $tz = $tzName ? new \DateTimeZone($tzName) : null;
            $dt = $tz ? new \DateTimeImmutable($raw, $tz) : new \DateTimeImmutable($raw);
            return $dt->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }
}
