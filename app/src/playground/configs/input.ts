import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('input', {
  appearance: Appearance,
  type: Schema.Literals(['text', 'email', 'password', 'number', 'search', 'url']),
  placeholder: Schema.String,
  value: Schema.String,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  invalid: Schema.Boolean,
  name: Schema.String,
  required: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'input',
  appearance: {},
  type: 'text',
  placeholder: 'Your next idea',
  value: '',
  disabled: false,
  readOnly: false,
  invalid: false,
  name: 'preview-input',
  required: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'choice',
    prop: 'type',
    group: 'Properties',
    initial: defaults.type,
    values: Configuration.fields.type.literals,
  },
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
  { kind: 'toggle', prop: 'required', group: 'Form', initial: defaults.required },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
