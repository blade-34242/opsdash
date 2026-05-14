<?php
declare(strict_types=1);

namespace OCA\Opsdash\AppInfo;

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
        // Console commands are registered from appinfo/register_command.php for
        // compatibility with the Nextcloud console loaders used across our
        // supported versions.
    }

    public function boot(IBootContext $context): void {
        // Navigation is declared via appinfo/navigation.xml.
    }
}
