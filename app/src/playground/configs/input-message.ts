// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('input-message', {
  appearance: Appearance,
  placeholder: Schema.String,
  suggestion: Schema.Boolean,
  suggestionsOn: Schema.Boolean,
  historyOn: Schema.Boolean,
  attachments: Schema.Boolean,
  minRows: Schema.Literals([1, 2, 3]),
  maxRows: Schema.Literals([4, 8, 12]),
  clickToFocus: Schema.Boolean,
  disabled: Schema.Boolean,
  leftSlot: Schema.Boolean,
  rightSlot: Schema.Boolean,
  status: Schema.Literals(['off', 'idle', 'streaming']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'input-message',
  appearance: {},
  placeholder: 'Ask me anything\u2026',
  suggestion: true,
  suggestionsOn: true,
  historyOn: true,
  attachments: false,
  minRows: 1,
  maxRows: 8,
  clickToFocus: true,
  disabled: false,
  leftSlot: true,
  rightSlot: false,
  status: 'off',
})
export const controls = [
  {
    kind: 'text',
    prop: 'placeholder',
    label: 'Placeholder',
    group: 'Composer',
    initial: 'Ask me anything\u2026',
    values: ['Ask me anything\u2026', 'Make it yours', 'Studio notes'],
  },
  {
    kind: 'toggle',
    prop: 'suggestion',
    label: 'Placeholder suggestion',
    group: 'Composer',
    initial: true,
  },
  {
    kind: 'toggle',
    prop: 'suggestionsOn',
    label: 'Suggested prompts',
    group: 'Composer',
    initial: true,
  },
  { kind: 'toggle', prop: 'historyOn', label: 'History recall', group: 'Composer', initial: true },
  { kind: 'toggle', prop: 'attachments', label: 'Attachments', group: 'Composer', initial: false },
  {
    kind: 'choice',
    prop: 'minRows',
    label: 'Min rows',
    group: 'Composer',
    initial: 1,
    values: [1, 2, 3],
  },
  {
    kind: 'choice',
    prop: 'maxRows',
    label: 'Max rows',
    group: 'Composer',
    initial: 8,
    values: [4, 8, 12],
  },
  {
    kind: 'toggle',
    prop: 'clickToFocus',
    label: 'Click to focus',
    group: 'Composer',
    initial: true,
  },
  { kind: 'toggle', prop: 'disabled', label: 'Disabled', group: 'Composer', initial: false },
  { kind: 'toggle', prop: 'leftSlot', label: 'Left slot', group: 'Slots', initial: true },
  { kind: 'toggle', prop: 'rightSlot', label: 'Right slot', group: 'Slots', initial: false },
  {
    kind: 'choice',
    prop: 'status',
    label: 'Status',
    group: 'Queue',
    initial: 'off',
    values: ['off', 'idle', 'streaming'],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor = (_config: Configuration): ReadonlyArray<Control> => controls

export const suggestedPrompts = [
  'What is Fluid Functionalism about?',
  'How does Micka tune the springs behind these animations?',
  'Install the InputMessage component in my project',
  'Draft a short thank-you note to Micka for the library',
] as const
export const placeholderPrompt = 'Why is every other input box so stiff?'
