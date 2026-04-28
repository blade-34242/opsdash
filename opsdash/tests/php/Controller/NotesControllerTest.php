<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\NotesController;
use OCA\Opsdash\Service\NotesService;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class NotesControllerTest extends TestCase {
  private IRequest $request;
  private IUserSession $userSession;
  private NotesService $notesService;
  private NotesController $controller;

  protected function setUp(): void {
    parent::setUp();

    $this->request = $this->createMock(IRequest::class);
    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $this->userSession = $this->createMock(IUserSession::class);
    $this->notesService = $this->createMock(NotesService::class);
    $logger = $this->createMock(LoggerInterface::class);

    $this->controller = new NotesController(
      'opsdash',
      $this->request,
      $this->userSession,
      $logger,
      $this->notesService,
    );
  }

  public function testNotesRequiresUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->notes();
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
  }

  public function testNotesClampsRangeAndOffset(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getParam')->willReturnMap([
      ['range', 'week', 'year'],
      ['offset', 0, 99],
    ]);

    $this->notesService
      ->expects($this->once())
      ->method('getNotes')
      ->with('admin', 'week', 24)
      ->willReturn(['notes' => ['current' => 'ok']]);

    $response = $this->controller->notes();
    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $this->assertSame(['ok' => true, 'notes' => ['current' => 'ok']], $response->getData());
  }

  public function testNotesRejectsLargeQuery(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $previous = $_SERVER['QUERY_STRING'] ?? null;
    $_SERVER['QUERY_STRING'] = str_repeat('a', 5000);

    try {
      $response = $this->controller->notes();
      $this->assertSame(Http::STATUS_REQUEST_URI_TOO_LONG, $response->getStatus());
    } finally {
      if ($previous === null) {
        unset($_SERVER['QUERY_STRING']);
      } else {
        $_SERVER['QUERY_STRING'] = $previous;
      }
    }
  }

  public function testNotesSaveRequiresUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->notesSave();
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
  }

  public function testNotesSaveRejectsInvalidJson(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->controller = new NotesController(
      'opsdash',
      $this->request,
      $this->userSession,
      $this->createMock(LoggerInterface::class),
      $this->notesService,
    );

    $data = $this->controller->notesSave();
    $this->assertSame(Http::STATUS_BAD_REQUEST, $data->getStatus());
    $this->assertSame(['message' => 'invalid json'], $data->getData());
  }

  public function testNotesSaveRejectsMissingRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $request = $this->createMock(IRequest::class);
    $request->method('getHeader')->willReturn('');
    $request->method('getParam')->willReturn('');

    $controller = new NotesController(
      'opsdash',
      $request,
      $this->userSession,
      $this->createMock(LoggerInterface::class),
      $this->notesService,
    );

    $response = $controller->notesSave();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'missing requesttoken'], $response->getData());
  }

  public function testNotesSaveRejectsInvalidRequestToken(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $request = $this->createMock(IRequest::class);
    $request->method('getHeader')->willReturn('token');
    $request->method('passesCSRFCheck')->willReturn(false);

    $controller = new NotesController(
      'opsdash',
      $request,
      $this->userSession,
      $this->createMock(LoggerInterface::class),
      $this->notesService,
    );

    $response = $controller->notesSave();
    $this->assertSame(Http::STATUS_PRECONDITION_FAILED, $response->getStatus());
    $this->assertSame(['message' => 'invalid requesttoken'], $response->getData());
  }

  public function testNotesSaveReturnsOkOnSuccess(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $request = $this->createMock(IRequest::class);
    $request->method('getHeader')->willReturn('token');
    $request->method('passesCSRFCheck')->willReturn(true);

    $this->notesService
      ->expects($this->once())
      ->method('saveNotes')
      ->with('admin', 'week', 1, 'hello')
      ->willReturn(true);

    $controller = new NotesController(
      'opsdash',
      $request,
      $this->userSession,
      $this->createMock(LoggerInterface::class),
      $this->notesService,
    );

    $payload = '{"range":"week","offset":1,"content":"hello"}';
    NotesControllerInputStream::setInput($payload);
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', NotesControllerInputStream::class);

    try {
      $response = $controller->notesSave();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $this->assertSame(['ok' => true], $response->getData());
  }

  public function testNotesSaveReturnsErrorOnFailure(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $request = $this->createMock(IRequest::class);
    $request->method('getHeader')->willReturn('token');
    $request->method('passesCSRFCheck')->willReturn(true);

    $this->notesService
      ->expects($this->once())
      ->method('saveNotes')
      ->with('admin', 'week', 0, 'fail')
      ->willReturn(false);

    $controller = new NotesController(
      'opsdash',
      $request,
      $this->userSession,
      $this->createMock(LoggerInterface::class),
      $this->notesService,
    );

    $payload = '{"range":"week","offset":0,"content":"fail"}';
    NotesControllerInputStream::setInput($payload);
    $hadPhpWrapper = in_array('php', stream_get_wrappers(), true);
    if ($hadPhpWrapper) {
      stream_wrapper_unregister('php');
    }
    stream_wrapper_register('php', NotesControllerInputStream::class);

    try {
      $response = $controller->notesSave();
    } finally {
      if ($hadPhpWrapper) {
        stream_wrapper_restore('php');
      } else {
        stream_wrapper_unregister('php');
      }
    }

    $this->assertSame(Http::STATUS_INTERNAL_SERVER_ERROR, $response->getStatus());
    $this->assertSame(['message' => 'error'], $response->getData());
  }
}
final class NotesControllerInputStream {
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
