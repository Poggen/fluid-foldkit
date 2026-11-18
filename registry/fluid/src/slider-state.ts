/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Option, Predicate, Schema } from 'effect'

const sliderAppearance: (config: SliderConfig) => typeof SliderAppearance.Type =
  function sliderAppearance(config: SliderConfig) {
    return {
      showSteps: config.showSteps ?? false,
      showValue: config.showValue ?? true,
      valuePosition: config.valuePosition ?? 'left',
      trackClassName: config.trackClassName ?? '',
      trackStyle: config.trackStyle ?? {},
      fillClassName: config.fillClassName ?? '',
      fillStyle: config.fillStyle ?? {},
      hideFill: config.hideFill ?? false,
      thumbColor: config.thumbColor ?? 'white',
      thumbBorderColor: config.thumbBorderColor ?? '',
    }
  }

export const sliderSettings: (config: SliderConfig) => typeof SliderSettings.Type =
  function sliderSettings(config: SliderConfig) {
    const list = [...new Set(config.steps)].toSorted((a, b) => a - b)
    const steps = list.length > 1 ? list : []

    const compact =
      config.size === 'compact' ||
      Array.isArray(config.value) ||
      [
        config.steps,
        config.showSteps,
        config.showValue,
        config.valuePosition,
        config.trackClassName,
        config.trackStyle,
        config.fillClassName,
        config.fillStyle,
        config.hideFill,
        config.thumbColor,
        config.thumbBorderColor,
      ].some((value) => value !== undefined)

    return {
      value: config.value,
      min: steps[0] ?? config.min ?? 0,
      max: steps.at(-1) ?? config.max ?? 100,
      step: config.step ?? 1,
      steps,
      compact,
      variant: config.variant ?? 'pips',
      disabled: config.disabled ?? false,
      appearance: sliderAppearance(config),
    }
  }

export const sliderValues: (value: SliderValue) => ReadonlyArray<number> = function sliderValues(
  value: SliderValue,
) {
  return Predicate.isNumber(value) ? [value] : value
}

export const nearestSliderStep: (value: number, steps: ReadonlyArray<number>) => number =
  function nearestSliderStep(value: number, steps: ReadonlyArray<number>) {
    let index = 0

    for (let i = 1; i < steps.length; i += 1) {
      const candidate = steps[i]
      const current = steps[index]

      if (
        candidate !== undefined &&
        current !== undefined &&
        Math.abs(candidate - value) < Math.abs(current - value)
      ) {
        index = i
      }
    }

    return index
  }

export const sliderSnap: (value: number, settings: typeof SliderSettings.Type) => number =
  function sliderSnap(value: number, settings: typeof SliderSettings.Type) {
    if (settings.steps.length > 1) {
      return settings.steps[nearestSliderStep(value, settings.steps)] ?? settings.min
    }

    return Math.max(
      settings.min,
      Math.min(
        settings.max,
        Math.round((value - settings.min) / settings.step) * settings.step + settings.min,
      ),
    )
  }

export const sliderPixel: (
  value: number,
  settings: typeof SliderSettings.Type,
  width: number,
) => number = function sliderPixel(
  value: number,
  settings: typeof SliderSettings.Type,
  width: number,
) {
  return settings.max === settings.min
    ? 0
    : ((value - settings.min) / (settings.max - settings.min)) * (width - 20)
}

export const sliderFromPixel: (
  pixel: number,
  settings: typeof SliderSettings.Type,
  width: number,
) => number = function sliderFromPixel(
  pixel: number,
  settings: typeof SliderSettings.Type,
  width: number,
) {
  return width <= 20
    ? settings.min
    : sliderSnap((pixel / (width - 20)) * (settings.max - settings.min) + settings.min, settings)
}

export const sliderReplace: (value: SliderValue, index: number, next: number) => SliderValue =
  function sliderReplace(value: SliderValue, index: number, next: number) {
    if (Predicate.isNumber(value)) {
      return next
    }

    return index === 0 ? [next, value[1]] : [value[0], next]
  }

export const sliderRangeClamp: (
  pixel: number,
  index: number,
  range: boolean,
  x0: number,
  x1: number,
) => number = function sliderRangeClamp(
  pixel: number,
  index: number,
  range: boolean,
  x0: number,
  x1: number,
) {
  if (!range) {
    return pixel
  }

  return index === 0 ? Math.min(pixel, x1 - 10) : Math.max(pixel, x0 + 10)
}

