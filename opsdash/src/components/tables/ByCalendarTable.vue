<template>
  <!-- Table: totals grouped by category -->
  <table>
    <colgroup><col class="col-w-42"><col class="col-w-12"><col class="col-w-14"><col class="col-w-14"><col class="col-w-18"></colgroup>
    <thead>
      <tr>
        <th class="nowrap">Calendar</th>
        <th class="num">Events</th>
        <th class="num">Hours</th>
        <th class="num">Target</th>
        <th class="num">Δ / %</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="group in grouped" :key="group.id">
        <tr class="group-row">
          <td colspan="5">
            <div class="group-header">
              <div class="group-main">
                <div class="group-label">
                  <span class="dot" :style="{ background: group.color || 'var(--brand)' }"></span>
                  <span class="name">{{ group.label }}</span>
                </div>
                <div class="group-progress" v-if="groupHasTarget(group)">
                  <div class="group-progress__bar" :style="{ width: groupProgressPct(group) + '%', background: group.color || undefined }"></div>
                  <div
                    v-if="groupTodayOverlay(group)"
                    class="group-progress__today"
                    :style="{
                      left: groupTodayOverlay(group)!.left + '%',
                      width: groupTodayOverlay(group)!.pct + '%',
                      background: group.color || 'var(--brand)',
                    }"
                  ></div>
                </div>
              </div>
              <div class="group-meta" v-if="group.summary">
                <span class="summary">{{ groupSummary(group) }}</span>
                <span v-if="groupPercent(group)" class="summary-percent">{{ groupPercent(group) }}</span>
                <span v-if="group.summary.statusLabel" class="badge" :class="statusClass(group.summary.status)">{{ group.summary.statusLabel }}</span>
              </div>
              <div class="group-meta" v-else>
                <span class="summary">{{ group.rows.length }} calendar<span v-if="group.rows.length !== 1">s</span></span>
              </div>
            </div>
          </td>
        </tr>
        <tr v-for="row in group.rows" :key="rowKey(row)">
          <td>
            <div class="cell" :title="rowName(row)">
              <div class="row-name">{{ rowName(row) }}</div>
              <div class="progress" v-if="hasTarget(calendarId(row)) && targetVal(calendarId(row)) > 0">
                <div class="progress-bar" :style="{ width: progressPct(row.total_hours, targetVal(calendarId(row))) + '%', background: group.color || undefined }"></div>
                <div
                  v-if="todayOverlay(row)"
                  class="progress-today"
                  :style="{
                    left: todayOverlay(row)!.left + '%',
                    width: todayOverlay(row)!.pct + '%',
                    background: group.color || 'var(--brand)',
                  }"
                ></div>
              </div>
            </div>
          </td>
          <td class="num">{{ row.events_count }}</td>
          <td class="num hours-cell">
            <div>{{ n2(row.total_hours) }}</div>
            <div v-if="Number(row.future_hours ?? 0) > 0.0001" class="hint planned-sub">+{{ n2(row.future_hours) }} planned</div>
          </td>
          <td class="num">{{ targetText(calendarId(row)) }}</td>
          <td class="num">
            <template v-if="hasTarget(calendarId(row))">
              <span :class="deltaClass(row.total_hours, targetVal(calendarId(row)))">{{ deltaText(row.total_hours, targetVal(calendarId(row))) }}</span>
              <span class="hint" v-if="targetVal(calendarId(row)) > 0"> ({{ progressText(row.total_hours, targetVal(calendarId(row))) }})</span>
            </template>
            <template v-else>—</template>
          </td>
        </tr>
        <tr v-if="!group.rows.length" class="empty-row">
          <td colspan="5" class="empty">No calendars assigned</td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TargetsProgress } from '../../services/targets'

type TableGroup = {
  id: string
  label: string
  summary: TargetsProgress | null
  color?: string
  todayHours?: number
  rows: any[]
}

const props = defineProps<{
  rows: any[]
  n2: (v:any)=>string
  targets?: Record<string, number>
  groups?: Array<{ id: string; label: string; summary: TargetsProgress; rows: any[]; color?: string; todayHours?: number }>
  todayHours?: Record<string, number>
}>()

