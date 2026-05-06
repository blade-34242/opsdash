import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import { formatLookbackLabel, getLookbackColor, sortLookbackOffsets } from './chartHelpers'

const ChartHodWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/charts/ChartHodWidget.vue').then((m) => m.default),
)

const baseTitle = 'Time-of-Day Chart'

export const chartHodEntry: RegistryEntry = {
  component: ChartHodWidget,
  defaultLayout: { width: 'full', height: 'l', order: 86 },
  label: 'Time-of-Day Chart',
  category: 'Charts' as const,
  baseTitle,
  configurable: true,
  defaultOptions: {
    showHint: false,
    showLegend: true,
    lookbackMode: 'stacked',
    compact: false,
    reverseOrder: false,
  },
  dynamicControls: () => {
    return [
      { key: 'lookbackMode', label: 'Lookback view', type: 'select', options: [
        { value: 'stacked', label: 'Stacked weeks' },
        { value: 'overlay', label: 'Overlay stripes' },
      ] },
      { key: 'showLegend', label: 'Show legend', type: 'toggle' },
      { key: 'showHint', label: 'Show hint', type: 'toggle' },
      { key: 'compact', label: 'Compact', type: 'toggle' },
      { key: 'reverseOrder', label: 'Reverse order (newest first)', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const lookbackWeeks = Number.isFinite(ctx.lookbackWeeks) ? Math.max(1, Math.min(6, Number(ctx.lookbackWeeks))) : 1
    const lookbackInput =
      lookbackWeeks > 1 && Array.isArray(ctx.charts?.hodByOffset)
        ? ctx.charts.hodByOffset
        : null
    const reverseOrder = def.options?.reverseOrder === true
    const sortedLookback = lookbackInput ? sortLookbackOffsets<any>(lookbackInput as any[]) : []
    const orderedLookback = reverseOrder ? sortedLookback : sortedLookback.slice().reverse()
    const lookbackEntries = orderedLookback
      .map((entry, idx) => {
        const matrix = Array.isArray(entry.matrix) ? entry.matrix : []
        const total = matrix.reduce((sum: number, row: any) => {
          const rowTotal = Array.isArray(row)
            ? row.reduce((acc: number, val: any) => acc + Math.max(0, Number(val) || 0), 0)
            : 0
          return sum + rowTotal
        }, 0)
        const color = getLookbackColor(idx)
        return {
          id: `offset-${entry.offset ?? idx}`,
          label: formatLookbackLabel(entry, ctx.rangeMode),
          color,
          total,
          hod: {
            dows: entry.dows || [],
            hours: entry.hours || [],
            matrix,
          },
        }
      })
      .filter((entry) => entry.total > 0)
    const hodData =
      lookbackWeeks > 1 && ctx.charts?.hodLookback
        ? ctx.charts.hodLookback
        : ctx.charts?.hod || null
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      showHint: def.options?.showHint === true,
      showLegend: def.options?.showLegend !== false,
      lookbackMode: def.options?.lookbackMode,
      lookbackWeeks: ctx.lookbackWeeks,
      rangeMode: ctx.rangeMode,
      hodData,
      lookbackEntries,
    }
  },
}
