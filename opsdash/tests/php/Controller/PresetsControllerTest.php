<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\PresetsController;
use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserPresetsService;
use OCP\AppFramework\Http;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class PresetsControllerTest extends TestCase {
  private PresetsController $controller;
  private IRequest $request;
  private IUserSession $userSession;
  private IConfig $config;
  private CalendarAccessService $calendarAccess;

  protected function setUp(): void {
    parent::setUp();

    $logger = $this->createMock(LoggerInterface::class);
    $this->config = $this->createMock(IConfig::class);
    $userPresetsService = new UserPresetsService($this->config, $logger);

    $this->request = $this->createMock(IRequest::class);
    $this->userSession = $this->createMock(IUserSession::class);
    $this->calendarAccess = $this->createMock(CalendarAccessService::class);

    $this->controller = new PresetsController(
      'opsdash',
      $this->request,
      $this->userSession,
      $logger,
      $this->calendarAccess,
      new PersistSanitizer(),
      $userPresetsService,
    );
  }

  public function testPresetExportFixtureSanitisesWithoutWarnings(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures-v2/preset-export.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $payload = is_array($fixture['payload'] ?? null) ? $fixture['payload'] : [];

    $data = [
      'selected' => $payload['cals'] ?? [],
      'groups' => $payload['groups'] ?? [],
      'targets_week' => $payload['targets_week'] ?? [],
      'targets_month' => $payload['targets_month'] ?? [],
      'targets_config' => $payload['targets_config'] ?? [],
    ];

    $allowedIds = ['personal', 'opsdash-focus'];
    $allowedSet = array_flip($allowedIds);

    $method = new \ReflectionMethod(PresetsController::class, 'sanitizePresetPayload');
    $method->setAccessible(true);

    /** @var array{payload:array<string,mixed>,warnings:string[]} $result */
    $result = $method->invoke($this->controller, $data, $allowedSet, $allowedIds);

    $this->assertSame([], $result['warnings']);
    $this->assertSame($allowedIds, $result['payload']['selected']);
    $this->assertSame(['personal' => 0, 'opsdash-focus' => 1], $result['payload']['groups']);
    $this->assertSame(['personal' => 12.0, 'opsdash-focus' => 8.0], $result['payload']['targets_week']);
    $this->assertSame(['personal' => 48.0, 'opsdash-focus' => 32.0], $result['payload']['targets_month']);
    $this->assertIsArray($result['payload']['targets_config']);
  }

  public function testSanitizePresetPayloadRemovesUnknownCalendarsAndWarns(): void {
    $data = [
      'selected' => ['personal', 'unknown', 'personal', 'opsdash-focus'],
      'groups' => [
        'personal' => 0,
        'unknown' => 99,
      ],
      'targets_week' => [
        'unknown' => 5,
        'opsdash-focus' => 8,
      ],
      'targets_month' => [
        'personal' => 12,
        'unknown' => 77,
      ],
      'targets_config' => [
        'totalHours' => 20,
        'categories' => [
          ['id' => 'focus', 'label' => 'Focus', 'targetHours' => 12, 'includeWeekend' => false, 'paceMode' => 'days_only'],
        ],
      ],
    ];

    $allowedIds = ['personal', 'opsdash-focus'];
    $allowedSet = array_flip($allowedIds);

    $method = new \ReflectionMethod(PresetsController::class, 'sanitizePresetPayload');
    $method->setAccessible(true);

    /** @var array{payload:array<string,mixed>,warnings:string[]} $result */
    $result = $method->invoke($this->controller, $data, $allowedSet, $allowedIds);

    $this->assertNotEmpty($result['warnings']);
    $this->assertStringContainsString('Skipped unknown calendars', implode(' | ', $result['warnings']));
    $this->assertStringContainsString('Removed calendar mappings for unknown calendars', implode(' | ', $result['warnings']));
    $this->assertStringContainsString('Removed weekly targets for unknown calendars', implode(' | ', $result['warnings']));
    $this->assertStringContainsString('Removed monthly targets for unknown calendars', implode(' | ', $result['warnings']));

    $this->assertSame($allowedIds, $result['payload']['selected']);
    $this->assertArrayNotHasKey('unknown', $result['payload']['groups']);
    $this->assertArrayNotHasKey('unknown', $result['payload']['targets_week']);
    $this->assertArrayNotHasKey('unknown', $result['payload']['targets_month']);
  }

  public function testSanitizePresetPayloadKeepsStrategyThemeAndWidgetLayout(): void {
    $data = [
      'selected' => ['personal', 'opsdash-focus'],
      'groups' => [
        'personal' => 0,
        'opsdash-focus' => 1,
      ],
      'targets_week' => [
        'personal' => 12,
        'opsdash-focus' => 8,
      ],
      'targets_month' => [
        'personal' => 48,
        'opsdash-focus' => 32,
      ],
      'targets_config' => [
        'totalHours' => 20,
      ],
      'theme_preference' => 'dark',
      'reporting_config' => [
        'enabled' => true,
        'modes' => [
          'week' => [
            'enabled' => true,
            'delivery' => 'checkpoint_final',
            'sendTimeLocal' => '06:00',
          ],
          'month' => [
            'enabled' => false,
            'delivery' => 'final',
            'sendTimeLocal' => '18:00',
          ],
        ],
      ],
      'deck_settings' => [
        'enabled' => true,
        'defaultFilter' => 'mine',
      ],
      'onboarding' => [
        'completed' => true,
        'version' => 1,
        'strategy' => 'full_granular',
        'completed_at' => '2026-02-21T00:00:00.000Z',
        'dashboardMode' => 'pro',
      ],
      'widgets' => [
        'tabs' => [
          [
            'id' => 'tab-1',
            'label' => 'Overview',
            'widgets' => [
              [
                'id' => 'widget-note',
                'type' => 'note_editor',
                'layout' => ['width' => 'half', 'height' => 'm', 'order' => 1],
                'options' => [],
              ],
            ],
          ],
        ],
        'defaultTabId' => 'tab-1',
      ],
    ];

    $allowedIds = ['personal', 'opsdash-focus'];
    $allowedSet = array_flip($allowedIds);

    $method = new \ReflectionMethod(PresetsController::class, 'sanitizePresetPayload');
    $method->setAccessible(true);

    /** @var array{payload:array<string,mixed>,warnings:string[]} $result */
    $result = $method->invoke($this->controller, $data, $allowedSet, $allowedIds);

    $this->assertSame([], $result['warnings']);
    $this->assertSame('dark', $result['payload']['theme_preference']);
    $this->assertTrue($result['payload']['reporting_config']['modes']['week']['enabled']);
    $this->assertSame('checkpoint_final', $result['payload']['reporting_config']['modes']['week']['delivery']);
    $this->assertSame('18:00', $result['payload']['reporting_config']['modes']['month']['sendTimeLocal']);
    $this->assertSame('mine', $result['payload']['deck_settings']['defaultFilter']);
    $this->assertSame('full_granular', $result['payload']['onboarding']['strategy']);
    $this->assertSame('pro', $result['payload']['onboarding']['dashboardMode']);
    $this->assertSame('tab-1', $result['payload']['widgets']['defaultTabId']);
    $this->assertSame('note_editor', $result['payload']['widgets']['tabs'][0]['widgets'][0]['type']);
  }

  public function testTrimPresetsKeepsMostRecent(): void {
    $method = new \ReflectionMethod(PresetsController::class, 'trimPresets');
    $method->setAccessible(true);

    $presets = [];
    for ($i = 0; $i < 25; $i++) {
      $presets['preset-' . $i] = [
        'updated_at' => sprintf('2025-01-%02dT00:00:00Z', $i + 1),
      ];
    }

    /** @var array<string,array<string,mixed>> $trimmed */
    $trimmed = $method->invoke($this->controller, $presets);

    $this->assertCount(20, $trimmed);
    $this->assertArrayHasKey('preset-24', $trimmed);
    $this->assertArrayHasKey('preset-5', $trimmed);
    $this->assertArrayNotHasKey('preset-0', $trimmed);
  }

  public function testPresetsSaveRejectsMissingRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('');
    $this->request->method('getParam')->willReturn('');

    $response = $this->controller->presetsSave();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'missing requesttoken'], $response->getData());
  }

  public function testPresetsSaveRejectsInvalidRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(false);

    $response = $this->controller->presetsSave();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'invalid requesttoken'], $response->getData());
  }

  public function testPresetsDeleteRejectsMissingRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('');
    $this->request->method('getParam')->willReturn('');

    $response = $this->controller->presetsDelete('sample');
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'missing requesttoken'], $response->getData());
  }

  public function testPresetsDeleteRejectsInvalidRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(false);

    $response = $this->controller->presetsDelete('sample');
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'invalid requesttoken'], $response->getData());
  }

  public function testPresetsDeleteRejectsInvalidName(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);

    $response = $this->controller->presetsDelete('%25');
    $this->assertSame(Http::STATUS_NOT_FOUND, $response->getStatus());
    $this->assertSame(['message' => 'not found'], $response->getData());
  }

  public function testPresetsDeleteReturnsNotFoundWhenMissing(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);

    $stored = json_encode([
      'Other' => [
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-01T00:00:00Z',
        'payload' => [],
      ],
    ]);
    $this->config
      ->method('getUserValue')
      ->with('admin', 'opsdash', 'targets_presets', '')
      ->willReturn($stored);

    $response = $this->controller->presetsDelete('Weekly');
    $this->assertSame(Http::STATUS_NOT_FOUND, $response->getStatus());
    $this->assertSame(['message' => 'not found'], $response->getData());
  }

  public function testPresetsLoadRejectsInvalidName(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $response = $this->controller->presetsLoad('%25');
    $this->assertSame(Http::STATUS_NOT_FOUND, $response->getStatus());
    $this->assertSame(['message' => 'not found'], $response->getData());
  }

  public function testPresetsLoadReturnsNotFoundWhenMissing(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $stored = json_encode([
      'Other' => [
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-01T00:00:00Z',
        'payload' => [],
      ],
    ]);
    $this->config
      ->method('getUserValue')
      ->with('admin', 'opsdash', 'targets_presets', '')
      ->willReturn($stored);

    $response = $this->controller->presetsLoad('Weekly');
    $this->assertSame(Http::STATUS_NOT_FOUND, $response->getStatus());
    $this->assertSame(['message' => 'not found'], $response->getData());
  }

  public function testPresetsLoadReturnsWarningsForUnknownCalendars(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->calendarAccess
      ->method('getCalendarIdsFor')
      ->with('admin')
      ->willReturn(['personal', 'opsdash-focus']);

    $stored = json_encode([
      'Weekly' => [
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-02T00:00:00Z',
        'payload' => [
          'selected' => ['personal', 'unknown', 'opsdash-focus'],
          'groups' => [
            'personal' => 0,
            'unknown' => 2,
          ],
          'targets_week' => [
            'unknown' => 4,
            'opsdash-focus' => 8,
          ],
          'targets_month' => [
            'personal' => 12,
            'unknown' => 77,
          ],
          'targets_config' => [
            'totalHours' => 20,
            'categories' => [
              ['id' => 'focus', 'label' => 'Focus', 'targetHours' => 12, 'includeWeekend' => false, 'paceMode' => 'days_only'],
            ],
          ],
        ],
      ],
    ]);
    $this->config
      ->method('getUserValue')
      ->with('admin', 'opsdash', 'targets_presets', '')
      ->willReturn($stored);

    $response = $this->controller->presetsLoad('Weekly');
    $this->assertSame(Http::STATUS_OK, $response->getStatus());

    $data = $response->getData();
    $this->assertTrue($data['ok']);
    $this->assertSame(['personal', 'opsdash-focus'], $data['preset']['selected']);
    $this->assertSame($data['warnings'], $data['preset']['warnings']);
    $this->assertNotEmpty($data['warnings']);
    $warnings = implode(' | ', $data['warnings']);
    $this->assertStringContainsString('Skipped unknown calendars', $warnings);
    $this->assertStringContainsString('Removed calendar mappings for unknown calendars', $warnings);
    $this->assertStringContainsString('Removed weekly targets for unknown calendars', $warnings);
    $this->assertStringContainsString('Removed monthly targets for unknown calendars', $warnings);
  }

  public function testPresetsListRejectsUnauthorized(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->presetsList();
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
    $this->assertSame(['message' => 'unauthorized'], $response->getData());
  }

  public function testPresetsListReturnsFormattedList(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $stored = json_encode([
      'Weekly' => [
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-03T00:00:00Z',
        'payload' => [
          'selected' => ['personal'],
          'groups' => ['personal' => 0],
        ],
      ],
      'Monthly' => [
        'created_at' => '2025-01-02T00:00:00Z',
        'updated_at' => '2025-01-02T00:00:00Z',
        'payload' => [
          'selected' => ['personal', 'opsdash-focus'],
          'groups' => ['personal' => 0, 'opsdash-focus' => 1],
        ],
      ],
    ]);
    $this->config
      ->method('getUserValue')
      ->with('admin', 'opsdash', 'targets_presets', '')
      ->willReturn($stored);

    $response = $this->controller->presetsList();
    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $data = $response->getData();
    $this->assertTrue($data['ok']);
    $this->assertCount(2, $data['presets']);
    $this->assertSame('Weekly', $data['presets'][0]['name']);
    $this->assertSame(1, $data['presets'][0]['selectedCount']);
    $this->assertSame(1, $data['presets'][0]['calendarCount']);
    $this->assertSame('Monthly', $data['presets'][1]['name']);
  }

  public function testPresetsListReturnsEmptyForInvalidStoredJson(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->config
      ->method('getUserValue')
      ->with('admin', 'opsdash', 'targets_presets', '')
      ->willReturn('not-json');

    $response = $this->controller->presetsList();
    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $data = $response->getData();
    $this->assertTrue($data['ok']);
    $this->assertSame([], $data['presets']);
  }

  public function testWritePresetsRejectsOversizePayload(): void {
    $method = new \ReflectionMethod(PresetsController::class, 'writePresets');
    $method->setAccessible(true);

    $presets = [
      'Huge' => [
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-01T00:00:00Z',
        'payload' => [
          'notes' => str_repeat('x', 70000),
        ],
      ],
    ];

    $response = $method->invoke($this->controller, 'admin', $presets);
    $this->assertSame(Http::STATUS_REQUEST_ENTITY_TOO_LARGE, $response->getStatus());
    $this->assertSame(['message' => 'presets too large'], $response->getData());
  }
}
