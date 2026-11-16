// Fluid's view-specific local-day preview is independent from DayPicker selection.
import { Match } from 'effect'
import type { CalendarRules } from '../calendar-domain/rules.js'
import { resolveDayMatchers } from '../calendar-domain/rules.js'
import { getNavMonths } from '../calendar-domain/navigation.js'
import type { CalendarState, Projection } from '../calendar-state.js'
import { restoreDate } from '../calendar-state.js'
import { calendarBand } from '../calendar-presentation.js'
import type { PresentationProjection } from './presentation.js'

export function projectCalendarPresentation(
  state: Pick<CalendarState, 'selection' | 'month' | 'hoverOrdinal'>,
  projection: Pick<Projection, 'months' | 'timeZone'>,
  rules: CalendarRules,
): PresentationProjection {
  const { dateLib: lib, formatters, labels, options } = rules
  const firstDay = projection.months[0]?.weeks[0]?.days[0]

  const firstDate =
    firstDay === undefined
      ? undefined
      : restoreDate({
          timestamp: firstDay.date,
          ordinal: firstDay.ordinal,
          timeZone: projection.timeZone,
        })

  const activeIndex =
    state.hoverOrdinal === null || firstDay === undefined
      ? null
      : state.hoverOrdinal - firstDay.ordinal

  const { band, previewEnd } = calendarBand(
    state.selection.selected,
    firstDate,
    activeIndex,
    resolveDayMatchers(rules.input).disabled,
  )

  const [start, end] = getNavMonths(options, lib)

  return {
    disableNavigation: options.disableNavigation === true,
    navLabel: labels.labelNav(),
    dir: Match.value(rules.input.dir).pipe(
      Match.when('rtl', (): PresentationProjection['dir'] => 'rtl'),
      Match.when('ltr', (): PresentationProjection['dir'] => 'ltr'),
      Match.when('auto', (): PresentationProjection['dir'] => 'auto'),
      Match.orElse(() => null),
    ),
    lang: rules.input.lang ?? lib.options.locale?.code ?? null,
    captionLayout: options.captionLayout ?? 'label',
    monthYearOrder: lib.getMonthYearOrder(),
    outsideHidden: options.showOutsideDays !== true,
    preview: { band, previewEnd },
    dropdowns: projection.months.map((month, displayIndex) => {
      const monthOffset =
        options.reverseMonths === true ? projection.months.length - 1 - displayIndex : displayIndex

      const date = restoreDate({ ...state.month, timestamp: month.date })

      const monthOptions = lib
        .eachMonthOfInterval({ start: lib.startOfYear(date), end: lib.endOfYear(date) })
        .map((candidate) => ({
          value: lib.getMonth(candidate),
          label: formatters.formatMonthDropdown(candidate, lib),
          disabled:
            (start !== undefined && candidate < lib.startOfMonth(start)) ||
            (end !== undefined && candidate > lib.startOfMonth(end)),
          month: lib
            .addMonths(lib.setMonth(lib.startOfMonth(date), lib.getMonth(candidate)), -monthOffset)
            .getTime(),
        }))

      const years =
        start === undefined || end === undefined
          ? []
          : lib.eachYearOfInterval({ start: lib.startOfYear(start), end: lib.endOfYear(end) })

      const yearOptions = years.map((candidate) => ({
        value: lib.getYear(candidate),
        label: formatters.formatYearDropdown(candidate, lib),
        disabled: false,
        month: lib
          .addMonths(lib.setYear(lib.startOfMonth(date), lib.getYear(candidate)), -monthOffset)
          .getTime(),
      }))

      return {
        date: month.date,
        monthText: formatters.formatMonthDropdown(date, lib),
        yearText: formatters.formatYearDropdown(date, lib),
        monthOptions,
        yearOptions: rules.input.reverseYears === true ? yearOptions.toReversed() : yearOptions,
        monthDropdownLabel: labels.labelMonthDropdown(lib.options),
        yearDropdownLabel: labels.labelYearDropdown(lib.options),
        selectedMonth: lib.getMonth(date),
        selectedYear: lib.getYear(date),
      }
    }),
  }
}