export const sliderTargets: (model: SliderModel) => SliderModel = function sliderTargets(
  model: SliderModel,
) {
  const { settings } = model
  const values = sliderValues(settings.value)

  const minimumOffset = settings.variant === 'pips' ? 8 : 17

  return modifyFields(model, {
    x0: () => sliderPixel(values[0] ?? settings.min, settings, model.width),
    x1: () => sliderPixel(values[1] ?? settings.min, settings, model.width),
    fill: () =>
      settings.max === settings.min
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((values[0] ?? settings.min) - settings.min) / (settings.max - settings.min),
            ),
          ),
    zero: () => (values[0] === settings.min ? minimumOffset : 0),
  })
}

export const sliderInitial: (config: SliderConfig) => SliderModel = function sliderInitial(
  config: SliderConfig,
) {
  return sliderTargets({
    id: config.id,
    settings: sliderSettings(config),
    width: 0,
    ready: false,
    hovered: false,
    hoverDelayDone: false,
    generation: 0,
    drag: 'idle',
    activeThumb: 0,
    dragTargetValue: sliderValues(config.value)[0] ?? 0,
    focusedThumb: Option.none(),
    editingIndex: Option.none(),
    draft: '',
    preview: Option.none(),
    x0: 0,
    x1: 0,
    fill: 0,
    zero: 0,
    immediate: true,
    revision: 0,
  })
}

export const SliderValue = Schema.Union([
  Schema.Number,
  Schema.Tuple([Schema.Number, Schema.Number]),
])

export type SliderValue = typeof SliderValue.Type

export type ValuePosition = 'left' | 'right' | 'top' | 'bottom' | 'tooltip'

const SliderAppearance = Schema.Struct({
  showSteps: Schema.Boolean,
  showValue: Schema.Boolean,
  valuePosition: Schema.Literals(['left', 'right', 'top', 'bottom', 'tooltip']),
  trackClassName: Schema.String,
  trackStyle: Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Number])),
  fillClassName: Schema.String,
  fillStyle: Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Number])),
  hideFill: Schema.Boolean,
  thumbColor: Schema.String,
  thumbBorderColor: Schema.String,
})

export const SliderSettings = Schema.Struct({
  appearance: SliderAppearance,
  value: SliderValue,
  min: Schema.Number,
  max: Schema.Number,
  step: Schema.Number,
  steps: Schema.Array(Schema.Number),
  compact: Schema.Boolean,
  variant: Schema.Literals(['pips', 'scrubber']),
  disabled: Schema.Boolean,
})

export const SliderConfig = Schema.Struct({
  id: Schema.String,
  value: SliderValue,
  min: Schema.optionalKey(Schema.Number),
  max: Schema.optionalKey(Schema.Number),
  step: Schema.optionalKey(Schema.Number),
  steps: Schema.optionalKey(Schema.Array(Schema.Number)),
  size: Schema.optionalKey(Schema.Literals(['default', 'compact'])),
  variant: Schema.optionalKey(SliderSettings.fields.variant),
  showSteps: Schema.optionalKey(Schema.Boolean),
  showValue: Schema.optionalKey(Schema.Boolean),
  valuePosition: Schema.optionalKey(SliderAppearance.fields.valuePosition),
  trackClassName: Schema.optionalKey(Schema.String),
  trackStyle: Schema.optionalKey(SliderAppearance.fields.trackStyle),
  fillClassName: Schema.optionalKey(Schema.String),
  fillStyle: Schema.optionalKey(SliderAppearance.fields.fillStyle),
  hideFill: Schema.optionalKey(Schema.Boolean),
  thumbColor: Schema.optionalKey(Schema.String),
  thumbBorderColor: Schema.optionalKey(Schema.String),
  disabled: Schema.optionalKey(Schema.Boolean),
})

export type SliderConfig = typeof SliderConfig.Type

export const SliderPreview = Schema.Struct({
  left: Schema.Number,
  width: Schema.Number,
  value: Schema.Number,
  cursor: Schema.Number,
})

export const SliderModel = Schema.Struct({
  id: Schema.String,
  settings: SliderSettings,
  width: Schema.Number,
  ready: Schema.Boolean,
  hovered: Schema.Boolean,
  hoverDelayDone: Schema.Boolean,
  generation: Schema.Natural,
  drag: Schema.Literals(['idle', 'row', 'handle']),
  activeThumb: Schema.Int,
  dragTargetValue: Schema.Number,
  focusedThumb: Schema.OptionFromNullOr(Schema.Int),
  editingIndex: Schema.OptionFromNullOr(Schema.Int),
  draft: Schema.String,
  preview: Schema.OptionFromNullOr(SliderPreview),
  x0: Schema.Number,
  x1: Schema.Number,
  fill: Schema.Number,
  zero: Schema.Number,
  immediate: Schema.Boolean,
  revision: Schema.Natural,
})

export type SliderModel = typeof SliderModel.Type
