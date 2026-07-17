import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { useConfigExportImport } from '../composables/useConfigExportImport'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultWidgetTabs } from '../src/services/widgetsRegistry'
import presetFixture from './fixtures-v2/preset-export.json'
import onboardingFixture from './fixtures-v2/onboarding-export.json'

function setup(overrides: Record<string, any> = {}) {
  const selected = ref<string[]>(['personal'])
  const groupsById = ref<Record<string, number>>({ personal: 0 })
  const targetsWeek = ref<Record<string, number>>({ personal: 5 })
  const targetsMonth = ref<Record<string, number>>({ personal: 20 })
  const targetsConfig = ref(createDefaultTargetsConfig())
  const themePreference = ref<'auto' | 'light' | 'dark'>('auto')
  const onboardingState = ref<any>(null)
  const widgetTabs = overrides.widgetTabs ?? ref(createDefaultWidgetTabs('standard'))

  const setThemePreference = vi.fn()
  const postJson = vi.fn().mockResolvedValue({})
  const route = vi.fn().mockReturnValue('/persist')
  const performLoad = vi.fn()
  const notifySuccess = vi.fn()
  const notifyError = vi.fn()
  const createDownload = overrides.createDownload ?? vi.fn()

  const helpers = useConfigExportImport({
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    onboardingState,
    widgetTabs,
    setThemePreference,
    postJson,
    route,
    performLoad,
    notifySuccess,
    notifyError,
    createDownload,
  })

  return {
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    onboardingState,
    setThemePreference,
    postJson,
    route,
    performLoad,
    notifySuccess,
    notifyError,
    createDownload,
    widgetTabs,
    ...helpers,
  }
}

describe('useConfigExportImport', () => {
  it('exports configuration envelope via custom downloader', () => {
    const ctx = setup({ createDownload: vi.fn() })
    ctx.exportSidebarConfig()

    expect(ctx.createDownload).toHaveBeenCalledTimes(1)
    const [filename, envelope] = ctx.createDownload.mock.calls[0]
    expect(filename).toMatch(/opsdash-config-/)
    expect(envelope).toHaveProperty('payload')
    expect(envelope.payload.widgets).toEqual(ctx.widgetTabs.value)
  })

  it('applies onboarding export payload without warnings', async () => {
    const ctx = setup()

    await ctx.applyConfigSource(onboardingFixture.payload)

    expect(ctx.selected.value).toEqual(onboardingFixture.payload.cals)
    expect(ctx.groupsById.value).toEqual(onboardingFixture.payload.groups)
    expect(ctx.targetsWeek.value).toEqual(onboardingFixture.payload.targets_week)
    expect(ctx.targetsMonth.value).toEqual(onboardingFixture.payload.targets_month)
    expect(ctx.targetsConfig.value.totalHours).toBe(onboardingFixture.payload.targets_config.totalHours)
    expect(ctx.setThemePreference).toHaveBeenCalledWith('dark', { persist: false })
    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.any(Object))
    expect(ctx.performLoad).toHaveBeenCalledTimes(1)
    expect(ctx.notifySuccess).toHaveBeenCalledWith('Configuration imported')
    expect(ctx.notifyError).not.toHaveBeenCalled()
  })

  it('sanitises preset export payloads', async () => {
    const ctx = setup()
    await ctx.applyConfigSource(presetFixture.payload)

    expect(ctx.selected.value).toEqual(presetFixture.payload.cals)
    expect(ctx.targetsWeek.value).toEqual(presetFixture.payload.targets_week)
    expect(ctx.notifySuccess).toHaveBeenCalled()
  })

  it('normalizes widget layouts when importing legacy payloads', async () => {
    const widgetTabs = ref(createDefaultWidgetTabs('standard'))
    const ctx = setup({ widgetTabs })
    const legacyPayload = {
      cals: ['personal'],
      widgets: [
        { type: 'deck_cards', layout: { width: 'half', height: 'm', order: 1 }, options: {} },
      ],
    }

    await ctx.applyConfigSource(legacyPayload)

    expect(ctx.widgetTabs.value.tabs).toHaveLength(1)
    expect(ctx.widgetTabs.value.tabs[0].widgets[0].type).toBe('deck_cards')
  })

  it('migrates chart filters when importing widget tabs', async () => {
    const widgetTabs = ref(createDefaultWidgetTabs('standard'))
    const ctx = setup({ widgetTabs })
    const payload = {
      widgets: {
        tabs: [
          {
            id: 'tab-a',
            label: 'Alpha',
            widgets: [
              {
                type: 'chart_pie',
                layout: { width: 'half', height: 'm', order: 1 },
                options: { scope: 'calendar', calendarFilter: ['cal-1'] },
              },
            ],
          },
        ],
        defaultTabId: 'tab-a',
      },
    }

    await ctx.applyConfigSource(payload)

    const widget = ctx.widgetTabs.value.tabs[0].widgets[0]
    expect(widget.options.filterMode).toBe('calendar')
    expect(widget.options.filterIds).toEqual(['cal-1'])
  })

  it('rejects payloads without recognized keys', async () => {
    const ctx = setup()
    await ctx.applyConfigSource({ foo: 'bar' })

    expect(ctx.notifyError).toHaveBeenCalledWith('No recognised configuration keys found in file')
    expect(ctx.postJson).not.toHaveBeenCalled()
  })

  it('warns when ignored keys are present', async () => {
    const ctx = setup()
    await ctx.applyConfigSource({ cals: ['personal'], extra: 'ignore' })

    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.any(Object))
    expect(ctx.notifyError).toHaveBeenCalledWith(expect.stringContaining('ignored keys'))
  })
})
