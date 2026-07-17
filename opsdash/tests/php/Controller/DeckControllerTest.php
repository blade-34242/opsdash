<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\DeckController;
use OCA\Opsdash\Service\DeckDataService;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class DeckControllerTest extends TestCase {
  private IRequest $request;
  private IUserSession $userSession;
  private DeckDataService $deckService;
  private DeckController $controller;
  private string|int|null $previousQueryString;

  protected function setUp(): void {
    parent::setUp();

    $this->previousQueryString = $_SERVER['QUERY_STRING'] ?? null;

    $this->request = $this->createMock(IRequest::class);
    $this->userSession = $this->createMock(IUserSession::class);
    $this->deckService = $this->createMock(DeckDataService::class);
    $logger = $this->createMock(LoggerInterface::class);

    $this->controller = new DeckController(
      'opsdash',
      $this->request,
      $this->userSession,
      $logger,
      $this->deckService,
    );
  }

  protected function tearDown(): void {
    if ($this->previousQueryString === null) {
      unset($_SERVER['QUERY_STRING']);
    } else {
      $_SERVER['QUERY_STRING'] = $this->previousQueryString;
    }
    parent::tearDown();
  }

  public function testBoardsRequiresUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->boards();
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
  }

  public function testBoardsReturnsList(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->deckService
      ->expects($this->once())
      ->method('fetchBoards')
      ->with('admin')
      ->willReturn([
        ['id' => 1, 'title' => 'Ops', 'color' => '#2563EB'],
      ]);

    $response = $this->controller->boards();
    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $this->assertSame([
      'ok' => true,
      'boards' => [
        ['id' => 1, 'title' => 'Ops', 'color' => '#2563EB'],
      ],
    ], $response->getData());
  }

  public function testCardsPassesFlags(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getParam')->willReturnMap([
      ['from', '', '2024-11-01T00:00:00.000Z'],
      ['to', '', '2024-11-30T23:59:59.000Z'],
      ['includeArchived', null, '0'],
      ['includeCompleted', null, '1'],
    ]);

    $this->deckService
      ->expects($this->once())
      ->method('fetchCards')
      ->with(
        'admin',
        '2024-11-01T00:00:00.000Z',
        '2024-11-30T23:59:59.000Z',
        false,
        true,
      )
      ->willReturn([
        'cards' => [],
        'truncated' => false,
        'rangeTruncated' => false,
      ]);

    $response = $this->controller->cards();
    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $this->assertSame([
      'ok' => true,
      'cards' => [],
      'truncated' => false,
      'rangeTruncated' => false,
    ], $response->getData());
  }

  public function testCardsRejectsLargeQuery(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);
    $_SERVER['QUERY_STRING'] = str_repeat('a', 5000);

    $response = $this->controller->cards();
    $this->assertSame(Http::STATUS_REQUEST_URI_TOO_LONG, $response->getStatus());
  }

  public function testCreateReturnsCreatedStatus(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);
    $this->request->method('getParam')->willReturnMap([
      ['title', '', 'Prepare release'],
      ['stackId', 0, 42],
    ]);
    $this->deckService
      ->expects($this->once())
      ->method('createCard')
      ->with('admin', 'Prepare release', 42)
      ->willReturn(['id' => 7, 'title' => 'Prepare release']);

    $response = $this->controller->create();

    $this->assertSame(201, $response->getStatus());
    $this->assertSame(['ok' => true, 'card' => ['id' => 7, 'title' => 'Prepare release']], $response->getData());
  }
}
