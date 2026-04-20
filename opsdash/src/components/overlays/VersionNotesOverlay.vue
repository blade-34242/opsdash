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
        <p v-if="entry.summary" class="subtitle">{{ entry.summary }}</p>
      </div>
      <div class="onboarding-actions version-notes-overlay__actions">
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
            <span class="version-notes-overlay__section-label">Optional images</span>
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
              <span>{{ formatDate(item.date) }}</span>
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
        <div v-if="entry.actions?.length" class="version-notes-overlay__link-row">
          <a
            v-for="action in entry.actions"
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

defineProps<{
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
}>()

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
  width: min(1080px, 100%);
}

.version-notes-overlay__header {
  align-items: flex-start;
  gap: 16px;
}

.version-notes-overlay__title {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.version-notes-overlay__body {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 20px;
}

.version-notes-overlay__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
}

.version-notes-overlay__section {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  gap: 14px;
}

.version-notes-overlay__section-head--history {
  padding-right: 4px;
}

.version-notes-overlay__history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
}

.version-notes-overlay__history-item {
  appearance: none;
  text-align: left;
  cursor: pointer;
  padding: 14px;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.version-notes-overlay__history-item:hover {
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 56%);
  background: color-mix(in oklab, var(--brand), transparent 94%);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand), transparent 82%);
}

.version-notes-overlay__history-item.is-active {
  border-color: color-mix(in oklab, var(--brand), var(--color-border) 38%);
  background: color-mix(in oklab, var(--brand), transparent 88%);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand), transparent 76%);
}

.version-notes-overlay__history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--color-text-light);
}

.version-notes-overlay__history-top span {
  flex-shrink: 0;
  white-space: nowrap;
}

.version-notes-overlay__footer {
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.version-notes-overlay__footer-note {
  max-width: 52ch;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--color-text-light);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .version-notes-overlay__body {
    grid-template-columns: 1fr;
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
