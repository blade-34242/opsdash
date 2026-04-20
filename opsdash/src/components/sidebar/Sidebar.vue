<template>
  <NcAppNavigation>
    <slot name="actions" />
    <div class="rangebar" title="Time range">
      <button
        class="sidebar-toggle-btn sidebar-toggle-btn--corner"
        type="button"
        @click="$emit('toggle-nav')"
        :aria-label="navToggleLabel"
        :title="navToggleLabel"
      >
        {{ navToggleIcon }}
      </button>
      <div class="range-toggle">
        <NcCheckboxRadioSwitch type="radio" name="range-week" :checked="range==='week'" @update:checked="val => { if (val) $emit('update:range','week') }">Week</NcCheckboxRadioSwitch>
        <NcCheckboxRadioSwitch type="radio" name="range-month" :checked="range==='month'" @update:checked="val => { if (val) $emit('update:range','month') }">Month</NcCheckboxRadioSwitch>
      </div>
      <div class="range-nav">
        <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="$emit('update:offset', offset-1)" title="Previous">◀</NcButton>
        <span class="range-dates">{{ from }} – {{ to }}</span>
        <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="$emit('update:offset', offset+1)" title="Next">▶</NcButton>
      </div>
      <div class="range-refresh">
        <button
          class="sidebar-action-btn"
          type="button"
          :disabled="isLoading"
          @click="$emit('load')"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="sidebar-block sidebar-block--framed">
      <div class="sb-title">Guided Setup</div>
      <div class="sb-actions sb-actions--secondary">
        <NcButton
          type="primary"
          size="small"
          class="rerun-btn"
          title="Open the setup wizard again"
          @click="$emit('rerun-onboarding')"
        >
          <span class="rerun-btn__icon" aria-hidden="true">⚙</span>
          Setup wizard
        </NcButton>
      </div>
      <div class="onboarding-help">
        Revisit the setup wizard to adjust your dashboard step by step.
      </div>
      <ol class="onboarding-jumps">
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'strategy')">Strategy</button>
          <div v-if="guidedHints?.strategy" class="onboarding-hint">{{ guidedHints.strategy }}</div>
        </li>
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'calendars')">Calendars</button>
          <div v-if="guidedHints?.calendars" class="onboarding-hint">{{ guidedHints.calendars }}</div>
        </li>
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'deck')">Deck</button>
          <div v-if="guidedHints?.deck" class="onboarding-hint">{{ guidedHints.deck }}</div>
        </li>
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'goals')">Goals</button>
          <div v-if="guidedHints?.goals" class="onboarding-hint">{{ guidedHints.goals }}</div>
        </li>
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'preferences')">Preferences</button>
          <div v-if="guidedHints?.preferences" class="onboarding-hint">{{ guidedHints.preferences }}</div>
        </li>
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'dashboard')">Dashboard</button>
          <div v-if="guidedHints?.dashboard" class="onboarding-hint">{{ guidedHints.dashboard }}</div>
        </li>
        <li>
          <button type="button" class="link" @click="$emit('rerun-onboarding', 'review')">Review</button>
          <div v-if="guidedHints?.review" class="onboarding-hint">{{ guidedHints.review }}</div>
        </li>
      </ol>
    </div>

    <div class="sidebar-shortcuts sidebar-shortcuts--bottom">
      <div class="sidebar-icon-row">
        <button
          type="button"
          class="sidebar-icon-btn"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
          @click="emit('open-shortcuts', $event.currentTarget as HTMLElement)"
        >
          <svg class="sidebar-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M4.25 6.5A2.75 2.75 0 0 1 7 3.75h10a2.75 2.75 0 0 1 2.75 2.75v10.5A2.75 2.75 0 0 1 17 19.75H7A2.75 2.75 0 0 1 4.25 17V6.5zm2.75-.75a.75.75 0 0 0-.75.75V17c0 .41.34.75.75.75h10a.75.75 0 0 0 .75-.75V6.5a.75.75 0 0 0-.75-.75H7zm1.5 2.25h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-6 3h7v2h-7v-2z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="sidebar-icon-btn sidebar-icon-btn--releases"
          :class="{ active: releaseNotesOpen }"
          title="What's new"
          aria-label="What's new"
          :disabled="!releaseNotesAvailable"
          @click="emit('open-release-notes')"
        >
          <svg class="sidebar-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3.25a.75.75 0 0 1 .69.46l1.61 3.85 4.15.35a.75.75 0 0 1 .43 1.31l-3.16 2.73.95 4.06a.75.75 0 0 1-1.12.8L12 14.67l-3.55 2.14a.75.75 0 0 1-1.12-.8l.95-4.06-3.16-2.73a.75.75 0 0 1 .43-1.31l4.15-.35 1.61-3.85a.75.75 0 0 1 .69-.46zm0 2.66-1.15 2.74a.75.75 0 0 1-.62.46l-2.96.25 2.25 1.95c.22.19.31.48.24.76l-.68 2.89 2.53-1.52a.75.75 0 0 1 .77 0l2.53 1.52-.68-2.89a.75.75 0 0 1 .24-.76l2.25-1.95-2.96-.25a.75.75 0 0 1-.62-.46L12 5.91z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="sidebar-icon-btn sidebar-icon-btn--profile"
          title="Profiles and backups"
          aria-label="Profiles and backups"
          @click="emit('open-profiles')"
        >
          <svg class="sidebar-icon sidebar-icon--profile" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 4.25a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 7.5c3.18 0 5.75 1.57 5.75 3.5v1.5c0 .41-.34.75-.75.75H7a.75.75 0 0 1-.75-.75v-1.5c0-1.93 2.57-3.5 5.75-3.5zm0 1.5c-2.44 0-4.25 1.05-4.25 2v.75h8.5V16.75c0-.95-1.81-2-4.25-2z"
            />
          </svg>
        </button>
      </div>
    </div>
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'

