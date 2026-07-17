<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\DashboardDefaultsService;
use PHPUnit\Framework\TestCase;

final class DashboardDefaultsServiceTest extends TestCase {
    public function testStandardPresetIncludesDeckStats(): void {
        $service = new DashboardDefaultsService();

        $tabs = $service->createDefaultTabs('standard');
        $widgets = $tabs['tabs'][0]['widgets'] ?? [];

        $this->assertContains('deck_stats', array_column($widgets, 'type'));
    }

    public function testProTabsUseWorkspaceForDeckAndCalendarStats(): void {
        $service = new DashboardDefaultsService();

        $tabs = $service->createDefaultTabs('pro');
        $workspace = array_values(array_filter(
            $tabs['tabs'] ?? [],
            static fn (array $tab): bool => ($tab['label'] ?? '') === 'Workspace',
        ));

        $this->assertCount(1, $workspace);
        $types = array_column($workspace[0]['widgets'] ?? [], 'type');
        $this->assertContains('deck_stats', $types);
        $this->assertContains('calendar_stats', $types);
    }
}
