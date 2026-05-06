<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\PersistSanitizer;
use PHPUnit\Framework\TestCase;

class PersistSanitizerTest extends TestCase {
  private PersistSanitizer $sanitizer;

  protected function setUp(): void {
    parent::setUp();
    $this->sanitizer = new PersistSanitizer();
  }

  public function testCleanTargetsClampsAndSkipsInvalidValues(): void {
    $allowed = ['wk' => 1, 'ok' => 1, 'max' => 1];
    $input = [
      'wk' => -5,
      'ok' => 'not-a-number',
      'max' => 20000,
      'skip' => 42,
    ];

    $result = $this->sanitizer->cleanTargets($input, $allowed);

    $this->assertSame(0.0, $result['wk']);
    $this->assertArrayNotHasKey('ok', $result, 'Non-numeric values should be skipped');
    $this->assertSame(10000.0, $result['max']);
    $this->assertArrayNotHasKey('skip', $result, 'Disallowed ids should be ignored');
  }

  public function testCleanGroupsSanitisesValues(): void {
    $allowed = ['cal' => 1, 'max' => 1];
    $result = $this->sanitizer->cleanGroups([
      'cal' => '2.7',
      'bad' => 'oops',
      'max' => 99,
    ], $allowed, ['cal', 'max', 'missing']);

    $this->assertSame(2, $result['cal']);
    $this->assertSame(0, $result['max']);
    $this->assertSame(0, $result['missing']);
    $this->assertArrayNotHasKey('bad', $result);
  }

  public function testCleanTargetsConfigSanitisesNumericFields(): void {
    $result = $this->sanitizer->cleanTargetsConfig([
      'totalHours' => 20000,
      'categories' => [
        [
          'id' => 'alpha',
          'label' => '  ',
          'targetHours' => 20001,
          'includeWeekend' => true,
          'paceMode' => 'time_aware',
          'groupIds' => ['2', '2', '99'],
        ],
      ],
      'pace' => [
        'includeWeekendTotal' => true,
        'mode' => 'time_aware',
        'thresholds' => [
          'onTrack' => 105.234,
          'atRisk' => -150,
        ],
      ],
      'forecast' => [
        'methodPrimary' => 'momentum',
        'momentumLastNDays' => 99,
        'padding' => 12.345,
      ],
      'balance' => [
        'index' => [
          'basis' => 'both',
        ],
        'thresholds' => [
          'noticeAbove' => 1.5,
          'noticeBelow' => 1.5,
          'warnAbove' => -0.5,
          'warnBelow' => -0.5,
          'warnIndex' => 0.3333,
        ],
        'trend' => [
          'lookbackWeeks' => 25,
        ],
        'ui' => [
          'showNotes' => true,
        ],
      ],
    ]);

    $this->assertSame(10000.0, $result['totalHours']);
    $this->assertCount(1, $result['categories']);
    $category = $result['categories'][0];
    $this->assertSame('Alpha', $category['label']);
    $this->assertSame(10000.0, $category['targetHours']);
    $this->assertSame(['alpha'], $result['balance']['categories']);
    $this->assertSame([2], $category['groupIds']);

    $this->assertSame('time_aware', $result['pace']['mode']);
    $this->assertTrue($result['pace']['includeWeekendTotal']);
    $this->assertSame(100.0, $result['pace']['thresholds']['onTrack']);
    $this->assertSame(-100.0, $result['pace']['thresholds']['atRisk']);

    $this->assertSame('momentum', $result['forecast']['methodPrimary']);
    $this->assertSame(14, $result['forecast']['momentumLastNDays']);
    $this->assertSame(12.3, $result['forecast']['padding']);

    $this->assertSame('both', $result['balance']['index']['basis']);
    $this->assertSame(1.0, $result['balance']['thresholds']['noticeAbove']);
    $this->assertSame(1.0, $result['balance']['thresholds']['noticeBelow']);
    $this->assertSame(0.0, $result['balance']['thresholds']['warnAbove']);
    $this->assertSame(0.0, $result['balance']['thresholds']['warnBelow']);
    $this->assertSame(0.3, $result['balance']['thresholds']['warnIndex']);
    $this->assertSame(6, $result['balance']['trend']['lookbackWeeks']);
    $this->assertArrayHasKey('showNotes', $result['balance']['ui']);
    $this->assertTrue($result['balance']['ui']['showNotes']);
  }

