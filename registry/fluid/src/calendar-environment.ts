import { toTimeZone } from './calendar-domain/time-zone.js'
import { localDate, zonedCivilDate } from './calendar-domain/date-boundary.js'
import { Clock, DateTime, Context, Effect, Layer } from 'effect'
import { createCalendarRules } from './calendar-domain/rules.js'
import type { CalendarRuleOptions, CalendarRules } from './calendar-domain/rules.js'
import { getInitialMonth, getNavMonths } from './calendar-domain/navigation.js'
import type { DateRange } from './calendar-domain/matcher-types.js'
import { CalendarState, dateValue, selectionValue } from './calendar-state.js'
import type { CalendarPresentation } from './calendar-state.js'
import { projectCalendar } from './calendar-project.js'

// Providers belong to application Layer construction. Only their prepared data
// crosses the Block initialization/operation boundary.
export class CalendarEnvironment extends Context.Service<
  CalendarEnvironment,
  {
    readonly rulesFor: (
      id: string,
      revision: number,
      presentation?: CalendarPresentation,
      initialRender?: boolean,
    ) => CalendarRules
  }
>()('@foldkit-visuals/fluid/CalendarEnvironment') {}

export const makeCalendarEnvironment = (
  optionsFor: (id: string, revision: number) => CalendarRuleOptions,
) =>
  Layer.effect(
    CalendarEnvironment,
    Effect.gen(function* () {
      const clock = yield* Clock.Clock

      return CalendarEnvironment.of({
        rulesFor: (id, revision, presentation, initialRender = false) => {
          const options = optionsFor(id, revision)

          let presentedOptions = { ...options }

          if (presentation !== undefined && presentation.numberOfMonths !== null) {
            presentedOptions = { ...presentedOptions, numberOfMonths: presentation.numberOfMonths }
          }

          if (presentation?.showWeekNumber !== undefined) {
            presentedOptions = { ...presentedOptions, showWeekNumber: presentation.showWeekNumber }
          }

          if (
            initialRender &&
            options.today === undefined &&
            options.dateLib?.today === undefined
          ) {
            const now = clock.currentTimeMillisUnsafe()
            const instant = DateTime.toDateUtc(DateTime.makeUnsafe(now))
            presentedOptions = {
              ...presentedOptions,
              today:
                options.timeZone === undefined
                  ? localDate(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
                  : zonedCivilDate(
                      instant.getUTCFullYear(),
                      instant.getUTCMonth(),
                      instant.getUTCDate(),
                      options.timeZone,
                    ),
            }
          }

          return createCalendarRules(presentedOptions, clock)
        },
      })
    }),
  )

export const DefaultCalendarEnvironment = makeCalendarEnvironment(() => ({}))

export interface CalendarPrepareOptions {
  readonly id: string
  readonly mode?: 'single' | 'range'
  readonly selected?: Date | DateRange
  readonly controlled?: boolean
  readonly required?: boolean
  readonly min?: number
  readonly max?: number
  readonly month?: Date
  readonly controlledMonth?: boolean
  readonly autoFocus?: boolean
  readonly presentation?: CalendarPresentation
  readonly revision?: number
}

export interface CalendarPreparedConfig {
  readonly initial: CalendarState
}

// Preparing before rendering gives SSR and the first browser render their full
// grid; there is no placeholder calendar waiting for a mount effect to read time.
export const prepareCalendar = Effect.fn('FluidCalendar.prepare')(function* (
  config: CalendarPrepareOptions,
) {
  const environment = yield* CalendarEnvironment

  const presentation: CalendarPresentation = config.presentation ?? {
    numberOfMonths: null,
    orientation: 'auto',
  }

  const rules = environment.rulesFor(config.id, config.revision ?? 0, presentation, true)

  const [start, end] = getNavMonths(rules.options, rules.dateLib)

  const configuredMonth = config.month ?? rules.options.month

  const monthOptions =
    configuredMonth === undefined
      ? rules.options
      : {
          ...rules.options,
          month:
            rules.dateLib.options.timeZone === undefined
              ? configuredMonth
              : toTimeZone(configuredMonth, rules.dateLib.options.timeZone),
        }

  const month = getInitialMonth(monthOptions, start, end, rules.dateLib)

  const base: Omit<CalendarState, 'projection'> = {
    hoverOrdinal: null,
    presentation,
    id: config.id,
    revision: config.revision ?? 0,
    internalSelection: selectionValue(config.selected),
    selection: {
      mode: config.mode ?? 'single',
      controlled: config.controlled ?? false,
      selected: selectionValue(config.selected),
      required: config.required ?? false,
      min: config.min ?? 0,
      max: config.max ?? 0,
    },
    month: dateValue(month),
    internalMonth: dateValue(month),
    controlledMonth:
      config.controlledMonth ?? (config.month !== undefined || rules.options.month !== undefined),
    focused: null,
    focusedDisplayMonth: null,
    lastFocused: null,
    lastFocusedDisplayMonth: null,
    beforePick: selectionValue(),
    autoFocus: config.autoFocus ?? false,
  }

  const projection = projectCalendar(base, rules)

  const focusedMonth =
    projection.months
      .flatMap((m) => m.weeks.flatMap((w) => w.days))
      .find((d) => d.date === projection.focused && d.flags.outside !== true)?.displayMonth ?? null

  return {
    initial: CalendarState.make({
      ...base,
      projection,
      focused: projection.focused,
      focusedDisplayMonth: focusedMonth,
    }),
  } satisfies CalendarPreparedConfig
})
