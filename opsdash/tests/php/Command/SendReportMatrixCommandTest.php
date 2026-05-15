<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Command;

use OCA\Opsdash\Command\SendReportVariantsCommand;
use OCA\Opsdash\Service\ReportDeliveryService;
use OCP\IUserManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class SendReportMatrixCommandTest extends TestCase {
  public function testExecuteRejectsMissingUser(): void {
    $delivery = $this->createMock(ReportDeliveryService::class);
    $userManager = new class implements IUserManager {
      public function get(string $uid) {
        return null;
      }
    };
    $command = new SendReportVariantsCommand($delivery, $userManager);

    $input = new TestMatrixInput(['user' => '', 'offset' => 0]);
    $output = new TestMatrixOutput();

    $method = new \ReflectionMethod(SendReportVariantsCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::FAILURE, $result);
    $this->assertStringContainsString('--user is required', implode("\n", $output->lines));
  }

  public function testExecuteRejectsUnknownUser(): void {
    $delivery = $this->createMock(ReportDeliveryService::class);
    $userManager = new class implements IUserManager {
      public function get(string $uid) {
        return null;
      }
    };
    $command = new SendReportVariantsCommand($delivery, $userManager);

    $input = new TestMatrixInput(['user' => 'admin', 'offset' => 0]);
    $output = new TestMatrixOutput();

    $method = new \ReflectionMethod(SendReportVariantsCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::FAILURE, $result);
    $this->assertStringContainsString('User not found', implode("\n", $output->lines));
  }

  public function testExecuteSendsAllGoalVariantsAcrossBothRanges(): void {
    $delivery = $this->createMock(ReportDeliveryService::class);
    $userManager = new class implements IUserManager {
      public function get(string $uid) {
        return new class implements \OCP\IUser {
          public function getUID(): string {
            return 'admin';
          }
        };
      }
    };

    $captured = [];
    $delivery
      ->expects($this->exactly(6))
      ->method('sendTestReport')
      ->willReturnCallback(function (
        string $appName,
        string $uid,
        string $range,
        int $offset,
        ?array $requestedCals,
        ?array $groupsOverride,
        ?array $targetsConfigOverride,
        ?array $reportingConfigOverride,
        ?string $reportVariantOverride,
        string $variantLabel
      ) use (&$captured): array {
        $captured[] = [
          'appName' => $appName,
          'uid' => $uid,
          'range' => $range,
          'offset' => $offset,
          'reportVariantOverride' => $reportVariantOverride,
          'reportingConfigOverride' => $reportingConfigOverride,
          'variantLabel' => $variantLabel,
        ];
        return [
          'email' => 'admin@local.test',
          'subject' => 'Opsdash test recap · ' . $variantLabel,
          'summary' => [],
        ];
      });

    $command = new SendReportVariantsCommand($delivery, $userManager);
    $input = new TestMatrixInput(['user' => 'admin', 'offset' => 99]);
    $output = new TestMatrixOutput();

    $method = new \ReflectionMethod(SendReportVariantsCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::SUCCESS, $result);
    $this->assertCount(6, $captured);
    $this->assertSame('opsdash', $captured[0]['appName']);
    $this->assertSame('admin', $captured[0]['uid']);
    $this->assertSame(24, $captured[0]['offset']);
    $this->assertSame('week', $captured[0]['range']);
    $this->assertSame('single_goal', $captured[0]['reportVariantOverride']);
    $this->assertSame('single_goal_week', $captured[0]['variantLabel']);
    $this->assertSame('month', $captured[3]['range']);
    $this->assertSame('category_and_calendar_goals_month', $captured[5]['variantLabel']);
    $this->assertNull($captured[0]['reportingConfigOverride']);
    $this->assertStringContainsString('single_goal_week -> admin@local.test', implode("\n", $output->lines));
    $this->assertStringContainsString('category_and_calendar_goals_month -> admin@local.test', implode("\n", $output->lines));
  }
}

final class TestMatrixInput implements InputInterface {
  /**
   * @param array<string,mixed> $options
   */
  public function __construct(private array $options) {
  }

  public function getOption(string $name) {
    return $this->options[$name] ?? null;
  }
}

final class TestMatrixOutput implements OutputInterface {
  /** @var list<string> */
  public array $lines = [];

  public function writeln(string $messages) {
    $this->lines[] = $messages;
  }
}
