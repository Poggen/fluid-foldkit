import { sliderSettings, sliderSnap } from '@foldkit-visuals/fluid/slider'
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('slider', {
  appearance: Appearance,
  value: Schema.Int.check(Schema.isBetween({ minimum: -100, maximum: 200 })),
  upperValue: Schema.Int.check(Schema.isBetween({ minimum: -100, maximum: 200 })),
  range: Schema.Boolean,
  min: Schema.Int.check(Schema.isBetween({ minimum: -100, maximum: 99 })),
  max: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 200 })),
  step: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 20 })),
  variant: Schema.Literals(['pips', 'scrubber']),
  valueDisplay: Schema.Literals(['automatic', 'show', 'hide']),
  valuePosition: Schema.Literals(['automatic', 'left', 'right', 'top', 'bottom', 'tooltip']),
  stepsPreset: Schema.Literals(['none', 'quarters', 'uneven']),
  showSteps: Schema.Boolean,
  label: Schema.String,
  disabled: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'slider',
  appearance: {},
  value: 35,
  upperValue: 65,
  range: false,
  min: 0,
  max: 100,
  step: 1,
  variant: 'pips',
  valueDisplay: 'automatic',
  valuePosition: 'automatic',
  stepsPreset: 'none',
  showSteps: false,
  label: 'Opacity',
  disabled: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'number',
    prop: 'value',
    group: 'Value',
    initial: defaults.value,
    min: -100,
    max: 200,
    step: 1,
  },
  {
    kind: 'number',
    prop: 'upperValue',
    group: 'Value',
    initial: defaults.upperValue,
    min: -100,
    max: 200,
    step: 1,
  },
  { kind: 'toggle', prop: 'range', group: 'Value', initial: defaults.range },
  {
    kind: 'number',
    prop: 'min',
    group: 'Properties',
    initial: defaults.min,
    min: -100,
    max: 99,
    step: 1,
  },
  {
    kind: 'number',
    prop: 'max',
    group: 'Properties',
    initial: defaults.max,
    min: 1,
    max: 200,
    step: 1,
  },
  {
    kind: 'number',
    prop: 'step',
    group: 'Properties',
    initial: defaults.step,
    min: 1,
    max: 20,
    step: 1,
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
    prop: 'valueDisplay',
    group: 'Appearance',
    initial: defaults.valueDisplay,
    values: Configuration.fields.valueDisplay.literals,
  },
  {
    kind: 'choice',
    prop: 'valuePosition',
    group: 'Appearance',
    initial: defaults.valuePosition,
    values: Configuration.fields.valuePosition.literals,
  },
  {
    kind: 'choice',
    prop: 'stepsPreset',
    group: 'Properties',
    initial: defaults.stepsPreset,
    values: Configuration.fields.stepsPreset.literals,
  },
  { kind: 'toggle', prop: 'showSteps', group: 'Appearance', initial: defaults.showSteps },
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
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
export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => {
    if (control.prop === 'upperValue') return { ...control, enabled: configuration.range }
    if (
      (control.prop === 'min' || control.prop === 'max' || control.prop === 'step') &&
      configuration.stepsPreset !== 'none'
    )
      return { ...control, enabled: false }
    if (control.prop === 'min') return { ...control, max: configuration.max - 1 }
    if (control.prop === 'max') return { ...control, min: configuration.min + 1 }
    if (control.prop === 'variant')
      return {
        ...control,
        enabled:
          configuration.size === 'default' &&
          !configuration.range &&
          configuration.valueDisplay === 'automatic' &&
          configuration.valuePosition === 'automatic' &&
          configuration.stepsPreset === 'none' &&
          !configuration.showSteps,
      }
    return control
  })

export const settingsFor = (
  configuration: Configuration,
  id: string,
  inheritedSize: 'default' | 'compact',
) =>
  sliderSettings({
    id,
    value: configuration.range
      ? [
          Math.min(configuration.value, configuration.upperValue),
          Math.max(configuration.value, configuration.upperValue),
        ]
      : configuration.value,
    size: configuration.size === 'site' ? inheritedSize : configuration.size,
    min: configuration.min,
    max: configuration.max,
    step: configuration.step,
    disabled: configuration.disabled,
    variant: configuration.variant,
    ...(configuration.valueDisplay === 'automatic'
      ? {}
      : { showValue: configuration.valueDisplay === 'show' }),
    ...(configuration.valuePosition === 'automatic'
      ? {}
      : { valuePosition: configuration.valuePosition }),
    ...(configuration.stepsPreset === 'none'
      ? {}
      : {
          steps:
            configuration.stepsPreset === 'quarters' ? [0, 25, 50, 75, 100] : [0, 10, 30, 60, 100],
        }),
    ...(configuration.showSteps ? { showSteps: true } : {}),
  })

export const normalize = (configuration: Configuration): Configuration => {
  const settings = settingsFor(configuration, 'playground-slider', 'default')
  const first = sliderSnap(configuration.value, settings)
  const second = sliderSnap(configuration.upperValue, settings)
  const value = configuration.range ? Math.min(first, second) : first
  const upperValue = configuration.range ? Math.max(first, second) : second
  return value === configuration.value &&
    upperValue === configuration.upperValue &&
    settings.min === configuration.min &&
    settings.max === configuration.max
    ? configuration
    : { ...configuration, value, upperValue, min: settings.min, max: settings.max }
}
