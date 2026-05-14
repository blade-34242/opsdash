<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\ReportController;
use OCA\Opsdash\Service\ReportDeliveryService;
use OCP\AppFramework\Http;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class ReportControllerTest extends TestCase {
  private IRequest $request;
  private IUserSession $userSession;
  private ReportDeliveryService $reportDeliveryService;
  private ReportController $controller;

  protected function setUp(): void {
    parent::setUp();

    $this->request = $this->createMock(IRequest::class);
    $this->userSession = $this->createMock(IUserSession::class);
    $logger = $this->createMock(LoggerInterface::class);
    $this->reportDeliveryService = $this->createMock(ReportDeliveryService::class);

    $this->controller = new ReportController(
      'opsdash',
      $this->request,
      $this->userSession,
      $logger,
      $this->reportDeliveryService,
    );
  }

  public function testTestSendRejectsUnauthorized(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->testSend();

    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
    $this->assertSame(['message' => 'unauthorized'], $response->getData());
  }

  public function testTestSendRejectsMissingRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);
    $this->request->method('getHeader')->willReturn('');
    $this->request->method('getParam')->willReturn('');

    $response = $this->controller->testSend();

    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'missing requesttoken'], $response->getData());
  }

  public function testTestSendReturnsBadRequestForInvalidUserInput(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);
    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $this->reportDeliveryService
      ->method('sendTestReport')
      ->willThrowException(new \InvalidArgumentException('No email address is configured for this user.'));

    ReportControllerInputStream::setInput('{"range":"week"}');
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', ReportControllerInputStream::class);

    try {
      $response = $this->controller->testSend();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_BAD_REQUEST, $response->getStatus());
    $this->assertSame(['message' => 'No email address is configured for this user.'], $response->getData());
  }

  public function testTestSendReturnsSummaryOnSuccess(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);
    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $this->reportDeliveryService
      ->expects($this->once())
      ->method('sendTestReport')
      ->with('opsdash', 'admin', 'month', 1, ['cal-a'], ['cal-a' => 2], ['totalHours' => 20], ['enabled' => true])
      ->willReturn([
        'email' => 'admin@local.test',
        'subject' => 'Opsdash test recap',
        'summary' => [
          'report_variant' => 'single_goal',
          'onboarding_strategy' => 'total_only',
        ],
      ]);

    $payload = json_encode([
      'range' => 'month',
      'offset' => 1,
      'cals' => ['cal-a'],
      'groups' => ['cal-a' => 2],
      'targets_config' => ['totalHours' => 20],
      'reporting_config' => ['enabled' => true],
    ], JSON_THROW_ON_ERROR);

    ReportControllerInputStream::setInput($payload);
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', ReportControllerInputStream::class);

    try {
      $response = $this->controller->testSend();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $data = $response->getData();
    $this->assertTrue($data['ok']);
    $this->assertSame('admin@local.test', $data['email']);
    $this->assertSame('single_goal', $data['summary']['report_variant']);
    $this->assertSame('total_only', $data['summary']['onboarding_strategy']);
  }
}

final class ReportControllerInputStream {
  public $context;
  private int $index = 0;
  private static string $input = '';

  public static function setInput(string $input): void {
    self::$input = $input;
  }

  public function stream_open(string $path, string $mode, int $options, ?string &$openedPath): bool {
    $this->index = 0;
    return true;
  }

  public function stream_read(int $count): string {
    $chunk = substr(self::$input, $this->index, $count);
    $this->index += strlen($chunk);
    return $chunk;
  }

  public function stream_eof(): bool {
    return $this->index >= strlen(self::$input);
  }

  public function stream_stat(): array {
    return [];
  }
}
