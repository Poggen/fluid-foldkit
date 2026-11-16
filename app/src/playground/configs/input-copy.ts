import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('input-copy', {
  appearance: Appearance,
  value: Schema.String,
  label: Schema.String,
  variant: Schema.Literals(['icon', 'button']),
  align: Schema.Literals(['left', 'right']),
  disabled: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'input-copy',
  appearance: {},
  value: 'bunx shadcn@4.23.0 add @fluid-foldkit/button',
  label: 'Copy install command',
  variant: 'icon',
  align: 'right',
  disabled: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'text',
    prop: 'value',
    group: 'Content',
    initial: defaults.value,
    values: [defaults.value],
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
    prop: 'variant',
    group: 'Properties',
    initial: defaults.variant,
    values: Configuration.fields.variant.literals,
  },
  {
    kind: 'choice',
    prop: 'align',
    group: 'Properties',
    initial: defaults.align,
    values: Configuration.fields.align.literals,
  },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
