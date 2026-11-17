import { modifyFields } from 'foldkit/struct'
import { Option, Predicate, Number } from 'effect'
import type { SliderObservation } from './slider-observer.js'
import {
  nearestSliderStep,
  sliderFromPixel,
  sliderPixel,
  sliderRangeClamp,
  sliderReplace,
  sliderSnap,
  sliderValues,
} from './slider-state.js'
import type { SliderModel, SliderValue } from './slider-state.js'

type PointerEvent = typeof SliderObservation.CapturedPointer.Type

interface SliderPointerResult {
  readonly model: SliderModel
  readonly value?: SliderValue
}

interface PointerPosition {
  readonly value: number
  readonly pixel: number
  readonly active: number
  readonly preview: SliderModel['preview']
}

const sliderEdge = (
  value: number,
  settings: SliderModel['settings'],
  width: number,
  cursor: number,
) => {
  if (value === settings.min) {
    return 0
  }

  if (value === settings.max) {
    return width
  }

  return cursor
}

const sliderZero = (value: number, settings: SliderModel['settings']) => {
  if (value !== settings.min) {
    return 0
  }

  return settings.variant === 'pips' ? 8 : 17
}

function releasedPointer(model: SliderModel): SliderPointerResult {
  const released: SliderModel = modifyFields(model, {
    drag: () => 'idle',
    preview: () => Option.none(),
    immediate: () => false,
    revision: Number.increment,
  })

  if (!model.settings.compact) {
    return { model: released }
  }

  const pixel = sliderPixel(model.dragTargetValue, model.settings, model.width)

  return {
    model:
      model.activeThumb === 0
        ? modifyFields(released, { x0: () => pixel })
        : modifyFields(released, { x1: () => pixel }),
  }
}

function compactPosition(model: SliderModel, event: PointerEvent): PointerPosition {
  const { settings } = model
  const down = event.phase === 'down'
  const preview = event.phase === 'preview'

  const cursor = (event.clientX - event.left) / (event.visualWidth / event.width)
  const px = Math.max(0, Math.min(event.width - 20, cursor - 10))
  let value = sliderFromPixel(px, settings, event.width)
  let pixel = sliderPixel(value, settings, event.width)
  let active = model.activeThumb

  if (down || preview) {
    active =
      !Predicate.isNumber(settings.value) &&
      Math.abs((down ? px : pixel) - event.x0) > Math.abs((down ? px : pixel) - event.x1)
        ? 1
        : 0
  }

  if (preview) {
    const nearest = (active === 0 ? event.x0 : event.x1) + 10
    const cursorX = pixel + 10
    const edge = sliderEdge(value, settings, event.width, cursorX)

    return {
      value,
      pixel,
      active,
      preview: Option.some({
        left: Math.min(nearest, edge),
        width: Math.abs(edge - nearest),
        value,
        cursor: cursorX,
      }),
    }
  }

  pixel = sliderRangeClamp(pixel, active, !Predicate.isNumber(settings.value), event.x0, event.x1)
  value = sliderFromPixel(pixel, settings, event.width)

  return { value, pixel, active, preview: Option.none() }
}

function comfortablePosition(model: SliderModel, event: PointerEvent): PointerPosition {
  const { settings, activeThumb: active } = model
  const preview = event.phase === 'preview'

  const normalized = preview
    ? ((event.clientX - event.left) / (event.visualWidth / event.width) -
        (event.width - event.clientWidth) / 2) /
      event.clientWidth
    : (event.clientX - event.left) / event.visualWidth

  const fraction = Math.max(0, Math.min(1, normalized))
  let value: number

  if (settings.variant === 'pips') {
    const count = Math.round((settings.max - settings.min) / settings.step) + 1
    value =
      settings.min +
      Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1)))) * settings.step
  } else {
    value = sliderSnap(settings.min + fraction * (settings.max - settings.min), settings)
  }

  if (!preview) {
    return { value, pixel: 0, active, preview: Option.none() }
  }

  const p =
    settings.max === settings.min ? 0 : (value - settings.min) / (settings.max - settings.min)

  const cursor = p * event.clientWidth

  const handle =
    event.fill * event.clientWidth +
    (settings.variant === 'pips' ? 20 - 20 * event.fill - event.zero * 2.5 : 0)

  const edge = sliderEdge(value, settings, event.clientWidth, cursor)

  return {
    value,
    pixel: 0,
    active,
    preview: Option.some({
      left: Math.min(handle, edge),
      width: Math.abs(edge - handle),
      value,
      cursor,
    }),
  }
}

