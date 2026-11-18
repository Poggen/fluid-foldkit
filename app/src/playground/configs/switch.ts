import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('switch', {
  appearance: Appearance,
  label: Schema.String,
  checked: Schema.Boolean,
  disabled: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'switch',
  appearance: {},
  label: 'Notifications',
  checked: true,
  disabled: false,
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  { kind: 'toggle', prop: 'checked', group: 'State', initial: defaults.checked },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
