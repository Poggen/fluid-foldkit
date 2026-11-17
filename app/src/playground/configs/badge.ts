import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('badge', {
  appearance: Appearance,
  variant: Schema.Literals(['solid', 'dot', 'ghost']),
  color: Schema.Literals([
    'gray',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
  ]),
  label: Schema.String,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'badge',
  appearance: {},
  variant: 'solid',
  color: 'gray',
  label: 'Published',
  size: 'site',
})
export const controls = [
  {
    kind: 'choice',
    prop: 'variant',
    group: 'Properties',
    initial: defaults.variant,
    values: Configuration.fields.variant.literals,
  },
  {
    kind: 'choice',
    prop: 'color',
    group: 'Properties',
    initial: defaults.color,
    values: Configuration.fields.color.literals,
  },
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
