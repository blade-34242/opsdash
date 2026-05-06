import { defineAsyncComponent } from 'vue'

const BalanceIndexCard = defineAsyncComponent(() =>
  import('../../../components/widgets/cards/BalanceIndexCard.vue').then((m) => m.default),
)

import { buildTitle, numberOr } from '../helpers'
import { createDefaultBalanceConfig } from '../../targets/config'
import type { RegistryEntry } from '../types'

const baseTitle = 'Balance Index'

export const balanceIndexEntry: RegistryEntry = {
  component: BalanceIndexCard,
  defaultLayout: { width: 'half', height: 's', order: 32 },
  label: 'Balance Index',
  category: 'Time' as const,
  baseTitle,
  configurable: true,
  supportsColors: true,
  defaultOptions: (() => {
    const defaults = createDefaultBalanceConfig()
    return {
      showTrend: true,
      showMessages: true,
      showConfig: true,
      indexBasis: defaults.index.basis,
      noticeAbove: defaults.thresholds.noticeAbove,
      noticeBelow: defaults.thresholds.noticeBelow,
      warnAbove: defaults.thresholds.warnAbove,
      warnBelow: defaults.thresholds.warnBelow,
      warnIndex: defaults.thresholds.warnIndex,
      messageDensity: 'normal',
      trendColor: '#2563EB',
      showCurrent: true,
      labelMode: 'period',
      reverseOrder: false,
    }
  })(),
  controls: [
    { key: 'showConfig', label: 'Show config summary', type: 'toggle' },
    { key: 'showTrend', label: 'Show trend', type: 'toggle' },
    { key: 'showMessages', label: 'Show messages', type: 'toggle' },
    {
      key: 'messageDensity',
      label: 'Messages shown',
      type: 'select',
      options: [
        { value: 'few', label: 'Few' },
        { value: 'normal', label: 'Normal' },
        { value: 'many', label: 'Many' },
      ],
    },
    {
      key: 'indexBasis',
      label: 'Index basis',
      type: 'select',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'category', label: 'Total categories' },
        { value: 'calendar', label: 'Total calendars' },
        { value: 'both', label: 'Categories + calendars' },
      ],
    },
    { key: 'noticeAbove', label: 'Notice above target', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'noticeBelow', label: 'Notice below target', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'warnAbove', label: 'Warn above target', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'warnBelow', label: 'Warn below target', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'warnIndex', label: 'Warn index', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'trendColor', label: 'Trend color', type: 'color' },
    { key: 'showCurrent', label: 'Show current period', type: 'toggle' },
    { key: 'reverseOrder', label: 'Reverse order (newest first)', type: 'toggle' },
    {
      key: 'labelMode',
      label: 'Trend label',
      type: 'select',
      options: [
        { value: 'date', label: 'Date range' },
        { value: 'period', label: 'Week/Month' },
        { value: 'offset', label: 'Offset only' },
      ],
    },
  ],
  buildProps: (def, ctx) => {
    const cfg = ctx.balanceConfig ? JSON.parse(JSON.stringify(ctx.balanceConfig)) : createDefaultBalanceConfig()
    const defaults = createDefaultBalanceConfig()
    const showBadge = def.options?.showBadge !== false
    const showTrend = def.options?.showTrend !== false
    const showMessages = def.options?.showMessages ?? cfg.ui?.showMessages ?? true
    const density = (def.options?.messageDensity as string) || 'normal'
    const messageLimit = density === 'few' ? 1 : density === 'many' ? Infinity : 3
    const lookbackWeeks = Number.isFinite(ctx.lookbackWeeks)
      ? Number(ctx.lookbackWeeks)
      : defaults.trend?.lookbackWeeks ?? 3
    const thresholds = {
      noticeAbove: numberOr(cfg?.thresholds?.noticeAbove, def.options?.noticeAbove),
      noticeBelow: numberOr(cfg?.thresholds?.noticeBelow, def.options?.noticeBelow),
      warnAbove: numberOr(cfg?.thresholds?.warnAbove, def.options?.warnAbove),
      warnBelow: numberOr(cfg?.thresholds?.warnBelow, def.options?.warnBelow),
      warnIndex: numberOr(cfg?.thresholds?.warnIndex, def.options?.warnIndex),
    }
    const requestedBasis = def.options?.indexBasis || cfg?.index?.basis || 'category'
    const indexBasis = cfg?.useCategoryMapping === false && requestedBasis === 'category'
      ? 'calendar'
      : requestedBasis
    const trendColor = typeof def.options?.trendColor === 'string' && def.options?.trendColor.trim()
      ? def.options.trendColor.trim()
      : '#2563EB'
    const effectiveLookback = Math.max(
      1,
      Math.min(6, Number.isFinite(lookbackWeeks) ? Number(lookbackWeeks) : defaults.trend?.lookbackWeeks ?? 4),
    )
    return {
      overview: ctx.balanceOverview,
      targetsCategories: ctx.targetsConfig?.categories || [],
      rangeLabel: ctx.rangeLabel,
      showBadge,
      showTrend,
      showMessages,
      showHeader: def.options?.showHeader !== false,
      showConfig: def.options?.showConfig !== false,
      messageLimit,
      lookbackWeeks: effectiveLookback,
      loopbackCount: effectiveLookback,
      showCurrent: def.options?.showCurrent !== false,
      labelMode: (def.options?.labelMode as any) || 'period',
      reverseOrder: def.options?.reverseOrder === true,
      indexBasis,
      thresholds,
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.colors?.background ?? def.options?.cardBg,
      trendColor,
      from: ctx.from,
      to: ctx.to,
      rangeMode: ctx.rangeMode,
    }
  },
}
