<template>
  <div
    ref="gridEl"
    class="layout-grid"
    :class="{ 'show-guides': editable }"
    @click="onGridClick"
    @contextmenu.prevent="onGridContext"
    @dragover.prevent="onGridDragOver"
    @drop.prevent="onGridDrop"
  >
  <div
    v-for="item in ordered"
    :key="item.id"
    :ref="(el) => registerItem(item.id, el as HTMLElement | null, item.heightMode)"
    class="layout-item"
    :class="[
        widthClass(item.layout.width),
        heightClass(item.layout.height, item.heightMode),
        scaleClass(item.options),
        {
          'is-editable': editable,
          'is-selected': editable && selectedId === item.id,
          'is-dragging': editable && draggingId === item.id,
          'is-loading': !!item.loading,
        },
      ]"
      :style="widgetVars(item.options)"
      :draggable="editable"
      :aria-busy="item.loading ? 'true' : 'false'"
      @click.stop="emit('select', item.id)"
      @dragstart="onDragStart(item.id)"
      @dragend="onDragEnd"
    >
      <div v-if="item.loading" class="widget-loading" aria-live="polite">
        <span class="widget-loading__spinner" aria-hidden="true" />
        <span class="widget-loading__label">Loading…</span>
      </div>
      <component :is="item.component" v-bind="item.props" />
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  ordered: Array<{ id: string; component: any; props: any; layout: any; type: string; options: any; loading?: boolean; heightMode?: string }>
  editable?: boolean
  selectedId?: string | null
  widgetTypeList?: Array<{ type: string; label: string }>
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'add', type: string, orderHint?: number): void
  (e: 'reorder', id: string, orderHint?: number | null): void
  (e: 'select-cell', orderHint?: number): void
}>()

const gridEl = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)
const dragOrderHint = ref<number | null>(null)

const widgetTypeList = computed(() => props.widgetTypeList || [])

/* ── Dynamic row-span for auto-height widgets ──
 * CSS Grid cannot measure rendered content height. For widgets with
 * heightMode: 'auto' we observe their rendered height and compute the
 * matching `grid-row-end: span N` so the grid reserves the right space
 * and neighbors don't overlap.
 */
const GRID_ROW = 24
const GRID_GAP = 12

const observers = new Map<string, ResizeObserver>()

function computeSpan(height: number): number {
  if (!Number.isFinite(height) || height <= 0) return 1
  return Math.max(1, Math.ceil((height + GRID_GAP) / (GRID_ROW + GRID_GAP)))
}

function applyAutoSpan(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const span = computeSpan(rect.height)
  el.style.gridRowEnd = `span ${span}`
}

function registerItem(id: string, el: HTMLElement | null, heightMode?: string) {
  // Clean up any previous observer for this id (element may have been replaced)
  const existing = observers.get(id)
  if (existing) {
    existing.disconnect()
    observers.delete(id)
  }
  if (!el) return
  if (heightMode !== 'auto') {
    el.style.gridRowEnd = ''
    return
  }
  // Initial measurement (after layout) and continuous tracking via RO.
  applyAutoSpan(el)
  if (typeof ResizeObserver === 'undefined') return
  const ro = new ResizeObserver(() => applyAutoSpan(el))
  ro.observe(el)
  observers.set(id, ro)
}

onBeforeUnmount(() => {
  observers.forEach((ro) => ro.disconnect())
  observers.clear()
})

const layoutRows = computed(() => {
  const rows: Array<{ items: Array<{ id: string; layout: any; type: string; options: any; span: number; start: number }> }> = []
  let current: { items: Array<any>; col: number; remaining: number } = { items: [], col: 1, remaining: 4 }
  const pushRow = () => {
    if (current.items.length) rows.push({ items: current.items })
    current = { items: [], col: 1, remaining: 4 }
  }
  props.ordered.forEach((item) => {
    const span = widthToSpan(item.layout.width)
    if (span > current.remaining) {
      pushRow()
    }
    const start = current.col
    current.items.push({ ...item, span, start })
    current.col += span
    current.remaining -= span
  })
  pushRow()
  return rows
})

