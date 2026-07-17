export interface ShortcutItem {
  id: string
  label: string
  combo: string[]
  description?: string
}

export interface ShortcutGroup {
  id: string
  title: string
  items: ShortcutItem[]
}

export const KEYBOARD_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    items: [
      { id: 'nav-prev', label: 'Previous period', combo: ['Alt', '←'], description: 'Go to the previous week or month' },
      { id: 'nav-next', label: 'Next period', combo: ['Alt', '→'], description: 'Go to the next week or month' },
      { id: 'nav-toggle-range', label: 'Toggle week/month', combo: ['Alt', 'Shift', 'R'], description: 'Switch between week and month range' },
    ],
  },
  {
    id: 'targets',
    title: 'Targets',
    items: [
      { id: 'targets-focus', label: 'Open Theme', combo: ['Alt', 'T'], description: 'Jump to theme controls' },
    ],
  },
  {
    id: 'misc',
    title: 'Misc',
    items: [
      { id: 'shortcuts-open', label: 'Open cheat sheet', combo: ['?'], description: 'Display this overlay' },
      { id: 'widget-options', label: 'Open widget options', combo: ['Shift', 'C'], description: 'Toggle options for the selected widget (edit mode)' },
      { id: 'layout-edit', label: 'Toggle edit layout', combo: ['Shift', 'E'], description: 'Enter or exit widget layout editing' },
    ],
  },
]
