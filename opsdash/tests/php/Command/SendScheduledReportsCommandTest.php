<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Command;

use OCA\Opsdash\Command\SendScheduledReportsCommand;
use OCA\Opsdash\Service\ReportScheduleService;
use OCP\IUser;
use OCP\IUserManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;

class SendScheduledReportsCommandTest extends TestCase {
  public function testExecuteRejectsUnknownUser(): void {
    $service = $this->createMock(ReportScheduleService::class);
    $userManager = $this->createMock(IUserManager::class);
    $userManager->method('get')->with('admin')->willReturn(null);
    $command = new SendScheduledReportsCommand($service, $userManager);

    $input = new TestScheduledInput(['user' => 'admin']);
    $output = new TestScheduledOutput();
    $method = new \ReflectionMethod(SendScheduledReportsCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::FAILURE, $result);
    $this->assertStringContainsString('User not found', implode("\n", $output->lines));
  }

  public function testExecuteReturnsFailureWhenSchedulerReportsFailures(): void {
    $service = $this->createMock(ReportScheduleService::class);
    $userManager = $this->createMock(IUserManager::class);
    $user = $this->createMock(IUser::class);
    $userManager->method('get')->with('admin')->willReturn($user);
    $service->method('runScheduled')->with('opsdash', 'admin')->willReturn([
      'scanned' => 1,
      'eligible' => 1,
      'sent' => 0,
      'skipped' => 0,
      'failed' => 1,
      'results' => [['uid' => 'admin', 'mode' => 'week', 'status' => 'failed']],
    ]);
    $command = new SendScheduledReportsCommand($service, $userManager);

    $input = new TestScheduledInput(['user' => 'admin']);
    $output = new TestScheduledOutput();
    $method = new \ReflectionMethod(SendScheduledReportsCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::FAILURE, $result);
    $this->assertStringContainsString('admin week :: failed', implode("\n", $output->lines));
  }

  public function testExecuteReturnsSuccessWhenSchedulerSucceeds(): void {
    $service = $this->createMock(ReportScheduleService::class);
    $userManager = $this->createMock(IUserManager::class);
    $service->method('runScheduled')->with('opsdash', null)->willReturn([
      'scanned' => 2,
      'eligible' => 1,
      'sent' => 1,
      'skipped' => 1,
      'failed' => 0,
      'results' => [['uid' => 'admin', 'mode' => 'week', 'status' => 'sent']],
    ]);
    $command = new SendScheduledReportsCommand($service, $userManager);

    $input = new TestScheduledInput(['user' => '']);
    $output = new TestScheduledOutput();
    $method = new \ReflectionMethod(SendScheduledReportsCommand::class, 'execute');
    $method->setAccessible(true);
    $result = $method->invoke($command, $input, $output);

    $this->assertSame(Command::SUCCESS, $result);
    $this->assertStringContainsString('scanned=2 eligible=1 sent=1 skipped=1 failed=0', implode("\n", $output->lines));
  }
}

final class TestScheduledInput implements \Symfony\Component\Console\Input\InputInterface {
  /**
   * @param array<string,mixed> $options
   */
  public function __construct(private array $options) {
  }

  public function getOption(string $name) {
    return $this->options[$name] ?? null;
  }
}

final class TestScheduledOutput implements \Symfony\Component\Console\Output\OutputInterface {
  /** @var list<string> */
  public array $lines = [];

  public function writeln(string $messages) {
    $this->lines[] = $messages;
  }
}
