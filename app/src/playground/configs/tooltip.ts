import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('tooltip', {
  appearance: Appearance,
  label: Schema.String,
  triggerLabel: Schema.String,
  side: Schema.Literals(['top', 'right', 'bottom', 'left']),
  sideOffset: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 24 })),
  delayDuration: Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1500 })),
  followCursor: Schema.Literals(['none', 'x', 'y']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'tooltip',
  appearance: {},
  label: 'A little detail',
  triggerLabel: 'Hover me',
  side: 'top',
  sideOffset: 6,
  delayDuration: 200,
  followCursor: 'none',
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
    kind: 'text',
    prop: 'triggerLabel',
    group: 'Content',
    initial: defaults.triggerLabel,
    values: [defaults.triggerLabel],
  },
  {
    kind: 'choice',
    prop: 'side',
    group: 'Properties',
    initial: defaults.side,
    values: Configuration.fields.side.literals,
  },
  {
    kind: 'number',
    prop: 'sideOffset',
    group: 'Properties',
    initial: defaults.sideOffset,
    min: 0,
    max: 24,
    step: 1,
  },
  {
    kind: 'number',
    prop: 'delayDuration',
    group: 'Properties',
    initial: defaults.delayDuration,
    min: 0,
    max: 1500,
    step: 50,
  },
  {
    kind: 'choice',
    prop: 'followCursor',
    group: 'Properties',
    initial: defaults.followCursor,
    values: Configuration.fields.followCursor.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
