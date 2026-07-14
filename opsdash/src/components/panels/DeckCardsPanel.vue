<template>
  <div class="card deck-panel" :class="{ 'deck-panel--compact': props.compact }" :style="cardStyle">
  <div class="deck-panel__header" v-if="showHeader">
    <div class="deck-panel__heading">
      <div class="deck-panel__title">{{ titleLabel }}</div>
      <div class="deck-panel__subtitle" v-if="lastFetchedLabel">
        Updated {{ lastFetchedLabel }}
      </div>
      <div class="deck-panel__subtitle" v-else>
        Showing {{ rangeLabel.toLowerCase() }} selection
      </div>
    </div>
    <div class="deck-panel__actions">
      <div v-if="showCount" class="deck-panel__count">{{ cards.length }} cards</div>
      <a
        v-if="deckUrl"
        class="deck-panel__link"
        :href="deckUrl"
        target="_blank"
        rel="noopener"
      >
        Open Deck ↗
      </a>
      <button
        type="button"
        class="deck-panel__refresh"
        @click="$emit('refresh')"
        :disabled="loading"
      >
        Refresh
      </button>
    </div>
  </div>

  <div
    v-if="filtersEnabledFlag"
    class="deck-panel__filters"
    role="group"
    aria-label="Deck card filters"
  >
    <button
      v-for="option in filterOptions"
      :key="option.value"
      type="button"
      class="deck-filter-btn"
      :class="{
        active: activeFilter === option.value,
        'is-draggable': props.editable && orderableFilters.includes(option.value),
      }"
      :aria-pressed="activeFilter === option.value"
      :disabled="option.mine && !allowMine"
      :title="option.contextLabel ? `${option.label} · ${option.contextLabel}` : option.label"
      :draggable="props.editable && orderableFilters.includes(option.value)"
      @click="$emit('update:filter', option.value)"
      @dragstart="onDragStart(option.value, $event)"
      @dragover.prevent="onDragOver(option.value)"
      @drop.prevent="onDrop(option.value)"
      @dragend="onDragEnd"
    >
      <span class="deck-filter-label">
        <span class="deck-filter-label-main">{{ option.label }}</span>
        <span v-if="option.contextLabel" class="deck-filter-label-context">
          <span
            class="deck-filter-board-dot"
            :style="{ backgroundColor: option.contextColor || 'var(--line)' }"
          />
          {{ option.contextLabel }}
        </span>
      </span>
      <span v-if="typeof option.count === 'number'" class="deck-filter-count">{{ option.count }}</span>
    </button>
  </div>

  <div class="deck-panel__body" ref="bodyEl">
    <div v-if="loading" class="deck-panel__loading">
      <NcLoadingIcon :size="20" />
      <span>Loading Deck cards…</span>
    </div>

    <template v-else>
      <div v-if="error" class="deck-panel__error">
        {{ error }}
      </div>
      <NcEmptyContent
        v-else-if="!cards.length"
        name="No Deck cards"
        :description="`No cards matched this ${rangeLabel.toLowerCase()}. Confirm Deck due dates or rerun seeding.`"
      />
      <ul v-else class="deck-card-list" ref="listEl">
        <li v-for="(card, idx) in visibleCards" :key="card.id" class="deck-card" :data-idx="idx">
          <template v-if="props.compact">
            <div class="deck-card__row">
              <span class="deck-card__status" :class="card.status">
                {{ statusLabel(card.status) }}
              </span>
              <span v-if="card.match === 'due' && card.due" class="deck-card__time">
                Due {{ formatDate(card.due) }}
              </span>
              <span v-else-if="card.done" class="deck-card__time">
                Completed {{ formatDate(card.done) }}
              </span>
              <span class="deck-card__title">{{ card.title }}</span>
              <span class="deck-card__meta">
                <span class="deck-card__board" :style="{ borderColor: safeColor(card.boardColor, 'var(--brand)') }">
                  {{ card.boardTitle }}
                </span>
                <span class="deck-card__stack">{{ card.stackTitle }}</span>
              </span>
              <span class="deck-card__labels" v-if="card.labels.length">
                <span
                  v-for="label in card.labels"
                  :key="`deck-label-${card.id}-${label.id ?? label.title}`"
                  class="deck-card__label"
                  :style="{ background: safeColor(label.color, 'var(--soft)') }"
                >
                  {{ label.title }}
                </span>
              </span>
              <span class="deck-card__assignees" v-if="card.assignees.length">
                <span class="deck-card__assignees-label">Assigned:</span>
                <span
                  v-for="assignee in card.assignees"
                  :key="`deck-assignee-${card.id}-${assignee.uid ?? assignee.id}`"
                  class="deck-card__assignee"
                >
                  {{ assignee.displayName || assignee.uid }}
                </span>
              </span>
            </div>
          </template>
          <template v-else>
            <div class="deck-card__status-row">
              <span class="deck-card__status" :class="card.status">
                {{ statusLabel(card.status) }}
              </span>
              <span v-if="card.match === 'due' && card.due" class="deck-card__time">
                Due {{ formatDate(card.due) }}
              </span>
              <span v-else-if="card.done" class="deck-card__time">
                Completed {{ formatDate(card.done) }}
              </span>
            </div>
            <div class="deck-card__title">{{ card.title }}</div>
            <div class="deck-card__meta">
              <span class="deck-card__board" :style="{ borderColor: safeColor(card.boardColor, 'var(--brand)') }">
                {{ card.boardTitle }}
              </span>
              <span class="deck-card__stack">{{ card.stackTitle }}</span>
            </div>
            <div class="deck-card__labels" v-if="card.labels.length">
              <span
                v-for="label in card.labels"
                :key="`deck-label-${card.id}-${label.id ?? label.title}`"
                class="deck-card__label"
                :style="{ background: safeColor(label.color, 'var(--soft)') }"
              >
                {{ label.title }}
              </span>
            </div>
            <div class="deck-card__assignees" v-if="card.assignees.length">
              <span class="deck-card__assignees-label">Assigned:</span>
              <span
                v-for="assignee in card.assignees"
                :key="`deck-assignee-${card.id}-${assignee.uid ?? assignee.id}`"
                class="deck-card__assignee"
              >
                {{ assignee.displayName || assignee.uid }}
              </span>
            </div>
          </template>
        </li>
      </ul>
      <button
        v-if="hasHiddenCards"
        type="button"
        class="deck-panel__show-all"
        @click="showAllCards = !showAllCards"
      >
        {{ showAllCards ? 'Show fewer cards' : `Show all ${cards.length} cards` }}
      </button>
    </template>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import type { DeckCardSummary } from '../../services/deck'
