<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

$composerAutoload = dirname(__DIR__) . '/../vendor/autoload.php';

if (file_exists($composerAutoload)) {
	require $composerAutoload;
} else {
	fwrite(STDERR, "Composer autoloader not found. Run `composer install` in the app root.\n");
	exit(1);
}

if (!class_exists(\OCP\AppFramework\Controller::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Controller.php';
}
if (!class_exists(\OCP\AppFramework\Http::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Http.php';
}
if (!class_exists(\OCP\AppFramework\Http\DataResponse::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Http/DataResponse.php';
}
if (!class_exists(\OCP\AppFramework\Http\TemplateResponse::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Http/TemplateResponse.php';
}
if (!class_exists(\OCP\AppFramework\Http\Attribute\NoAdminRequired::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Http/Attribute/NoAdminRequired.php';
}
if (!class_exists(\OCP\AppFramework\Http\Attribute\NoCSRFRequired::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Http/Attribute/NoCSRFRequired.php';
}
if (!class_exists(\OCP\Server::class)) {
	require __DIR__ . '/stubs/OCP/Server.php';
}
if (!class_exists(\OCP\Util::class)) {
	require __DIR__ . '/stubs/OCP/Util.php';
}
if (!class_exists(\Sabre\VObject\Reader::class)) {
	require __DIR__ . '/stubs/Sabre/VObject/Reader.php';
}
if (!class_exists(\Symfony\Component\Console\Command\Command::class)) {
	require __DIR__ . '/stubs/Symfony/Component/Console/Command/Command.php';
}
if (!class_exists(\Symfony\Component\Console\Input\InputOption::class)) {
	require __DIR__ . '/stubs/Symfony/Component/Console/Input/InputOption.php';
}
if (!class_exists(\Symfony\Component\Console\Attribute\AsCommand::class)) {
	require __DIR__ . '/stubs/Symfony/Component/Console/Attribute/AsCommand.php';
}

$interfaceStubs = [
	\OCP\IRequest::class => '/stubs/OCP/IRequest.php',
	\OCP\Calendar\IManager::class => '/stubs/OCP/Calendar/IManager.php',
	\OCP\IUserSession::class => '/stubs/OCP/IUserSession.php',
	\OCP\IUser::class => '/stubs/OCP/IUser.php',
	\OCP\IUserManager::class => '/stubs/OCP/IUserManager.php',
	\OCP\IConfig::class => '/stubs/OCP/IConfig.php',
	\OCP\IURLGenerator::class => '/stubs/OCP/IURLGenerator.php',
	\OCP\ICache::class => '/stubs/OCP/ICache.php',
	\OCP\ICacheFactory::class => '/stubs/OCP/ICacheFactory.php',
	\OCP\IL10N::class => '/stubs/OCP/IL10N.php',
	\OCP\Mail\IMailer::class => '/stubs/OCP/Mail/IMailer.php',
	\OCP\App\IAppManager::class => '/stubs/OCP/App/IAppManager.php',
	\Symfony\Component\Console\Input\InputInterface::class => '/stubs/Symfony/Component/Console/Input/InputInterface.php',
	\Symfony\Component\Console\Output\OutputInterface::class => '/stubs/Symfony/Component/Console/Output/OutputInterface.php',
	\Psr\Log\LoggerInterface::class => '/stubs/Psr/Log/LoggerInterface.php',
];

foreach ($interfaceStubs as $fqcn => $relativePath) {
	if (!interface_exists($fqcn) && !class_exists($fqcn)) {
		require __DIR__ . $relativePath;
	}
}
