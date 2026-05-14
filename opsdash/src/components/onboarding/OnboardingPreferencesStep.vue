<template>
  <div class="preferences-step">
    <h3>Preferences</h3>
    <p class="hint">Edit the defaults you almost always need. Add-ons stay separate.</p>

    <div class="preferences-grid preferences-grid--core-optional">
      <section class="pref-card pref-card--core pref-card--stack">
        <h4>Core defaults</h4>

        <div class="field-row">
          <div class="field-copy">
            <strong>Theme</strong>
            <p>Follow Nextcloud / light / dark</p>
          </div>
          <div class="field-actions">
            <span class="value-chip">{{ themeSummaryLabel }}</span>
            <button type="button" class="action-chip" @click="toggleCoreEditor('theme')">Choose</button>
          </div>
        </div>
        <div v-if="openCoreEditor === 'theme'" class="editor-card">
          <strong>Open theme selection</strong>
          <div class="choice-strip">
            <button
              type="button"
              class="choice-pill"
              :class="{ active: themePreference === 'auto' }"
              @click="setThemePreference('auto')"
            >
              Follow Nextcloud
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: themePreference === 'light' }"
              @click="setThemePreference('light')"
            >
              Light
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: themePreference === 'dark' }"
              @click="setThemePreference('dark')"
            >
              Dark
            </button>
          </div>
          <p class="quiet">Current preview follows {{ previewTheme === 'dark' ? 'dark' : 'light' }} mode.</p>
        </div>

        <div class="field-row">
          <div class="field-copy">
            <strong>All-day hours</strong>
            <p>Contribution per all-day event and day.</p>
          </div>
          <div class="field-actions">
            <span class="value-chip">{{ allDayHoursLabel }}</span>
            <button type="button" class="action-chip" @click="toggleCoreEditor('allDay')">Edit</button>
          </div>
        </div>
        <div v-if="openCoreEditor === 'allDay'" class="editor-card">
          <strong>Open all-day hours editor</strong>
          <div class="choice-strip">
            <button
              type="button"
              class="choice-pill"
              :class="{ active: allDayHoursInput === 6 }"
              @click="setAllDayHours(6)"
            >
              6 h
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: allDayHoursInput === 8 }"
              @click="setAllDayHours(8)"
            >
              8 h
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: allDayHoursInput === 10 }"
              @click="setAllDayHours(10)"
            >
              10 h
            </button>
            <label class="inline-input">
              <span>Custom</span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.25"
                :value="allDayHoursInput"
                @input="onAllDayHoursChange($event.target as HTMLInputElement)"
              />
              <span class="slot">h</span>
            </label>
          </div>
          <p class="quiet">Preset values stay visible, but you can still type a custom hours value.</p>
        </div>

        <div class="field-row">
          <div class="field-copy">
            <strong>Trend lookback</strong>
            <p>Global default for trends.</p>
          </div>
          <div class="field-actions">
            <span class="value-chip">{{ lookbackLabel }}</span>
            <button type="button" class="action-chip" @click="toggleCoreEditor('lookback')">Choose</button>
          </div>
        </div>
        <div v-if="openCoreEditor === 'lookback'" class="editor-card">
          <strong>Open trend lookback selection</strong>
          <div class="choice-strip compact">
            <button
              v-for="option in lookbackOptions"
              :key="option"
              type="button"
              class="choice-pill"
              :class="{ active: trendLookbackInput === option }"
              @click="setTrendLookback(option)"
            >
              {{ option }} week{{ option === 1 ? '' : 's' }}
            </button>
          </div>
          <p class="quiet">Allowed range: 1 to 6 weeks. This stays compact as a one-row selection.</p>
        </div>
      </section>

      <section class="pref-card pref-card--stack">
        <h4>Add-on modules</h4>

        <div class="module-card">
          <strong>Recap reporting</strong>
          <p>Current optional module for schedule, reminders, and risk alerts.</p>
          <div class="row">
            <span class="soft-pill">{{ reportingDraft.enabled ? 'Recap on' : 'Recap off' }}</span>
            <button type="button" class="action-chip" @click="reportingOpen = !reportingOpen">
              {{ reportingOpen ? 'Close module' : 'Open module' }}
            </button>
          </div>
        </div>

        <div v-if="reportingOpen" class="editor-card">
          <strong>Open recap reporting module</strong>
          <div class="field-row">
            <div class="field-copy">
              <strong>Enabled</strong>
              <p>Turn recap reporting on or off.</p>
            </div>
            <div class="field-actions">
              <button
                type="button"
                class="toggle-chip"
                :class="{ on: reportingDraft.enabled }"
                @click="setReportingEnabled(!reportingDraft.enabled)"
              >
                {{ reportingDraft.enabled ? 'On' : 'Off' }}
              </button>
            </div>
          </div>
          <div v-if="reportingDraft.enabled" class="editor-card">
            <strong>Weekly recap</strong>
            <div class="field-row">
              <div class="field-copy">
                <strong>Weekly mode</strong>
                <p>Enable or disable weekly recap delivery.</p>
              </div>
              <div class="field-actions">
                <button
                  type="button"
                  class="toggle-chip"
                  :class="{ on: reportingDraft.modes.week.enabled }"
                  @click="setReportingModeEnabled('week', !reportingDraft.modes.week.enabled)"
                >
                  {{ reportingDraft.modes.week.enabled ? 'On' : 'Off' }}
                </button>
              </div>
            </div>
            <div v-if="reportingDraft.modes.week.enabled" class="field-row">
              <div class="field-copy">
                <strong>Weekly cadence</strong>
                <p>Choose between daily, half-week, or end-of-week recaps.</p>
              </div>
              <div class="field-actions field-actions--wrap">
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.week.cadence === 'daily' }"
                  @click="setReportingModeCadence('week', 'daily')"
                >
                  Daily
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.week.cadence === 'mid' }"
                  @click="setReportingModeCadence('week', 'mid')"
                >
                  Half-week
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.week.cadence === 'end' }"
                  @click="setReportingModeCadence('week', 'end')"
                >
                  End of week
                </button>
              </div>
            </div>
            <div v-if="reportingDraft.modes.week.enabled" class="field-row">
              <div class="field-copy">
                <strong>Weekly reminder lead</strong>
                <p>How far ahead the weekly recap reminder should arrive.</p>
              </div>
              <div class="field-actions field-actions--wrap">
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.week.reminderLead === 'none' }"
                  @click="updateReportingMode('week', { reminderLead: 'none' })"
                >
                  None
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.week.reminderLead === '1d' }"
                  @click="updateReportingMode('week', { reminderLead: '1d' })"
                >
                  1 day
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.week.reminderLead === '2d' }"
                  @click="updateReportingMode('week', { reminderLead: '2d' })"
                >
                  2 days
                </button>
              </div>
            </div>
          </div>
          <div v-if="reportingDraft.enabled" class="editor-card">
            <strong>Monthly recap</strong>
            <div class="field-row">
              <div class="field-copy">
                <strong>Monthly mode</strong>
                <p>Enable or disable monthly recap delivery.</p>
              </div>
              <div class="field-actions">
                <button
                  type="button"
                  class="toggle-chip"
                  :class="{ on: reportingDraft.modes.month.enabled }"
                  @click="setReportingModeEnabled('month', !reportingDraft.modes.month.enabled)"
                >
                  {{ reportingDraft.modes.month.enabled ? 'On' : 'Off' }}
                </button>
              </div>
            </div>
            <div v-if="reportingDraft.modes.month.enabled" class="field-row">
              <div class="field-copy">
                <strong>Monthly cadence</strong>
                <p>Choose between daily, half-month, or end-of-month recaps.</p>
              </div>
              <div class="field-actions field-actions--wrap">
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.month.cadence === 'daily' }"
                  @click="setReportingModeCadence('month', 'daily')"
                >
                  Daily
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.month.cadence === 'mid' }"
                  @click="setReportingModeCadence('month', 'mid')"
                >
                  Half-month
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.month.cadence === 'end' }"
                  @click="setReportingModeCadence('month', 'end')"
                >
                  End of month
                </button>
              </div>
            </div>
            <div v-if="reportingDraft.modes.month.enabled" class="field-row">
              <div class="field-copy">
                <strong>Monthly reminder lead</strong>
                <p>How far ahead the monthly recap reminder should arrive.</p>
              </div>
              <div class="field-actions field-actions--wrap">
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.month.reminderLead === 'none' }"
                  @click="updateReportingMode('month', { reminderLead: 'none' })"
                >
                  None
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.month.reminderLead === '1d' }"
                  @click="updateReportingMode('month', { reminderLead: '1d' })"
                >
                  1 day
                </button>
                <button
                  type="button"
                  class="choice-pill"
                  :class="{ active: reportingDraft.modes.month.reminderLead === '2d' }"
                  @click="updateReportingMode('month', { reminderLead: '2d' })"
                >
                  2 days
                </button>
              </div>
            </div>
          </div>
          <div class="field-row">
            <div class="field-copy">
              <strong>Risk alert</strong>
              <p>Highlight if targets drift.</p>
            </div>
            <div class="field-actions">
              <button
                type="button"
                class="toggle-chip"
                :class="{ on: reportingDraft.alertOnRisk }"
                @click="updateReporting({ alertOnRisk: !reportingDraft.alertOnRisk })"
              >
                {{ reportingDraft.alertOnRisk ? 'On' : 'Off' }}
              </button>
            </div>
          </div>
          <div v-if="reportingDraft.enabled" class="field-row">
            <div class="field-copy">
              <strong>Risk threshold</strong>
              <p>Send the alert once progress drops below this share of target.</p>
            </div>
            <div class="field-actions field-actions--wrap">
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.riskThreshold === 0.7 }"
                @click="updateReporting({ riskThreshold: 0.7 })"
              >
                70%
              </button>
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.riskThreshold === 0.85 }"
                @click="updateReporting({ riskThreshold: 0.85 })"
              >
                85%
              </button>
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.riskThreshold === 0.95 }"
                @click="updateReporting({ riskThreshold: 0.95 })"
              >
                95%
              </button>
            </div>
          </div>
          <div v-if="reportingDraft.enabled" class="field-row">
            <div class="field-copy">
              <strong>Delivery</strong>
              <p>Choose where recap signals should appear once delivery is implemented.</p>
            </div>
            <div class="field-actions field-actions--wrap">
              <button
                type="button"
                class="toggle-chip"
                :class="{ on: reportingDraft.notifyEmail }"
                @click="updateReporting({ notifyEmail: !reportingDraft.notifyEmail })"
              >
                Email {{ reportingDraft.notifyEmail ? 'On' : 'Off' }}
              </button>
              <button
                type="button"
                class="toggle-chip"
                :class="{ on: reportingDraft.notifyNotification }"
                @click="updateReporting({ notifyNotification: !reportingDraft.notifyNotification })"
              >
                In-app {{ reportingDraft.notifyNotification ? 'On' : 'Off' }}
              </button>
            </div>
          </div>
          <div v-if="reportingDraft.enabled && sendTestReport" class="field-row">
            <div class="field-copy">
              <strong>Test send</strong>
              <p>Send a manual recap email using the current onboarding draft and your Nextcloud mail address.</p>
            </div>
            <div class="field-actions">
              <button
                type="button"
                class="action-chip"
                :disabled="testSendPending"
                @click="handleTestSend"
              >
                {{ testSendPending ? 'Sending…' : 'Send test recap' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import type { ReportingConfig, ReportingCadence, ReportingMode } from '../../services/reporting'

const props = defineProps<{
  themePreference: 'auto' | 'light' | 'dark'
  systemThemeLabel: string
  previewTheme: 'light' | 'dark'
  setThemePreference: (value: 'auto' | 'light' | 'dark') => void
  totalHoursInput: number | null
  categoryTotalHours: number
  categoriesEnabled: boolean
  onTotalHoursChange: (el: HTMLInputElement) => void
  allDayHoursInput: number
  onAllDayHoursChange: (el: HTMLInputElement) => void
  trendLookbackInput: number
  onTrendLookbackChange: (el: HTMLInputElement) => void
  reportingDraft: ReportingConfig
  setReportingEnabled: (enabled: boolean) => void
  setReportingModeEnabled: (mode: ReportingMode, enabled: boolean) => void
  setReportingModeCadence: (mode: ReportingMode, cadence: ReportingCadence) => void
  updateReporting: (patch: Partial<ReportingConfig>) => void
  updateReportingMode: (mode: ReportingMode, patch: Partial<ReportingConfig['modes'][ReportingMode]>) => void
  sendTestReport?: () => Promise<void>
}>()

const openCoreEditor = ref<'theme' | 'allDay' | 'lookback'>('theme')
const reportingOpen = ref(false)
const testSendPending = ref(false)
const lookbackOptions = [1, 2, 3, 4, 5, 6]

const themeSummaryLabel = computed(() => {
  if (props.themePreference === 'auto') return 'Auto'
  if (props.themePreference === 'light') return 'Light'
  return 'Dark'
})

const allDayHoursLabel = computed(() => `${Number(props.allDayHoursInput || 0).toFixed(props.allDayHoursInput % 1 === 0 ? 0 : 2)} h`)
const lookbackLabel = computed(() => `${props.trendLookbackInput}`)

function toggleCoreEditor(target: 'theme' | 'allDay' | 'lookback') {
  openCoreEditor.value = openCoreEditor.value === target ? target : target
}

function setAllDayHours(value: number) {
  props.onAllDayHoursChange({ value: String(value) } as HTMLInputElement)
}

function setTrendLookback(value: number) {
  props.onTrendLookbackChange({ value: String(value) } as HTMLInputElement)
}

async function handleTestSend() {
  if (!props.sendTestReport || testSendPending.value) return
  testSendPending.value = true
  try {
    await props.sendTestReport()
  } finally {
    testSendPending.value = false
  }
}

const {
  themePreference,
  previewTheme,
  allDayHoursInput,
  trendLookbackInput,
  reportingDraft,
} = toRefs(props)

const {
  setThemePreference,
  onAllDayHoursChange,
  setReportingEnabled,
  setReportingModeEnabled,
  setReportingModeCadence,
  updateReporting,
  updateReportingMode,
  sendTestReport,
} = props
</script>
