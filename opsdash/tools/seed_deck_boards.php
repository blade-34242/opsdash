#!/usr/bin/env php
<?php
declare(strict_types=1);

define('OC_ROOT', dirname(__DIR__, 3));
require_once OC_ROOT . '/config/config.php';
require_once OC_ROOT . '/lib/base.php';

use OCA\Opsdash\Service\DeckSeedException;
use OCA\Opsdash\Service\DeckSeedService;
use OCP\App\IAppManager;

function main(): void {
    $userId = getenv('QA_USER') ?: 'qa';
    $boardTitle = getenv('QA_DECK_BOARD_TITLE') ?: 'Opsdash Deck QA';
    $boardColor = getenv('QA_DECK_BOARD_COLOR') ?: '#2563EB';
    $resetStacks = getenv('QA_DECK_KEEP_STACKS') ? false : true;
    /** @var IAppManager $appManager */
    $appManager = \OC::$server->get(IAppManager::class);
    $appManager->loadApp('opsdash');

    /** @var DeckSeedService $service */
    $service = \OC::$server->query(DeckSeedService::class);
    $result = $service->seed([
        'userId' => $userId,
        'boardTitle' => $boardTitle,
        'boardColor' => $boardColor,
        'resetStacks' => $resetStacks,
    ]);

    $status = $result['created'] ? 'Created' : ($resetStacks ? 'Reset' : 'Reused');
    echo sprintf(
        "%s Deck board \"%s\" (#%d) with %d cards for %s\n",
        $status,
        $result['boardTitle'],
        $result['boardId'],
        $result['cardsSeeded'],
        $userId,
    );
}

try {
    main();
} catch (DeckSeedException $e) {
    fwrite(STDERR, '[deck seed] ' . $e->getMessage() . PHP_EOL);
    exit(1);
} catch (\Throwable $e) {
    fwrite(STDERR, '[deck seed] Unhandled error: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
