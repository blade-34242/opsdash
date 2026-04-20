export interface ReleaseNotesImage {
  src: string
  alt: string
  title: string
  caption?: string
}

export interface ReleaseNotesAction {
  label: string
  type: 'link'
  href: string
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

const CHANGELOG_URL = 'https://github.com/blade34242/opsdash-operational-dashboard-nextcloud/blob/master/CHANGELOG.md'

const RELEASE_NOTES: ReleaseNotesEntry[] = [
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
    actions: [
      {
        label: 'Open changelog',
        type: 'link',
        href: CHANGELOG_URL,
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
    actions: [
      {
        label: 'Open changelog',
        type: 'link',
        href: CHANGELOG_URL,
      },
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
