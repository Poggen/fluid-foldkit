import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('textarea', {
  appearance: Appearance,
  placeholder: Schema.String,
  value: Schema.String,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  invalid: Schema.Boolean,
  name: Schema.String,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'textarea',
  appearance: {},
  placeholder: 'Your next idea',
  value: '',
  disabled: false,
  readOnly: false,
  invalid: false,
  name: 'preview-textarea',
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
    kind: 'text',
    prop: 'value',
    group: 'Content',
    initial: defaults.value,
    values: [defaults.value],
  },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  { kind: 'toggle', prop: 'readOnly', group: 'State', initial: defaults.readOnly },
  { kind: 'toggle', prop: 'invalid', group: 'State', initial: defaults.invalid },
  { kind: 'text', prop: 'name', group: 'Form', initial: defaults.name, values: [defaults.name] },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