function widthClass(width: string) {
  switch (width) {
    case 'quarter': return 'w-quarter'
    case 'half': return 'w-half'
    default: return 'w-full'
  }
}

function widthToSpan(width: string) {
  if (width === 'quarter') return 1
  if (width === 'half') return 2
  return 4
}

function heightClass(height: string, heightMode?: string) {
  if (heightMode === 'auto') return 'h-auto'
  switch (height) {
    case 's': return 'h-s'
    case 'l': return 'h-l'
    case 'xl': return 'h-xl'
    default: return 'h-m'
  }
}

function scaleClass(options?: { scale?: string; textSize?: string }) {
  const size = options?.scale || options?.textSize || 'md'
  if (size === 'sm') return 'scale-sm'
  if (size === 'lg') return 'scale-lg'
  if (size === 'xl') return 'scale-xl'
  return 'scale-md'
}

function widgetVars(options?: { scale?: string; textSize?: string; dense?: boolean }) {
  const size = options?.scale || options?.textSize || 'md'
  const scale = size === 'sm' ? 0.85 : size === 'lg' ? 1.35 : size === 'xl' ? 1.6 : 1.1
  const density = options?.dense ? 0.72 : 1
  const space = scale * density
  const textScale = scale * density
  const titleSize = 18 * textScale
  return {
    '--widget-scale': String(scale),
    '--widget-space': String(space),
    '--widget-density': String(density),
    '--widget-text-scale': String(textScale),
    '--widget-title-size': `${titleSize}px`,
  } as Record<string, string>
}

function gridPositionFromEvent(evt: MouseEvent) {
  const el = gridEl.value
  if (!el) return { row: 0, col: 1 }
  const rect = el.getBoundingClientRect()
  const gap = 12
  const effectiveWidth = rect.width - gap * 3
  const colWidth = effectiveWidth / 4
  const offsetX = Math.max(0, Math.min(rect.width, evt.clientX - rect.left))
  const col = Math.min(3, Math.max(0, Math.floor(offsetX / (colWidth + gap)))) + 1

  const offsetY = Math.max(0, Math.min(rect.height + 400, evt.clientY - rect.top))
  const rowSize = Number.parseFloat(getComputedStyle(el).getPropertyValue('--grid-row')) || 24
  const row = Math.max(0, Math.floor(offsetY / (rowSize + gap)))
  return { row, col }
}

function orderForCell(row: number, col: number) {
  const rows = layoutRows.value
  const currentRow = rows[row] || rows[rows.length - 1] || { items: [] }
  const before = [...(currentRow.items || [])].filter((it) => it.start < col).sort((a, b) => a.start - b.start).pop()
  const after = [...(currentRow.items || [])].filter((it) => it.start >= col).sort((a, b) => a.start - b.start)[0]
  if (before && after) return (before.layout.order + after.layout.order) / 2
  if (before) return (before.layout.order || 0) + 5
  if (after) return (after.layout.order || 0) - 5
  const prevRow = rows[row - 1] || rows[rows.length - 1]
  if (prevRow && prevRow.items.length) {
    const last = prevRow.items[prevRow.items.length - 1]
    return (last.layout.order || 0) + 10
  }
  return ((rows[0]?.items?.[0]?.layout?.order ?? 0) || 0) - 10
}

function selectCellAt(evt: MouseEvent) {
  if (!props.editable || !widgetTypeList.value.length) return
  const { row, col } = gridPositionFromEvent(evt)
  const orderHint = orderForCell(row, col)
  emit('select-cell', orderHint)
}

function onGridClick(evt: MouseEvent) {
  if (!props.editable) return
  if ((evt.target as HTMLElement).closest('.layout-item')) return
  selectCellAt(evt)
}

function onGridContext(evt: MouseEvent) {
  if (!props.editable) return
  if ((evt.target as HTMLElement).closest('.layout-item')) return
  selectCellAt(evt)
}

