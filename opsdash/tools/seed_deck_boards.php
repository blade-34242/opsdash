#!/usr/bin/env php
<?php
declare(strict_types=1);

define('OC_ROOT', dirname(__DIR__, 3));
require_once OC_ROOT . '/config/config.php';
require_once OC_ROOT . '/lib/base.php';

function main(): void {
    $base = rtrim((string)(getenv('BASE') ?: 'http://localhost:8080'), '/');
    $userId = (string)(getenv('QA_USER') ?: 'qa');
    $password = (string)(getenv('QA_PASS') ?: 'qa');
    $boardTitle = (string)(getenv('QA_DECK_BOARD_TITLE') ?: 'Opsdash Deck QA');
    $boardColor = (string)(getenv('QA_DECK_BOARD_COLOR') ?: '#2563EB');

    if ($userId === '' || $password === '') {
        throw new RuntimeException('QA_USER and QA_PASS must be provided.');
    }

    $boardResult = recreateBoard($base, $userId, $password, $boardTitle, $boardColor);
    if (!$boardResult['created']) {
        echo sprintf(
            "Reused Deck board \"%s\" (#%d) for %s\n",
            (string)$boardResult['title'],
            (int)$boardResult['id'],
            $userId,
        );
        return;
    }

    $stacks = seedStacks($base, $userId, $password, (int)$boardResult['id']);
    $cardsSeeded = seedCards($base, $userId, $password, (int)$boardResult['id'], $stacks);

    echo sprintf(
        "Created Deck board \"%s\" (#%d) with %d cards for %s\n",
        (string)$boardResult['title'],
        (int)$boardResult['id'],
        $cardsSeeded,
        $userId,
    );
}

/**
 * @return array{created:bool,id:int,title:string}
 */
function recreateBoard(string $base, string $userId, string $password, string $boardTitle, string $boardColor): array {
    $existing = deckRequest($base, $userId, $password, 'GET', '/index.php/apps/deck/api/v1/boards', [
        'details' => 1,
    ]);
    foreach (($existing['data'] ?? []) as $board) {
        if (strcasecmp((string)($board['title'] ?? ''), $boardTitle) === 0) {
            $boardId = (int)($board['id'] ?? 0);
            if ($boardId > 0) {
                return [
                    'created' => false,
                    'id' => $boardId,
                    'title' => (string)($board['title'] ?? $boardTitle),
                ];
            }
        }
    }

    $created = deckRequest($base, $userId, $password, 'POST', '/index.php/apps/deck/api/v1/boards', [
        'title' => $boardTitle,
        'color' => ltrim($boardColor, '#'),
    ]);

    if (!isset($created['data']['id'])) {
        throw new RuntimeException('Unable to create Deck board.');
    }

    return [
        'created' => true,
        'id' => (int)($created['data']['id'] ?? 0),
        'title' => (string)($created['data']['title'] ?? $boardTitle),
    ];
}

/**
 * @return array<string,int>
 */
function seedStacks(string $base, string $userId, string $password, int $boardId): array {
    $stacks = [
        ['title' => 'Inbox', 'order' => 10],
        ['title' => 'In Progress', 'order' => 20],
        ['title' => 'Done', 'order' => 30],
    ];

    $map = [];
    foreach ($stacks as $stack) {
        $created = deckRequest($base, $userId, $password, 'POST', '/index.php/apps/deck/api/v1/boards/' . $boardId . '/stacks', [
            'title' => $stack['title'],
            'order' => $stack['order'],
        ]);
        if (!isset($created['data']['id'])) {
            throw new RuntimeException('Unable to create Deck stack "' . $stack['title'] . '".');
        }
        $map[$stack['title']] = (int)$created['data']['id'];
    }

    return $map;
}

/**
 * @param array<string,int> $stacks
 */
function seedCards(string $base, string $userId, string $password, int $boardId, array $stacks): int {
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $cards = [
        [
            'stack' => 'Inbox',
            'title' => 'Review overnight alerts',
            'order' => 10,
            'description' => 'Check incidents and flag anything that blocks delivery.',
            'due' => $now->modify('+1 day'),
            'archive' => false,
        ],
        [
            'stack' => 'Inbox',
            'title' => 'QA follow-up checks',
            'order' => 20,
            'description' => 'Verify retests for issues marked ready-for-verify.',
            'due' => $now->modify('+2 days'),
            'archive' => false,
        ],
        [
            'stack' => 'In Progress',
            'title' => 'Investigate sync latency spike',
            'order' => 30,
            'description' => 'Analyze slow sync jobs and prepare mitigations.',
            'due' => $now->modify('+3 days'),
            'archive' => false,
        ],
        [
            'stack' => 'Done',
            'title' => 'Publish weekly KPI digest',
            'order' => 40,
            'description' => 'Post the weekly metrics digest for product and support.',
            'due' => $now->modify('+4 days'),
            'archive' => false,
        ],
    ];

    $count = 0;
    foreach ($cards as $entry) {
        $stackId = $stacks[$entry['stack']] ?? null;
        if (!$stackId) {
            continue;
        }
        $created = deckRequest($base, $userId, $password, 'POST', '/index.php/apps/deck/api/v1/boards/' . $boardId . '/stacks/' . $stackId . '/cards', [
            'title' => $entry['title'],
            'type' => 'plain',
            'order' => $entry['order'],
            'duedate' => $entry['due']->format('c'),
            'description' => $entry['description'],
        ]);
        if (!isset($created['data']['id'])) {
            throw new RuntimeException('Unable to create Deck card "' . $entry['title'] . '".');
        }
        $cardId = (int)$created['data']['id'];
        $count++;
    }

    return $count;
}

/**
 * @return array{status:int,data:array<string,mixed>}
 */
function deckRequest(string $base, string $userId, string $password, string $method, string $path, array $payload = []): array {
    $url = $base . $path;
    if ($method === 'GET' && $payload) {
        $url .= '?' . http_build_query($payload);
    }

    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Authorization: Basic ' . base64_encode($userId . ':' . $password),
    ];

    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 30,
        ],
    ];

    if ($method !== 'GET' && $payload) {
        $options['http']['content'] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    }

    $context = stream_context_create($options);
    $body = file_get_contents($url, false, $context);
    if ($body === false) {
        throw new RuntimeException('Request failed: ' . $method . ' ' . $path);
    }

    $status = 0;
    foreach (($http_response_header ?? []) as $line) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})\s+/', $line, $m)) {
            $status = (int)$m[1];
            break;
        }
    }
    if ($status === 0) {
        $status = 200;
    }

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException(sprintf('Deck request failed (%d): %s', $status, trim($body)));
    }

    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        return ['status' => $status, 'data' => []];
    }

    return [
        'status' => $status,
        'data' => $decoded['ocs']['data'] ?? $decoded['data'] ?? $decoded,
    ];
}

try {
    main();
} catch (Throwable $e) {
    fwrite(STDERR, '[deck seed] ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
