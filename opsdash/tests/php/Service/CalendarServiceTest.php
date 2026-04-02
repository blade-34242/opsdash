<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarParsingService;
use PHPUnit\Framework\TestCase;

final class CalendarServiceTest extends TestCase {
    public function testParseRowsStructuredObjects(): void {
        $service = new CalendarParsingService();

        $raw = [
            [
                'objects' => [
                    [
                        'UID' => ['opsdash-work-w1-mon-standup', []],
                        'SUMMARY' => ['Team standup', []],
                        'DTSTART' => [
                            [
                                'date' => '2025-12-15 09:00:00.000000',
                                'timezone_type' => 3,
                                'timezone' => 'UTC',
                            ],
                            [],
                        ],
                        'DTEND' => [
                            [
                                'date' => '2025-12-15 09:30:00.000000',
                                'timezone_type' => 3,
                                'timezone' => 'UTC',
                            ],
                            [],
                        ],
                    ],
                ],
            ],
        ];

        $rows = $service->parseRows($raw, 'opsdash-work', 'opsdash-work');

        $this->assertCount(1, $rows);
        $this->assertSame('Team standup', $rows[0]['summary']);
        $this->assertSame('2025-12-15 09:00:00', $rows[0]['start']);
        $this->assertSame('2025-12-15 09:30:00', $rows[0]['end']);
        $this->assertFalse($rows[0]['allday']);
    }

    public function testParseRowsTopLevelStartEnd(): void {
        $service = new CalendarParsingService();

        $raw = [
            [
                'summary' => 'Focus block',
                'start' => '2026-01-08 16:00:00',
                'end' => '2026-01-08 17:00:00',
                'allday' => false,
            ],
        ];

        $rows = $service->parseRows($raw, 'personal', 'personal');

        $this->assertCount(1, $rows);
        $this->assertSame('Focus block', $rows[0]['summary']);
        $this->assertSame('2026-01-08 16:00:00', $rows[0]['start']);
        $this->assertSame('2026-01-08 17:00:00', $rows[0]['end']);
        $this->assertFalse($rows[0]['allday']);
    }

    public function testParseRowsStructuredDurationArray(): void {
        $service = new CalendarParsingService();

        $raw = [
            [
                'objects' => [
                    [
                        'SUMMARY' => ['Focus session', []],
                        'DTSTART' => [
                            [
                                'date' => '2025-12-15 09:00:00.000000',
                                'timezone_type' => 3,
                                'timezone' => 'UTC',
                            ],
                            [],
                        ],
                        'DURATION' => ['PT45M', []],
                    ],
                ],
            ],
        ];

        $rows = $service->parseRows($raw, 'opsdash-work', 'opsdash-work');

        $this->assertCount(1, $rows);
        $this->assertSame('Focus session', $rows[0]['summary']);
        $this->assertSame('2025-12-15 09:00:00', $rows[0]['start']);
        $this->assertSame('2025-12-15 09:45:00', $rows[0]['end']);
    }

    public function testParseRowsTopLevelSummaryArray(): void {
        $service = new CalendarParsingService();

        $raw = [
            [
                'summary' => ['Focus block', []],
                'start' => '2026-01-08 16:00:00',
                'end' => '2026-01-08 17:00:00',
                'allday' => false,
            ],
        ];

        $rows = $service->parseRows($raw, 'personal', 'personal');

        $this->assertCount(1, $rows);
        $this->assertSame('Focus block', $rows[0]['summary']);
        $this->assertSame('2026-01-08 16:00:00', $rows[0]['start']);
        $this->assertSame('2026-01-08 17:00:00', $rows[0]['end']);
    }
}
