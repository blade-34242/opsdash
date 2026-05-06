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

    public function testProTabsIncludeDeckStatsInOverviewTab(): void {
        $service = new DashboardDefaultsService();

        $tabs = $service->createDefaultTabs('pro');
        $overview = array_values(array_filter(
            $tabs['tabs'] ?? [],
            static fn (array $tab): bool => ($tab['label'] ?? '') === 'Overview',
        ));

        $this->assertCount(1, $overview);
        $this->assertContains('deck_stats', array_column($overview[0]['widgets'] ?? [], 'type'));
    }
}
