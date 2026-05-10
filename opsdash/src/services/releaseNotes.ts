export interface ReleaseNotesImage {
  src: string
  alt: string
  title: string
  caption?: string
}

export interface ReleaseNotesAction {
  label: string
  type: 'link' | 'reload'
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
    version: '0.8.1',
    date: '2026-05-10',
    title: 'Forgejo smoke checks and release prep tightened up',
    teaser: 'This update focuses on release readiness: Forgejo runs a narrower stable browser smoke path now, and the release docs/versioned references were cleaned up for 0.8.1.',
    summary: 'Version 0.8.1 is a release-preparation pass that tightens the browser smoke path in Forgejo and keeps the surrounding release/version docs aligned with the current app version.',
    highlights: [
      'Forgejo now targets a smaller must-pass browser smoke path instead of leaving browser coverage fully disabled.',
      'The smoke flow is more deterministic around onboarding and release-note dismissal state.',
      'Release references and supporting docs were aligned to the 0.8.1 cycle.',
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