function onGridDragOver(evt: DragEvent) {
  if (!props.editable || !draggingId.value) return
  const { row, col } = gridPositionFromEvent(evt as any)
  dragOrderHint.value = orderForCell(row, col)
}

function onGridDrop() {
  if (!props.editable || !draggingId.value) return
  const id = draggingId.value
  const hint = dragOrderHint.value ?? undefined
  draggingId.value = null
  dragOrderHint.value = null
  emit('reorder', id, hint)
}

function onDragStart(id: string) {
  if (!props.editable) return
  draggingId.value = id
  dragOrderHint.value = null
}

function onDragEnd() {
  draggingId.value = null
  dragOrderHint.value = null
}
</script>

<style scoped>
.layout-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
  width:100%;
  position:relative;
  --grid-row: 24px;
  grid-auto-rows: var(--grid-row);
  grid-auto-flow: row;
}
.layout-item{
  position:relative;
}
.layout-item.is-loading > :not(.widget-loading){
  opacity:0.35;
  filter:saturate(0.85);
}
.widget-loading{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
  background:color-mix(in oklab, var(--card), transparent 20%);
  border-radius:16px;
  z-index:2;
}
.widget-loading__spinner{
  width:20px;
  height:20px;
  border-radius:50%;
  border:2px solid color-mix(in oklab, var(--brand), transparent 65%);
  border-top-color:var(--brand);
  animation:widget-spin 0.8s linear infinite;
}
.widget-loading__label{
  font-size:12px;
  font-weight:600;
  color:var(--muted, #6b7280);
}
@keyframes widget-spin{
  to{ transform:rotate(360deg); }
}
.layout-grid.show-guides{
  background-image:
    linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px);
  background-size: calc((100% - 36px) / 4) 100%, 100% var(--grid-row);
  background-position: 0 0, 0 0;
}
.layout-grid.show-guides::after{
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
}
.layout-item{
  min-width:0;
  position:relative;
  display:flex;
  padding:0;
  cursor:grab;
  align-self:stretch;
  overflow:hidden;
  --widget-scale:1;
  --widget-space:1;
  --widget-density:1;
  --widget-text-scale: var(--widget-scale);
  --widget-pad: calc(12px * var(--widget-space));
  --widget-gap: calc(8px * var(--widget-space));
  --widget-gap-tight: calc(6px * var(--widget-space));
  --widget-font: calc(14px * var(--widget-text-scale, var(--widget-scale)));
}
.layout-item > *{
  flex:1 1 auto;
  min-width:0;
  min-height:0;
  height:100%;
  overflow:auto;
}
/* Auto-height widgets grow with their content — no internal scroll,
   widget height is driven by the component's natural size. */
.layout-item.h-auto{
  overflow:visible;
  align-self:start;
  height:auto;
  grid-row-end:auto;
}
.layout-item.h-auto > *{
  height:auto;
  overflow:visible;
}
.w-quarter{ grid-column: span 1; }
.w-half{ grid-column: span 2; }
.w-full{ grid-column: span 4; }
.h-s{ grid-row-end: span 4; }
.h-m{ grid-row-end: span 8; }
.h-l{ grid-row-end: span 13; }
.h-xl{ grid-row-end: span 22; }
.is-editable{
  outline:1px dashed rgba(107,114,128,0.5);
  border-radius:10px;
}
.is-selected{
  outline:2px solid var(--color-primary,#2563EB);
}
.is-dragging{
  opacity:0.6;
}
.scale-sm{ --widget-scale:0.85; }
.scale-md{ --widget-scale:1; }
.scale-lg{ --widget-scale:1.2; }
.scale-xl{ --widget-scale:1.4; }
@media (max-width: 1024px){
  .w-quarter{ grid-column: span 2; }
  .w-half{ grid-column: span 2; }
  .w-full{ grid-column: span 4; }
}
@media (max-width: 768px){
  .w-quarter,.w-half,.w-full{ grid-column: span 4; }
}
</style>
