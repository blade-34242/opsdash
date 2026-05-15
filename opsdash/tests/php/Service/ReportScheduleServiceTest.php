<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\ReportScheduleService;
use PHPUnit\Framework\TestCase;

class ReportScheduleServiceTest extends TestCase {
  /**
   * @param array<string,mixed> $modeConfig
   * @return array<string,int|string>|null
   */
  private function resolveDispatch(string $modeKey, array $modeConfig, string $now, string $currentFrom, string $currentTo, ?string $previousFrom = null, ?string $previousTo = null): ?array {
    $service = (new \ReflectionClass(ReportScheduleService::class))->newInstanceWithoutConstructor();
    $method = new \ReflectionMethod(ReportScheduleService::class, 'resolveDispatchContext');
    $method->setAccessible(true);

    $calendarAccess = $this->createMock(\OCA\Opsdash\Service\CalendarAccessService::class);
    $calendarAccess
      ->method('rangeBounds')
      ->willReturnCallback(function (string $range, int $offset) use ($currentFrom, $currentTo, $previousFrom, $previousTo): array {
        if ($offset === -1 && $previousFrom !== null && $previousTo !== null) {
          return [
            new \DateTimeImmutable($previousFrom, new \DateTimeZone('UTC')),
            new \DateTimeImmutable($previousTo, new \DateTimeZone('UTC')),
          ];
        }
        return [
          new \DateTimeImmutable($currentFrom, new \DateTimeZone('UTC')),
          new \DateTimeImmutable($currentTo, new \DateTimeZone('UTC')),
        ];
      });
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

  public function testWeeklyCheckpointDispatchOnlyRunsOnMidpointAfterSendTime(): void {
    $miss = $this->resolveDispatch('week', ['delivery' => 'checkpoint_final', 'sendTimeLocal' => '06:00'], '2026-05-13 09:00:00', '2026-05-11', '2026-05-17');
    $early = $this->resolveDispatch('week', ['delivery' => 'checkpoint_final', 'sendTimeLocal' => '06:00'], '2026-05-14 05:30:00', '2026-05-11', '2026-05-17');
    $hit = $this->resolveDispatch('week', ['delivery' => 'checkpoint_final', 'sendTimeLocal' => '06:00'], '2026-05-14 06:00:00', '2026-05-11', '2026-05-17');

    $this->assertNull($miss);
    $this->assertNull($early);
    $this->assertSame('2026-05-11_2026-05-17:checkpoint', $hit['dispatchKey']);
    $this->assertSame(0, $hit['rangeOffset']);
  }

  public function testWeeklyFinalDispatchRunsOnNextPeriodMorning(): void {
    $miss = $this->resolveDispatch('week', ['delivery' => 'final', 'sendTimeLocal' => '06:00'], '2026-05-17 09:00:00', '2026-05-18', '2026-05-24', '2026-05-11', '2026-05-17');
    $early = $this->resolveDispatch('week', ['delivery' => 'final', 'sendTimeLocal' => '06:00'], '2026-05-18 05:00:00', '2026-05-18', '2026-05-24', '2026-05-11', '2026-05-17');
    $hit = $this->resolveDispatch('week', ['delivery' => 'final', 'sendTimeLocal' => '06:00'], '2026-05-18 06:00:00', '2026-05-18', '2026-05-24', '2026-05-11', '2026-05-17');

    $this->assertNull($miss);
    $this->assertNull($early);
    $this->assertSame('2026-05-11_2026-05-17:final', $hit['dispatchKey']);
    $this->assertSame(-1, $hit['rangeOffset']);
  }

  public function testMonthlyFinalDispatchRunsOnNextMonthEvening(): void {
    $miss = $this->resolveDispatch('month', ['delivery' => 'final', 'sendTimeLocal' => '18:00'], '2026-05-31 19:00:00', '2026-06-01', '2026-06-30', '2026-05-01', '2026-05-31');
    $early = $this->resolveDispatch('month', ['delivery' => 'final', 'sendTimeLocal' => '18:00'], '2026-06-01 17:30:00', '2026-06-01', '2026-06-30', '2026-05-01', '2026-05-31');
    $hit = $this->resolveDispatch('month', ['delivery' => 'final', 'sendTimeLocal' => '18:00'], '2026-06-01 18:00:00', '2026-06-01', '2026-06-30', '2026-05-01', '2026-05-31');

    $this->assertNull($miss);
    $this->assertNull($early);
    $this->assertSame('2026-05-01_2026-05-31:final', $hit['dispatchKey']);
    $this->assertSame(-1, $hit['rangeOffset']);
  }
}
