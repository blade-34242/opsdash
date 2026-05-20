<template>
  <AppOverlayShell
    :visible="visible"
    :theme="theme"
    panel-class="version-notes-overlay"
    aria-labelledby="version-notes-title"
    @close="emit('close')"
  >
    <header class="onboarding-header version-notes-overlay__header">
      <div class="onboarding-title version-notes-overlay__title">
        <div class="version-notes-overlay__eyebrow">What&apos;s new</div>
        <h2 id="version-notes-title">Opsdash {{ entry.version }}</h2>
        <p class="version-notes-overlay__teaser">{{ entry.teaser }}</p>
      </div>
      <div class="onboarding-actions version-notes-overlay__actions">
        <span v-if="entry.version === selectedVersion" class="version-notes-overlay__pill version-notes-overlay__pill--accent">Current</span>
        <span class="version-notes-overlay__pill">{{ formatDate(entry.date) }}</span>
        <button
          type="button"
          class="close-btn"
          :disabled="isSaving"
          aria-label="Close release notes"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
    </header>

    <main class="onboarding-body version-notes-overlay__body">
      <section class="version-notes-overlay__content">
        <section class="version-notes-overlay__section version-notes-overlay__section--intro">
          <div class="version-notes-overlay__section-head">
            <h4>Release focus</h4>
            <span class="version-notes-overlay__section-label">Why this matters</span>
          </div>
          <p class="version-notes-overlay__intro-copy">{{ entry.summary || entry.teaser }}</p>
          <div v-if="ctaActions.length" class="version-notes-overlay__apply-block">
            <div class="version-notes-overlay__apply-row">
              <div class="version-notes-overlay__apply-text">
                <strong>{{ ctaTitle }}</strong>
                {{ ctaDescription }}
              </div>
              <div class="version-notes-overlay__apply-actions">
                <button
                  v-for="action in ctaActions"
                  :key="`${entry.version}-${action.label}`"
                  type="button"
                  class="version-notes-overlay__reload-btn"
                  @click="emit('action', action.type)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="version-notes-overlay__section">
          <div class="version-notes-overlay__section-head">
            <h4>Highlights</h4>
            <span class="version-notes-overlay__section-label">Short version</span>
          </div>
          <ul class="version-notes-overlay__highlights">
            <li v-for="item in entry.highlights" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section v-if="entry.images?.length" class="version-notes-overlay__section">
          <div class="version-notes-overlay__section-head">
            <h4>Preview</h4>
            <span class="version-notes-overlay__section-label">Screenshots</span>
          </div>
          <div class="version-notes-overlay__images">
            <a
              v-for="image in entry.images"
              :key="`${entry.version}-${image.src}`"
              class="version-notes-overlay__image-card"
              :href="image.src"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img :src="image.src" :alt="image.alt">
              <div class="version-notes-overlay__image-meta">
                <strong>{{ image.title }}</strong>
                <span v-if="image.caption">{{ image.caption }}</span>
              </div>
            </a>
          </div>
        </section>
      </section>

      <aside class="version-notes-overlay__history">
        <div class="version-notes-overlay__section-head version-notes-overlay__section-head--history">
          <h4>Version history</h4>
          <span class="version-notes-overlay__section-label">Available releases</span>
        </div>
        <div class="version-notes-overlay__history-list">
          <button
            v-for="item in history"
            :key="item.version"
            type="button"
            class="version-notes-overlay__history-item"
            :class="{ 'is-active': item.version === selectedVersion }"
            @click="emit('select-version', item.version)"
          >
            <div class="version-notes-overlay__history-top">
              <strong>v{{ item.version }}</strong>
              <span>{{ item.version === entry.version ? 'Open now' : formatDate(item.date) }}</span>
            </div>
            <div class="version-notes-overlay__history-title">{{ item.title }}</div>
            <p>{{ item.teaser }}</p>
          </button>
        </div>
      </aside>
    </main>

    <footer class="onboarding-footer version-notes-overlay__footer">
      <div class="version-notes-overlay__footer-note">
        The latest release opens first. Older updates stay available here whenever you want to look back.
        <div v-if="linkActions.length" class="version-notes-overlay__link-row">
          <a
            v-for="action in linkActions"
            :key="`${entry.version}-${action.label}`"
            class="version-notes-overlay__link"
            :href="action.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ action.label }}
          </a>
        </div>
      </div>
      <NcButton type="primary" :disabled="isSaving" @click="emit('close')">
        {{ isSaving ? 'Saving…' : 'Back to dashboard' }}
      </NcButton>
    </footer>
  </AppOverlayShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NcButton } from '@nextcloud/vue'

