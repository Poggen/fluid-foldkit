import { Number } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { instantDate } from './calendar-domain/date-boundary.js'

import { minutesToTime, shiftEnd, timeToMinutes } from './date-picker-format.js'
import { dateValue, restoreDate, type Selection } from './calendar-state.js'
import {
  DatePickerAction,
  type DatePickerEvent,
  type DatePickerState,
} from './date-picker-state.js'

export interface DatePickerOpening {
  readonly now: number
  readonly viewportWidth: number | null
  readonly orientation: 'auto' | 'horizontal' | 'vertical'
  readonly numberOfMonths: 1 | 2
  readonly cellSize: number
  readonly showWeekNumber: boolean
  readonly presetsCount: number
}

export function transitionDatePicker(
  input: DatePickerState,
  action: DatePickerAction,
  opening: DatePickerOpening,
) {
  let state = input
  const events: Array<DatePickerEvent> = []
  let scheduleAck = false
  let cancelAck = false

  const value = (next: Selection) => {
    if (!state.controlledValue)
      state = modifyFields(state, { value: () => next, internalValue: () => next })
    events.push({ _tag: 'ValueChanged', value: next })
  }

  const time = (next: string | null) => {
    if (!state.controlledTime)
      state = modifyFields(state, { time: () => next, internalTime: () => next })
    events.push({ _tag: 'TimeChanged', time: next })
  }

  const timeRange = (range: DatePickerState['timeRange']) => {
    if (!state.controlledTimeRange)
      state = modifyFields(state, { timeRange: () => range, internalTimeRange: () => range })
    events.push({ _tag: 'TimeRangeChanged', range })
  }

  const acknowledge = () => {
    state = modifyFields(state, {
      ackGeneration: Number.increment,
      ackPending: () => true,
      ackControlledOpen: () => state.controlledOpen,
    })
    scheduleAck = true
    cancelAck = true
  }

  const open = (next: boolean, controlledAtRequest = state.controlledOpen) => {
    cancelAck = true
    state = modifyFields(state, { ackGeneration: Number.increment, ackPending: () => false })

    if (next) {
      const anchor =
        state.value._tag === 'Single'
          ? state.value.date
          : state.value._tag === 'Range'
            ? state.value.from
            : null

      state = modifyFields(state, { month: () => anchor ?? dateValue(instantDate(opening.now)) })

      if (
        opening.orientation === 'auto' &&
        opening.numberOfMonths > 1 &&
        opening.viewportWidth !== null
      ) {
        const needed =
          (7 + (opening.showWeekNumber ? 0.75 : 0)) * opening.cellSize * 2 +
          48 +
          (opening.presetsCount ? 152 : 0)

        const viewportWidth = opening.viewportWidth
        state = modifyFields(state, {
          layout: () => (viewportWidth - 16 >= needed ? 'horizontal' : 'vertical'),
        })
      }
    } else state = modifyFields(state, { draft: () => null })

    if (!controlledAtRequest)
      state = modifyFields(state, {
        internalOpen: () => next,
        open: () => (state.controlledOpen ? state.open : next),
      })
    events.push({ _tag: 'OpenChanged', open: next })
  }

  DatePickerAction.match(action, {
    CalendarSelected: (action) => {
      const next = action.value
      if (state.mode === 'single') {
        value(next)
        if (next._tag === 'Single') acknowledge()
        return
      }
      if (next._tag === 'Range' && next.from !== null && next.to === null) {
        state = modifyFields(state, { draft: () => next })
        return
      }
      const draft = state.draft
      state = modifyFields(state, { draft: () => null })
      if (draft === null) value(next)
      else if (
        next._tag === 'Range' &&
        next.from !== null &&
        next.to !== null &&
        draft.from !== null
      ) {
        const from = restoreDate(next.from)
        const to = restoreDate(next.to)
        const start = restoreDate(draft.from)
        const same = (date: Date) => date.toDateString() === start.toDateString()
        if (same(from) || same(to)) {
          value(next)
          acknowledge()
        }
      }
      return
    },
    PresetSelected: (action) => {
      state = modifyFields(state, {
        draft: () => null,
        month: (currentMonth) => action.value.from ?? currentMonth,
      })
      value(action.value)
      return
    },
    OpenRequested: (action) => {
      open(action.open)
      return
    },
    Cleared: (_action) => {
      value({ _tag: 'Empty' })
      state = modifyFields(state, { draft: () => null })
      if (state.hasTime) time(null)
      if (state.hasTimeRange) timeRange(null)
      return
    },
    TimeCommitted: (action) => {
      time(minutesToTime(action.minutes))
      return
    },
    StartCommitted: (action) => {
      const previousStart = timeToMinutes(state.timeRange?.start)
      const previousEnd = timeToMinutes(state.timeRange?.end)
      const start = previousStart ?? action.minutes
      const end = previousEnd ?? Math.min(action.minutes + 60, 1439)
      timeRange({
        start: minutesToTime(action.minutes),
        end: minutesToTime(previousEnd === null ? end : shiftEnd(start, end, action.minutes)),
      })
      return
    },
    EndCommitted: (action) => {
      const start = timeToMinutes(state.timeRange?.start) ?? Math.max(action.minutes - 60, 0)
      if (action.minutes > start)
        timeRange({ start: minutesToTime(start), end: minutesToTime(action.minutes) })
      return
    },
    AckElapsed: (action) => {
      if (state.ackPending && action.generation === state.ackGeneration)
        open(false, state.ackControlledOpen)
      return
    },
    MonthChanged: (action) => {
      state = modifyFields(state, { month: () => action.month })
      return
    },
    Accepted: (action) => {
      state = modifyFields(state, { mode: () => action.mode })
      state = modifyFields(state, {
        value: () => (action.controlledValue ? action.value : state.internalValue),
        controlledValue: () => action.controlledValue,
        open: () => (action.controlledOpen ? action.open : state.internalOpen),
        controlledOpen: () => action.controlledOpen,
        time: () => (action.controlledTime ? action.time : state.internalTime),
        controlledTime: () => action.controlledTime,
        hasTime: () => action.hasTime,
        timeRange: () => (action.controlledTimeRange ? action.timeRange : state.internalTimeRange),
        controlledTimeRange: () => action.controlledTimeRange,
        hasTimeRange: () => action.hasTimeRange,
      })
      return
    },
    Disposed: (_action) => {
      cancelAck = true
      state = modifyFields(state, { ackGeneration: Number.increment, ackPending: () => false })
      return
    },
  })

  return { state, events, scheduleAck, cancelAck }
}
