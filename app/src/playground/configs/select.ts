import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('select', {
  appearance: Appearance,
  placeholder: Schema.String,
  variant: Schema.Literals(['bordered', 'borderless']),
  itemsPreset: Schema.Literals(['roles', 'frameworks', 'long']),
  showIcon: Schema.Boolean,
  error: Schema.Boolean,
  disabled: Schema.Boolean,
  name: Schema.String,
  required: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'select',
  appearance: {},
  placeholder: 'Choose a role',
  variant: 'bordered',
  itemsPreset: 'roles',
  showIcon: false,
  error: false,
  disabled: false,
  name: 'role',
  required: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'text',
    prop: 'placeholder',
    group: 'Content',
    initial: defaults.placeholder,
    values: [defaults.placeholder],
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
    prop: 'itemsPreset',
    group: 'Properties',
    initial: defaults.itemsPreset,
    values: Configuration.fields.itemsPreset.literals,
  },
  { kind: 'toggle', prop: 'showIcon', group: 'Content', initial: defaults.showIcon },
  { kind: 'toggle', prop: 'error', group: 'State', initial: defaults.error },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  { kind: 'text', prop: 'name', group: 'Form', initial: defaults.name, values: [defaults.name] },
  { kind: 'toggle', prop: 'required', group: 'Form', initial: defaults.required },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
