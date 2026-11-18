import { HoverMode } from './hover-observation.js'
import { Clock, Effect, Schema } from 'effect'
import { prepareCalendar, type CalendarPreparedConfig } from './calendar-environment.js'
import {
  Selection,
  SelectionControl,
  restoreDate,
  type CalendarPresentation,
} from './calendar-state.js'
import {
  initialDatePicker,
  type DatePickerInitialControls,
  type DatePickerState,
} from './date-picker-state.js'

export const pickerCalendarPresentation: (
  state: DatePickerState,
  presentation: DatePickerPresentation,
) => CalendarPresentation = function pickerCalendarPresentation(
  state: DatePickerState,
  presentation: DatePickerPresentation,
) {
  const numberOfMonths = presentation.numberOfMonths ?? (state.mode === 'range' ? 2 : 1)

  return {
    ...(presentation.hoverMode === undefined ? {} : { hoverMode: presentation.hoverMode }),
    numberOfMonths,
    showWeekNumber: presentation.showWeekNumber,
    orientation:
      numberOfMonths === 1
        ? 'auto'
        : presentation.orientation === 'auto'
          ? state.layout
          : presentation.orientation,
  }
}

export const calendarControl: (
  state: DatePickerState,
  presentation: DatePickerPresentation,
) => typeof SelectionControl.Type = function calendarControl(
  state: DatePickerState,
  presentation: DatePickerPresentation,
) {
  return {
    mode: state.mode,
    controlled: true,
    selected: state.draft ?? state.value,
    required: state.mode === 'single' || presentation.required,
    min: presentation.min,
    max: presentation.max,
  }
}

export const pickerOpening: (
  state: DatePickerState,
  presentation: DatePickerPresentation,
  now: number,
  viewportWidth: number | null,
) => DatePickerOpening = function pickerOpening(
  state: DatePickerState,
  presentation: DatePickerPresentation,
  now: number,
  viewportWidth: number | null,
) {
  return {
    now,
    viewportWidth,
    orientation: presentation.orientation,
    numberOfMonths: presentation.numberOfMonths ?? (state.mode === 'range' ? 2 : 1),
    cellSize: presentation.cellSize ?? (presentation.compact ? 32 : 36),
    showWeekNumber: presentation.showWeekNumber,
    presetsCount: state.mode === 'range' ? presentation.presets.length : 0,
  }
}

export const pickerHasClear: (
  state: DatePickerState,
  presentation: DatePickerPresentation,
) => boolean = function pickerHasClear(
  state: DatePickerState,
  presentation: DatePickerPresentation,
) {
  const hasDate =
    state.mode === 'single'
      ? state.value._tag === 'Single'
      : state.value._tag === 'Range' && state.value.from !== null

  return (
    presentation.variant === 'outline' &&
    presentation.clearable &&
    (hasDate || (state.hasTime && !!state.time) || (state.hasTimeRange && state.timeRange !== null))
  )
}

export { timeFieldConfig } from './date-picker-time-config.js'
import type { DatePickerOpening } from './date-picker-transition.js'

export const DatePickerPresentation = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  compact: Schema.Boolean,
  disabled: Schema.Boolean,
  variant: Schema.Literals(['outline', 'ghost']),
  orientation: Schema.Literals(['auto', 'horizontal', 'vertical']),
  numberOfMonths: Schema.NullOr(Schema.Literals([1, 2])),
  cellSize: Schema.NullOr(Schema.Number),
  showWeekNumber: Schema.Boolean,
  locale: Schema.NullOr(Schema.String),
  hourCycle: Schema.NullOr(Schema.Literals([12, 24])),
  step: Schema.Number,
  triggerId: Schema.NullOr(Schema.String),
  placeholder: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
  ariaLabel: Schema.NullOr(Schema.String),
  clearable: Schema.Boolean,
  className: Schema.String,
  required: Schema.Boolean,
  min: Schema.Number,
  max: Schema.Number,
  presets: Schema.Array(Schema.Struct({ label: Schema.String, range: Selection.cases.Range })),
})

export type DatePickerPresentation = typeof DatePickerPresentation.Type

export interface DatePickerPreparedConfig {
  readonly initial: DatePickerState
  readonly calendar: CalendarPreparedConfig
  readonly presentation: DatePickerPresentation
  readonly now: number
}

export const prepareDatePicker = Effect.fn('FluidDatePicker.prepare')(function* (
  controls: DatePickerInitialControls,
  presentation: DatePickerPresentation,
  calendarRevision: number = 0,
) {
  const initial = initialDatePicker(controls)

  const selected =
    initial.value._tag === 'Single'
      ? restoreDate(initial.value.date)
      : initial.value._tag === 'Range'
        ? {
            from: initial.value.from === null ? undefined : restoreDate(initial.value.from),
            to: initial.value.to === null ? undefined : restoreDate(initial.value.to),
          }
        : undefined

  const calendar = yield* prepareCalendar({
    id: `${controls.id}-calendar`,
    mode: initial.mode,
    controlled: true,

    ...(selected === undefined ? {} : { selected }),
    required: initial.mode === 'single' || presentation.required,
    min: presentation.min,
    max: presentation.max,
    revision: calendarRevision,
    autoFocus: true,
    presentation: pickerCalendarPresentation(initial, presentation),
  })

  const clock = yield* Clock.Clock
  const now = clock.currentTimeMillisUnsafe()

  return { initial, calendar, presentation, now } satisfies DatePickerPreparedConfig
})