const grouped = computed<TableGroup[]>(() => {
  if (Array.isArray(props.groups) && props.groups.length) {
    return props.groups.map(group => ({
      id: group.id,
      label: group.label,
      summary: group.summary ?? null,
      color: group.color,
      todayHours: Number(group.todayHours ?? 0) || 0,
      rows: (group.rows || []).map(mapRow),
    }))
  }
  return [{
    id: '__all__',
    label: 'Calendars',
    summary: null,
    color: undefined,
    rows: (props.rows || []).map(mapRow),
  }]
})

function mapRow(row: any){
  const id = calendarId(row)
  return { ...row, calendarId: id }
}

function calendarId(row: any): string {
  if (!row) return ''
  if (row.calendarId) return String(row.calendarId)
  if (row.id) return String(row.id)
  if (row.calendar_id) return String(row.calendar_id)
  if (row.calendar) return String(row.calendar)
  return ''
}

function rowName(row: any): string {
  return String(row.calendar || row.displayname || row.name || row.calendarId || '')
}

function rowKey(row: any): string {
  const id = calendarId(row)
  return id || rowName(row)
}

function hasTarget(id?: string){
  const key = normalizeId(id)
  if (!key) return false
  const t = props.targets||{} as any
  const v = Number(t[key])
  return isFinite(v) && v > 0
}
function targetVal(id?: string){
  const key = normalizeId(id)
  if (!key) return 0
  const t = props.targets||{} as any
  const v = Number(t[key])
  return isFinite(v) ? v : 0
}
function targetText(id?: string){
  const v = targetVal(id)
  return v>0 ? (Math.round(v*100)/100).toFixed(2) : '—'
}
function deltaClass(hours:number, target:number){
  const d = hours - target
  return d>=0 ? 'delta pos' : 'delta neg'
}
function deltaText(hours:number, target:number){
  const d = hours - target
  const v = Math.abs(Math.round(d*100)/100).toFixed(2)
  return (d>=0?'+':'-') + v + 'h'
}
function progressText(hours:number, target:number){
  const p = Math.max(0, Math.min(100, target>0 ? (hours/target*100) : 0))
  return p.toFixed(0) + '%'
}
function progressPct(hours:number, target:number){
  return Math.max(0, Math.min(100, target>0 ? (hours/target*100) : 0))
}
function todayVal(id?: string){
  const key = normalizeId(id)
  if (!key) return 0
  const map = props.todayHours || {}
  const raw = Number(map[key] ?? 0)
  return Number.isFinite(raw) ? Math.max(0, raw) : 0
}
function todayOverlay(row: any){
  const target = targetVal(calendarId(row))
  const today = todayVal(calendarId(row))
  if (target <= 0 || today <= 0.0001) return null
  const pct = Math.max(2, Math.min(120, (today / target) * 100))
  const progress = progressPct(row.total_hours, target)
  const left = Math.max(0, progress - pct)
  return { pct, left }
}

function groupHasTarget(group: TableGroup): boolean {
  return !!group.summary && Number(group.summary.targetHours ?? 0) > 0
}

function groupProgressPct(group: TableGroup): number {
  if (!group.summary) return 0
  const actual = Number(group.summary.actualHours ?? 0)
  const target = Number(group.summary.targetHours ?? 0)
  return progressPct(actual, target)
}

function groupTodayOverlay(group: TableGroup) {
  if (!group.summary) return null
  const target = Number(group.summary.targetHours ?? 0)
  const today = Number(group.todayHours ?? 0)
  if (target <= 0 || today <= 0.0001) return null
  const pct = Math.max(2, Math.min(120, (today / target) * 100))
  const progress = groupProgressPct(group)
  const left = Math.max(0, progress - pct)
  return { pct, left }
}

function normalizeId(id: any): string {
  if (id == null) return ''
  return String(id)
}

function groupSummary(group: TableGroup): string {
  const summary = group.summary
  if (!summary) return `${group.rows.length} calendar${group.rows.length === 1 ? '' : 's'}`
  const actual = props.n2(summary.actualHours)
  const planned = Number((summary as any).plannedHours ?? 0)
  if (summary.targetHours > 0) {
    return `${actual} h / ${props.n2(summary.targetHours)} h${planned > 0 ? ` · +${props.n2(planned)} h planned` : ''}`
  }
  return `${actual} h${planned > 0 ? ` · +${props.n2(planned)} h planned` : ''}`
}