import AppOverlayShell from './AppOverlayShell.vue'
import type { ReleaseNotesEntry } from '../../services/releaseNotes'

const props = defineProps<{
  visible: boolean
  theme: 'light' | 'dark'
  entry: ReleaseNotesEntry
  history: ReleaseNotesEntry[]
  selectedVersion: string
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-version', version: string): void
  (e: 'action', type: string): void
}>()

const linkActions = computed(() => (props.entry.actions ?? []).filter(a => a.type === 'link'))
const ctaActions = computed(() => (props.entry.actions ?? []).filter(a => a.type !== 'link'))
const ctaTitle = computed(() => {
  if (ctaActions.value.some(action => action.type === 'open_preferences')) {
    return 'Want to turn recap reporting on?'
  }
  return 'Want the new layout right now?'
})
const ctaDescription = computed(() => {
  if (ctaActions.value.some(action => action.type === 'open_preferences')) {
    return 'Reporting stays off by default. Jump straight into Preferences to enable weekly or monthly recaps and set the send times that should drive scheduled delivery.'
  }
  return 'This release ships with an updated default dashboard. Clicking the button below resets your current tab to the default layout for your selected dashboard profile — no manual rebuilding needed.'
})

const formatter = computed(() => new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}))

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatter.value.format(date)
}
</script>

<style scoped>
.version-notes-overlay {
  width: min(1120px, calc(100vw - 32px));
  height: min(860px, calc(100vh - var(--header-height, 50px) - 56px));
  max-height: calc(100vh - var(--header-height, 50px) - 56px);
}

.version-notes-overlay__header {
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in oklab, var(--color-border), transparent 18%);
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--brand), transparent 88%), transparent 42%);
}

.version-notes-overlay__title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-notes-overlay__title h2 {
  margin: 0;
  font-size: clamp(34px, 4.2vw, 42px);
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 800;
}

.version-notes-overlay__teaser {
  margin: 0;
  max-width: 62ch;
  font-size: 18px;
  line-height: 1.45;
  color: color-mix(in oklab, var(--color-text), white 12%);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.version-notes-overlay__eyebrow,
.version-notes-overlay__section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-light);
}

.version-notes-overlay__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.version-notes-overlay__pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--brand), var(--color-border) 70%);
  background: color-mix(in oklab, var(--brand), transparent 90%);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.version-notes-overlay__pill--accent {
  border-color: color-mix(in oklab, #0ea5e9, var(--color-border) 35%);
  background: color-mix(in oklab, #0ea5e9, transparent 86%);
  color: color-mix(in oklab, #0b4f6c, var(--color-text) 18%);
}

.version-notes-overlay__body {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 320px);
  gap: 18px;
  align-items: start;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.version-notes-overlay__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-notes-overlay__section,
.version-notes-overlay__history-item {
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: color-mix(in oklab, var(--color-main-background), white 4%);
}

.version-notes-overlay__section h4,
.version-notes-overlay__history-title {
  margin: 0;
}

.version-notes-overlay__history-item p {
  margin: 0;
  color: var(--color-text-light);
  line-height: 1.55;
}

.version-notes-overlay__link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.version-notes-overlay__link {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--brand), var(--color-border) 68%);
  background: color-mix(in oklab, var(--brand), transparent 90%);
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.version-notes-overlay__link--action {
  appearance: none;
  font-family: inherit;
  font-size: inherit;
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 40%);
  background: color-mix(in oklab, var(--brand), transparent 82%);
  color: var(--brand);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.version-notes-overlay__link--action:hover {
  background: color-mix(in oklab, var(--brand), transparent 72%);
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 22%);
}

.version-notes-overlay__section {
  padding: 18px 18px 17px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.version-notes-overlay__section--intro {
  gap: 14px;
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 68%);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--brand), transparent 90%), transparent 48%),
    linear-gradient(135deg, color-mix(in oklab, var(--brand), transparent 96%), transparent 58%),
    color-mix(in oklab, var(--color-main-background), white 3%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.version-notes-overlay__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-notes-overlay__highlights {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  line-height: 1.6;
}

.version-notes-overlay__intro-copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text-light);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.version-notes-overlay__images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.version-notes-overlay__image-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid color-mix(in oklab, var(--brand), var(--color-border) 72%);
  background: color-mix(in oklab, var(--color-main-background), white 2%);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.version-notes-overlay__image-card img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.version-notes-overlay__image-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px 14px;
}

