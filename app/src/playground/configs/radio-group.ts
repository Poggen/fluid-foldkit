import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('radio-group', {
  appearance: Appearance,
  count: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 6 })),
  labels: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'radio-group',
  appearance: {},
  count: 4,
  labels: 'Moderate spring, Slow spring, Comfortable, No animation',
})
export const controls = [
  {
    kind: 'number',
    prop: 'count',
    group: 'Properties',
    initial: defaults.count,
    min: 1,
    max: 6,
    step: 1,
  },
  {
    kind: 'text',
    prop: 'labels',
    group: 'Content',
    initial: defaults.labels,
    values: [defaults.labels],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
