import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('input-group', {
  appearance: Appearance,
  count: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 3 })),
  firstLabel: Schema.String,
  secondLabel: Schema.String,
  thirdLabel: Schema.String,
  firstValue: Schema.String,
  secondValue: Schema.String,
  thirdValue: Schema.String,
  placeholder: Schema.String,
  showIcons: Schema.Boolean,
  hideLabels: Schema.Boolean,
  invalid: Schema.Boolean,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'input-group',
  appearance: {},
  count: 3,
  firstLabel: 'Name',
  secondLabel: 'Email',
  thirdLabel: 'Website',
  firstValue: '',
  secondValue: '',
  thirdValue: '',
  placeholder: 'Your next idea',
  showIcons: true,
  hideLabels: false,
  invalid: false,
  disabled: false,
  readOnly: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'number',
    prop: 'count',
    group: 'Properties',
    initial: defaults.count,
    min: 1,
    max: 3,
    step: 1,
  },
  {
    kind: 'text',
    prop: 'firstLabel',
    group: 'Content',
    initial: defaults.firstLabel,
    values: [defaults.firstLabel],
  },
  {
    kind: 'text',
    prop: 'secondLabel',
    group: 'Content',
    initial: defaults.secondLabel,
    values: [defaults.secondLabel],
  },
  {
    kind: 'text',
    prop: 'thirdLabel',
    group: 'Content',
    initial: defaults.thirdLabel,
    values: [defaults.thirdLabel],
  },
  {
    kind: 'text',
    prop: 'firstValue',
    group: 'Content',
    initial: defaults.firstValue,
    values: [defaults.firstValue],
  },
  {
    kind: 'text',
    prop: 'secondValue',
    group: 'Content',
    initial: defaults.secondValue,
    values: [defaults.secondValue],
  },
  {
    kind: 'text',
    prop: 'thirdValue',
    group: 'Content',
    initial: defaults.thirdValue,
    values: [defaults.thirdValue],
  },
  {
    kind: 'text',
    prop: 'placeholder',
    group: 'Content',
    initial: defaults.placeholder,
    values: [defaults.placeholder],
  },
  { kind: 'toggle', prop: 'showIcons', group: 'Content', initial: defaults.showIcons },
  { kind: 'toggle', prop: 'hideLabels', group: 'Content', initial: defaults.hideLabels },
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
    if (control.prop === 'secondLabel') return { ...control, enabled: configuration.count > 1 }
    if (control.prop === 'secondValue') return { ...control, enabled: configuration.count > 1 }
    if (control.prop === 'thirdLabel') return { ...control, enabled: configuration.count > 2 }
    if (control.prop === 'thirdValue') return { ...control, enabled: configuration.count > 2 }
    return control
  })