.version-notes-overlay__image-meta strong {
  font-size: 14px;
}

.version-notes-overlay__image-meta span {
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-light);
}

.version-notes-overlay__history {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  position: sticky;
  top: 0;
  align-self: start;
}

.version-notes-overlay__section-head--history {
  padding-right: 4px;
}

.version-notes-overlay__history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  padding-right: 4px;
  max-height: 100%;
}

.version-notes-overlay__history-item {
  appearance: none;
  text-align: left;
  cursor: pointer;
  padding: 12px 13px;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  border-color: color-mix(in oklab, var(--color-border), transparent 10%);
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--color-main-background), white 3%), color-mix(in oklab, var(--color-main-background), black 1%));
}

.version-notes-overlay__history-item:hover {
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 56%);
  background: color-mix(in oklab, var(--brand), transparent 95%);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand), transparent 82%);
  transform: translateY(-1px);
}

.version-notes-overlay__history-item.is-active {
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 38%);
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--brand), transparent 92%), color-mix(in oklab, var(--brand), transparent 96%));
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--brand), transparent 76%),
    0 10px 24px rgba(15, 23, 42, 0.14);
}

.version-notes-overlay__history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
  font-size: 11px;
  color: var(--color-text-light);
}

.version-notes-overlay__history-top span {
  flex-shrink: 0;
  white-space: nowrap;
}

.version-notes-overlay__history-title {
  font-size: 14px;
  line-height: 1.35;
  color: color-mix(in oklab, var(--color-text), white 6%);
}

.version-notes-overlay__history-item p {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.version-notes-overlay__footer {
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in oklab, var(--color-border), transparent 18%);
}

.version-notes-overlay__footer-note {
  max-width: 52ch;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--color-text-light);
  line-height: 1.5;
}


.version-notes-overlay__apply-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--brand), transparent 94%);
  border: 1px solid color-mix(in oklab, var(--brand), transparent 78%);
}

.version-notes-overlay__apply-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}

.version-notes-overlay__apply-text {
  flex: 1 1 auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-light);
}

.version-notes-overlay__apply-text strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.version-notes-overlay__apply-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-notes-overlay__reload-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1.5px solid color-mix(in oklab, var(--brand), transparent 48%);
  background: color-mix(in oklab, var(--brand), transparent 88%);
  color: var(--brand);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  white-space: nowrap;
}

.version-notes-overlay__reload-btn:hover {
  background: color-mix(in oklab, var(--brand), transparent 78%);
  border-color: color-mix(in oklab, var(--brand), transparent 24%);
  transform: translateY(-1px);
}

.version-notes-overlay__reload-btn:active {
  transform: translateY(0);
}

@media (max-width: 760px) {
  .version-notes-overlay__body {
    grid-template-columns: 1fr;
  }

  .version-notes-overlay__apply-row {
    flex-direction: column;
    align-items: stretch;
  }

  .version-notes-overlay__apply-actions {
    justify-content: flex-start;
  }

  .version-notes-overlay__history {
    position: static;
  }
}

@media (max-height: 760px) {
  .version-notes-overlay {
    height: min(820px, calc(100vh - var(--header-height, 50px) - 36px));
    max-height: calc(100vh - var(--header-height, 50px) - 36px);
  }

  .version-notes-overlay__header {
    gap: 12px;
    padding-bottom: 8px;
  }

  .version-notes-overlay__title h2 {
    font-size: clamp(28px, 4vw, 34px);
  }

  .version-notes-overlay__teaser {
    font-size: 16px;
  }

  .version-notes-overlay__body {
    gap: 14px;
  }

  .version-notes-overlay__section {
    padding: 15px 15px 14px;
  }

  .version-notes-overlay__footer {
    padding-top: 10px;
  }

  .version-notes-overlay__footer-note {
    display: none;
  }
}

@media (max-width: 640px) {
  .version-notes-overlay__header,
  .version-notes-overlay__section-head,
  .version-notes-overlay__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .version-notes-overlay__actions {
    justify-content: space-between;
  }
}
</style>
