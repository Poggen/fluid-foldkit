import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('context-menu', {
  appearance: Appearance,
  label: Schema.String,
  disabled: Schema.Boolean,
  showShortcuts: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'context-menu',
  appearance: {},
  label: 'Right-click here',
  disabled: false,
  showShortcuts: true,
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  { kind: 'toggle', prop: 'disabled', group: 'Properties', initial: defaults.disabled },
  { kind: 'toggle', prop: 'showShortcuts', group: 'Properties', initial: defaults.showShortcuts },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
