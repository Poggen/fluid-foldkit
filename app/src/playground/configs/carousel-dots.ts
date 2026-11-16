import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('carousel-dots', {
  appearance: Appearance,
  count: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 8 })),
  autoplay: Schema.Boolean,
  loop: Schema.Boolean,
  duration: Schema.Finite.check(Schema.isBetween({ minimum: 500, maximum: 6000 })),
  labelPrefix: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'carousel-dots',
  appearance: {},
  count: 4,
  autoplay: true,
  loop: true,
  duration: 2400,
  labelPrefix: 'Go to slide',
})
export const controls = [
  {
    kind: 'number',
    prop: 'count',
    group: 'Properties',
    initial: defaults.count,
    min: 1,
    max: 8,
    step: 1,
  },
  { kind: 'toggle', prop: 'autoplay', group: 'State', initial: defaults.autoplay },
  { kind: 'toggle', prop: 'loop', group: 'State', initial: defaults.loop },
  {
    kind: 'number',
    prop: 'duration',
    group: 'Properties',
    initial: defaults.duration,
    min: 500,
    max: 6000,
    step: 100,
  },
  {
    kind: 'text',
    prop: 'labelPrefix',
    group: 'Content',
    initial: defaults.labelPrefix,
    values: [defaults.labelPrefix],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
