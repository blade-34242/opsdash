<template>
  <DeckCardsPanel
    :cards="filteredCards"
    :loading="loading"
    :range-label="rangeLabel"
    :last-fetched-at="lastFetchedAt"
    :deck-url="deckUrl"
    :error="error"
    :filter="activeFilter"
    :filters-enabled="filtersEnabled"
    :can-filter-mine="allowMine"
    :allow-mine-override="allowMine"
    :filter-options="filterOptionDefs"
    :auto-scroll="props.autoScroll !== false"
    :interval-seconds="props.intervalSeconds"
    :show-count="props.showCount !== false"
    :max-visible="props.maxVisible"
    :compact="props.compactList === true"
    :title="props.title"
    :card-bg="props.cardBg"
    :show-header="props.showHeader !== false"
    :editable="props.editable === true"
    :on-cards-changed="props.onDeckCardsChanged"
    :boards="boards"
    :orderable-values="filterOrder"
    @refresh="$emit('refresh')"
    @update:filter="onFilter"
    @reorder:filters="onReorderFilters"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DeckCardsPanel from '../../panels/DeckCardsPanel.vue'
import { fetchDeckBoardsMeta, type DeckCardSummary, type DeckStackMeta } from '../../../services/deck'
import type { DeckFilterMode, DeckMineMode } from '../../../services/reporting'
import {
  buildDeckTagControlOptions,
  filterDeckBaseCards,
  filterDeckCardsForMode,
} from '../../../services/deckWidgetMetrics'

const props = withDefaults(defineProps<{
  cards: DeckCardSummary[]
  rangeLabel: string
  from?: string
  to?: string
  uid?: string
  deckUrl?: string
  lastFetchedAt?: string | null
  loading?: boolean
  error?: string | null
  boardIds?: Array<number | string>
  stackIds?: Array<number | string>
  filters?: DeckFilterMode[]
  defaultFilter?: DeckFilterMode
  allowMine?: boolean
  mineMode?: DeckMineMode
  includeArchived?: boolean
  includeCompleted?: boolean
  autoScroll?: boolean
  intervalSeconds?: number
  showCount?: boolean
  maxVisible?: number
  minFilterCount?: number
  showHeader?: boolean
  title?: string
  cardBg?: string | null
  customFilters?: Array<{
    id: string
    label: string
    labelIds?: string[]
    labels?: string[]
    assignees?: string[]
  }>
  autoTagsEnabled?: boolean
  autoTagSelection?: string[]
  compactList?: boolean
  editable?: boolean
  onUpdateFilters?: (filters: DeckFilterMode[]) => void
  onDeckCardsChanged?: () => void | Promise<void>
}>(), {
  autoTagsEnabled: true,
})

defineEmits<{
  refresh: []
}>()

const defaultFilters: DeckFilterMode[] = [
  'focus_all',
  'focus_mine',
  'backlog_all',
  'backlog_mine',
  'all',
]

const boards = ref<Array<{ id: number; title: string }>>([])
const stacksByBoard = ref<Record<number, DeckStackMeta[]>>({})

onMounted(async () => {
  try {
    boards.value = await fetchDeckBoardsMeta()
  } catch {
    boards.value = []
  }
})

const baseCards = computed(() => {
  return filterDeckBaseCards(props.cards || [], {
    boardIds: props.boardIds,
    stackIds: props.stackIds,
    includeArchived: true,
    includeCompleted: true,
  })
})

const cleanedCards = computed(() => {
  return filterDeckBaseCards(baseCards.value, {
    includeArchived: props.includeArchived !== false,
    includeCompleted: props.includeCompleted !== false,
  })
})

const tagOptions = computed(() => {
  if (props.autoTagsEnabled === false) return []
  return buildDeckTagControlOptions(cleanedCards.value)
})

const tagSelection = computed(() => {
  if (!Array.isArray(props.autoTagSelection)) return null
  return new Set(props.autoTagSelection.map((value) => String(value)))
})

const tagFilterOptions = computed(() => {
  if (props.autoTagsEnabled === false) return []
  const options = tagOptions.value
  if (!options.length) return []
  const selection = tagSelection.value
  if (!selection) return options
  return options.filter((opt) => selection.has(opt.value))
})

const customFilterValues = computed(() =>
  (props.customFilters || []).map((f) => `custom_${f.id}` as DeckFilterMode),
)

const filterModes = computed(() => {
  const base = (props.filters && props.filters.length ? props.filters : defaultFilters) as DeckFilterMode[]
  const tags = tagFilterOptions.value.map((opt) => opt.value as DeckFilterMode)
  return [...base, ...customFilterValues.value, ...tags]
})

