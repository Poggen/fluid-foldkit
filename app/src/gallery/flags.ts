import { calendarRulesForRevision } from '../playground/configs/calendar'
import { CalendarBlock, Selection, dateValue } from '@foldkit-visuals/fluid/calendar'
import {
  makeCalendarEnvironment,
  prepareCalendar,
} from '@foldkit-visuals/fluid/calendar/environment'
import {
  DatePickerPresentation,
  DatePickerState,
  prepareDatePicker,
} from '@foldkit-visuals/fluid/date-picker'
import { PreviewOptions } from '../playground/options'
import { Clock, DateTime, Effect, Layer, Schema } from 'effect'
import { authoredRules } from '../../../registry/fluid/examples/src/calendar-authored-data'

export const CalendarEnvironmentLayer = Layer.unwrap(
  Effect.gen(function* makeShowcaseCalendarEnvironment() {
    const now = yield* DateTime.nowInCurrentZone.pipe(DateTime.withCurrentZoneLocal)
    const today = DateTime.toDateUtc(now)
    const authoredBooked = [4, 5, 6, 12, 19, 20].map((days) =>
      DateTime.toDateUtc(DateTime.add(DateTime.startOf(now, 'day'), { days })),
    )
    const pickerBooked = [3, 4, 5, 11, 12].map((days) =>
      DateTime.toDateUtc(DateTime.add(now, { days })),
    )

    // Live Calendar commands share one runtime service across gallery and authored examples.
    return makeCalendarEnvironment((id, revision) => {
      if (id.startsWith('authored-'))
        return authoredRules({ id, revision, booked: authoredBooked, today })
      if (id === 'preview-calendar' || id === 'preview-date-picker-calendar')
        return calendarRulesForRevision(revision, today)
      if (id === 'docs-picker-booking-calendar')
        return { booked: pickerBooked, disabled: { before: today } }
      return { timeZone: 'UTC' }
    })
  }),
)
export const PreparedCalendar = Schema.Struct({ initial: CalendarBlock.Model.fields.calendar })
export const PreparedPicker = Schema.Struct({
  initial: DatePickerState,
  calendar: PreparedCalendar,
  presentation: DatePickerPresentation,
  now: Schema.Finite,
})
export const CalendarSelections = Schema.Struct({
  single: Schema.Union([Selection.cases.Empty, Selection.cases.Single]),
  range: Schema.Union([Selection.cases.Empty, Selection.cases.Range]),
})
export const GalleryFlags = Schema.Struct({
  calendar: PreparedCalendar,
  calendarSelections: CalendarSelections,
  picker: PreparedPicker,
  preview: Schema.optionalKey(PreviewOptions),
  componentSlug: Schema.optionalKey(Schema.String),
})
export type GalleryFlags = typeof GalleryFlags.Type

export const prepareGalleryFlagsFor = (preview: PreviewOptions = {}) =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    const date = DateTime.toDateUtc(DateTime.makeUnsafe(now))
    const presentation = DatePickerPresentation.make({
      compact: false,
      disabled: preview.disabled ?? false,
      variant: preview.variant === 'ghost' ? 'ghost' : 'outline',
      orientation: preview.calendarOrientation ?? 'auto',
      numberOfMonths: preview.numberOfMonths ?? 1,
      cellSize: 36,
      showWeekNumber: false,
      locale: 'en-US',
      hourCycle: 24,
      step: 15,
      triggerId: null,
      placeholder: preview.placeholder ?? 'Choose a date',
      name: 'showcase-date',
      ariaLabel: 'Choose a date',
      clearable: preview.clearable ?? true,
      className: '',
      required: false,
      min: 0,
      max: 0,
      presets: [],
    })
    return GalleryFlags.make({
      preview,
      calendarSelections: {
        single: Selection.cases.Single.make({ date: dateValue(date) }),
        range: Selection.cases.Empty.make({}),
      },
      calendar: yield* prepareCalendar({
        id: 'preview-calendar',
        mode: preview.type === 'single' ? 'single' : 'range',
        controlled: true,
        controlledMonth: false,
        month: date,
        ...(preview.type === 'single' ? { selected: date } : {}),
        presentation: {
          numberOfMonths: preview.numberOfMonths ?? 2,
          orientation: preview.orientation ?? 'horizontal',
          showWeekNumber: preview.showWeekNumber ?? false,
        },
      }),
      picker: yield* prepareDatePicker(
        preview.type === 'range'
          ? { id: 'preview-date-picker', mode: 'range' }
          : {
              id: 'preview-date-picker',
              mode: 'single',
              ...(Object.keys(preview).length ? {} : { defaultValue: date }),
            },
        presentation,
      ),
    })
  }).pipe(Effect.provide(CalendarEnvironmentLayer))

export const prepareGalleryFlags = prepareGalleryFlagsFor()