function applyPointer(
  model: SliderModel,
  event: PointerEvent,
  position: PointerPosition,
): SliderPointerResult {
  const { settings } = model
  const { compact } = settings
  const { value, active, pixel } = position
  const down = event.phase === 'down'

  const fill =
    settings.max === settings.min
      ? 0
      : Math.max(0, Math.min(1, (value - settings.min) / (settings.max - settings.min)))

  let { drag } = model

  if (down) {
    drag = event.handle ? 'handle' : 'row'
  }

  return {
    model: modifyFields(model, {
      activeThumb: () => active,
      dragTargetValue: () => value,
      drag: () => drag,
      immediate: () =>
        compact ? !down : event.handle || (!down && settings.variant === 'scrubber'),
      x0: (currentX0) => (compact && active === 0 ? pixel : currentX0),
      x1: (currentX1) => (compact && active === 1 ? pixel : currentX1),
      fill: (currentFill) => (compact ? currentFill : fill),
      zero: () => sliderZero(value, settings),
      revision: Number.increment,
    }),
    value: sliderReplace(settings.value, active, value),
  }
}

export function sliderPointer(model: SliderModel, event: PointerEvent): SliderPointerResult {
  const { settings } = model
  const preview = event.phase === 'preview'
  const down = event.phase === 'down'

  if (preview && (model.drag !== 'idle' || (!settings.compact && settings.disabled))) {
    return { model }
  }

  if (down && (settings.disabled || !event.primary)) {
    return { model }
  }

  if (event.phase === 'up' || event.phase === 'cancel') {
    return model.drag === 'idle' ? { model } : releasedPointer(model)
  }

  if (!preview && !down && model.drag === 'idle') {
    return { model }
  }

  if (event.visualWidth <= 0 || event.width <= 0) {
    return { model }
  }

  const position = settings.compact
    ? compactPosition(model, event)
    : comfortablePosition(model, event)

  return Option.isSome(position.preview)
    ? { model: modifyFields(model, { preview: () => position.preview }) }
    : applyPointer(model, event, position)
}

function keyboardPosition(
  key: string,
  index: number,
  values: ReadonlyArray<number>,
  min: number,
  max: number,
  next: number,
) {
  if (key === 'Home') {
    return values.length > 1 ? (values[index - 1] ?? min) : min
  }

  if (key === 'End') {
    return values.length > 1 ? (values[index + 1] ?? max) : max
  }

  return next
}

export function sliderKeyboard(
  model: SliderModel,
  index: number,
  key: string,
  shift: boolean,
): SliderValue | undefined {
  if (model.settings.disabled || (model.settings.compact && model.drag !== 'idle')) {
    return undefined
  }

  const { settings } = model
  const values = sliderValues(settings.value)
  const current = values[index] ?? settings.min
  const list = settings.steps
  const old = list.length > 1 ? nearestSliderStep(current, list) : current
  const min = list.length > 1 ? 0 : settings.min
  const max = list.length > 1 ? list.length - 1 : settings.max
  const step = list.length > 1 ? 1 : settings.step
  const direction = ['ArrowLeft', 'ArrowDown', 'PageDown'].includes(key) ? -1 : 1
  const large = shift || key.startsWith('Page')
  const increment = large ? step * 10 : step

  const next = keyboardPosition(
    key,
    index,
    values,
    min,
    max,
    Math.max(min, Math.min(max, old + direction * increment)),
  )

  const value =
    list.length > 1 ? (list[Math.round(next)] ?? settings.min) : sliderSnap(next, settings)

  let result = sliderReplace(settings.value, index, value)

  if (!Predicate.isNumber(result)) {
    result =
      index === 0
        ? [Math.min(result[0], values[1] ?? result[0]), result[1]]
        : [result[0], Math.max(result[1], values[0] ?? result[1])]
  }

  return JSON.stringify(result) === JSON.stringify(settings.value) ? undefined : result
}