function groupPercent(group: TableGroup): string {
  const summary = group.summary
  if (!summary || summary.targetHours <= 0) return ''
  return `${Math.round(summary.percent)}%`
}

function statusClass(status: TargetsProgress['status']): string {
  switch (status) {
    case 'on_track': return 'status-on'
    case 'at_risk': return 'status-risk'
    case 'behind': return 'status-behind'
    case 'done': return 'status-done'
    default: return 'status-none'
  }
}
</script>

<style scoped>
table{ width:100%; border-collapse:collapse; font-size:13px }
thead th{ text-align:left; padding:6px 8px; font-weight:600; color:var(--muted); border-bottom:1px solid var(--line) }
thead th.num{ text-align:right }
tbody td{ padding:6px 8px; border-top:1px solid var(--line); vertical-align:top }
tbody tr:not(.group-row):not(.empty-row):hover td{
  background:color-mix(in oklab, var(--brand) 12%, var(--card) 88%);
}
.col-w-42{ width:42% }
.col-w-12{ width:12% }
.col-w-14{ width:14% }
.col-w-18{ width:18% }
.group-row td{ padding-top:12px; padding-bottom:8px; background:color-mix(in oklab, var(--muted) 12%, var(--card) 88%) }
.group-row:hover td{
  background:color-mix(in oklab, var(--brand) 12%, var(--card) 88%);
}
.group-header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; font-size:12px }
.group-main{ display:flex; flex-direction:column; gap:6px; min-width:0; flex:1 }
.group-label{ display:flex; align-items:center; gap:8px; font-weight:600; color:var(--fg) }
.group-label .dot{ width:10px; height:10px; border-radius:50%; background:var(--brand); box-shadow:0 0 0 1px color-mix(in srgb, var(--fg) 12%, transparent) }
.group-progress{ position:relative; height:7px; max-width:320px; background:color-mix(in srgb, var(--muted) 22%, transparent); border-radius:999px; overflow:visible }
.group-progress__bar{ height:100%; border-radius:999px; background:var(--brand); transition:width .2s ease }
.group-progress__today{
  position:absolute;
  top:-2px;
  height:11px;
  border-radius:999px;
  opacity:.98;
  box-shadow:
    0 0 0 1px color-mix(in srgb, white 38%, transparent),
    0 0 8px color-mix(in srgb, white 42%, transparent),
    0 0 14px color-mix(in srgb, var(--brand) 34%, transparent);
  filter:saturate(1.2) brightness(1.06);
}
.group-meta{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; color:var(--muted) }
.group-meta .summary{ font-size:12px }
.group-meta .summary-percent{ font-variant-numeric:tabular-nums; color:var(--fg); font-weight:600 }
.badge{ display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em }
.status-on{ background:color-mix(in srgb, var(--brand) 20%, white); color:var(--brand) }
.status-risk{ background:color-mix(in srgb, #f97316 20%, white); color:#f97316 }
.status-behind{ background:color-mix(in srgb, #ef4444 20%, white); color:#ef4444 }
.status-done{ background:color-mix(in srgb, var(--pos) 25%, white); color:var(--pos) }
.status-none{ background:color-mix(in srgb, var(--muted) 12%, white); color:var(--muted) }
.cell{ display:flex; flex-direction:column; gap:4px }
.row-name{ font-weight:600; color:var(--fg) }
.progress{ position:relative; height:6px; background:color-mix(in srgb, var(--muted) 22%, transparent); border-radius:999px; overflow:visible }
.progress-bar{ height:100%; border-radius:999px; background:var(--brand); transition:width .2s ease }
.progress-today{
  position:absolute;
  top:-2px;
  height:10px;
  border-radius:999px;
  opacity:.98;
  box-shadow:
    0 0 0 1px color-mix(in srgb, white 38%, transparent),
    0 0 8px color-mix(in srgb, white 42%, transparent),
    0 0 14px color-mix(in srgb, var(--brand) 34%, transparent);
  filter:saturate(1.2) brightness(1.08);
}
.num{ text-align:right; font-variant-numeric:tabular-nums; color:var(--fg) }
.hint{ color:var(--muted); font-size:11px }
.delta{ font-weight:600 }
.delta.pos{ color:var(--pos) }
.delta.neg{ color:var(--neg) }
.empty-row td.empty{ font-style:italic; color:var(--muted); text-align:center }
</style>