import type { DeckFilterMode } from '../../services/reporting'
import { formatDateTime, parseDateTime } from '../../services/dateTime'

function safeColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const v = value.trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v
  if (/^[a-zA-Z]+$/.test(v)) return v
  return fallback
}

const props = defineProps<{
  cards: DeckCardSummary[]
  loading: boolean
  rangeLabel: string
  lastFetchedAt?: string | null
  deckUrl?: string
  error?: string
  filter?: DeckFilterMode
  canFilterMine?: boolean
  filtersEnabled?: boolean
  filterOptions?: Array<{
    value: DeckFilterMode
    label: string
    mine?: boolean
    count?: number
    contextLabel?: string
    contextColor?: string
  }>
  orderableValues?: DeckFilterMode[]
  editable?: boolean
  allowMineOverride?: boolean
  autoScroll?: boolean
  intervalSeconds?: number
  showCount?: boolean
  maxVisible?: number
  compact?: boolean
  title?: string
  cardBg?: string | null
  showHeader?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  'update:filter': [DeckFilterMode]
  'reorder:filters': [DeckFilterMode[]]
}>()

const activeFilter = computed(() => props.filter ?? 'all')
const maxVisible = computed(() => {
  const value = Number(props.maxVisible ?? 8)
  return Number.isFinite(value) ? Math.max(3, Math.min(50, Math.trunc(value))) : 8
})
const showAllCards = ref(false)
const visibleCards = computed(() => showAllCards.value ? props.cards : props.cards.slice(0, maxVisible.value))
const hasHiddenCards = computed(() => props.cards.length > maxVisible.value)
const titleLabel = computed(() => props.title || 'Deck cards')
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const showHeader = computed(() => props.showHeader !== false)
const filtersEnabledFlag = computed(() => props.filtersEnabled !== false && filterOptions.value.length > 1)
const allowMine = computed(() => filtersEnabledFlag.value && props.canFilterMine !== false && props.allowMineOverride !== false)
const filterOptions = computed<Array<{
  value: DeckFilterMode
  label: string
  mine: boolean
  count?: number
  contextLabel?: string
  contextColor?: string
}>>(() => {
  if (props.filterOptions && props.filterOptions.length) {
    return props.filterOptions.map((opt) => ({ ...opt, mine: !!opt.mine }))
  }
  return [
    { value: 'all', label: 'All cards', mine: false },
    { value: 'open_all', label: 'Open · All', mine: false },
    { value: 'open_mine', label: 'Open · Mine', mine: true },
    { value: 'done_all', label: 'Done · All', mine: false },
    { value: 'done_mine', label: 'Done · Mine', mine: true },
    { value: 'archived_all', label: 'Archived · All', mine: false },
    { value: 'archived_mine', label: 'Archived · Mine', mine: true },
    { value: 'due_all', label: 'Due · All', mine: false },
    { value: 'due_mine', label: 'Due · Mine', mine: true },
    { value: 'due_today_all', label: 'Due today · All', mine: false },
    { value: 'due_today_mine', label: 'Due today · Mine', mine: true },
  ]
})
const orderableFilters = computed(() => {
  if (props.orderableValues && props.orderableValues.length) {
    return props.orderableValues
  }
  return filterOptions.value.map((opt) => opt.value).filter((value) => !String(value).startsWith('custom_'))
})
const dragValue = ref<DeckFilterMode | null>(null)

const bodyEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const autoTimer = ref<number | null>(null)
const activeIndex = ref(0)

const intervalMs = computed(() => {
  const ms = Math.max(3, Math.min(10, Number(props.intervalSeconds ?? 5))) * 1000
  return Number.isFinite(ms) ? ms : 5000
})

watch(
  () => props.autoScroll,
  () => {
    resetAutoScroll()
    startAutoScroll()
  },
)

watch(showAllCards, () => {
  resetAutoScroll()
  startAutoScroll()
})

watch(
  () => props.cards,
  () => {
    activeIndex.value = 0
    showAllCards.value = false
    resetAutoScroll()
    startAutoScroll()
  },
  { deep: true },
)

onMounted(() => {
  startAutoScroll()
})

onBeforeUnmount(() => {
  resetAutoScroll()
})

function onDragStart(value: DeckFilterMode, event: DragEvent) {
  if (!props.editable || !orderableFilters.value.includes(value)) return
  dragValue.value = value
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(value))
  }
}

function onDragOver(value: DeckFilterMode) {
  if (!props.editable || !dragValue.value) return
  if (!orderableFilters.value.includes(value)) return
}

function onDrop(targetValue: DeckFilterMode) {
  if (!props.editable || !dragValue.value) return
  if (!orderableFilters.value.includes(targetValue)) return
  const current = orderableFilters.value.slice()
  const fromIdx = current.indexOf(dragValue.value)
  const toIdx = current.indexOf(targetValue)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) {
    dragValue.value = null
    return
  }
  current.splice(fromIdx, 1)
  current.splice(toIdx, 0, dragValue.value)
  dragValue.value = null
  if (current.length) {
    const customTail = filterOptions.value
      .map((opt) => opt.value)
      .filter((value) => String(value).startsWith('custom_'))
    const next = [...current, ...customTail]
    if (props.orderableValues && props.orderableValues.length) {
      emit('reorder:filters', current)
    } else {
      emit('reorder:filters', next)
    }
  }
}

function onDragEnd() {
  dragValue.value = null
}

function resetAutoScroll() {
  if (autoTimer.value) {
    clearInterval(autoTimer.value)
    autoTimer.value = null
  }
}