const props = defineProps<{
  isLoading: boolean
  range: 'week'|'month'
  offset: number
  from: string
  to: string
  navToggleLabel: string
  navToggleIcon: string
  dashboardMode?: 'quick' | 'standard' | 'pro'
  guidedHints?: Partial<Record<'strategy' | 'calendars' | 'deck' | 'goals' | 'preferences' | 'dashboard' | 'review', string>>
  releaseNotesAvailable?: boolean
  releaseNotesOpen?: boolean
}>()

const emit = defineEmits([
  'load',
  'update:range',
  'update:offset',
  'toggle-nav',
  'open-profiles',
  'open-release-notes',
  'open-shortcuts',
  'rerun-onboarding',
])
</script>

<style scoped>
.sidebar-toggle-btn{
  appearance:none;
  border-radius:14px;
  border:1px solid color-mix(in oklab, var(--brand), transparent 55%);
  background:color-mix(in oklab, var(--brand), transparent 86%);
  color:var(--brand);
  width:26px;
  height:26px;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 6px 14px rgba(15,23,42,0.12);
  cursor:pointer;
  font-size:11px;
}

.sidebar-toggle-btn:hover{
  background:color-mix(in oklab, var(--brand), transparent 76%);
  border-color:color-mix(in oklab, var(--brand), transparent 40%);
}

.sidebar-toggle-btn:focus-visible{
  outline:2px solid color-mix(in oklab, var(--brand), transparent 40%);
  outline-offset:2px;
}

