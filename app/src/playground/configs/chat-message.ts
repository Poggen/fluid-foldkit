import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('chat-message', {
  appearance: Appearance,
  label: Schema.String,
  from: Schema.Literals(['assistant', 'user']),
  showTime: Schema.Boolean,
  time: Schema.String,
  showActions: Schema.Boolean,
  actionLabel: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'chat-message',
  appearance: {},
  label: 'A comfortable space for conversation',
  from: 'assistant',
  showTime: false,
  time: '12:42',
  showActions: false,
  actionLabel: 'Copy message',
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  {
    kind: 'choice',
    prop: 'from',
    group: 'Properties',
    initial: defaults.from,
    values: Configuration.fields.from.literals,
  },
  { kind: 'toggle', prop: 'showTime', group: 'Content', initial: defaults.showTime },
  { kind: 'text', prop: 'time', group: 'Content', initial: defaults.time, values: [defaults.time] },
  { kind: 'toggle', prop: 'showActions', group: 'Content', initial: defaults.showActions },
  {
    kind: 'text',
    prop: 'actionLabel',
    group: 'Content',
    initial: defaults.actionLabel,
    values: [defaults.actionLabel],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => {
    if (control.prop === 'time') return { ...control, enabled: configuration.showTime }
    if (control.prop === 'actionLabel') return { ...control, enabled: configuration.showActions }
    return control
  })
