<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\NotesService;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class NotesServiceTest extends TestCase {
  public function testGetNotesBuildsHistoryAndFiltersEmpty(): void {
    $config = $this->createMock(IConfig::class);
    $calendar = $this->createMock(CalendarAccessService::class);
    $logger = $this->createMock(LoggerInterface::class);

    $dates = [
      1 => new \DateTimeImmutable('2025-03-10'),
      0 => new \DateTimeImmutable('2025-03-03'),
      -1 => new \DateTimeImmutable('2025-02-24'),
      -2 => new \DateTimeImmutable('2025-02-17'),
      -3 => new \DateTimeImmutable('2025-02-10'),
      -4 => new \DateTimeImmutable('2025-02-03'),
    ];

    $calendar->method('resolveUserTimezone')->willReturn(new \DateTimeZone('UTC'));
    $calendar->method('resolveUserWeekStart')->willReturn(1);
    $calendar->method('rangeBounds')->willReturnCallback(
      fn (string $range, int $offset) => [$dates[$offset] ?? $dates[0], $dates[$offset] ?? $dates[0]]
    );
    $calendar->method('notesKey')->willReturnCallback(
      fn (string $range, \DateTimeInterface $from) => sprintf('%s-%s', $range, $from->format('Y-m-d'))
    );

    $config->method('getUserValue')->willReturnCallback(
      fn (string $uid, string $app, string $key) => match ($key) {
        'week-2025-03-10' => 'current note',
        'week-2025-03-03' => 'previous note',
        'week-2025-02-24' => 'history 1',
        'week-2025-02-17' => '',
        'week-2025-02-10' => 'history 3',
        'week-2025-02-03' => '',
        default => '',
      }
    );

    $service = new NotesService($config, $calendar, $logger);
    $result = $service->getNotes('admin', 'week', 1);

    $this->assertSame('week', $result['period']['type']);
    $this->assertSame('2025-03-10', $result['period']['current_from']);
    $this->assertSame('2025-03-03', $result['period']['previous_from']);
    $this->assertSame('current note', $result['notes']['current']);
    $this->assertSame('previous note', $result['notes']['previous']);
    $this->assertCount(3, $result['notes']['history']);
    $this->assertSame(1, $result['notes']['history'][0]['offset']);
    $this->assertSame('previous note', $result['notes']['history'][0]['content']);
    $this->assertSame(2, $result['notes']['history'][1]['offset']);
    $this->assertSame('history 1', $result['notes']['history'][1]['content']);
    $this->assertSame(4, $result['notes']['history'][2]['offset']);
    $this->assertSame('history 3', $result['notes']['history'][2]['content']);
  }

  public function testSaveNotesTruncatesAndStoresRaw(): void {
    $config = $this->createMock(IConfig::class);
    $calendar = $this->createMock(CalendarAccessService::class);
    $logger = $this->createMock(LoggerInterface::class);

    $calendar->method('resolveUserTimezone')->willReturn(new \DateTimeZone('UTC'));
    $calendar->method('resolveUserWeekStart')->willReturn(1);
    $calendar->method('rangeBounds')->willReturn([new \DateTimeImmutable('2025-03-10'), new \DateTimeImmutable('2025-03-10')]);
    $calendar->method('notesKey')->willReturn('week-2025-03-10');

    $config->expects($this->once())
      ->method('setUserValue')
      ->with(
        'admin',
        'opsdash',
        'week-2025-03-10',
        $this->callback(function (string $value): bool {
          // Content must be stored raw (no entity encoding) and truncated to 32768 bytes.
          return str_contains($value, '<script>')
            && !str_contains($value, '&lt;')
            && strlen($value) === 32768;
        })
      );

    $service = new NotesService($config, $calendar, $logger);
    $payload = '<script>' . str_repeat('a', 40000);

    $this->assertTrue($service->saveNotes('admin', 'week', 0, $payload));
  }

  public function testSaveNotesReturnsFalseOnFailure(): void {
    $config = $this->createMock(IConfig::class);
    $calendar = $this->createMock(CalendarAccessService::class);
    $logger = $this->createMock(LoggerInterface::class);

    $calendar->method('resolveUserTimezone')->willReturn(new \DateTimeZone('UTC'));
    $calendar->method('resolveUserWeekStart')->willReturn(1);
    $calendar->method('rangeBounds')->willReturn([new \DateTimeImmutable('2025-03-10'), new \DateTimeImmutable('2025-03-10')]);
    $calendar->method('notesKey')->willReturn('week-2025-03-10');

    $config->method('setUserValue')->willThrowException(new \RuntimeException('boom'));
    $logger->expects($this->once())
      ->method('error')
      ->with($this->stringContains('notes save failed'));

    $service = new NotesService($config, $calendar, $logger);
    $this->assertFalse($service->saveNotes('admin', 'week', 0, 'note'));
  }
}
