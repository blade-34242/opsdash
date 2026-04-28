<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\PersistController;
use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\OverviewIncludeResolver;
use OCA\Opsdash\Service\OverviewLoadCacheService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserConfigService;
use OCP\AppFramework\Http;
use OCP\Calendar\IManager;
use OCP\ICacheFactory;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class PersistControllerTest extends TestCase {
  private PersistController $controller;
  private IRequest $request;
  private IUserSession $userSession;
  private IConfig $config;

  protected function setUp(): void {
    parent::setUp();

    $request = $this->createMock(IRequest::class);
    $userSession = $this->createMock(IUserSession::class);
    $logger = $this->createMock(LoggerInterface::class);
    $config = $this->createMock(IConfig::class);
    $calendarManager = $this->createMock(IManager::class);

    $this->request = $request;
    $this->userSession = $userSession;
    $this->config = $config;

    $calendarService = new CalendarAccessService($calendarManager, $config, $logger);
    $sanitizer = new PersistSanitizer();
    $userConfigService = new UserConfigService($config, $sanitizer, $logger);
    $cacheService = new OverviewLoadCacheService(
      $this->createMock(ICacheFactory::class),
      $config,
      $userConfigService,
      new OverviewIncludeResolver(),
      $logger,
    );

    $this->controller = new PersistController(
      'opsdash',
      $request,
      $userSession,
      $logger,
      $config,
      $calendarService,
      $sanitizer,
      $userConfigService,
      $cacheService,
    );
  }

  public function testEncodeConfigValueAcceptsSmallPayload(): void {
    $method = new \ReflectionMethod(PersistController::class, 'encodeConfigValue');
    $method->setAccessible(true);

    $encoded = $method->invoke($this->controller, ['foo' => 'bar'], 'sample');

    $this->assertIsString($encoded);
    $this->assertStringContainsString('foo', $encoded);
  }

  public function testEncodeConfigValueRejectsLargePayload(): void {
    $method = new \ReflectionMethod(PersistController::class, 'encodeConfigValue');
    $method->setAccessible(true);

    $payload = ['notes' => str_repeat('x', 70000)];

    $this->expectException(\LengthException::class);
    $method->invoke($this->controller, $payload, 'sample');
  }

  public function testPersistRejectsMissingRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('');
    $this->request->method('getParam')->willReturn('');

    $response = $this->controller->persist();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'missing requesttoken'], $response->getData());
  }

  public function testPersistRejectsInvalidRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(false);

    $response = $this->controller->persist();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'invalid requesttoken'], $response->getData());
  }

  public function testPersistReturnsOkOnMinimalPayload(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $this->config->method('getUserValue')->willReturn('');

    $payload = '{"cals":["cal-1","cal-2"]}';
    PersistControllerInputStream::setInput($payload);
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', PersistControllerInputStream::class);

    try {
      $response = $this->controller->persist();
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
    $this->assertSame(['cal-1', 'cal-2'], $data['request']);
    $this->assertSame([], $data['saved']);
    $this->assertSame([], $data['read']);
  }

  public function testPersistDoesNotDowngradeReleaseNotesSeenVersion(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $this->config->method('getUserValue')->willReturnCallback(
      static function (string $uid, string $appName, string $key, string $default = ''): string {
        if ($key === 'onboarding_state') {
          return '{"completed":true,"version":1,"strategy":"total_only","completed_at":"2026-04-01T00:00:00Z","dashboardMode":"standard","releaseNotesSeenVersion":"0.7.5"}';
        }
        return $default;
      },
    );

    $savedOnboarding = null;
    $this->config->method('setUserValue')->willReturnCallback(
      static function (string $uid, string $appName, string $key, string $value) use (&$savedOnboarding): void {
        if ($key === 'onboarding_state') {
          $savedOnboarding = json_decode($value, true);
        }
      },
    );

    $payload = '{"onboarding":{"completed":true,"version":1,"strategy":"total_only","completed_at":"2026-04-01T00:00:00Z","dashboardMode":"standard","releaseNotesSeenVersion":"0.7.4"}}';
    PersistControllerInputStream::setInput($payload);
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', PersistControllerInputStream::class);

    try {
      $response = $this->controller->persist();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $this->assertSame('0.7.5', $response->getData()['onboarding_saved']['releaseNotesSeenVersion']);
    $this->assertSame('0.7.5', $savedOnboarding['releaseNotesSeenVersion']);
  }

  public function testPersistRejectsOversizedPayload(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);

    $payload = json_encode(['content' => str_repeat('x', 300000)]);
    PersistControllerInputStream::setInput($payload ?: '');
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', PersistControllerInputStream::class);

    try {
      $response = $this->controller->persist();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_REQUEST_ENTITY_TOO_LARGE, $response->getStatus());
    $this->assertSame(['message' => 'payload too large'], $response->getData());
  }
}

final class PersistControllerInputStream {
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
