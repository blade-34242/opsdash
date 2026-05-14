<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\ReportRenderService;
use OCP\IURLGenerator;
use OCP\Mail\IMailer;
use PHPUnit\Framework\TestCase;

class ReportRenderServiceTest extends TestCase {
  /**
   * @param array<string,mixed> $summary
   * @param array<string,mixed> $reportingConfig
   * @return array{subject:string,plain:string,html:string}
   */
  private function render(array $summary, array $reportingConfig): array {
    $mailer = new ReportRenderTestMailer();
    $urlGenerator = $this->createMock(IURLGenerator::class);
    $urlGenerator->method('linkToRouteAbsolute')->willReturn('http://localhost/index.php/apps/opsdash/overview');
    $service = new ReportRenderService($mailer, $urlGenerator);
    return $service->render($summary, $reportingConfig, 'Admin', 'test_case');
  }

  /**
   * @return array<string,mixed>
   */
  private function baseSummary(): array {
    return [
      'range' => 'week',
      'from' => '2026-05-11',
      'to' => '2026-05-17',
      'selected_labels' => ['Opsdash · Deep Work', 'Opsdash · Meetings'],
      'selected_count' => 2,
      'total_hours' => 41.0,
      'future_hours' => 12.5,
      'events' => 25,
      'active_days' => 4,
      'avg_per_day' => 10.25,
      'avg_per_event' => 1.64,
      'top_calendar' => ['label' => 'Opsdash · Deep Work', 'hours' => 20.5],
      'top_category' => ['label' => 'Work', 'hours' => 30.0],
      'busiest_day' => ['date' => '2026-05-11', 'hours' => 16.5, 'events' => 11],
      'days_off' => 3,
      'longest_session' => ['summary' => 'Architecture workshop', 'calendar' => 'Opsdash · Deep Work', 'hours' => 3.0, 'start' => '2026-05-12 08:30:00'],
      'balance' => ['index' => 0.5, 'warnings' => ['Balance index low (0.50).']],
      'notes' => ['current' => '', 'previous' => ''],
      'targets' => [
        'total' => [
          'actual' => 41.0,
          'target' => 34.0,
          'remaining' => 0.0,
          'percent' => 120.6,
          'status' => 'done',
        ],
        'calendars' => [
          ['label' => 'Opsdash · Deep Work', 'actual' => 20.5, 'target' => 16.0, 'percent' => 128.1, 'status' => 'done'],
          ['label' => 'Opsdash · Meetings', 'actual' => 8.0, 'target' => 10.0, 'percent' => 80.0, 'status' => 'at_risk'],
        ],
        'categories' => [
          ['label' => 'Work', 'actual' => 30.0, 'target' => 24.0, 'percent' => 125.0, 'status' => 'done'],
          ['label' => 'Sport', 'actual' => 3.0, 'target' => 6.0, 'percent' => 50.0, 'status' => 'on_track'],
        ],
      ],
    ];
  }

  /**
   * @return array<string,mixed>
   */
  private function reportingConfig(): array {
    return [
      'enabled' => true,
      'modes' => [
        'week' => ['enabled' => true, 'cadence' => 'end', 'reminderLead' => '1d'],
        'month' => ['enabled' => false, 'cadence' => 'end', 'reminderLead' => '2d'],
      ],
      'alertOnRisk' => true,
      'riskThreshold' => 0.85,
      'notifyEmail' => true,
      'notifyNotification' => true,
    ];
  }

  public function testSingleGoalRenderContainsSingleGoalSectionsOnly(): void {
    $summary = $this->baseSummary();
    $summary['report_variant'] = 'single_goal';

    $result = $this->render($summary, $this->reportingConfig());

    $this->assertStringContainsString('Single Goal model', $result['plain']);
    $this->assertStringContainsString('Goal progress', $result['plain']);
    $this->assertStringNotContainsString('Calendar targets', $result['plain']);
    $this->assertStringNotContainsString('Balance index:', $result['plain']);
  }

  public function testCalendarGoalsRenderContainsCalendarTargets(): void {
    $summary = $this->baseSummary();
    $summary['report_variant'] = 'calendar_goals';

    $result = $this->render($summary, $this->reportingConfig());

    $this->assertStringContainsString('Calendar Goals model', $result['plain']);
    $this->assertStringContainsString('Calendar targets', $result['plain']);
    $this->assertStringContainsString('Opsdash · Meetings', $result['plain']);
    $this->assertStringNotContainsString('Balance index:', $result['plain']);
  }

  public function testCategoryAndCalendarGoalsRenderContainsBalanceAndCategoryTargets(): void {
    $summary = $this->baseSummary();
    $summary['report_variant'] = 'category_and_calendar_goals';

    $result = $this->render($summary, $this->reportingConfig());

    $this->assertStringContainsString('Calendar + Category Goals model', $result['plain']);
    $this->assertStringContainsString('Targets & pace', $result['plain']);
    $this->assertStringContainsString('Work: 30.00 h / 24.00 h', $result['plain']);
    $this->assertStringContainsString('Balance index: 0.50', $result['plain']);
  }
}

final class ReportRenderTestMailer implements IMailer {
  public function createEMailTemplate(string $templateId) {
    return new ReportRenderTestTemplate();
  }

  public function createMessage() {
    return new \stdClass();
  }

  public function send($message) {
    return [];
  }
}

final class ReportRenderTestTemplate {
  private string $subject = '';
  /** @var list<string> */
  private array $plainParts = [];
  /** @var list<string> */
  private array $htmlParts = [];

  public function setSubject(string $subject): void {
    $this->subject = $subject;
  }

  public function addHeader(): void {}

  public function addHeading(string $heading): void {
    $this->plainParts[] = $heading;
    $this->htmlParts[] = $heading;
  }

  public function addBodyText(string $html, string $plain): void {
    $this->htmlParts[] = $html;
    $this->plainParts[] = $plain;
  }

  public function addBodyButton(string $label, string $url): void {
    $this->plainParts[] = $label . ' -> ' . $url;
    $this->htmlParts[] = $label . ' -> ' . $url;
  }

  public function addFooter(string $footer): void {
    $this->plainParts[] = strip_tags(str_replace('<br>', "\n", $footer));
    $this->htmlParts[] = $footer;
  }

  public function renderSubject(): string {
    return $this->subject;
  }

  public function renderText(): string {
    return implode("\n\n", $this->plainParts);
  }

  public function renderHtml(): string {
    return implode("\n", $this->htmlParts);
  }
}
