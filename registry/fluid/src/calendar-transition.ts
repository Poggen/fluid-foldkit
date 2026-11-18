import { modifyFields } from 'foldkit/struct'
import type { CalendarState, DateValue } from './calendar-state.js'
import {
  Action,
  Event,
  Selection,
  dateValue,
  restoreDate,
  selectionValue,
} from './calendar-state.js'
import { calendarDate, projectCalendar, selectedDate, selectedRange } from './calendar-project.js'
import { getInitialMonth, getNavMonths, nextFocus } from './calendar-domain/navigation.js'
import type { FocusDirection, FocusUnit } from './calendar-domain/navigation.js'
import { selectRange } from './calendar-domain/selection.js'
import type { CalendarRules } from './calendar-domain/rules.js'

const keyMovement: (
  key: string,
  shift: boolean,
  rtl: boolean,
) => readonly [FocusUnit, FocusDirection] | undefined = function keyMovement(
  key: string,
  shift: boolean,
  rtl: boolean,
) {
  switch (key) {
    case 'ArrowLeft': {
      return [shift ? 'month' : 'day', rtl ? 'after' : 'before']
    }
    case 'ArrowRight': {
      return [shift ? 'month' : 'day', rtl ? 'before' : 'after']
    }
    case 'ArrowDown': {
      return [shift ? 'year' : 'week', 'after']
    }
    case 'ArrowUp': {
      return [shift ? 'year' : 'week', 'before']
    }
    case 'PageUp': {
      return [shift ? 'year' : 'month', 'before']
    }
    case 'PageDown': {
      return [shift ? 'year' : 'month', 'after']
    }
    case 'Home': {
      return ['startOfWeek', 'before']
    }
    case 'End': {
      return ['endOfWeek', 'after']
    }
    default: {
      return undefined
    }
  }
}

const pickingRange: (state: CalendarState) => boolean = function pickingRange(
  state: CalendarState,
) {
  return (
    state.selection.mode === 'range' &&
    Selection.isAnyOf(['Range'])(state.selection.selected) &&
    state.selection.selected.from !== null &&
    state.selection.selected.to === null
  )
}

