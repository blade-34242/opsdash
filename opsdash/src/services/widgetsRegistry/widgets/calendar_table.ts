import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import { parseIdList } from './chartHelpers'

const CalendarTableWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/tables/CalendarTableWidget.vue').then((m) => m.default),
)

const baseTitle = 'Calendar Table'

function detectCalendarTableMode(ctx: any): 'single_goal' | 'calendar_goals' | 'category_and_calendar_goals' {
  const strategy = String(ctx?.onboardingStrategy ?? '')
  if (strategy === 'total_only') return 'single_goal'
  if (strategy === 'total_plus_categories') return 'calendar_goals'
  if (strategy === 'full_granular') return 'category_and_calendar_goals'

  const categories = Array.isArray(ctx?.targetsConfig?.categories) ? ctx.targetsConfig.categories : []
  if (categories.length > 0) return 'category_and_calendar_goals'
  const currentTargets = ctx?.currentTargets && typeof ctx.currentTargets === 'object' ? ctx.currentTargets : {}
  return Object.keys(currentTargets).length > 0 ? 'calendar_goals' : 'single_goal'
}

export const calendarTableEntry: RegistryEntry = {
  component: CalendarTableWidget,
  defaultLayout: { width: 'full', height: 'l', order: 70 },
  heightMode: 'auto',
  label: 'Calendar Table',
  category: 'Time' as const,
  baseTitle,
  configurable: true,
  defaultOptions: {
    calendarFilter: [],
    compact: false,
  },
  dynamicControls: (options, ctx) => {
    const calOptions = Array.isArray(ctx?.calendars)
      ? ctx.calendars.map((cal: any) => ({ value: cal.id, label: cal.displayname || cal.name || cal.id }))
      : []
    return [
      { key: 'calendarFilter', label: 'Calendars', type: 'multiselect', options: calOptions },
      { key: 'compact', label: 'Compact', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const mode = detectCalendarTableMode(ctx)
    const calendarFilter = new Set(parseIdList(def.options?.calendarFilter))
    const rows = Array.isArray(ctx.byCal) ? ctx.byCal : []
    const filteredRows = calendarFilter.size
      ? rows.filter((row: any) => calendarFilter.has(String(row?.id ?? row?.calendar_id ?? row?.calendar ?? '')))
      : rows
    const groupedRows = Array.isArray(ctx.calendarGroups) ? ctx.calendarGroups : (Array.isArray(ctx.groups) ? ctx.groups : [])
    const groups = mode === 'category_and_calendar_goals' ? groupedRows : []
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: calendarFilter.size ? 'Filtered calendars' : undefined,
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      rows: filteredRows,
      targets: ctx.currentTargets || {},
      groups,
      todayHours: ctx.calendarTodayHours || {},
      mode,
      totalTarget: Number(ctx?.targetsConfig?.totalHours ?? 0) || 0,
    }
  },
}
