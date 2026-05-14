<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\ReportSummaryService;
use PHPUnit\Framework\TestCase;

class ReportSummaryServiceTest extends TestCase {
  /**
   * @param array<string,mixed> $onboardingState
   * @param array<string,mixed> $targetsConfig
   * @param array<string,mixed> $targetSummary
   */
  private function resolveVariant(array $onboardingState, array $targetsConfig, array $targetSummary): string {
    $reflection = new \ReflectionClass(ReportSummaryService::class);
    $service = $reflection->newInstanceWithoutConstructor();
    $method = $reflection->getMethod('resolveReportVariant');
    $method->setAccessible(true);
    /** @var string $variant */
    $variant = $method->invoke($service, $onboardingState, $targetsConfig, $targetSummary);
    return $variant;
  }

  public function testResolvesSingleGoalFromStrategy(): void {
    $variant = $this->resolveVariant(
      ['strategy' => 'total_only'],
      ['categories' => []],
      ['calendars' => [['label' => 'Personal']]],
    );

    $this->assertSame('single_goal', $variant);
  }

  public function testResolvesCalendarGoalsFromStrategy(): void {
    $variant = $this->resolveVariant(
      ['strategy' => 'total_plus_categories'],
      ['categories' => []],
      ['calendars' => [['label' => 'Work']]],
    );

    $this->assertSame('calendar_goals', $variant);
  }

  public function testResolvesCategoryAndCalendarGoalsFromStrategy(): void {
    $variant = $this->resolveVariant(
      ['strategy' => 'full_granular'],
      ['categories' => []],
      ['calendars' => []],
    );

    $this->assertSame('category_and_calendar_goals', $variant);
  }

  public function testFallsBackToCategoriesWhenStrategyMissing(): void {
    $variant = $this->resolveVariant(
      [],
      ['categories' => [['id' => 'work', 'label' => 'Work']]],
      ['calendars' => []],
    );

    $this->assertSame('category_and_calendar_goals', $variant);
  }

  public function testFallsBackToCalendarTargetsWhenStrategyMissing(): void {
    $variant = $this->resolveVariant(
      [],
      ['categories' => []],
      ['calendars' => [['id' => 'opsdash-work', 'label' => 'Work']]],
    );

    $this->assertSame('calendar_goals', $variant);
  }

  public function testFallsBackToSingleGoalWhenNoSignalsExist(): void {
    $variant = $this->resolveVariant(
      [],
      ['categories' => []],
      ['calendars' => []],
    );

    $this->assertSame('single_goal', $variant);
  }
}
