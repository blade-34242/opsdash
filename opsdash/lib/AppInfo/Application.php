<?php
declare(strict_types=1);

namespace OCA\Opsdash\AppInfo;

use OCA\Opsdash\Command\ReportCommand;
use OCA\Opsdash\Command\SeedDeckCommand;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IBootContext;
// (metrics/admin settings removed)

class Application extends App implements IBootstrap {
    public function __construct() {
        parent::__construct('opsdash');
    }

    public function register(IRegistrationContext $context): void {
        if (method_exists($context, 'registerCommand')) {
            $context->registerCommand(ReportCommand::class);
            $context->registerCommand(SeedDeckCommand::class);
        }
    }

    public function boot(IBootContext $context): void {
        // Navigation is declared via appinfo/navigation.xml.
    }
}
