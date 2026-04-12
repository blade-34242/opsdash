import { defineAsyncComponent } from 'vue'

const DayOffTrendCard = defineAsyncComponent(() =>
  import('../../../components/widgets/cards/DayOffTrendCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Time Off Trend'

export const dayOffTrendEntry: RegistryEntry = {
  component: DayOffTrendCard,
  defaultLayout: { width: 'quarter', height: 's', order: 45 },
  heightMode: 'auto',
  label: 'Time Off Trend',
  baseTitle,
  configurable: true,
  defaultOptions: {
    reverseOrder: false,
    labelMode: 'period',
    interpretation: 'more_off_positive',
    toneLowColor: '#dc2626',
    toneHighColor: '#16a34a',
  },
  controls: [
    { key: 'reverseOrder', label: 'Newest first', type: 'toggle' },
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
    {
      key: 'interpretation',
      label: 'Interpretation',
      type: 'select',
      options: [
        { value: 'more_off_positive', label: 'More off = positive' },
        { value: 'more_off_warning', label: 'More off = warning' },
      ],
    },
    { key: 'toneLowColor', label: 'Low % color', type: 'color' },
    { key: 'toneHighColor', label: 'High % color', type: 'color' },
  ],
  buildProps: (def, ctx) => ({
    trend: ctx.activityDayOffTrend,
    unit: ctx.activityTrendUnit ?? 'wk',
    lookback: ctx.activityDayOffLookback ?? 3,
    showHeader: def.options?.showHeader !== false,
    reverseOrder: def.options?.reverseOrder === true,
    labelMode: def.options?.labelMode,
    interpretation: def.options?.interpretation,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    toneLowColor: def.options?.toneLowColor,
    toneHighColor: def.options?.toneHighColor,
  }),
}
