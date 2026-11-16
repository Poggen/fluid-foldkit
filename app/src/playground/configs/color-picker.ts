import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('color-picker', {
  appearance: Appearance,
  value: Schema.String,
  format: Schema.Literals(['hex', 'rgb', 'hsl', 'oklch']),
  swatchesPreset: Schema.Literals(['brand', 'warm', 'cool', 'none']),
  hideEyedropper: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'color-picker',
  appearance: {},
  value: '#6B97FF',
  format: 'hex',
  swatchesPreset: 'brand',
  hideEyedropper: false,
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
    kind: 'choice',
    prop: 'format',
    group: 'Properties',
    initial: defaults.format,
    values: Configuration.fields.format.literals,
  },
  {
    kind: 'choice',
    prop: 'swatchesPreset',
    group: 'Properties',
    initial: defaults.swatchesPreset,
    values: Configuration.fields.swatchesPreset.literals,
  },
  { kind: 'toggle', prop: 'hideEyedropper', group: 'State', initial: defaults.hideEyedropper },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
