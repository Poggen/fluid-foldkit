import { projectCalendarPresentation } from './calendar-view/project.js'

import { instantDate, zonedDate } from './calendar-domain/date-boundary.js'
import { dateValue, restoreDate, Selection } from './calendar-state.js'
import type { CalendarState, DateValue, Projection } from './calendar-state.js'
import { calendarDay, getDates, getMonths, getWeekdays } from './calendar-domain/grid.js'
import { createModifiers, focusTarget } from './calendar-domain/modifiers.js'
import type { Modifiers } from './calendar-domain/modifiers.js'
import {
  getDisplayMonths,
  getNavMonths,
  getNextMonth,
  getPreviousMonth,
} from './calendar-domain/navigation.js'
import { rangeIncludesDate } from './calendar-domain/matchers.js'
import { dayNumber } from './calendar-domain/rules.js'
import type { CalendarRules } from './calendar-domain/rules.js'

export const calendarDate: (
  value: number,
  rules: CalendarRules,
  inheritedZone?: string | null,
) => Date = function calendarDate(
  value: number,
  rules: CalendarRules,
  inheritedZone: string | null = null,
) {
  const zone = rules.dateLib.options.timeZone ?? inheritedZone

  return zone !== null && zone !== '' ? zonedDate(value, zone) : instantDate(value)
}

const selectionDate: (value: DateValue, rules: CalendarRules) => Date = function selectionDate(
  value: DateValue,
  rules: CalendarRules,
) {
  return rules.dateLib.options.timeZone !== undefined && rules.dateLib.options.timeZone !== ''
    ? calendarDate(value.timestamp, rules)
    : restoreDate(value)
}

export const selectedDate: (selection: Selection, rules: CalendarRules) => Date | undefined =
  function selectedDate(selection: Selection, rules: CalendarRules) {
    return Selection.isAnyOf(['Single'])(selection)
      ? selectionDate(selection.date, rules)
      : undefined
  }

export const isSelected: (
  selection: CalendarState['selection'],
  date: Date,
  rules: CalendarRules,
) => boolean = function isSelected(
  selection: CalendarState['selection'],
  date: Date,
  rules: CalendarRules,
) {
  if (selection.mode === 'single') {
    const selected = selectedDate(selection.selected, rules)

    return selected !== undefined && rules.dateLib.isSameDay(date, selected)
  }

  const range = selectedRange(selection.selected, rules)

  return range !== undefined && rangeIncludesDate(range, date, false, rules.dateLib)
}

