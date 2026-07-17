<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use JsonSerializable;
use OCP\App\IAppManager;
use OCP\ICacheFactory;
use OCP\IConfig;
use OCP\Server;
use Psr\Log\LoggerInterface;

class DeckDataService {
    private const APP_NAME = 'opsdash';
    private const MAX_RANGE_DAYS = 120;
    private const MAX_CARDS = 2000;

    public function __construct(
        private LoggerInterface $logger,
        private ICacheFactory $cacheFactory,
        private IConfig $config,
        private IAppManager $appManager,
    ) {
    }

    /**
     * @return array<int, array{id: int, title: string, color?: string}>
     */
    public function fetchBoards(string $uid): array {
        $services = $this->prepareDeckServices($uid);
        if ($services === null) {
            return [];
        }
        [$boardService] = $services;

        $boards = $this->findAllBoards($boardService);
        $result = [];
        foreach ($boards as $board) {
            $entry = $this->normalizeBoard($board);
            if ($entry !== null) {
                $result[] = $entry;
            }
        }
        return $result;
    }

    /**
     * @return array<int, array{id:int, title:string}>
     */
    public function fetchStacks(string $uid, int $boardId): array {
        $services = $this->prepareDeckServices($uid);
        if ($services === null || $boardId <= 0) {
            return [];
        }
        [, $stackService] = $services;
        try {
            $stacks = $stackService->findAll($boardId);
        } catch (\Throwable $e) {
            $this->logger->error('Deck stacks load failed: ' . $e->getMessage(), ['app' => self::APP_NAME]);
            return [];
        }
        $result = [];
        foreach ($stacks as $stack) {
            $entry = $this->normalizeStack($stack, false);
            if ($entry !== null) {
                $result[] = ['id' => $entry['stackId'], 'title' => $entry['stackTitle']];
            }
        }
        return $result;
    }

