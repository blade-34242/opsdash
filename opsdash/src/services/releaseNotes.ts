export interface ReleaseNotesImage {
  src: string
  alt: string
  title: string
  caption?: string
}

export interface ReleaseNotesAction {
  label: string
  type: 'link' | 'reload' | 'open_preferences'
  href?: string
}

export interface ReleaseNotesEntry {
  version: string
  date: string
  title: string
  teaser: string
  summary: string
  highlights: string[]
  images?: ReleaseNotesImage[]
  actions?: ReleaseNotesAction[]
  autoShow?: boolean
  showInHistory?: boolean
}

const RELEASE_NOTES: ReleaseNotesEntry[] = [
  {
    version: '0.8.3',
    date: '2026-07-20',
    title: 'Time Summary now reads like a daily control panel',
    teaser: 'Opsdash 0.8.3 turns Time Summary (Overview) into a current-week daily KPI card, adds a focused Deck action queue, and fixes missed monthly final recaps after month-end.',
    summary: 'Version 0.8.3 focuses the Time Summary overview on what you need to read today and makes Deck cards useful as an operational queue. Time Summary starts with today’s hours and events, adapts its tabs to your goal type, fills Daily with six KPI cards, and keeps historical lookback separate. Deck cards now opens on dated active work, separates undated items into Backlog, limits the initial list, and relies on normal user-controlled scrolling. Monthly final reports also get a safer catch-up path: if the background job misses the first send slot after month-end, Opsdash still sends the completed previous month instead of dropping the recap.',
    highlights: [
      'Time Summary (Overview) now centers the current day instead of mixing daily signals with old period-summary text rows.',
      "The overview heading is now Today's time summary, so the weekly context supports the card instead of repeating in its title.",
      'The Daily tab now uses a six-card KPI grid for average, median, avg/event, latest end, active days, and longest session.',
      'Single Goal dashboards stay daily-only, so users are not offered calendar or category tabs that cannot add context.',
      'Calendar Goals dashboards can switch between Daily and Calendars to inspect today’s color-filled calendar lanes without leaving the widget.',
      'Calendar + Category Goals dashboards can switch between Daily, Calendars, and Categories for color-filled planning lanes and daily KPIs.',
      'The compact week chart shows the current week’s rhythm directly inside the card without reintroducing lookback noise.',
      'Widget configuration now exposes the controls that matter for this card: default view, daily KPIs, week mini chart, empty lanes, and max lanes.',
      'The old lookback companion is no longer created for new overview layouts, while existing lookback widgets remain supported for saved dashboards.',
      'Deck cards now starts with a Focus queue for dated active work, including overdue cards, instead of opening an unbounded list of every open item.',
      'Undated work is available through a dedicated Backlog view; the queue starts with eight cards and expands only when you ask for the full list.',
      'Deck card configuration now centers boards, stacks, starting view, list size, and compact rows rather than the previous broad filter matrix.',
      'Time Off Trend exclusions now reliably update the current and historical comparison periods; choose calendars directly, or categories that have calendars assigned to them.',
      'Rapid clicks on Refresh now reuse the active dashboard request instead of showing a rate-limit error.',
      'Scheduled monthly final reports now catch up after missed first-day runs and keep reporting the completed previous month.',
      'Calendar stats adds a compact, configurable scan of tracked time, planned time, events, and average event duration for the selected calendars.',
      'Deck cards can create a new Deck card directly from the dashboard after you choose its board and stack.',
      'The active saved-profile badge moved from Targets to the tab bar; click it to open Profiles, even when the sidebar is collapsed.',
      'Deck Cards now retains the Compact list setting after dashboard saves and reloads.',
      'The unused Notes widgets and API are gone; legacy data can be cleaned up safely with the supplied occ command.',
    ],
    images: [
      {
        src: resolveReleaseImagePath('release-notes/release-083-time-summary-overview.png'),
        alt: 'Opsdash Time Summary overview widget with daily KPI cards, colored lanes, and a weekly mini chart',
        title: 'Daily KPI overview for the current week',
        caption: 'Daily is a compact KPI grid; Calendars and Categories use color-filled lanes; every tab keeps the current week rhythm underneath.',
      },
    ],
    actions: [
      {
        label: '↻ Reload dashboard',
        type: 'reload',
      },
    ],
    autoShow: true,
    showInHistory: true,
  },
  {
    version: '0.8.2',
    date: '2026-07-09',
    title: 'Nextcloud 34 is ready for Opsdash',
    teaser: 'Opsdash 0.8.2 expands the supported Nextcloud window to 34 and hardens the local validation path with seeded Calendar, Deck, and browser smoke coverage.',
    summary: 'Version 0.8.2 is a compatibility and release-readiness update. Opsdash now officially supports Nextcloud 34, the local development workflow includes a dedicated NC34 stack, and the release line has been verified on a seeded Nextcloud 34 instance with Calendar, Deck, API-level dashboard loads, and the must-pass browser smoke journey.',
    highlights: [
      'Opsdash now advertises compatibility with Nextcloud 34 in addition to the existing 30-33 range.',
      'A dedicated local Nextcloud 34 stack is now part of the repo, so compatibility work no longer depends on manual compose edits.',
      'The standard seed flow was verified on Nextcloud 34 with both Calendar and Deck installed and enabled before seeding.',
      'Seeded NC34 validation now covers realistic dashboard data, Deck boards/cards, and the existing overview-load smoke path.',
      'The must-pass Playwright browser smoke suite was rerun against the seeded Nextcloud 34 lane to confirm the real UI shell still loads and the core overlays still work.',
      'Release and contributor docs now reflect the NC34 lane so packaging and QA instructions line up with the actual compatibility target.',
    ],
    actions: [
      {
        label: '↻ Reload dashboard',
        type: 'reload',
      },
    ],
    autoShow: true,
    showInHistory: true,
  },
  {
    version: '0.8.1',
    date: '2026-05-20',
    title: 'Reporting is live, and planning modes now stay visually consistent',
    teaser: 'Opsdash now turns your setup into real recap emails, keeps Single Goal, Calendar Goals, and Calendar + Category Goals visually aligned when you switch between them, and ships updated Standard and Advanced dashboard templates.',
    summary: 'Version 0.8.1 makes reporting a real part of the dashboard flow, tightens up how strategy-aware widgets behave, and refreshes the default onboarding templates. You can configure weekly and monthly recaps in Preferences, send a test recap immediately, rely on widgets to follow your selected planning mode without stale category fallbacks or stray Unassigned labels, and start from Standard or Advanced layouts that now match the real current dashboard setups.',
    highlights: [
      'Recap reporting now lives directly in onboarding Preferences with separate weekly and monthly settings, local send times, and a simpler final-checkpoint model.',
      'Test sends now use the real mail pipeline, so you can verify the recap from the UI before relying on scheduled delivery.',
      'Recap content now follows your goal setup: Single Goal, Calendar Goals, and Calendar + Category Goals each render a more fitting summary.',
      'Scheduled recaps use your Nextcloud timezone and run through the built-in background-job system after the configured send time is reached.',
      'The onboarding dashboard presets were refreshed: Standard now starts from the real single-tab default layout, while Advanced restores the current multi-tab workspace layout.',
      'Targets, Time Summary, and Calendar Table now respect known planning strategies more reliably, even if older category mappings are still present in saved config.',
      'Calendar Goals views stay focused on calendars: category-only fallback rows no longer leak back in after switching down from Calendar + Category Goals.',
      'Time Summary no longer shows stray Unassigned category labels in the today block when the dashboard is in Calendar Goals mode.',
    ],
    images: [
      {
        src: resolveReleaseImagePath('release-notes/release-081-reporting-preferences.png'),
        alt: 'Opsdash onboarding preferences with recap reporting settings',
        title: 'Reporting now lives in Preferences',
        caption: 'Weekly and monthly recap settings now sit in one place: enable reporting, choose the delivery mode per period, and set local send times before turning the scheduler loose.',
      },
    ],
    actions: [
      {
        label: 'Open recap settings',
        type: 'open_preferences',
      },
    ],
    autoShow: true,
    showInHistory: true,
  },
  {
    version: '0.8.0',
    date: '2026-05-06',
    title: 'Smarter balance tracking, cleaner editing',
    teaser: 'The Balance widget now tracks your score over time, the editing bar got a big polish, and the whole dashboard is safer under the hood.',
    summary: 'Version 0.8.0 brings visible improvements to how Opsdash shows balance trends over time, makes layout editing feel more organised, and quietly tightens up a lot of behind-the-scenes behaviour.',
    highlights: [
      'The editing bar is now cleaner and better organised: tabs stay on their own row, and the Add widget and Done editing buttons sit together in a quieter second row below.',
      'Widget controls in the toolbar (Width, Height, Color) are now grouped into compact expandable sections, so the bar stays readable even when many options are available.',
      'A shared color picker is now used consistently across the whole app — in calendar goals, targets, and widget customisation.',
    ],
    images: [
      {
        src: resolveReleaseImagePath('release-notes/release-080-composite.png'),
        alt: 'Opsdash 0.8.0 — sidebar, browse bar, and edit bar side by side',
        title: 'Sidebar · Browse bar · Edit bar',
        caption: 'Left: the sidebar with your dashboard profile and quick-setup links. Right top: the clean browse bar. Right bottom: the new two-row edit bar with tabs on row 1 and actions on row 2.',
      },
    ],
    actions: [
      {
        label: '↻ Reset to default layout',
        type: 'reload',
      },
    ],
    autoShow: true,
    showInHistory: true,
  },
  {
    version: '0.7.6',
    date: '2026-04-27',
    title: 'What’s new now stays dismissed',
    teaser: 'The release update panel now remembers when you have already seen the latest version.',
    summary: 'This small update makes the in-app release notes less repetitive. After you close the latest update, Opsdash keeps it out of your way until a newer version is available.',
    highlights: [
      'The latest update panel now appears only once for each app version.',
      'Closing the panel is remembered more reliably across refreshes and dashboard saves.',
      'Targets now show real over-goal progress above 200%, so very strong weeks no longer look capped.',
      'You can still open release notes manually from the sidebar whenever you want to review what changed.',
    ],
    autoShow: true,
    showInHistory: true,
  },
  {
    version: '0.7.5',
    date: '2026-04-20',
    title: 'Updates now get their own in-app spotlight',
    teaser: 'A cleaner in-app release note overlay now highlights what changed and keeps past updates one click away.',
    summary: '',
    highlights: [
      'A new in-app update panel calls out the latest release in a cleaner, more readable format.',
      'The newest version opens first, while older release notes stay available from the built-in history list.',
      'Release copy is now written for end users, focusing on visible UI changes and feature updates instead of internal implementation details.',
    ],
    images: [
      {
        src: resolveReleaseImagePath('release-notes/release-075-overlay-shot.png'),
        alt: 'Opsdash release notes overlay screenshot',
        title: 'Live overlay preview',
        caption: 'The first preview shows the real in-app release window as it appears in Opsdash.',
      },
      {
        src: resolveReleaseImagePath('release-notes/release-075-overlay.svg'),
        alt: 'Opsdash release notes layout illustration',
        title: 'Layout concept',
        caption: 'The second preview highlights the window structure and shared onboarding-style layout.',
      },
    ],
    autoShow: true,
    showInHistory: true,
  },
  {
    version: '0.7.4',
    date: '2026-04-18',
    title: 'Targets mode switching feels more reliable',
    teaser: 'The Targets widget now changes cleanly between its planning modes without unexpected fallback rows.',
    summary: 'This release smooths out one of the most visible planning flows in Opsdash: switching Targets between a single goal, per-calendar goals, and combined calendar-plus-category views.',
    highlights: [
      'Switching between Targets layouts is now much clearer and no longer drops you into the wrong structure.',
      'Calendar Goals stays focused on calendar rows instead of unexpectedly falling back to category sections.',
      'The result is a more predictable setup flow when you adjust how planning is displayed on the dashboard.',
    ],
    autoShow: true,
    showInHistory: true,
  },
]

function toNumberParts(version: string): number[] {
  return normalizeReleaseVersion(version)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0))
}

export function normalizeReleaseVersion(version: string): string {
  return String(version ?? '').trim().replace(/^v/i, '')
}

export function compareReleaseVersions(left: string, right: string): number {
  const a = toNumberParts(left)
  const b = toNumberParts(right)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (b[index] ?? 0) - (a[index] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

export function getReleaseNotesEntries(): ReleaseNotesEntry[] {
  return [...RELEASE_NOTES].sort((left, right) => compareReleaseVersions(left.version, right.version))
}

export function getReleaseNotesEntry(version: string): ReleaseNotesEntry | null {
  const normalized = normalizeReleaseVersion(version)
  return getReleaseNotesEntries().find((entry) => entry.version === normalized) ?? null
}

function resolveReleaseImagePath(name: string): string {
  const oc = (typeof window !== 'undefined' ? (window as any).OC : null)
  if (typeof oc?.imagePath === 'function') {
    return oc.imagePath('opsdash', name)
  }
  return `/apps-extra/opsdash/img/${name}`
}