  public function testSanitizeDeckSettingsClampsIdsAndBools(): void {
    $result = $this->sanitizer->sanitizeDeckSettings([
      'enabled' => false,
      'filtersEnabled' => 'false',
      'defaultFilter' => 'evil',
      'hiddenBoards' => [1, -2, 'abc', 50000, 2000000],
      'mineMode' => 'owner',
      'solvedIncludesArchived' => 0,
      'ticker' => [
        'autoScroll' => 'false',
        'intervalSeconds' => 0,
        'showBoardBadges' => '0',
      ],
    ]);

    $this->assertFalse($result['enabled']);
    $this->assertFalse($result['filtersEnabled']);
    $this->assertSame('all', $result['defaultFilter']);
    $this->assertSame([1, 50000], $result['hiddenBoards'], 'Hidden boards should drop invalid/oversized ids');
    $this->assertSame('assignee', $result['mineMode'], 'Invalid mineMode falls back');
    $this->assertFalse($result['solvedIncludesArchived']);
    $this->assertSame(3, $result['ticker']['intervalSeconds'], 'Ticker interval clamps to min');
    $this->assertFalse($result['ticker']['autoScroll']);
    $this->assertFalse($result['ticker']['showBoardBadges']);
  }

  public function testDeckSettingsSanitizeHiddenBoards(): void {
    $result = $this->sanitizer->sanitizeDeckSettings([
      'enabled' => false,
      'filtersEnabled' => false,
      'defaultFilter' => 'mine',
      'hiddenBoards' => [2, '5', 'foo', -4, 0, 2],
    ]);

    $this->assertFalse($result['enabled']);
    $this->assertFalse($result['filtersEnabled']);
    $this->assertSame('mine', $result['defaultFilter']);
    $this->assertSame([2, 5], $result['hiddenBoards']);
    $this->assertSame('assignee', $result['mineMode']);
    $this->assertTrue($result['solvedIncludesArchived']);
    $this->assertIsArray($result['ticker']);
    $this->assertArrayHasKey('autoScroll', $result['ticker']);
  }

  public function testBalanceLookbackClampValid(): void {
    $resultOne = $this->sanitizer->cleanBalanceConfig(['trend' => ['lookbackWeeks' => 1]], []);
    $this->assertSame(1, $resultOne['trend']['lookbackWeeks']);

    $resultFour = $this->sanitizer->cleanBalanceConfig(['trend' => ['lookbackWeeks' => 4]], []);
    $this->assertSame(4, $resultFour['trend']['lookbackWeeks']);

    $resultSix = $this->sanitizer->cleanBalanceConfig(['trend' => ['lookbackWeeks' => 6]], []);
    $this->assertSame(6, $resultSix['trend']['lookbackWeeks']);
  }

  public function testBalanceLookbackDefaultsToThree(): void {
    $result = $this->sanitizer->cleanTargetsConfig(['balance' => []]);
    $this->assertSame(3, $result['balance']['trend']['lookbackWeeks']);
  }

  public function testBalanceLookbackClampNegative(): void {
    $result = $this->sanitizer->cleanBalanceConfig(['trend' => ['lookbackWeeks' => -1]], []);
    $this->assertSame(1, $result['trend']['lookbackWeeks']);
  }

  public function testBalanceIndexBasisSanitises(): void {
    $resultCalendar = $this->sanitizer->cleanBalanceConfig(['index' => ['basis' => 'calendar']], []);
    $this->assertSame('calendar', $resultCalendar['index']['basis']);

    $resultOff = $this->sanitizer->cleanBalanceConfig(['index' => ['basis' => 'off']], []);
    $this->assertSame('off', $resultOff['index']['basis']);

    $resultFallback = $this->sanitizer->cleanBalanceConfig(['index' => ['basis' => 'invalid']], []);
    $this->assertSame('category', $resultFallback['index']['basis']);
  }

