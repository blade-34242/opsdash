import { defineAsyncComponent } from 'vue'

const TimeTargetsCard = defineAsyncComponent(() =>
  import('../../../components/widgets/cards/TimeTargetsCard.vue').then((m) => m.default),
)

import { attachUi, buildCategoryGroups, buildTitle, copyConfigForRange, safeBuildTargetsSummary } from '../helpers'
import { clampTarget, convertWeekToMonth, createDefaultTargetsConfig } from '../../targets'
import type { RegistryEntry } from '../types'

const baseTitle = 'Targets'

export const targetsV2Entry: RegistryEntry = {
  component: TimeTargetsCard,
  defaultLayout: { width: 'half', height: 'm', order: 18 },
  heightMode: 'auto',
  label: 'Targets',
  baseTitle,
  configurable: true,
  defaultOptions: {
    showLegend: true,
    showDelta: true,
    showForecast: true,
    showPace: true,
    neverFinishedMode: false,
    showToday: true,
    showTotalDelta: true,
    showNeedPerDay: true,
    showCategoryBlocks: true,
    badges: true,
    includeWeekendToggle: true,
    includeZeroDaysInStats: false,
    useLocalConfig: false,
    localConfig: null,
  },
  resolveOptions: (options, ctx) => {
    const useLocal = options?.useLocalConfig === true
    const baseConfig =
      useLocal && options?.localConfig
        ? JSON.parse(JSON.stringify(options.localConfig))
        : ctx?.targetsConfig
          ? JSON.parse(JSON.stringify(ctx.targetsConfig))
          : createDefaultTargetsConfig()
    const cfg = attachUi(copyConfigForRange(baseConfig, ctx?.rangeMode))
    return {
      showTotalDelta: cfg.ui.showTotalDelta,
      showNeedPerDay: cfg.ui.showNeedPerDay,
      showCategoryBlocks: cfg.ui.showCategoryBlocks,
      badges: cfg.ui.badges,
      includeWeekendToggle: cfg.ui.includeWeekendToggle,
      includeZeroDaysInStats: cfg.includeZeroDaysInStats,
    }
  },
  controls: [
    { key: 'showLegend', label: 'Show legend', type: 'toggle' },
    { key: 'showDelta', label: 'Show delta', type: 'toggle' },
    { key: 'showForecast', label: 'Show forecast', type: 'toggle' },
    { key: 'showPace', label: 'Show pace line', type: 'toggle' },
    { key: 'neverFinishedMode', label: 'Never Finished · Stay Hard', type: 'toggle' },
    { key: 'showToday', label: 'Show today overlay', type: 'toggle' },
    { key: 'useLocalConfig', label: 'Use custom targets for this widget', type: 'toggle' },
    { key: 'showTotalDelta', label: 'Show total delta', type: 'toggle' },
    { key: 'showNeedPerDay', label: 'Show need per day', type: 'toggle' },
    { key: 'showCategoryBlocks', label: 'Show categories', type: 'toggle' },
    { key: 'badges', label: 'Status badges', type: 'toggle' },
    { key: 'includeWeekendToggle', label: 'Weekend toggle', type: 'toggle' },
    { key: 'includeZeroDaysInStats', label: 'Include zero days in pace', type: 'toggle' },
    // footer removed
  ],
  buildProps: (def, ctx) => {
    const useLocal = !!def.options?.useLocalConfig
    const localGroupsById = normalizeLocalGroups(useLocal ? def.options?.localGroupsById : null)
    const localTargetsWeek = normalizeLocalTargets(useLocal ? def.options?.localTargetsWeek : null)
    const baseConfig =
      useLocal && def.options?.localConfig
        ? JSON.parse(JSON.stringify(def.options.localConfig))
        : ctx.targetsConfig
          ? JSON.parse(JSON.stringify(ctx.targetsConfig))
          : createDefaultTargetsConfig()
    const cfg = attachUi(copyConfigForRange(baseConfig, ctx.rangeMode))
    const applyBool = (key: string, setter: (val: boolean) => void) => {
      if (def.options?.[key] === undefined) return
      setter(!!def.options[key])
    }
    applyBool('showTotalDelta', (val) => { cfg.ui.showTotalDelta = val })
    applyBool('showNeedPerDay', (val) => { cfg.ui.showNeedPerDay = val })
    applyBool('showCategoryBlocks', (val) => { cfg.ui.showCategoryBlocks = val })
    applyBool('badges', (val) => { cfg.ui.badges = val })
    applyBool('includeWeekendToggle', (val) => { cfg.ui.includeWeekendToggle = val })
    applyBool('includeZeroDaysInStats', (val) => { cfg.includeZeroDaysInStats = val })

    const summary = useLocal && ctx.stats
      ? safeBuildTargetsSummary(cfg, {
          ...ctx,
          groupsById: localGroupsById ?? ctx.groupsById,
        })
      : (ctx.targetsSummary ?? ctx.summary)
    const currentTargets = useLocal
      ? targetsForRange(localTargetsWeek, ctx.rangeMode)
      : (ctx.currentTargets || {})
    const groups = useLocal
      ? buildCategoryGroups({
          config: cfg,
          summary,
          byCal: ctx.byCal || [],
          calendars: ctx.calendars || [],
          colorsById: ctx.colorsById || {},
          groupsById: localGroupsById ?? ctx.groupsById ?? {},
          currentTargets,
        })
      : (def.props?.groups ?? ctx.groups)

    return {
      summary,
      config: cfg,
      groups,
      showHeader: def.options?.showHeader !== false,
      showLegend: def.options?.showLegend !== false,
      showDelta: def.options?.showDelta !== false,
      showForecast: def.options?.showForecast !== false,
      showPace: def.options?.showPace !== false,
      neverFinishedMode: def.options?.neverFinishedMode === true,
      showToday: def.options?.showToday !== false,
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
    }
  },
}

function normalizeLocalGroups(input: any): Record<string, number> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const result: Record<string, number> = {}
  Object.entries(input).forEach(([calendarId, value]) => {
    const id = String(calendarId || '').trim()
    if (!id) return
    result[id] = Math.max(0, Math.min(9, Math.trunc(Number(value) || 0)))
  })
  return result
}

function normalizeLocalTargets(input: any): Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const result: Record<string, number> = {}
  Object.entries(input).forEach(([calendarId, value]) => {
    const id = String(calendarId || '').trim()
    const numeric = Number(value)
    if (!id || !Number.isFinite(numeric)) return
    result[id] = clampTarget(numeric)
  })
  return result
}

function targetsForRange(targetsWeek: Record<string, number>, rangeMode: string | undefined) {
  if (String(rangeMode || 'week').toLowerCase() !== 'month') {
    return { ...targetsWeek }
  }
  return Object.fromEntries(
    Object.entries(targetsWeek).map(([calendarId, value]) => [calendarId, convertWeekToMonth(value)]),
  )
}
