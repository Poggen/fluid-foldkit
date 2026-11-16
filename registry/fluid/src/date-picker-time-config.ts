import { Schema } from 'effect'
import { instantDate } from './calendar-domain/date-boundary.js'
import type { DatePickerPresentation } from './date-picker-config.js'
import type { DatePickerState } from './date-picker-state.js'
import {
  buildSlots,
  makeTimeFormatter,
  resolveHourCycle,
  timeToMinutes,
} from './date-picker-format.js'
import { HoverMode } from './hover-observation.js'
import type { TimeFieldConfig } from './date-picker-time-state.js'

const TimeFieldInputs = Schema.Struct({
  hoverMode: HoverMode,
  id: Schema.String,
  value: Schema.NullOr(Schema.Number),
  after: Schema.NullOr(Schema.Number),
  step: Schema.Number,
  locale: Schema.NullOr(Schema.String),
  hourCycle: Schema.NullOr(Schema.Literals([12, 24])),
  fallback: Schema.Number,
  disabled: Schema.Boolean,
  label: Schema.String,
  placeholder: Schema.String,
})
type TimeFieldInputs = typeof TimeFieldInputs.Type

export const timeFieldInputsEqual = Schema.toEquivalence(TimeFieldInputs)

// This projection drives both construction and equality: formatting dependencies
// cannot be added to the builder without also entering the comparison boundary.
export function timeFieldInputs(
  state: DatePickerState,
  presentation: DatePickerPresentation,
  now: number,
  end: boolean,
): TimeFieldInputs {
  const date = instantDate(now)
  const nowMinutes = date.getHours() * 60 + date.getMinutes()
  const start = timeToMinutes(state.timeRange?.start)
  return {
    hoverMode: presentation.hoverMode ?? 'fluid',
    id: `${state.id}-${end ? 'end' : 'time'}`,
    value: end
      ? timeToMinutes(state.timeRange?.end)
      : state.hasTime
        ? timeToMinutes(state.time)
        : start,
    after: end ? (start ?? nowMinutes - (nowMinutes % presentation.step)) : null,
    step: presentation.step,
    locale: presentation.locale,
    hourCycle: presentation.hourCycle,
    fallback: end ? (start ?? nowMinutes) + 60 : nowMinutes,
    disabled: presentation.disabled,
    label: end ? 'End time' : state.hasTime ? 'Time' : 'Start time',
    placeholder: end ? 'End' : state.hasTime ? 'Time' : 'Start',
  }
}

export function timeFieldConfigFromInputs(input: TimeFieldInputs): typeof TimeFieldConfig.Type {
  const slots = buildSlots(input.step, input.after ?? undefined)
  const locale = input.locale ?? undefined
  const hourCycle = resolveHourCycle(locale, input.hourCycle ?? undefined)
  const format = makeTimeFormatter(hourCycle, locale)
  const labels = slots.map((slot) => format(slot.minutes))
  const widest = labels.reduce(
    (longest, label) => (label.length > longest.length ? label : longest),
    '',
  )
  const twin = widest.replace(/AM|PM/, (part) => (part === 'AM' ? 'PM' : 'AM'))
  return {
    hoverMode: input.hoverMode,
    id: input.id,
    value: input.value,
    display: input.value === null ? '' : format(input.value),
    slots: slots.map((slot, index) => ({
      minutes: slot.minutes,
      duration: slot.duration ?? null,
      label: labels[index] ?? '',
    })),
    widestLabels: widest === twin ? [widest] : [widest, twin],
    fallback: input.fallback,
    disabled: input.disabled,
    label: input.label,
    placeholder: input.placeholder,
  }
}

export const timeFieldConfig = (
  state: DatePickerState,
  presentation: DatePickerPresentation,
  now: number,
  end: boolean,
): typeof TimeFieldConfig.Type =>
  timeFieldConfigFromInputs(timeFieldInputs(state, presentation, now, end))