  public function testBalanceUiDefaultsAndDropsDeprecatedFields(): void {
    $result = $this->sanitizer->cleanTargetsConfig([
      'balance' => [
        'ui' => [
          'showNotes' => true,
          'roundPercent' => 2,
          'roundRatio' => 2,
          'showDailyStacks' => true,
        ],
      ],
    ]);

    $this->assertSame(['showNotes' => true], $result['balance']['ui']);

    $defaults = $this->sanitizer->cleanTargetsConfig(['balance' => []]);
    $this->assertArrayHasKey('showNotes', $defaults['balance']['ui']);
    $this->assertFalse($defaults['balance']['ui']['showNotes']);
  }

  public function testSanitizeWidgets(): void {
    $result = $this->sanitizer->sanitizeWidgets([
      ['type' => '', 'id' => 'bad'],
      ['type' => 'note_editor', 'layout' => ['width' => 'giant', 'height' => 'x', 'order' => 'oops'], 'options' => 'not-array'],
      ['type' => 'deck_cards', 'layout' => ['width' => 'half', 'height' => 'l', 'order' => 7]],
      ['type' => 'category_mix_trend', 'layout' => ['width' => 'quarter', 'height' => 'xl', 'order' => 12]],
    ]);

    $this->assertCount(3, $result, 'Invalid widget types should be skipped');
    $this->assertSame('note_editor', $result[0]['type']);
    $this->assertSame('full', $result[0]['layout']['width']);
    $this->assertSame('m', $result[0]['layout']['height']);
    $this->assertSame(0.0, $result[0]['layout']['order']);
    $this->assertSame([], $result[0]['options']);

    $this->assertSame('deck_cards', $result[1]['type']);
    $this->assertSame('half', $result[1]['layout']['width']);
    $this->assertSame('l', $result[1]['layout']['height']);
    $this->assertSame(7.0, $result[1]['layout']['order']);
    $this->assertStringStartsWith('widget-deck_cards-', $result[1]['id'], 'Missing ids should be generated');

    $this->assertSame('category_mix_trend', $result[2]['type']);
    $this->assertSame('quarter', $result[2]['layout']['width']);
    $this->assertSame('xl', $result[2]['layout']['height']);
    $this->assertSame(12.0, $result[2]['layout']['order']);
  }

  public function testSanitizeWidgetsCapsTabsAndTotals(): void {
    $widgets = [];
    for ($i = 0; $i < 120; $i++) {
      $widgets[] = ['type' => 'note_editor', 'id' => 'widget-' . $i];
    }
    $tabs = [];
    for ($t = 0; $t < 12; $t++) {
      $tabs[] = [
        'id' => 'tab-' . $t,
        'label' => 'Tab ' . $t,
        'widgets' => $widgets,
      ];
    }

    $result = $this->sanitizer->sanitizeWidgets(['tabs' => $tabs]);

    $this->assertLessThanOrEqual(10, count($result['tabs']));
    $total = 0;
    foreach ($result['tabs'] as $tab) {
      $this->assertLessThanOrEqual(50, count($tab['widgets']));
      $total += count($tab['widgets']);
    }
    $this->assertLessThanOrEqual(100, $total);
  }

  public function testSanitizeWidgetsRejectsUnknownType(): void {
    $result = $this->sanitizer->sanitizeWidgets([
      ['type' => 'unknown_widget', 'id' => 'w1'],
      ['type' => '../../evil', 'id' => 'w2'],
      ['type' => '<script>alert(1)</script>', 'id' => 'w3'],
      ['type' => 'note_editor', 'id' => 'w4'],
    ]);

    $this->assertCount(1, $result, 'Only known widget types should be kept');
    $this->assertSame('note_editor', $result[0]['type']);
  }

