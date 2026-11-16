import { DateTime, Schema } from 'effect'
import type { makeCalendarEnvironment } from '@foldkit-visuals/fluid/calendar/environment'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('calendar', {
  appearance: Appearance,
  type: Schema.Literals(['single', 'range']),
  numberOfMonths: Schema.Literals([1, 2]),
  orientation: Schema.Literals(['auto', 'horizontal', 'vertical']),
  cellSize: Schema.Literals(['auto', '40', '44', '48']),
  days: Schema.Literals(['all', 'booked', 'weekdays']),
  showWeekNumber: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'calendar',
  appearance: {},
  type: 'range',
  numberOfMonths: 2,
  orientation: 'auto',
  cellSize: 'auto',
  days: 'all',
  showWeekNumber: false,
})
export const controls = [
  {
    kind: 'choice',
    prop: 'type',
    label: 'Mode',
    group: 'Selection',
    initial: defaults.type,
    values: Configuration.fields.type.literals,
  },
  {
    kind: 'choice',
    prop: 'numberOfMonths',
    label: 'Months',
    group: 'Layout',
    initial: defaults.numberOfMonths,
    values: Configuration.fields.numberOfMonths.literals,
  },
  {
    kind: 'choice',
    prop: 'orientation',
    label: 'Orientation',
    group: 'Layout',
    initial: defaults.orientation,
    values: Configuration.fields.orientation.literals,
  },
  {
    kind: 'choice',
    prop: 'cellSize',
    label: 'Cell size',
    group: 'Layout',
    initial: defaults.cellSize,
    values: Configuration.fields.cellSize.literals,
  },
  {
    kind: 'choice',
    prop: 'days',
    label: 'Days',
    group: 'Availability',
    initial: defaults.days,
    values: Configuration.fields.days.literals,
  },
  {
    kind: 'toggle',
    prop: 'showWeekNumber',
    label: 'Week numbers',
    group: 'Layout',
    initial: defaults.showWeekNumber,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => ({
    ...control,
    enabled: control.prop !== 'orientation' || configuration.numberOfMonths === 2,
  }))
export const calendarRuleRevision = (days: Configuration['days']) =>
  days === 'booked' ? 1 : days === 'weekdays' ? 2 : 0
export const calendarRulesForRevision = (
  revision: number,
  today: Date,
): ReturnType<Parameters<typeof makeCalendarEnvironment>[0]> => {
  if (revision === 2) return { available: { dayOfWeek: [1, 2, 3, 4, 5] } }
  if (revision !== 1) return {}
  const start = DateTime.startOf(
    DateTime.makeZonedUnsafe(today, { timeZone: DateTime.zoneMakeLocal() }),
    'day',
  )
  return {
    booked: [4, 5, 6, 12, 19, 20].map((days) => DateTime.toDateUtc(DateTime.add(start, { days }))),
    disabled: { before: today },
  }
}
