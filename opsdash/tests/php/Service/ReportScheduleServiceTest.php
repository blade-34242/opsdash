<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\ReportScheduleService;
use PHPUnit\Framework\TestCase;

class ReportScheduleServiceTest extends TestCase {
  /**
   * @param array<string,mixed> $modeConfig
   * @return array<string,string>|null
   */
  private function resolveDispatch(string $modeKey, array $modeConfig, string $now, string $from, string $to): ?array {
    $service = (new \ReflectionClass(ReportScheduleService::class))->newInstanceWithoutConstructor();
    $method = new \ReflectionMethod(ReportScheduleService::class, 'resolveDispatchContext');
    $method->setAccessible(true);

    $calendarAccess = $this->createMock(\OCA\Opsdash\Service\CalendarAccessService::class);
    $calendarAccess
      ->method('rangeBounds')
      ->willReturn([
        new \DateTimeImmutable($from, new \DateTimeZone('UTC')),
        new \DateTimeImmutable($to, new \DateTimeZone('UTC')),
      ]);
    $property = new \ReflectionProperty(ReportScheduleService::class, 'calendarAccess');
    $property->setAccessible(true);
    $property->setValue($service, $calendarAccess);

    /** @var array<string,string>|null $result */
    $result = $method->invoke(
      $service,
      'admin',
      $modeKey,
      $modeConfig,
      new \DateTimeImmutable($now, new \DateTimeZone('UTC')),
      1,
    );
    return $result;
  }

  public function testWeeklyDailyDispatchUsesDateSpecificKey(): void {
    $result = $this->resolveDispatch('week', ['cadence' => 'daily'], '2026-05-14 09:00:00', '2026-05-11', '2026-05-17');
    $this->assertSame('2026-05-11_2026-05-17:daily:2026-05-14', $result['dispatchKey']);
  }

  public function testWeeklyMidDispatchOnlyRunsOnMidpoint(): void {
    $miss = $this->resolveDispatch('week', ['cadence' => 'mid'], '2026-05-13 09:00:00', '2026-05-11', '2026-05-17');
    $hit = $this->resolveDispatch('week', ['cadence' => 'mid'], '2026-05-14 09:00:00', '2026-05-11', '2026-05-17');

    $this->assertNull($miss);
    $this->assertSame('2026-05-11_2026-05-17:mid', $hit['dispatchKey']);
  }

  public function testMonthlyEndDispatchOnlyRunsOnLastDay(): void {
    $miss = $this->resolveDispatch('month', ['cadence' => 'end'], '2026-05-30 09:00:00', '2026-05-01', '2026-05-31');
    $hit = $this->resolveDispatch('month', ['cadence' => 'end'], '2026-05-31 09:00:00', '2026-05-01', '2026-05-31');

    $this->assertNull($miss);
    $this->assertSame('2026-05-01_2026-05-31:end', $hit['dispatchKey']);
  }
}
