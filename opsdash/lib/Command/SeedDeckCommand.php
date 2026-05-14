<?php
declare(strict_types=1);

namespace OCA\Opsdash\Command;

use OCA\Opsdash\Service\DeckSeedException;
use OCA\Opsdash\Service\DeckSeedService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'opsdash:seed-deck',
    description: 'Seed the Opsdash QA Deck board/cards for a user.',
    hidden: false,
)]
class SeedDeckCommand extends Command {
    protected static $defaultName = 'opsdash:seed-deck';

    public function __construct(
        private DeckSeedService $deckSeedService,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->setDescription('Seed the Opsdash QA Deck board/cards for a user.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'User ID to own the Deck board', 'qa')
            ->addOption('board-title', null, InputOption::VALUE_REQUIRED, 'Deck board title', 'Opsdash Deck QA')
            ->addOption('board-color', null, InputOption::VALUE_REQUIRED, 'Board color (hex)', '#2563EB')
            ->addOption('keep-stacks', null, InputOption::VALUE_NONE, 'Skip resetting existing stacks/cards');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int {
        $userId = (string)$input->getOption('user');
        $boardTitle = (string)$input->getOption('board-title');
        $boardColor = (string)$input->getOption('board-color');
        $resetStacks = !$input->getOption('keep-stacks');

        try {
            $result = $this->deckSeedService->seed([
                'userId' => $userId,
                'boardTitle' => $boardTitle,
                'boardColor' => $boardColor,
                'resetStacks' => $resetStacks,
            ]);
        } catch (DeckSeedException $e) {
            $output->writeln('<error>[opsdash] ' . $e->getMessage() . '</error>');
            return Command::FAILURE;
        } catch (\Throwable $e) {
            $output->writeln('<error>[opsdash] Deck seeding failed: ' . $e->getMessage() . '</error>');
            return Command::FAILURE;
        }

        $status = $result['created'] ? 'created' : ($resetStacks ? 'reset' : 'reused');
        $output->writeln(sprintf(
            '<info>[opsdash]</info> Deck board "%s" (#%d) %s with %d cards.',
            $result['boardTitle'],
            $result['boardId'],
            $status,
            $result['cardsSeeded']
        ));

        return Command::SUCCESS;
    }
}
