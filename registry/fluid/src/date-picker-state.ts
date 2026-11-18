import { Schema } from 'effect'
import { DateValue, Selection, selectionValue } from './calendar-state.js'
import type { DateRange } from './calendar-domain/matcher-types.js'

export const initialDatePicker: (config: DatePickerInitialControls) => DatePickerState =
  function initialDatePicker(config: DatePickerInitialControls) {
    return DatePickerState.make({
      id: config.id,
      mode: config.mode ?? 'single',
      internalValue: selectionValue(config.defaultValue),
      internalOpen: config.defaultOpen ?? false,
      internalTime: config.defaultTime ?? null,
      internalTimeRange: config.defaultTimeRange ?? null,
      value: selectionValue('value' in config ? config.value : config.defaultValue),
      controlledValue: 'value' in config,
      open: ('open' in config ? config.open : config.defaultOpen) ?? false,
      controlledOpen: 'open' in config,
      time: ('time' in config ? config.time : config.defaultTime) ?? null,
      controlledTime: 'time' in config,
      hasTime: 'time' in config || 'defaultTime' in config,
      timeRange: ('timeRange' in config ? config.timeRange : config.defaultTimeRange) ?? null,
      controlledTimeRange: 'timeRange' in config,
      hasTimeRange: 'timeRange' in config || 'defaultTimeRange' in config,
      draft: null,
      month: null,
      layout: 'horizontal',
      ackGeneration: 0,
      ackPending: false,
      ackControlledOpen: 'open' in config,
    })
  }

const TimeRange = Schema.Struct({ start: Schema.String, end: Schema.String })

export const DatePickerState = Schema.Struct({
  id: Schema.String,
  mode: Schema.Literals(['single', 'range']),
  value: Selection,
  internalValue: Selection,
  controlledValue: Schema.Boolean,
  internalOpen: Schema.Boolean,
  internalTime: Schema.NullOr(Schema.String),
  internalTimeRange: Schema.NullOr(TimeRange),
  open: Schema.Boolean,
  controlledOpen: Schema.Boolean,
  time: Schema.NullOr(Schema.String),
  controlledTime: Schema.Boolean,
  hasTime: Schema.Boolean,
  timeRange: Schema.NullOr(TimeRange),
  controlledTimeRange: Schema.Boolean,
  hasTimeRange: Schema.Boolean,
  draft: Schema.NullOr(Selection.cases.Range),
  month: Schema.NullOr(DateValue),
  layout: Schema.Literals(['horizontal', 'vertical']),
  ackGeneration: Schema.Int,
  ackPending: Schema.Boolean,
  ackControlledOpen: Schema.Boolean,
})

export type DatePickerState = typeof DatePickerState.Type

export const DatePickerEvent = Schema.TaggedUnion({
  ValueChanged: { value: Selection },
  OpenChanged: { open: Schema.Boolean },
  TimeChanged: { time: Schema.NullOr(Schema.String) },
  TimeRangeChanged: { range: Schema.NullOr(TimeRange) },
})

export type DatePickerEvent = typeof DatePickerEvent.Type

export const DatePickerAction = Schema.TaggedUnion({
  CalendarSelected: { value: Selection },
  PresetSelected: { value: Selection.cases.Range },
  OpenRequested: { open: Schema.Boolean },
  Cleared: {},
  TimeCommitted: { minutes: Schema.Finite },
  StartCommitted: { minutes: Schema.Finite },
  EndCommitted: { minutes: Schema.Finite },
  AckElapsed: { generation: Schema.Int },
  MonthChanged: { month: DateValue },
  Accepted: {
    mode: Schema.Literals(['single', 'range']),
    value: Selection,
    controlledValue: Schema.Boolean,
    open: Schema.Boolean,
    controlledOpen: Schema.Boolean,
    time: Schema.NullOr(Schema.String),
    controlledTime: Schema.Boolean,
    hasTime: Schema.Boolean,
    timeRange: Schema.NullOr(TimeRange),
    controlledTimeRange: Schema.Boolean,
    hasTimeRange: Schema.Boolean,
  },
  Disposed: {},
})

export type DatePickerAction = typeof DatePickerAction.Type

interface DatePickerSharedControls {
  readonly id: string
  readonly open?: boolean | undefined
  readonly defaultOpen?: boolean | undefined
  readonly time?: string | null | undefined
  readonly defaultTime?: string | null | undefined
  readonly timeRange?: typeof TimeRange.Type | null | undefined
  readonly defaultTimeRange?: typeof TimeRange.Type | null | undefined
}

export type DatePickerInitialControls = DatePickerSharedControls &
  (
    | {
        readonly mode?: 'single'
        readonly value?: Date | undefined
        readonly defaultValue?: Date | undefined
      }
    | {
        readonly mode: 'range'
        readonly value?: DateRange | undefined
        readonly defaultValue?: DateRange | undefined
      }
  )
