<?php
declare(strict_types=1);

namespace OCA\Opsdash\Command;

use OCP\IConfig;
use OCP\IUser;
use OCP\IUserManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'opsdash:remove-notes',
    description: 'Remove legacy Opsdash weekly and monthly notes from user configuration.',
)]
final class RemoveNotesCommand extends Command {
    public function __construct(
        private IConfig $config,
        private IUserManager $userManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'Only remove notes for this user ID')
            ->addOption('execute', null, InputOption::VALUE_NONE, 'Actually delete data; omit for a dry run');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int {
        $targetUid = trim((string)$input->getOption('user'));
        $execute = (bool)$input->getOption('execute');
        $removed = 0;

        $removeForUser = function (IUser $user) use (&$removed, $execute, $output): void {
            $uid = $user->getUID();
            $keys = $this->config->getUserKeys($uid, 'opsdash');
            $noteKeys = array_values(array_filter(
                $keys,
                static fn (string $key): bool => preg_match('/^notes_(week|month)_\d{4}-\d{2}-\d{2}$/', $key) === 1,
            ));
            if ($noteKeys === []) {
                return;
            }
            foreach ($noteKeys as $key) {
                if ($execute) {
                    $this->config->deleteUserValue($uid, 'opsdash', $key);
                }
                $removed++;
            }
            $output->writeln(sprintf('%s: %d legacy note%s', $uid, count($noteKeys), count($noteKeys) === 1 ? '' : 's'));
        };

        if ($targetUid !== '') {
            $user = $this->userManager->get($targetUid);
            if ($user === null) {
                $output->writeln('<error>User not found.</error>');
                return Command::FAILURE;
            }
            $removeForUser($user);
        } else {
            $this->userManager->callForAllUsers($removeForUser);
        }

        $verb = $execute ? 'Removed' : 'Would remove';
        $output->writeln(sprintf('<info>%s %d legacy Opsdash note%s.</info>', $verb, $removed, $removed === 1 ? '' : 's'));
        if (!$execute) {
            $output->writeln('Run again with --execute to delete them.');
        }
        return Command::SUCCESS;
    }
}