export const projectCalendar: (state: ProjectionInput, rules: CalendarRules) => Projection =
  function projectCalendar(state: ProjectionInput, rules: CalendarRules) {
    const { dateLib, options, labels, formatters } = rules
    const [start, end] = getNavMonths(options, dateLib)
    const firstMonth = dateLib.startOfMonth(selectionDate(state.month, rules))
    const displayed = getDisplayMonths(firstMonth, end, options, dateLib)
    const [first, ...rest] = displayed

    if (first === undefined) {
      throw new Error('Calendar navigation bounds admit no displayed month')
    }

    const dates = getDates(
      [first, ...rest],
      options.endMonth !== undefined ? dateLib.endOfMonth(options.endMonth) : undefined,
      options,
      dateLib,
    )

    const months = getMonths(displayed, dates, options, dateLib)
    const days = months.flatMap((month) => month.weeks.flatMap((week) => week.days))
    const flags = createModifiers(days, options, start, end, dateLib)

    const last =
      state.lastFocused === null || state.lastFocusedDisplayMonth === null
        ? undefined
        : calendarDay(
            calendarDate(state.lastFocused, rules, state.month.timeZone),
            calendarDate(state.lastFocusedDisplayMonth, rules, state.month.timeZone),
            dateLib,
          )

    const target = focusTarget(
      days,
      flags,
      (date) => isSelected(state.selection, date, rules),
      last,
      dateLib,
    )

    const initialFocus = state.autoFocus ? target : undefined

    const focused =
      state.focused === null
        ? initialFocus
        : (days.find(
            (day) =>
              dateLib.isSameDay(
                day.date,
                calendarDate(state.focused ?? state.month.timestamp, rules, state.month.timeZone),
              ) &&
              (state.focusedDisplayMonth === null ||
                dateLib.isSameMonth(
                  day.displayMonth,
                  calendarDate(state.focusedDisplayMonth, rules, state.month.timeZone),
                )),
          ) ?? target)

    const previous = getPreviousMonth(firstMonth, start, options, dateLib)
    const next = getNextMonth(firstMonth, end, options, dateLib)
    const range = selectedRange(state.selection.selected, rules)

    const projection = {
      firstMonth: firstMonth.getTime(),
      focused: focused?.date.getTime() ?? null,
      previous: previous !== undefined ? dateValue(previous) : null,
      next: next !== undefined ? dateValue(next) : null,
      previousLabel: labels.labelPrevious(previous),
      nextLabel: labels.labelNext(next),
      weekNumberHeader: formatters.formatWeekNumberHeader(),
      weekNumberLabel: labels.labelWeekNumberHeader(dateLib.options),
      timeZone: dateLib.options.timeZone ?? null,
      showWeekNumber: rules.input.showWeekNumber ?? false,
      hideWeekdays: rules.input.hideWeekdays ?? false,
      hideNavigation: rules.input.hideNavigation === true || rules.input.disableNavigation === true,
      weekdays: getWeekdays(dateLib, options.ISOWeek, options.broadcastCalendar, options.today).map(
        (date) => ({
          text: formatters.formatWeekdayName(date, dateLib.options, dateLib),
          label: labels.labelWeekday(date, dateLib.options, dateLib),
        }),
      ),
      months: months.map((month) => ({
        date: month.date.getTime(),
        caption: formatters.formatCaption(month.date, dateLib.options, dateLib),
        label: labels.labelGrid(month.date, dateLib.options, dateLib),
        weeks: month.weeks.map((week) => ({
          number: week.weekNumber,
          text: formatters.formatWeekNumber(week.weekNumber, dateLib),
          label: labels.labelWeekNumber(
            week.weekNumber,
            dateLib.options.locale === undefined ? {} : { locale: dateLib.options.locale },
          ),
          days: week.days.map((day) => {
            const modifiers: Modifiers = {
              ...flags.get(day),
              focused: false,
              selected:
                isSelected(state.selection, day.date, rules) || flags.get(day)?.selected === true,
            }

            modifiers.focused =
              modifiers.hidden !== true &&
              focused !== undefined &&
              dateLib.isSameDay(day.date, focused.date) &&
              dateLib.isSameMonth(day.displayMonth, focused.displayMonth)
            const allFlags: Modifiers = { ...modifiers }

            if (state.selection.mode === 'range' && range !== undefined) {
              allFlags.range_start =
                range.from !== undefined &&
                range.to !== undefined &&
                dateLib.isSameDay(day.date, range.from)
              allFlags.range_end =
                range.from !== undefined &&
                range.to !== undefined &&
                dateLib.isSameDay(day.date, range.to)
              allFlags.range_middle = rangeIncludesDate(range, day.date, true, dateLib)
            }

            return {
              date: day.date.getTime(),
              displayMonth: day.displayMonth.getTime(),
              ordinal: dayNumber(day.date),
              isoDate: day.isoDate,
              monthId: day.dateMonthId,
              displayMonthId: day.displayMonthId,
              text: formatters.formatDay(day.date, dateLib.options, dateLib),
              label: labels.labelDayButton(day.date, allFlags, dateLib.options, dateLib),
              flags: allFlags,
              tabStop:
                target !== undefined &&
                dateLib.isSameDay(day.date, target.date) &&
                dateLib.isSameMonth(day.displayMonth, target.displayMonth),
            }
          }),
        })),
      })),
    }

    return { ...projection, ...projectCalendarPresentation(state, projection, rules) }
  }

export function selectedRange(selection: Selection, rules: CalendarRules) {
  return Selection.isAnyOf(['Range'])(selection)
    ? {
        from: selection.from === null ? undefined : selectionDate(selection.from, rules),
        to: selection.to === null ? undefined : selectionDate(selection.to, rules),
      }
    : undefined
}

export type ProjectionInput = Pick<
  CalendarState,
  | 'selection'
  | 'hoverOrdinal'
  | 'month'
  | 'focused'
  | 'focusedDisplayMonth'
  | 'lastFocused'
  | 'lastFocusedDisplayMonth'
  | 'autoFocus'
>
