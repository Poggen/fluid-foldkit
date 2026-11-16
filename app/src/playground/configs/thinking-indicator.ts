import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('thinking-indicator', {
  appearance: Appearance,
  size: Schema.Literals(['site', 'default', 'compact']),
  showIcon: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'thinking-indicator',
  appearance: {},
  size: 'site',
  showIcon: true,
})
export const controls = [
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
  { kind: 'toggle', prop: 'showIcon', group: 'Appearance', initial: defaults.showIcon },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