:global(.app-opsdash #app-navigation),
:global(.app-opsdash .app-navigation){
  position:relative;
  display:flex;
  flex-direction:column;
  height:100%;
  overflow:visible !important;
}

:global(.app-opsdash .app-content__navigation){
  overflow:visible !important;
}

:global(.app-opsdash .app-navigation__content){
  display:flex;
  flex-direction:column;
  flex:1;
  min-height:100%;
  overflow:visible !important;
  max-height:none !important;
}

.sidebar-toggle-btn--corner{
  position:absolute;
  top:-10px;
  right:-10px;
  border-color:color-mix(in oklab, var(--brand), var(--line) 70%);
  background:color-mix(in oklab, var(--card), transparent 10%);
  box-shadow:0 6px 16px rgba(15,23,42,0.12), inset 0 0 0 1px color-mix(in oklab, var(--brand), transparent 82%);
}

.sidebar-shortcuts{
  margin:8px 0 4px;
}

.sidebar-shortcuts--bottom{
  display:flex;
  flex-direction:column;
  align-items:center;
  margin-top:auto;
  padding-bottom:10px;
  gap:8px;
}

.onboarding-hint{
  margin:0;
  font-size:12px;
  line-height:1.3;
  color:color-mix(in oklab, var(--text), transparent 40%);
  white-space:normal;
  overflow:hidden;
  max-width:100%;
  overflow-wrap:anywhere;
  word-break:break-word;
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
  line-clamp:2;
  text-overflow:ellipsis;
}

.sidebar-icon-row{
  display:flex;
  gap:10px;
  align-items:center;
  justify-content:center;
}

.sidebar-icon-btn{
  appearance:none;
  border-radius:999px;
  border:1px solid color-mix(in oklab, var(--brand), var(--line) 70%);
  background:color-mix(in oklab, var(--brand), var(--card) 90%);
  color:var(--brand);
  width:40px;
  height:40px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 6px 14px rgba(15,23,42,0.12);
  cursor:pointer;
}

.sidebar-icon-btn:hover{
  background:color-mix(in oklab, var(--brand), var(--card) 80%);
  border-color:color-mix(in oklab, var(--brand), var(--line) 50%);
}

.sidebar-icon-btn.active{
  background:color-mix(in oklab, var(--brand), var(--card) 70%);
  border-color:color-mix(in oklab, var(--brand), var(--line) 40%);
  box-shadow:0 8px 16px rgba(15,23,42,0.16);
}

.sidebar-icon-btn:disabled{
  opacity:0.45;
  cursor:default;
  box-shadow:none;
}

.sidebar-icon-btn:focus-visible{
  outline:2px solid color-mix(in oklab, var(--brand), transparent 40%);
  outline-offset:2px;
}

.sidebar-icon{
  width:20px;
  height:20px;
}

.sidebar-icon-btn--profile{
  width:46px;
  height:46px;
}

.sidebar-icon--profile{
  width:24px;
  height:24px;
}

.sidebar-block{
  margin:8px 0 12px;
}

.sidebar-block--framed{
  border:1px solid color-mix(in oklab, var(--brand), var(--line) 70%);
  border-radius:14px;
  background:color-mix(in oklab, var(--card), transparent 10%);
  padding:12px 14px;
  box-shadow:0 6px 16px rgba(15, 23, 42, 0.12), inset 0 0 0 1px color-mix(in oklab, var(--brand), transparent 82%);
}

.rerun-btn__icon{
  display:inline-flex;
  margin-right:6px;
  font-size:12px;
  line-height:1;
}

.onboarding-jumps{
  display:grid;
  gap:10px;
  margin:8px 0 4px;
  padding-left:0;
  min-width:0;
  font-size:12px;
  color: var(--muted, #6b7280);
  list-style: none;
  counter-reset: guided-step;
}

.onboarding-jumps li{
  counter-increment: guided-step;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:4px;
  min-width:0;
}

.onboarding-jumps .link{
  appearance:none;
  display:inline-block;
  width:100%;
  min-width:0;
  margin:0;
  min-height:0;
  background: transparent;
  border: 0;
  padding: 0;
  font-size:12px;
  line-height:1.2;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  color: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.onboarding-jumps .link::before{
  content: counter(guided-step) '. ';
  font-variant-numeric: tabular-nums;
  font-weight:600;
  color:color-mix(in oklab, var(--text), transparent 20%);
}

.onboarding-jumps .link:hover{
  color: var(--color-primary-text);
  text-decoration: underline;
}

.onboarding-help{
  font-size:12px;
  color: var(--muted, #6b7280);
  margin-top:2px;
  margin-bottom:4px;
}

</style>
