<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Command;

use OCA\Opsdash\Command\SendReportMatrixCommand;
use OCA\Opsdash\Service\ReportDeliveryService;
use OCP\IUser;
use OCP\IUserManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class SendReportMatrixCommandTest extends TestCase {
  public function testExecuteRejectsMissingUser(): void {
    $delivery = $this->createMock(ReportDeliveryService::class);
    $userManager = $this->createMock(IUserManager::class);
    $command = new SendReportMatrixCommand($delivery, $userManager);

    $input = new TestMatrixInput(['user' => '', 'offset' => 0]);
    $output = new TestMatrixOutput();

    $method = new \ReflectionMethod(SendReportMatrixCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::FAILURE, $result);
    $this->assertStringContainsString('--user is required', implode("\n", $output->lines));
  }

  public function testExecuteRejectsUnknownUser(): void {
    $delivery = $this->createMock(ReportDeliveryService::class);
    $userManager = $this->createMock(IUserManager::class);
    $userManager->method('get')->with('admin')->willReturn(null);
    $command = new SendReportMatrixCommand($delivery, $userManager);

    $input = new TestMatrixInput(['user' => 'admin', 'offset' => 0]);
    $output = new TestMatrixOutput();

    $method = new \ReflectionMethod(SendReportMatrixCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::FAILURE, $result);
    $this->assertStringContainsString('User not found', implode("\n", $output->lines));
  }

  public function testExecuteSendsAllMatrixCases(): void {
    $delivery = $this->createMock(ReportDeliveryService::class);
    $userManager = $this->createMock(IUserManager::class);
    $user = $this->createMock(IUser::class);
    $userManager->method('get')->with('admin')->willReturn($user);

    $captured = [];
    $delivery
      ->expects($this->exactly(8))
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
        string $variantLabel
      ) use (&$captured): array {
        $captured[] = [
          'appName' => $appName,
          'uid' => $uid,
          'range' => $range,
          'offset' => $offset,
          'requestedCals' => $requestedCals,
          'groupsOverride' => $groupsOverride,
          'targetsConfigOverride' => $targetsConfigOverride,
          'reportingConfigOverride' => $reportingConfigOverride,
          'variantLabel' => $variantLabel,
        ];
        return [
          'email' => 'admin@local.test',
          'subject' => 'Opsdash test recap · ' . $variantLabel,
          'summary' => [],
        ];
      });

    $command = new SendReportMatrixCommand($delivery, $userManager);
    $input = new TestMatrixInput(['user' => 'admin', 'offset' => 99]);
    $output = new TestMatrixOutput();

    $method = new \ReflectionMethod(SendReportMatrixCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::SUCCESS, $result);
    $this->assertCount(8, $captured);
    $this->assertSame('opsdash', $captured[0]['appName']);
    $this->assertSame('admin', $captured[0]['uid']);
    $this->assertSame(24, $captured[0]['offset']);
    $this->assertSame('week', $captured[0]['range']);
    $this->assertSame('week_daily', $captured[0]['variantLabel']);
    $this->assertSame('month', $captured[7]['range']);
    $this->assertSame('both_month', $captured[7]['variantLabel']);
    $this->assertTrue($captured[0]['reportingConfigOverride']['modes']['week']['enabled']);
    $this->assertSame('daily', $captured[0]['reportingConfigOverride']['modes']['week']['cadence']);
    $this->assertTrue($captured[7]['reportingConfigOverride']['modes']['month']['enabled']);
    $this->assertStringContainsString('week_daily -> admin@local.test', implode("\n", $output->lines));
    $this->assertStringContainsString('both_month -> admin@local.test', implode("\n", $output->lines));
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