    /**
     * @return array{id:int,title:string}
     */
    public function createCard(string $uid, string $title, int $stackId): array {
        if (!$this->ensureDeckAvailable()) {
            throw new \RuntimeException('Deck is unavailable');
        }
        try {
            /** @var \OCA\Deck\Service\CardService $cardService */
            $cardService = Server::get('OCA\\Deck\\Service\\CardService');
            $card = $cardService->create($title, $stackId, 'plain', 999, $uid);
            return ['id' => (int)$card->getId(), 'title' => $title];
        } catch (\Throwable $e) {
            $this->logger->error('Deck card create failed: ' . $e->getMessage(), ['app' => self::APP_NAME]);
            throw $e;
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    /**
     * @return array{cards: array<int, array<string, mixed>>, truncated: bool, rangeTruncated: bool}
     */
    public function fetchCards(
        string $uid,
        string $from,
        string $to,
        bool $includeArchived,
        bool $includeCompleted,
    ): array {
        $services = $this->prepareDeckServices($uid);
        if ($services === null) {
            return ['cards' => [], 'truncated' => false, 'rangeTruncated' => false];
        }
        [$boardService, $stackService] = $services;

        $fromTs = $this->toTimestamp($from);
        $toTs = $this->toTimestamp($to);
        if ($fromTs === null || $toTs === null || $fromTs > $toTs) {
            return ['cards' => [], 'truncated' => false, 'rangeTruncated' => false];
        }
        $rangeTruncated = false;
        $rangeDays = (int)floor(($toTs - $fromTs) / (1000 * 60 * 60 * 24));
        if ($rangeDays > self::MAX_RANGE_DAYS) {
            $toTs = $fromTs + (self::MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
            $rangeTruncated = true;
        }

        if ($cached = $this->readCardsCache($uid, $fromTs, $toTs, $includeArchived, $includeCompleted)) {
            return [
                'cards' => $cached['cards'],
                'truncated' => (bool)($cached['truncated'] ?? false),
                'rangeTruncated' => $rangeTruncated,
            ];
        }

        $boards = $this->findAllBoards($boardService);
        if (empty($boards)) {
            return ['cards' => [], 'truncated' => false, 'rangeTruncated' => $rangeTruncated];
        }

        $boardMap = [];
        foreach ($boards as $board) {
            $entry = $this->normalizeBoard($board);
            if ($entry === null) {
                continue;
            }
            $boardMap[$entry['id']] = $entry;
        }
        if (empty($boardMap)) {
            return ['cards' => [], 'truncated' => false, 'rangeTruncated' => $rangeTruncated];
        }

        $cards = [];
        $nowTs = (int)floor(microtime(true) * 1000);
        foreach ($boardMap as $boardId => $board) {
            foreach ($this->loadStacks($stackService, (int)$boardId, $includeArchived) as $stack) {
                if (empty($stack['cards'])) {
                    continue;
                }
                foreach ($stack['cards'] as $rawCard) {
                    $normalized = $this->normalizeCard($rawCard, $board, $stack);
                    if ($normalized === null) {
                        continue;
                    }

                    if ($normalized['archived'] && !$includeArchived) {
                        continue;
                    }

                    $hasDate = isset($normalized['dueTs']) || isset($normalized['doneTs']);
                    if (!$hasDate) {
                        $cards[] = $normalized;
                        continue;
                    }

                    $isActive = $normalized['status'] === 'active';
                    $dueOk = isset($normalized['dueTs']) && (
                        $this->inRange($normalized['dueTs'], $fromTs, $toTs)
                        || ($isActive && $normalized['dueTs'] < $nowTs)
                    );
                    $doneOk = $includeCompleted && isset($normalized['doneTs']) && $this->inRange($normalized['doneTs'], $fromTs, $toTs);
                    $isCompleted = $normalized['status'] !== 'active';
                    $completionMatch = $includeCompleted && ($doneOk || ($isCompleted && $dueOk));
                    $dueMatch = $dueOk && !$completionMatch;
                    if (!$dueMatch && !$completionMatch) {
                        continue;
                    }
                    $normalized['match'] = $completionMatch ? 'completed' : 'due';
                    $cards[] = $normalized;
                }
            }
        }

        usort($cards, function ($a, $b) {
            $maxTs = PHP_INT_MAX;
            $aTs = $a['match'] === 'due'
                ? ($a['dueTs'] ?? $a['doneTs'] ?? $maxTs)
                : ($a['doneTs'] ?? $a['dueTs'] ?? $maxTs);
            $bTs = $b['match'] === 'due'
                ? ($b['dueTs'] ?? $b['doneTs'] ?? $maxTs)
                : ($b['doneTs'] ?? $b['dueTs'] ?? $maxTs);
            if ($aTs !== $bTs) return $aTs <=> $bTs;
            if ($a['boardId'] !== $b['boardId']) return $a['boardId'] <=> $b['boardId'];
            return $a['id'] <=> $b['id'];
        });

        $truncated = false;
        if (count($cards) > self::MAX_CARDS) {
            $cards = array_slice($cards, 0, self::MAX_CARDS);
            $truncated = true;
        }

        $this->writeCardsCache($uid, $fromTs, $toTs, $includeArchived, $includeCompleted, $cards, $truncated);

        return ['cards' => $cards, 'truncated' => $truncated, 'rangeTruncated' => $rangeTruncated];
    }

    /**
     * @return array{0:mixed,1:mixed}|null
     */
    private function prepareDeckServices(string $uid): ?array {
        if (!$this->ensureDeckAvailable()) {
            return null;
        }

        try {
            /** @var \OCA\Deck\Service\PermissionService $permissionService */
            $permissionService = Server::get('OCA\\Deck\\Service\\PermissionService');
            if (method_exists($permissionService, 'setUserId')) {
                $permissionService->setUserId($uid);
            }
            /** @var \OCA\Deck\Service\BoardService $boardService */
            $boardService = Server::get('OCA\\Deck\\Service\\BoardService');
            if (method_exists($boardService, 'setUserId')) {
                $boardService->setUserId($uid);
            }
            /** @var \OCA\Deck\Service\StackService $stackService */
            $stackService = Server::get('OCA\\Deck\\Service\\StackService');
            return [$boardService, $stackService];
        } catch (\Throwable $e) {
            $this->logger->error('Deck services unavailable: ' . $e->getMessage(), ['app' => 'opsdash']);
            return null;
        }
    }

    private function ensureDeckAvailable(): bool {
        if (!class_exists('OCA\\Deck\\AppInfo\\Application')) {
            return false;
        }
        try {
            if (!$this->appManager->isInstalled('deck') || !$this->appManager->isEnabledForUser('deck')) {
                return false;
            }
            $this->appManager->loadApp('deck');
        } catch (\Throwable $e) {
            $this->logger->error('Deck app check failed: ' . $e->getMessage(), ['app' => 'opsdash']);
            return false;
        }
        return true;
    }

    private function isCacheEnabled(): bool {
        $env = getenv('OPSDASH_DECK_CACHE_ENABLED');
        if ($env !== false) {
            $filtered = filter_var($env, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            if ($filtered !== null) {
                return (bool)$filtered;
            }
        }
        try {
            $raw = (string)$this->config->getAppValue(self::APP_NAME, 'deck_cache_enabled', '1');
            $filtered = filter_var($raw, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            if ($filtered !== null) {
                return (bool)$filtered;
            }
        } catch (\Throwable) {}
        return true;
    }

    private function cacheTtl(): int {
        $env = getenv('OPSDASH_DECK_CACHE_TTL');
        if ($env !== false && is_numeric($env)) {
            $ttl = (int)$env;
            return $ttl < 0 ? 0 : $ttl;
        }
        try {
            $raw = (string)$this->config->getAppValue(self::APP_NAME, 'deck_cache_ttl', '30');
            if (is_numeric($raw)) {
                $ttl = (int)$raw;
                return $ttl < 0 ? 0 : $ttl;
            }
        } catch (\Throwable) {}
        return 30;
    }

    /**
     * @return array{cards: array<int, array<string, mixed>>, truncated?: bool}|null
     */
    private function readCardsCache(
        string $uid,
        int $fromTs,
        int $toTs,
        bool $includeArchived,
        bool $includeCompleted,
    ): ?array {
        if (!$this->isCacheEnabled()) {
            return null;
        }
        $ttl = $this->cacheTtl();
        if ($ttl <= 0) {
            return null;
        }
        try {
            $cache = $this->cacheFactory->createDistributed(self::APP_NAME);
            $cacheKey = $this->buildCardsCacheKey($uid, $fromTs, $toTs, $includeArchived, $includeCompleted);
            $cached = $cacheKey ? $cache->get($cacheKey) : null;
            if (is_string($cached) && $cached !== '') {
                $payload = json_decode($cached, true);
                if (is_array($payload) && isset($payload['cards']) && is_array($payload['cards'])) {
                    return [
                        'cards' => $payload['cards'],
                        'truncated' => (bool)($payload['truncated'] ?? false),
                    ];
                }
            }
        } catch (\Throwable $e) {
            $this->logger->debug('deck cache read failed: ' . $e->getMessage(), ['app' => self::APP_NAME]);
        }
        return null;
    }

    /**
     * @param array<int, array<string, mixed>> $cards
     */
    private function writeCardsCache(
        string $uid,
        int $fromTs,
        int $toTs,
        bool $includeArchived,
        bool $includeCompleted,
        array $cards,
        bool $truncated,
    ): void {
        if (!$this->isCacheEnabled()) {
            return;
        }
        $ttl = $this->cacheTtl();
        if ($ttl <= 0) {
            return;
        }
        try {
            $cache = $this->cacheFactory->createDistributed(self::APP_NAME);
            $cacheKey = $this->buildCardsCacheKey($uid, $fromTs, $toTs, $includeArchived, $includeCompleted);
            $cache->set($cacheKey, json_encode(['cards' => $cards, 'truncated' => $truncated]), $ttl);
        } catch (\Throwable $e) {
            $this->logger->debug('deck cache write failed: ' . $e->getMessage(), ['app' => self::APP_NAME]);
        }
    }

    private function buildCardsCacheKey(
        string $uid,
        int $fromTs,
        int $toTs,
        bool $includeArchived,
        bool $includeCompleted,
    ): string {
        $payload = implode('|', [
            $uid,
            (string)$fromTs,
            (string)$toTs,
            $includeArchived ? '1' : '0',
            $includeCompleted ? '1' : '0',
        ]);
        return 'deck:cards:' . sha1($payload);
    }

    /**
     * @return array<int, mixed>
     */
    private function findAllBoards(mixed $boardService): array {
        try {
            try {
                return $boardService->findAll(0, false, true);
            } catch (\ArgumentCountError) {
                return $boardService->findAll(0, false);
            }
        } catch (\Throwable $e) {
            $this->logger->error('Deck board load failed: ' . $e->getMessage(), ['app' => 'opsdash']);
            return [];
        }
    }

    /**
     * @return array<int, array{stackId:int, stackTitle:string, cards:array<int,mixed>, forceArchived:bool}>
     */
    private function loadStacks(mixed $stackService, int $boardId, bool $includeArchived): array {
        $stacks = [];
        try {
            $activeStacks = $stackService->findAll($boardId);
            foreach ($activeStacks as $stack) {
                $entry = $this->normalizeStack($stack, false);
                if ($entry !== null) {
                    $stacks[] = $entry;
                }
            }
        } catch (\Throwable $e) {
            $this->logger->error('Deck stacks load failed: ' . $e->getMessage(), ['app' => 'opsdash']);
            return [];
        }

        if ($includeArchived && method_exists($stackService, 'findAllArchived')) {
            try {
                $archivedStacks = $stackService->findAllArchived($boardId);
                foreach ($archivedStacks as $stack) {
                    $entry = $this->normalizeStack($stack, true);
                    if ($entry !== null) {
                        $stacks[] = $entry;
                    }
                }
            } catch (\Throwable) {
                // Older Deck versions may not support archived stacks; ignore.
            }
        }

        return $stacks;
    }

    /**
     * @return array{stackId:int, stackTitle:string, cards:array<int,mixed>, forceArchived:bool}|null
     */
    private function normalizeStack(mixed $stack, bool $forceArchived): ?array {
        $data = $this->entityToArray($stack);
        $id = $data['id'] ?? null;
        if (!is_numeric($id) || (int)$id <= 0) {
            return null;
        }
        $title = isset($data['title']) ? (string)$data['title'] : '';
        $cards = $data['cards'] ?? null;
        if (!is_array($cards) && is_object($stack)) {
            try {
                $cards = $stack->getCards();
            } catch (\Throwable) {
                $cards = [];
            }
        }
        if (!is_array($cards)) {
            $cards = [];
        }
        return [
            'stackId' => (int)$id,
            'stackTitle' => $title !== '' ? $title : 'Stack ' . (int)$id,
            'cards' => $cards,
            'forceArchived' => $forceArchived,
        ];
    }

    /**
     * @return array{id:int, title:string, color?:string}|null
     */
    private function normalizeBoard(mixed $board): ?array {
        $data = $this->entityToArray($board);
        $id = $data['id'] ?? null;
        if (!is_numeric($id) || (int)$id <= 0) {
            return null;
        }
        $title = isset($data['title']) ? (string)$data['title'] : '';
        $color = $data['color'] ?? null;
        return [
            'id' => (int)$id,
            'title' => $title !== '' ? $title : 'Board ' . (int)$id,
            'color' => $this->normalizeColor($color),
        ];
    }

    /**
     * @param array{stackId:int, stackTitle:string, forceArchived:bool} $stack
     * @return array<string,mixed>|null
     */
    private function normalizeCard(mixed $card, array $board, array $stack): ?array {
        $data = $this->entityToArray($card);
        $id = $data['id'] ?? null;
        if (!is_numeric($id) || (int)$id <= 0) {
            return null;
        }

        $dueTs = $this->toTimestamp($data['duedate'] ?? null);
        $doneTs = $this->toTimestamp($data['done'] ?? null);
        $createdTs = $this->toTimestamp($data['createdAt'] ?? ($data['created'] ?? null));

        $boardId = $data['boardId'] ?? $board['id'] ?? null;
        if (!is_numeric($boardId) || (int)$boardId <= 0) {
            return null;
        }

        $isArchived = !empty($data['archived']) || !empty($stack['forceArchived']);
        $status = $isArchived ? 'archived' : ($doneTs !== null ? 'done' : 'active');

        $createdBy = $this->normalizeParticipant($data['owner'] ?? $data['createdBy'] ?? $data['creator'] ?? null);
        $doneBy = $this->normalizeParticipant($data['doneBy'] ?? $data['completedBy'] ?? $data['lastEditor'] ?? null);

        return [
            'id' => (int)$id,
            'title' => !empty($data['title']) ? (string)$data['title'] : 'Card ' . (int)$id,
            'description' => isset($data['description']) ? (string)$data['description'] : '',
            'boardId' => (int)$boardId,
            'boardTitle' => $board['title'] ?? 'Board ' . (int)$boardId,
            'boardColor' => $board['color'] ?? null,
            'stackTitle' => $stack['stackTitle'],
            'stackId' => $stack['stackId'],
            'due' => $this->toIso($dueTs),
            'dueTs' => $dueTs ?? null,
            'done' => $this->toIso($doneTs),
            'doneTs' => $doneTs ?? null,
            'archived' => $isArchived,
            'status' => $status,
            'labels' => $this->normalizeLabels($data['labels'] ?? []),
            'assignees' => $this->normalizeAssignees($data['assignedUsers'] ?? []),
            'match' => 'due',
            'created' => $this->toIso($createdTs),
            'createdTs' => $createdTs ?? null,
            'createdBy' => $createdBy['uid'] ?? null,
            'createdByDisplay' => $createdBy['displayName'] ?? null,
            'doneBy' => $doneBy['uid'] ?? null,
            'doneByDisplay' => $doneBy['displayName'] ?? null,
        ];
    }

    /**
     * @return array<int, array{id?:int, title:string, color?:string}>
     */
    private function normalizeLabels(mixed $labels): array {
        if (!is_array($labels)) {
            return [];
        }
        $result = [];
        foreach ($labels as $label) {
            $data = $this->entityToArray($label);
            $title = isset($data['title']) ? (string)$data['title'] : '';
            $id = $data['id'] ?? null;
            if ($title === '' && is_numeric($id)) {
                $title = 'Label ' . (int)$id;
            }
            $result[] = [
                'id' => is_numeric($id) ? (int)$id : null,
                'title' => $title !== '' ? $title : 'Label',
                'color' => $this->normalizeColor($data['color'] ?? null),
            ];
        }
        return $result;
    }

    /**
     * @return array<int, array{id?:int, uid?:string, displayName?:string}>
     */
    private function normalizeAssignees(mixed $assignees): array {
        if (!is_array($assignees)) {
            return [];
        }
        $result = [];
        foreach ($assignees as $assignee) {
            $data = $this->entityToArray($assignee);
            $id = $data['id'] ?? null;
            $participant = $data['participant'] ?? null;
            $normalized = $this->normalizeParticipant($participant);
            if ($normalized === null) {
                continue;
            }
            if (is_numeric($id)) {
                $normalized['id'] = (int)$id;
            }
            $result[] = $normalized;
        }
        return $result;
    }

    /**
     * @return array{uid?:string, displayName?:string}|null
     */
    private function normalizeParticipant(mixed $participant): ?array {
        if (empty($participant)) {
            return null;
        }
        if (is_string($participant)) {
            $uid = trim($participant);
            return $uid !== '' ? ['uid' => $uid] : null;
        }
        $data = $this->entityToArray($participant);
        $uid = isset($data['uid']) ? (string)$data['uid'] : (isset($data['participant']) ? (string)$data['participant'] : '');
        $display = '';
        if (isset($data['displayname'])) {
            $display = (string)$data['displayname'];
        } elseif (isset($data['id'])) {
            $display = (string)$data['id'];
        }
        if ($uid === '' && $display === '') {
            return null;
        }
        $result = [];
        if ($uid !== '') {
            $result['uid'] = $uid;
        }
        if ($display !== '') {
            $result['displayName'] = $display;
        }
        return $result;
    }

    private function normalizeColor(mixed $color): ?string {
        if (!is_string($color)) {
            return null;
        }
        $trimmed = trim($color);
        if ($trimmed === '') {
            return null;
        }
        return str_starts_with($trimmed, '#') ? $trimmed : '#' . $trimmed;
    }

    private function toTimestamp(mixed $value): ?int {
        if ($value instanceof DateTimeInterface) {
            return $value->getTimestamp() * 1000;
        }
        if (is_numeric($value)) {
            $num = (float)$value;
            if (!is_finite($num)) {
                return null;
            }
            if ($num > 1e12) {
                return (int)round($num);
            }
            return (int)round($num * 1000);
        }
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return null;
            }
            $parsed = strtotime($trimmed);
            if ($parsed === false) {
                return null;
            }
            return $parsed * 1000;
        }
        return null;
    }

    private function toIso(?int $timestamp): ?string {
        if ($timestamp === null) {
            return null;
        }
        $seconds = intdiv($timestamp, 1000);
        $millis = abs($timestamp % 1000);
        $dt = (new DateTimeImmutable('@' . $seconds))->setTimezone(new DateTimeZone('UTC'));
        return $dt->format('Y-m-d\TH:i:s') . '.' . str_pad((string)$millis, 3, '0', STR_PAD_LEFT) . 'Z';
    }

    private function inRange(int $value, int $from, int $to): bool {
        return $value >= $from && $value <= $to;
    }

    /**
     * @return array<string,mixed>
     */
    private function entityToArray(mixed $entity): array {
        if (is_array($entity)) {
            return $entity;
        }
        if ($entity instanceof JsonSerializable) {
            $data = $entity->jsonSerialize();
            return is_array($data) ? $data : [];
        }
        if (is_object($entity) && method_exists($entity, 'toArray')) {
            try {
                $data = $entity->toArray();
                return is_array($data) ? $data : [];
            } catch (\Throwable) {
                return [];
            }
        }
        return [];
    }
}
