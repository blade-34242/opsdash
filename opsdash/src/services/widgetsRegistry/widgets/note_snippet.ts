import { defineAsyncComponent } from 'vue'

const NoteSnippetWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/notes/NoteSnippetWidget.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Note'

export const noteSnippetEntry: RegistryEntry = {
  component: NoteSnippetWidget,
  defaultLayout: { width: 'quarter', height: 's', order: 68 },
  heightMode: 'auto',
  label: 'Notes snippet',
  category: 'Notes' as const,
  baseTitle,
  configurable: true,
  controls: [],
  buildProps: (def, ctx) => ({
    notesCurr: ctx.notesCurr ?? '',
    notesPrev: ctx.notesPrev ?? '',
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    showHeader: def.options?.showHeader !== false,
    cardBg: def.options?.cardBg,
  }),
}