export const transitionCalendar: (
  input: CalendarState,
  action: Action,
  rules: CalendarRules,
) => CalendarTransition = function transitionCalendar(
  input: CalendarState,
  action: Action,
  rules: CalendarRules,
) {
  let state = input

  const events: Array<Event> = []

  let focus: number | null = null

  const lib = rules.dateLib

  const [start, end] = getNavMonths(rules.options, lib)

  const commit = (value: Selection) => {
    if (!state.selection.controlled) {
      state = modifyFields(state, {
        internalSelection: () => value,
        selection: (currentSelection) => modifyFields(currentSelection, { selected: () => value }),
      })
    }

    events.push(Event.cases.Selected.make({ value }))
  }

  const month = (requested: DateValue) => {
    if (rules.options.disableNavigation === true) {
      return
    }

    let date = lib.startOfMonth(calendarDate(requested.timestamp, rules, requested.timeZone))

    if (start !== undefined && date < lib.startOfMonth(start)) {
      date = lib.startOfMonth(start)
    }

    if (end !== undefined && date > lib.startOfMonth(end)) {
      date = lib.startOfMonth(end)
    }

    state = modifyFields(state, {
      internalMonth: () => dateValue(date),
      month: () => (state.controlledMonth ? state.month : dateValue(date)),
    })
    events.push(Event.cases.MonthChanged.make({ month: dateValue(date) }))
  }

  const skipProjection = Action.match(action, {
    OccurrenceFocus: () => {
      state = modifyFields(state, {
        beforePick: () => selectionValue(),
        hoverOrdinal: () => null,
        focused: () => null,
        focusedDisplayMonth: () => null,
        lastFocused: () => null,
        lastFocusedDisplayMonth: () => null,
        autoFocus: () => true,
      })

      return false
    },
    HoverPreview: (intent) => {
      state = modifyFields(state, { hoverOrdinal: () => intent.ordinal })

      return false
    },
    Picked: (intent) => {
      state = modifyFields(state, {
        focused: () => intent.date,
        focusedDisplayMonth: () => intent.displayMonth,
      })

      if (intent.modifiers.disabled === true) {
        return false
      }

      const date = calendarDate(intent.date, rules, state.month.timeZone)

      if (state.selection.mode === 'single') {
        const previous = selectedDate(state.selection.selected, rules)

        const next =
          !state.selection.required && previous !== undefined && lib.isSameDay(previous, date)
            ? undefined
            : date
        commit(selectionValue(next))
      } else {
        const selectionRules = {
          required: state.selection.required,
          min: state.selection.min,
          max: state.selection.max,
        }

        const rangeRules =
          rules.options.disabled === undefined
            ? selectionRules
            : { ...selectionRules, disabled: rules.options.disabled }

        const next = selectRange(
          date,
          selectedRange(state.selection.selected, rules),
          rangeRules,
          lib,
        )

        if (next?.from !== undefined && next.to === undefined && !pickingRange(state)) {
          state = modifyFields(state, { beforePick: () => state.selection.selected })
        }

        commit(selectionValue(next))
      }

      events.push(Event.cases.DayClicked.make({ date: intent.date, modifiers: intent.modifiers }))

      return false
    },
    Focused: (intent) => {
      state = modifyFields(state, {
        focused: () => intent.date,
        focusedDisplayMonth: () => intent.displayMonth,
      })
      events.push(Event.cases.DayFocused.make({ date: intent.date, modifiers: intent.modifiers }))

      return false
    },
    Blurred: (intent) => {
      state = modifyFields(state, {
        lastFocused: () => state.focused,
        lastFocusedDisplayMonth: () => state.focusedDisplayMonth,
        focused: () => null,
        focusedDisplayMonth: () => null,
      })
      events.push(Event.cases.DayBlurred.make({ date: intent.date, modifiers: intent.modifiers }))

      return false
    },
    MouseEntered: (intent) => {
      events.push(
        Event.cases.DayMouseEntered.make({ date: intent.date, modifiers: intent.modifiers }),
      )

      return true
    },
    MouseLeft: (intent) => {
      events.push(Event.cases.DayMouseLeft.make({ date: intent.date, modifiers: intent.modifiers }))

      return true
    },
    KeyDown: (intent) => {
      const movement = keyMovement(intent.key, intent.shift, rules.input.dir === 'rtl')

      if (movement !== undefined && state.focused !== null) {
        const next = nextFocus(
          movement[0],
          movement[1],
          calendarDate(state.focused, rules, state.month.timeZone),
          start,
          end,
          rules.options,
          lib,
        )

        if (next !== undefined) {
          const displayed = state.projection.months.some((displayedMonth) =>
            displayedMonth.weeks.some((week) =>
              week.days.some(
                (day) =>
                  lib.isSameDay(calendarDate(day.date, rules, state.month.timeZone), next) &&
                  lib.isSameMonth(
                    calendarDate(day.displayMonth, rules, state.month.timeZone),
                    next,
                  ),
              ),
            ),
          )

          if (rules.options.disableNavigation !== true || displayed) {
            if (!displayed) {
              month(dateValue(next))
            }

            state = modifyFields(state, {
              focused: () => next.getTime(),
              focusedDisplayMonth: () => next.getTime(),
            })
            focus = next.getTime()
          }
        }
      }

      events.push(
        Event.cases.DayKeyDown.make({
          date: intent.date,
          modifiers: intent.modifiers,
          key: intent.key,
          shift: intent.shift,
        }),
      )

      return movement === undefined
    },
    Navigated: (intent) => {
      const next = intent.direction === 'next' ? state.projection.next : state.projection.previous

      if (next !== null) {
        month(next)
        events.push(
          intent.direction === 'next'
            ? Event.cases.NextClicked.make({ month: next })
            : Event.cases.PreviousClicked.make({ month: next }),
        )
      }

      return false
    },
    MonthRequested: (intent) => {
      month(intent.month)

      return false
    },
    Escaped: () => {
      if (pickingRange(state)) {
        commit(state.beforePick)
      }

      return false
    },
    Accepted: (intent) => {
      state = modifyFields(state, {
        selection: () =>
          modifyFields(intent.selection, {
            selected: () =>
              intent.selection.controlled ? intent.selection.selected : state.internalSelection,
          }),
        controlledMonth: () => intent.controlledMonth,
        month: () => (intent.controlledMonth ? (intent.month ?? state.month) : state.internalMonth),
      })

      return false
    },
    Synchronized: (intent) => {
      state = modifyFields(state, {
        selection: () =>
          modifyFields(intent.selection, {
            selected: () =>
              intent.selection.controlled ? intent.selection.selected : state.internalSelection,
          }),
        controlledMonth: () => intent.controlledMonth,
        month: () => (intent.controlledMonth ? (intent.month ?? state.month) : state.internalMonth),
        presentation: () => intent.presentation,
        ...(intent.occurrenceFocus
          ? {
              beforePick: () => selectionValue(),
              hoverOrdinal: () => null,
              focused: () => null,
              focusedDisplayMonth: () => null,
              lastFocused: () => null,
              lastFocusedDisplayMonth: () => null,
              autoFocus: () => true,
            }
          : {}),
      })

      return false
    },
    Presented: (intent) => {
      state = modifyFields(state, { presentation: () => intent.presentation })

      return false
    },
    Refreshed: (intent) => {
      const zoneChanged = state.projection.timeZone !== (lib.options.timeZone ?? null)

      const nextMonth =
        rules.options.month ?? (state.controlledMonth ? restoreDate(state.month) : undefined)

      const monthOptions =
        nextMonth === undefined ? rules.options : { ...rules.options, month: nextMonth }

      const updated =
        rules.options.month !== undefined || zoneChanged
          ? getInitialMonth(monthOptions, start, end, lib)
          : null
      state = modifyFields(state, {
        revision: () => intent.revision,
        month: (currentMonth) => (updated === null ? currentMonth : dateValue(updated)),
        internalMonth: (currentInternalMonth) =>
          zoneChanged && updated !== null ? dateValue(updated) : currentInternalMonth,
      })

      return false
    },
  })

  if (skipProjection) {
    return { state, events, focus }
  }

  const projection = projectCalendar(state, rules)

  const projectedFocus = projection.focused

  if (
    Action.isAnyOf(['OccurrenceFocus'])(action) ||
    (Action.isAnyOf(['Synchronized'])(action) && action.occurrenceFocus)
  ) {
    focus = projectedFocus
  }

  if (state.focused !== null && projectedFocus !== state.focused) {
    focus = projectedFocus
  }

  state = modifyFields(state, {
    projection: () => projection,
    focused: () => projectedFocus,
    autoFocus: (currentAutoFocus) =>
      Action.isAnyOf(['Focused', 'Blurred', 'Picked', 'KeyDown'])(action)
        ? false
        : currentAutoFocus,
  })

  return { state, events, focus }
}

interface CalendarTransition {
  readonly state: CalendarState
  readonly events: Array<Event>
  readonly focus: number | null
}