const filterCounts = computed(() => {
  const allowArchived = props.includeArchived !== false
  const cleaned = cleanedCards.value
  const counts = new Map<DeckFilterMode, number>()
  filterModes.value.forEach((mode) => {
    counts.set(mode, filterDeckCardsForMode(mode, cleaned, {
      uid: props.uid,
      mineMode: props.mineMode || 'assignee',
      from: props.from,
      to: props.to,
      includeCompleted: props.includeCompleted !== false,
      includeArchivedInDone: allowArchived,
      customFilters: props.customFilters || [],
    }).length)
  })
  return counts
})

const localFilters = ref<DeckFilterMode[] | null>(null)

const filterOrder = computed(() => {
  if (localFilters.value) return localFilters.value
  return (props.filters && props.filters.length ? props.filters : defaultFilters).filter(Boolean) as DeckFilterMode[]
})

const allFilterOptionDefs = computed(() => {
  const opts = filterOrder.value
  const labels: Record<DeckFilterMode, string> = {
    all: 'All cards',
    mine: 'Mine (any status)',
    focus_all: 'Focus',
    focus_mine: 'My focus',
    backlog_all: 'Backlog',
    backlog_mine: 'My backlog',
    open_all: 'Open · All',
    open_mine: 'Open · Mine',
    done_all: 'Done · All',
    done_mine: 'Done · Mine',
    archived_all: 'Archived · All',
    archived_mine: 'Archived · Mine',
    due_all: 'Due · All',
    due_mine: 'Due · Mine',
    due_today_all: 'Due today · All',
    due_today_mine: 'Due today · Mine',
    created_today_all: 'Created today · All',
    created_today_mine: 'Created today · Mine',
    created_range_all: 'Created this range · All',
    created_range_mine: 'Created this range · Mine',
  }
  const counts = filterCounts.value
  const built = opts.map((value) => ({
    value,
    label: labels[value] || value,
    mine: value.endsWith('_mine') || value === 'mine',
    count: counts.get(value) ?? 0,
  }))
  const custom = (props.customFilters || [])
    .filter((f) => f && f.id && f.label)
    .map((f) => ({
      value: (`custom_${f.id}` as DeckFilterMode),
      label: f.label,
      mine: false,
      count: counts.get(`custom_${f.id}` as DeckFilterMode) ?? 0,
    }))
  const tags = tagFilterOptions.value.map((opt) => ({
    value: opt.value as DeckFilterMode,
    label: opt.label,
    mine: false,
    count: counts.get(opt.value as DeckFilterMode) ?? opt.count ?? 0,
    contextLabel: opt.contextLabel,
    contextColor: opt.contextColor,
  }))
  return [...built, ...custom, ...tags]
})

const minFilterCount = computed(() => {
  const value = Number(props.minFilterCount ?? 0)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
})

const filterOptionDefs = computed(() => {
  if (minFilterCount.value <= 0) return allFilterOptionDefs.value
  return allFilterOptionDefs.value.filter((opt) => Number(opt.count ?? 0) >= minFilterCount.value)
})

const activeFilter = ref<DeckFilterMode>(sanitizeDefaultFilter())

watch(
  () => props.defaultFilter,
  () => {
    activeFilter.value = sanitizeDefaultFilter()
  },
)

watch(
  () => filterOptionDefs.value.map((opt) => opt.value).join('|'),
  () => {
    const options = filterOptionDefs.value
    if (!options.length) return
    if (!options.some((opt) => opt.value === activeFilter.value)) {
      activeFilter.value = options[0].value
    }
  },
)

const filtersEnabled = computed(() => filterOptionDefs.value.length > 1)
const allowMine = computed(() => props.allowMine !== false && !!(props.uid || '').trim())

const filteredCards = computed(() => {
  const allowArchived = props.includeArchived !== false || activeFilter.value.startsWith('archived')
  const cleaned = filterDeckBaseCards(baseCards.value, {
    includeArchived: allowArchived,
    includeCompleted: props.includeCompleted !== false,
  })
  return filterDeckCardsForMode(activeFilter.value, cleaned, {
    uid: props.uid,
    mineMode: props.mineMode || 'assignee',
    from: props.from,
    to: props.to,
    includeCompleted: props.includeCompleted !== false,
    includeArchivedInDone: allowArchived,
    customFilters: props.customFilters || [],
  })
})

function sanitizeDefaultFilter(): DeckFilterMode {
  const opts = filterOptionDefs.value.map((opt) => opt.value)
  const candidate = (props.defaultFilter || opts[0] || 'all') as DeckFilterMode
  return opts.includes(candidate) ? candidate : opts[0] || 'all'
}

function onFilter(value: DeckFilterMode) {
  activeFilter.value = value
}

function onReorderFilters(nextOrder: DeckFilterMode[]) {
  if (!nextOrder.length) return
  localFilters.value = [...nextOrder]
  props.onUpdateFilters?.(nextOrder)
  if (!nextOrder.includes(activeFilter.value)) {
    activeFilter.value = nextOrder[0]
  }
}
</script>
