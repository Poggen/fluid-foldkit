import { HoverMode } from './hover-observation.js'
import { PresentationProjectionFields } from './calendar-view/presentation.js'

import { Schema } from 'effect'
import { instantDate, zonedDate } from './calendar-domain/date-boundary.js'
import { TZDate } from '@date-fns/tz'
import { UTCDateMini } from '@date-fns/utc'
import { dayNumber } from './calendar-domain/rules.js'
import type { DateRange } from './calendar-domain/matcher-types.js'

export const dateValue: (date: Date) => DateValue = function dateValue(date: Date) {
  const timeZone = date instanceof TZDate ? (date.timeZone ?? null) : null

  return {
    timestamp: date.getTime(),
    ordinal: dayNumber(date),
    timeZone: date instanceof UTCDateMini ? 'UTC' : timeZone,
  }
}

export const restoreDate: (value: DateValue) => Date = function restoreDate(value: DateValue) {
  return value.timeZone === null
    ? instantDate(value.timestamp)
    : zonedDate(value.timestamp, value.timeZone)
}

export const selectionValue: (value?: Date | DateRange) => Selection = function selectionValue(
  value?: Date | DateRange,
) {
  if (value === undefined) {
    return Selection.cases.Empty.make({})
  }

  if (value instanceof Date) {
    return Selection.cases.Single.make({ date: dateValue(value) })
  }

  return Selection.cases.Range.make({
    from: value.from ? dateValue(value.from) : null,
    to: value.to ? dateValue(value.to) : null,
  })
}

export const DateValue = Schema.Struct({
  timestamp: Schema.Finite,
  ordinal: Schema.Int,
  timeZone: Schema.NullOr(Schema.String),
})

export type DateValue = typeof DateValue.Type

export const Selection = Schema.TaggedUnion({
  Empty: {},
  Single: { date: DateValue },
  Range: { from: Schema.NullOr(DateValue), to: Schema.NullOr(DateValue) },
})

export type Selection = typeof Selection.Type

export const SelectionControl = Schema.Struct({
  mode: Schema.Literals(['single', 'range']),
  controlled: Schema.Boolean,
  selected: Selection,
  required: Schema.Boolean,
  min: Schema.Number,
  max: Schema.Number,
})

export const Modifiers = Schema.Record(Schema.String, Schema.Boolean)

export const Day = Schema.Struct({
  date: Schema.Finite,
  displayMonth: Schema.Finite,
  ordinal: Schema.Int,
  isoDate: Schema.String,
  monthId: Schema.String,
  displayMonthId: Schema.String,
  text: Schema.String,
  label: Schema.String,
  flags: Modifiers,
  tabStop: Schema.Boolean,
})

export const Week = Schema.Struct({
  number: Schema.Int,
  text: Schema.String,
  label: Schema.String,
  days: Schema.Array(Day),
})

export const Month = Schema.Struct({
  date: Schema.Finite,
  caption: Schema.String,
  label: Schema.String,
  weeks: Schema.Array(Week),
})

export const Projection = Schema.Struct({
  ...PresentationProjectionFields,
  months: Schema.Array(Month),
  weekdays: Schema.Array(Schema.Struct({ text: Schema.String, label: Schema.String })),
  previous: Schema.NullOr(DateValue),
  next: Schema.NullOr(DateValue),
  previousLabel: Schema.String,
  nextLabel: Schema.String,
  weekNumberHeader: Schema.String,
  weekNumberLabel: Schema.String,
  timeZone: Schema.NullOr(Schema.String),
  showWeekNumber: Schema.Boolean,
  hideWeekdays: Schema.Boolean,
  hideNavigation: Schema.Boolean,
  focused: Schema.NullOr(Schema.Finite),
  firstMonth: Schema.Finite,
})

export type Projection = typeof Projection.Type

export const CalendarPresentation = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  numberOfMonths: Schema.NullOr(Schema.Literals([1, 2])),
  orientation: Schema.Literals(['auto', 'horizontal', 'vertical']),
  showWeekNumber: Schema.optionalKey(Schema.Boolean),
})

export type CalendarPresentation = typeof CalendarPresentation.Type

export const CalendarState = Schema.Struct({
  presentation: CalendarPresentation,
  hoverOrdinal: Schema.NullOr(Schema.Int),
  id: Schema.String,
  revision: Schema.Int,
  selection: SelectionControl,
  internalSelection: Selection,
  month: DateValue,
  internalMonth: DateValue,
  controlledMonth: Schema.Boolean,
  focused: Schema.NullOr(Schema.Finite),
  focusedDisplayMonth: Schema.NullOr(Schema.Finite),
  lastFocused: Schema.NullOr(Schema.Finite),
  lastFocusedDisplayMonth: Schema.NullOr(Schema.Finite),
  beforePick: Selection,
  autoFocus: Schema.Boolean,
  projection: Projection,
})

export type CalendarState = typeof CalendarState.Type

export const Event = Schema.TaggedUnion({
  Selected: { value: Selection },
  MonthChanged: { month: DateValue },
  PreviousClicked: { month: DateValue },
  NextClicked: { month: DateValue },
  DayClicked: { date: Schema.Finite, modifiers: Modifiers },
  DayFocused: { date: Schema.Finite, modifiers: Modifiers },
  DayBlurred: { date: Schema.Finite, modifiers: Modifiers },
  DayMouseEntered: { date: Schema.Finite, modifiers: Modifiers },
  DayMouseLeft: { date: Schema.Finite, modifiers: Modifiers },
  DayKeyDown: {
    date: Schema.Finite,
    modifiers: Modifiers,
    key: Schema.String,
    shift: Schema.Boolean,
  },
})

export type Event = typeof Event.Type

export const Action = Schema.TaggedUnion({
  OccurrenceFocus: {},
  HoverPreview: { ordinal: Schema.NullOr(Schema.Int) },
  Picked: { date: Schema.Finite, displayMonth: Schema.Finite, modifiers: Modifiers },
  Focused: { date: Schema.Finite, displayMonth: Schema.Finite, modifiers: Modifiers },
  Blurred: { date: Schema.Finite, modifiers: Modifiers },
  MouseEntered: { date: Schema.Finite, modifiers: Modifiers },
  MouseLeft: { date: Schema.Finite, modifiers: Modifiers },
  KeyDown: { date: Schema.Finite, modifiers: Modifiers, key: Schema.String, shift: Schema.Boolean },
  Navigated: { direction: Schema.Literals(['previous', 'next']) },
  MonthRequested: { month: DateValue },
  Escaped: {},
  Accepted: {
    selection: SelectionControl,
    month: Schema.NullOr(DateValue),
    controlledMonth: Schema.Boolean,
  },
  Synchronized: {
    selection: SelectionControl,
    month: Schema.NullOr(DateValue),
    controlledMonth: Schema.Boolean,
    presentation: CalendarPresentation,
    occurrenceFocus: Schema.Boolean,
  },
  Refreshed: { revision: Schema.Int },
  Presented: { presentation: CalendarPresentation },
})

export type Action = typeof Action.Type