  public function testSanitizeWidgetOptionsPerSchema(): void {
    $result = $this->sanitizer->sanitizeWidgets([
      [
        'type' => 'targets_v2',
        'id' => 'w1',
        'options' => [
          'showLegend' => 1,
          'showDelta' => 0,
          'localConfig' => [
            'totalHours' => 20000,
            'categories' => [
              [
                'id' => 'work',
                'label' => 'Work',
                'targetHours' => 12000,
                'includeWeekend' => true,
                'paceMode' => 'time_aware',
                'groupIds' => [1, 99],
              ],
            ],
          ],
          'localTargetsWeek' => [
            'work' => '14.236',
            'bad' => 'nope',
          ],
          'extraKey' => '<script>',
        ],
      ],
      [
        'type' => 'category_mix_trend',
        'id' => 'w2',
        'options' => [
          'colorMode' => 'hybrid',
          'trendIndicator' => 'bogus',
          'filterIds' => ['alpha', '', 'beta'],
          'shareLowColor' => '#abc',
          'shareHighColor' => 'javascript:alert(1)',
          'unexpected' => true,
        ],
      ],
    ]);

    $this->assertCount(2, $result);

    $targetsOptions = $result[0]['options'];
    $this->assertTrue($targetsOptions['showLegend']);
    $this->assertFalse($targetsOptions['showDelta']);
    $this->assertArrayNotHasKey('extraKey', $targetsOptions);
    $this->assertSame(10000.0, $targetsOptions['localConfig']['totalHours']);
    $this->assertSame(10000.0, $targetsOptions['localConfig']['categories'][0]['targetHours']);
    $this->assertSame([1], $targetsOptions['localConfig']['categories'][0]['groupIds']);
    $this->assertSame(['work' => 14.24], $targetsOptions['localTargetsWeek']);

    $trendOptions = $result[1]['options'];
    $this->assertSame('hybrid', $trendOptions['colorMode']);
    $this->assertArrayNotHasKey('trendIndicator', $trendOptions);
    $this->assertSame(['alpha', 'beta'], $trendOptions['filterIds']);
    $this->assertSame('#AABBCC', $trendOptions['shareLowColor']);
    $this->assertArrayNotHasKey('shareHighColor', $trendOptions);
    $this->assertArrayNotHasKey('unexpected', $trendOptions);
  }

  public function testCleanOnboardingState(): void {
    $default = $this->sanitizer->cleanOnboardingState(null);
    $this->assertFalse($default['completed']);
    $this->assertSame(0, $default['version']);
    $this->assertSame('', $default['strategy']);
    $this->assertSame('', $default['completed_at']);
    $this->assertSame('standard', $default['dashboardMode']);
    $this->assertSame('', $default['releaseNotesSeenVersion']);

    $filled = $this->sanitizer->cleanOnboardingState([
      'completed' => true,
      'version' => '12',
      'strategy' => ' full_granular ',
      'completed_at' => '2025-01-01T00:00:00Z   ',
      'dashboardMode' => 'quick',
      'releaseNotesSeenVersion' => 'v0.7.5',
    ]);
    $this->assertTrue($filled['completed']);
    $this->assertSame(12, $filled['version']);
    $this->assertSame('full_granular', $filled['strategy']);
    $this->assertSame('2025-01-01T00:00:00Z', $filled['completed_at']);
    $this->assertSame('quick', $filled['dashboardMode']);
    $this->assertSame('0.7.5', $filled['releaseNotesSeenVersion']);
  }

  public function testSanitizePresetNameStripsUnsafeCharacters(): void {
    $result = $this->sanitizer->sanitizePresetName(" ../Evil<script>/\\Name  ");
    $this->assertSame('..EvilscriptName', $result);
  }

  public function testSanitizePresetNameReturnsEmptyWhenNothingAllowed(): void {
    $result = $this->sanitizer->sanitizePresetName("<><><>");
    $this->assertSame('', $result);
  }

  public function testSanitizePresetNameTrimsLength(): void {
    $name = str_repeat('A', 200);
    $result = $this->sanitizer->sanitizePresetName($name);
    $this->assertSame(80, mb_strlen($result));
  }

  public function testSanitizeThemePreferenceRejectsInvalid(): void {
    $this->assertNull($this->sanitizer->sanitizeThemePreference('purple'));
    $this->assertSame('light', $this->sanitizer->sanitizeThemePreference('Light'));
  }
}
