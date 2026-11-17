import { Effect, Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('checkbox', {
  appearance: Appearance,
  label: Schema.String,
  checked: Schema.Boolean,
  indeterminate: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  invalid: Schema.Boolean,
  required: Schema.Boolean,
  name: Schema.String,
  formValue: Schema.String,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'checkbox',
  appearance: {},
  label: 'Notifications',
  checked: true,
  indeterminate: false,
  disabled: false,
  readOnly: false,
  invalid: false,
  required: false,
  name: 'notification',
  formValue: 'on',
  size: 'site',
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  { kind: 'toggle', prop: 'checked', group: 'State', initial: defaults.checked },
  { kind: 'toggle', prop: 'indeterminate', group: 'State', initial: defaults.indeterminate },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  { kind: 'toggle', prop: 'readOnly', group: 'State', initial: defaults.readOnly },
  { kind: 'toggle', prop: 'invalid', group: 'State', initial: defaults.invalid },
  { kind: 'toggle', prop: 'required', group: 'Form', initial: defaults.required },
  { kind: 'text', prop: 'name', group: 'Form', initial: defaults.name, values: [defaults.name] },
  {
    kind: 'text',
    prop: 'formValue',
    group: 'Form',
    initial: defaults.formValue,
    values: [defaults.formValue],
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
