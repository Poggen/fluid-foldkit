import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('field', {
  appearance: Appearance,
  label: Schema.String,
  placeholder: Schema.String,
  value: Schema.String,
  orientation: Schema.Literals(['vertical', 'horizontal']),
  description: Schema.String,
  showDescription: Schema.Boolean,
  error: Schema.String,
  invalid: Schema.Boolean,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'field',
  appearance: {},
  label: 'Your name',
  placeholder: 'Your next idea',
  value: '',
  orientation: 'vertical',
  description: 'A quiet place for your best work.',
  showDescription: true,
  error: 'This field needs your attention.',
  invalid: false,
  disabled: false,
  readOnly: false,
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
  {
    kind: 'choice',
    prop: 'orientation',
    group: 'Properties',
    initial: defaults.orientation,
    values: Configuration.fields.orientation.literals,
  },
  {
    kind: 'text',
    prop: 'description',
    group: 'Content',
    initial: defaults.description,
    values: [defaults.description],
  },
  { kind: 'toggle', prop: 'showDescription', group: 'Content', initial: defaults.showDescription },
  {
    kind: 'text',
    prop: 'error',
    group: 'Content',
    initial: defaults.error,
    values: [defaults.error],
  },
  { kind: 'toggle', prop: 'invalid', group: 'State', initial: defaults.invalid },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  { kind: 'toggle', prop: 'readOnly', group: 'State', initial: defaults.readOnly },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor: (configuration: Configuration) => ReadonlyArray<Control> = (
  configuration: Configuration,
) =>
  controls.map((control) => {
    if (control.prop === 'description')
      return { ...control, enabled: configuration.showDescription }
    if (control.prop === 'error') return { ...control, enabled: configuration.invalid }
    return control
  })
