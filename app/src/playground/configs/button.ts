import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('button', {
  appearance: Appearance,
  variant: Schema.Literals(['primary', 'secondary', 'tertiary', 'ghost', 'destructive']),
  buttonSize: Schema.Literals(['default', 'compact']),
  label: Schema.String,
  iconOnly: Schema.Boolean,
  leadingIcon: Schema.Boolean,
  trailingIcon: Schema.Boolean,
  loading: Schema.Boolean,
  active: Schema.Boolean,
  disabled: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'button',
  appearance: {},
  variant: 'primary',
  buttonSize: 'default',
  label: 'Get started',
  iconOnly: false,
  leadingIcon: false,
  trailingIcon: false,
  loading: false,
  active: false,
  disabled: false,
})
export const controls = [
  {
    kind: 'choice',
    prop: 'variant',
    values: Configuration.fields.variant.literals,
    initial: defaults.variant,
  },
  {
    kind: 'choice',
    prop: 'buttonSize',
    values: Configuration.fields.buttonSize.literals,
    initial: defaults.buttonSize,
  },
  {
    kind: 'text',
    prop: 'label',
    initial: defaults.label,
    values: ['Get started', 'Learn more', 'Deploy', 'Continue', 'Ship it'],
  },
  {
    kind: 'toggle',
    prop: 'iconOnly',
    initial: defaults.iconOnly,
  },
  {
    kind: 'toggle',
    prop: 'leadingIcon',
    initial: defaults.leadingIcon,
  },
  {
    kind: 'toggle',
    prop: 'trailingIcon',
    initial: defaults.trailingIcon,
  },
  {
    kind: 'toggle',
    prop: 'loading',
    initial: defaults.loading,
  },
  {
    kind: 'toggle',
    prop: 'active',
    initial: defaults.active,
  },
  {
    kind: 'toggle',
    prop: 'disabled',
    initial: defaults.disabled,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
