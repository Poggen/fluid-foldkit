/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('combobox', {
  appearance: Appearance,
  placeholder: Schema.String,
  multiple: Schema.Boolean,
  creatable: Schema.Boolean,
  hideSelected: Schema.Boolean,
  variant: Schema.Literals(['bordered', 'borderless']),
  icon: Schema.Boolean,
  clearable: Schema.Boolean,
  error: Schema.Boolean,
  disabled: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'combobox',
  appearance: {},
  placeholder: 'Choose components',
  multiple: true,
  creatable: false,
  hideSelected: false,
  variant: 'bordered',
  icon: false,
  clearable: false,
  error: false,
  disabled: false,
})
export const controls = [
  {
    kind: 'text',
    prop: 'placeholder',
    label: 'Placeholder',
    group: 'Field',
    initial: 'Choose components',
    values: ['Choose components', 'Make it yours', 'Studio notes'],
  },
  { kind: 'toggle', prop: 'multiple', label: 'Multiple', group: 'Selection', initial: true },
  {
    kind: 'toggle',
    prop: 'creatable',
    label: 'Create from query',
    group: 'Selection',
    initial: false,
  },
  {
    kind: 'toggle',
    prop: 'hideSelected',
    label: 'Hide picked rows',
    group: 'Selection',
    initial: false,
  },
  {
    kind: 'choice',
    prop: 'variant',
    label: 'Variant',
    group: 'Field',
    initial: 'bordered',
    values: ['bordered', 'borderless'],
  },
  { kind: 'toggle', prop: 'icon', label: 'Leading icon', group: 'Field', initial: false },
  { kind: 'toggle', prop: 'clearable', label: 'Clear button', group: 'Field', initial: false },
  { kind: 'toggle', prop: 'error', label: 'Error', group: 'Field', initial: false },
  { kind: 'toggle', prop: 'disabled', label: 'Disabled', group: 'Field', initial: false },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor: (config: Configuration) => ReadonlyArray<Control> = (
  config: Configuration,
) =>
  controls.map((control) => ({
    ...control,
    enabled: control.prop !== 'hideSelected' || config.multiple,
  }))
