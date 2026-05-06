import { defineAsyncComponent } from 'vue'

const NoteEditorWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/notes/NoteEditorWidget.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Notes'

export const noteEditorEntry: RegistryEntry = {
  component: NoteEditorWidget,
  defaultLayout: { width: 'half', height: 'm', order: 69 },
  heightMode: 'auto',
  label: 'Notes editor',
  category: 'Notes' as const,
  baseTitle,
  configurable: true,
  controls: [
    { key: 'prevLabel', label: 'Prev label', type: 'text' },
    { key: 'currLabel', label: 'Current label', type: 'text' },
  ],
  buildProps: (def, ctx) => ({
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    showHeader: def.options?.showHeader !== false,
    cardBg: def.options?.cardBg,
    prevLabel: def.options?.prevLabel || (ctx.notesLabelPrev ?? 'Previous'),
    currLabel: def.options?.currLabel || (ctx.notesLabelCurr ?? 'Current'),
    previous: ctx.notesPrev ?? '',
    history: ctx.notesHistory ?? [],
    modelValue: ctx.notesCurr ?? '',
    saving: ctx.isSavingNote ?? false,
    onSave: ctx.onSaveNote,
    'onUpdate:modelValue': ctx.onUpdateNotes,
  }),
}