function startAutoScroll() {
  if (!props.autoScroll || !showAllCards.value || visibleCards.value.length <= 1) {
    return
  }
  resetAutoScroll()
  autoTimer.value = window.setInterval(() => {
    const total = visibleCards.value.length
    activeIndex.value = (activeIndex.value + 1) % total
    scrollToIndex(activeIndex.value)
  }, intervalMs.value)
}

function scrollToIndex(idx: number) {
  if (!bodyEl.value || !listEl.value) return
  const target = listEl.value.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null
  if (!target) return
  const top = target.offsetTop - listEl.value.offsetTop
  bodyEl.value.scrollTo({ top, behavior: 'smooth' })
}

const lastFetchedLabel = computed(() => {
  if (!props.lastFetchedAt) return ''
  const parsed = parseDateTime(props.lastFetchedAt)
  if (!parsed) return ''
  return formatDateTime(parsed, { weekday: 'short', month: 'short', day: 'numeric' })
})

function formatDate(iso: string) {
  return formatDateTime(iso, { weekday: 'short', month: 'short', day: 'numeric' }) || iso
}

function statusLabel(status: DeckCardSummary['status']) {
  if (status === 'done') return 'Done'
  if (status === 'archived') return 'Archived'
  return 'Active'
}
</script>

<style scoped>
.deck-panel {
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--widget-space, 1));
  height: 100%;
  min-height: 0;
  font-size: var(--widget-font, 14px);
}
.deck-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deck-panel__title {
  font-size: var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
  font-weight: 600;
}
.deck-panel__subtitle {
  font-size: calc(14px * var(--widget-scale, 1));
  color: var(--muted);
}
.deck-panel__actions {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
}
.deck-panel__count{
  font-size:calc(14px * var(--widget-scale, 1));
  background:color-mix(in oklab, var(--card), var(--soft) 30%);
  border:1px solid var(--line);
  padding:calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius:calc(12px * var(--widget-space, 1));
}
.deck-panel__refresh {
  border: 1px solid var(--brand);
  background: transparent;
  color: var(--brand);
  border-radius: 999px;
  padding: calc(4px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  font-size: calc(14px * var(--widget-scale, 1));
  cursor: pointer;
}
.deck-panel__refresh:disabled {
  opacity: 0.6;
  cursor: default;
}
.deck-panel__link {
  font-size: calc(14px * var(--widget-scale, 1));
  text-decoration: none;
  color: var(--fg);
}
.deck-panel__loading {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  color: var(--muted);
}
.deck-panel__filters {
  display: flex;
  gap: calc(8px * var(--widget-space, 1));
  flex-wrap: wrap;
}
.deck-panel--compact {
  gap: calc(10px * var(--widget-space, 1));
}
.deck-panel--compact .deck-panel__filters {
  gap: calc(6px * var(--widget-space, 1));
}
.deck-panel--compact .deck-card-list {
  gap: calc(10px * var(--widget-space, 1));
}
.deck-panel--compact .deck-card {
  padding: calc(6px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  gap: 0;
  border-radius: calc(8px * var(--widget-space, 1));
}
.deck-panel--compact .deck-card__row {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  white-space: nowrap;
  overflow-x: auto;
  padding-bottom: 2px;
}
.deck-panel--compact .deck-card__row::-webkit-scrollbar {
  height: 6px;
}
.deck-panel--compact .deck-card__row::-webkit-scrollbar-thumb {
  background: color-mix(in oklab, var(--line), transparent 30%);
  border-radius: 999px;
}
.deck-panel--compact .deck-card__status-row {
  font-size: calc(12px * var(--widget-scale, 1));
  gap: calc(6px * var(--widget-space, 1));
}
.deck-panel--compact .deck-card__status {
  font-size: calc(11px * var(--widget-scale, 1));
  letter-spacing: 0.04em;
}
.deck-panel--compact .deck-card__time {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.deck-panel--compact .deck-card__title {
  font-size: calc(13px * var(--widget-scale, 1));
  font-weight: 600;
}
.deck-panel--compact .deck-card__meta {
  font-size: calc(11px * var(--widget-scale, 1));
  gap: calc(6px * var(--widget-space, 1));
}
.deck-panel--compact .deck-card__board {
  padding: calc(1px * var(--widget-space, 1)) calc(6px * var(--widget-space, 1));
  font-size: calc(10px * var(--widget-scale, 1));
}
.deck-panel--compact .deck-card__labels {
  gap: calc(4px * var(--widget-space, 1));
  flex-wrap: nowrap;
}
.deck-panel--compact .deck-card__label {
  font-size: calc(10px * var(--widget-scale, 1));
  padding: calc(1px * var(--widget-space, 1)) calc(6px * var(--widget-space, 1));
}
.deck-panel--compact .deck-card__assignees {
  font-size: calc(11px * var(--widget-scale, 1));
  gap: calc(4px * var(--widget-space, 1));
  flex-wrap: nowrap;
}
.deck-panel__body{
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: calc(4px * var(--widget-space, 1));
}
.deck-panel__show-all {
  margin-top: calc(10px * var(--widget-space, 1));
  border: 0;
  background: transparent;
  color: var(--brand);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
}
.deck-filter-btn {
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--fg);
  border-radius: 999px;
  padding: calc(3px * var(--widget-space, 1)) calc(14px * var(--widget-space, 1));
  font-size: calc(13px * var(--widget-scale, 1));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
}
.deck-filter-label {
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
  min-width: 0;
}
.deck-filter-label-main {
  white-space: nowrap;
}
.deck-filter-label-context {
  display: inline-flex;
  align-items: center;
  gap: calc(4px * var(--widget-space, 1));
  color: var(--muted);
  font-size: calc(11px * var(--widget-scale, 1));
  white-space: nowrap;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.deck-filter-board-dot {
  width: calc(8px * var(--widget-space, 1));
  height: calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  display: inline-block;
  border: 1px solid color-mix(in oklab, var(--line), transparent 35%);
  flex: 0 0 auto;
}
.deck-filter-btn.is-draggable {
  cursor: grab;
}
.deck-filter-btn.is-draggable:active {
  cursor: grabbing;
}
.deck-filter-btn.active {
  border-color: var(--brand);
  color: var(--brand);
}
.deck-filter-count {
  font-size: calc(11px * var(--widget-scale, 1));
  opacity: 0.7;
}
.deck-filter-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.deck-panel__error {
  padding: calc(12px * var(--widget-space, 1));
  border-radius: calc(8px * var(--widget-space, 1));
  background: var(--color-error-hover);
  color: var(--color-error-text);
}
.deck-card-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--widget-space, 1));
}
.deck-card {
  border: 1px solid var(--line);
  border-radius: calc(12px * var(--widget-space, 1));
  padding: calc(14px * var(--widget-space, 1));
  background: var(--card);
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--widget-space, 1));
}
.deck-card__status-row {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  font-size: calc(14px * var(--widget-scale, 1));
  color: var(--muted);
}
.deck-card__status {
  font-weight: 600;
  text-transform: uppercase;
  font-size: calc(12px * var(--widget-scale, 1));
  letter-spacing: 0.05em;
}
.deck-card__status.done {
  color: var(--color-success);
}
.deck-card__status.archived {
  color: var(--muted);
}
.deck-card__title {
  font-size: calc(16px * var(--widget-scale, 1));
  font-weight: 600;
  color: var(--fg);
}
.deck-card__meta {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  font-size: calc(13px * var(--widget-scale, 1));
}
.deck-card__board {
  border: 2px solid var(--line);
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  text-transform: uppercase;
  font-size: calc(11px * var(--widget-scale, 1));
}
.deck-card__stack {
  color: var(--muted);
}
.deck-card__labels {
  display: flex;
  gap: calc(6px * var(--widget-space, 1));
  flex-wrap: wrap;
}
.deck-card__label {
  color: #fff;
  font-size: calc(11px * var(--widget-scale, 1));
  padding: calc(2px * var(--widget-space, 1)) calc(7px * var(--widget-space, 1));
  border-radius: 999px;
}
.deck-card__assignees {
  display: flex;
  flex-wrap: wrap;
  gap: calc(6px * var(--widget-space, 1));
  font-size: calc(12px * var(--widget-scale, 1));
}
.deck-card__assignees-label {
  color: var(--muted);
}
.deck-card__assignee {
  font-weight: 500;
}
</style>
