import { DateTime, Schema } from 'effect'
import { dateValue } from '@foldkit-visuals/fluid/calendar'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('date-picker', {
  appearance: Appearance,
  type: Schema.Literals(['single', 'range']),
  variant: Schema.Literals(['outline', 'ghost']),
  calendarOrientation: Schema.Literals(['auto', 'horizontal', 'vertical']),
  numberOfMonths: Schema.Literals([1, 2]),
  placeholder: Schema.String,
  disabled: Schema.Boolean,
  clearable: Schema.Boolean,
  time: Schema.Literals(['none', 'time', 'timeRange']),
  step: Schema.Literals([15, 30, 60]),
  clock: Schema.Literals(['locale', '12', '24']),
  presets: Schema.Boolean,
  days: Schema.Literals(['all', 'booked']),
  showWeekNumber: Schema.Boolean,
  pickerSize: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'date-picker',
  appearance: {},
  type: 'single',
  variant: 'ghost',
  calendarOrientation: 'auto',
  numberOfMonths: 2,
  placeholder: 'Choose a date',
  disabled: false,
  clearable: true,
  time: 'timeRange',
  step: 15,
  clock: 'locale',
  presets: false,
  days: 'all',
  showWeekNumber: false,
  pickerSize: 'site',
})
export const controls = [
  {
    kind: 'choice',
    prop: 'variant',
    label: 'Design',
    group: 'Trigger',
    initial: defaults.variant,
    values: Configuration.fields.variant.literals,
  },
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
    prop: 'time',
    label: 'Time',
    group: 'Time',
    initial: defaults.time,
    values: Configuration.fields.time.literals,
  },
  {
    kind: 'choice',
    prop: 'step',
    label: 'Step',
    group: 'Time',
    initial: defaults.step,
    values: Configuration.fields.step.literals,
  },
  {
    kind: 'choice',
    prop: 'clock',
    label: 'Clock',
    group: 'Time',
    initial: defaults.clock,
    values: Configuration.fields.clock.literals,
  },
  {
    kind: 'toggle',
    prop: 'presets',
    label: 'Presets',
    group: 'Selection',
    initial: defaults.presets,
  },
  {
    kind: 'choice',
    prop: 'numberOfMonths',
    label: 'Months',
    group: 'Calendar',
    initial: defaults.numberOfMonths,
    values: Configuration.fields.numberOfMonths.literals,
  },
  {
    kind: 'choice',
    prop: 'calendarOrientation',
    label: 'Orientation',
    group: 'Calendar',
    initial: defaults.calendarOrientation,
    values: Configuration.fields.calendarOrientation.literals,
  },
  {
    kind: 'choice',
    prop: 'days',
    label: 'Days',
    group: 'Calendar',
    initial: defaults.days,
    values: Configuration.fields.days.literals,
  },
  {
    kind: 'toggle',
    prop: 'showWeekNumber',
    label: 'Week numbers',
    group: 'Calendar',
    initial: defaults.showWeekNumber,
  },
  {
    kind: 'choice',
    prop: 'pickerSize',
    label: 'Size',
    group: 'Trigger',
    initial: defaults.pickerSize,
    values: Configuration.fields.pickerSize.literals,
  },
  {
    kind: 'text',
    prop: 'placeholder',
    label: 'Placeholder',
    group: 'Trigger',
    initial: defaults.placeholder,
    values: [defaults.placeholder],
  },
  {
    kind: 'toggle',
    prop: 'clearable',
    label: 'Clearable',
    group: 'Trigger',
    initial: defaults.clearable,
  },
  {
    kind: 'toggle',
    prop: 'disabled',
    label: 'Disabled',
    group: 'Trigger',
    initial: defaults.disabled,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor: (configuration: Configuration) => ReadonlyArray<Control> = (
  configuration: Configuration,
) =>
  controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'time'
        ? configuration.type === 'single'
        : control.prop === 'step' || control.prop === 'clock'
          ? configuration.type === 'single' && configuration.time !== 'none'
          : control.prop === 'presets'
            ? configuration.type === 'range'
            : control.prop === 'calendarOrientation'
              ? configuration.numberOfMonths === 2
              : control.prop === 'clearable'
                ? configuration.variant === 'outline'
                : true,
  }))
export const datePresets = (today: number) => {
  const date = DateTime.makeZonedUnsafe(today, { timeZone: DateTime.zoneMakeLocal() })
  const day = (offset: number) =>
    dateValue(DateTime.toDateUtc(DateTime.add(DateTime.startOf(date, 'day'), { days: offset })))
  const weekend = (6 - DateTime.toDateUtc(date).getDay() + 7) % 7
  return [
    { label: 'Next 7 days', range: { _tag: 'Range' as const, from: day(0), to: day(6) } },
    { label: 'Next 14 days', range: { _tag: 'Range' as const, from: day(0), to: day(13) } },
    { label: 'Next 30 days', range: { _tag: 'Range' as const, from: day(0), to: day(29) } },
    {
      label: 'This weekend',
      range: { _tag: 'Range' as const, from: day(weekend), to: day(weekend + 1) },
    },
  ]
}
