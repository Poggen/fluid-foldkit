import type { Configuration } from './date-picker'

export const datePickerCode = (
  configuration: Configuration,
) => `import { DatePickerBlock, DatePickerPresentation, prepareDatePicker } from '@foldkit-visuals/fluid/date-picker'
import { dateValue } from '@foldkit-visuals/fluid/calendar'
import { makeCalendarEnvironment } from '@foldkit-visuals/fluid/calendar/environment'

const today = new Date()
const addDays = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
const environment = makeCalendarEnvironment(() => ${configuration.days === 'booked' ? '({ booked: [4, 5, 6, 12, 19, 20].map(addDays), disabled: { before: today } })' : '({})'})
const presets = ${
  configuration.type === 'range' && configuration.presets
    ? `[
  { label: 'Next 7 days', range: { _tag: 'Range', from: dateValue(addDays(0)), to: dateValue(addDays(6)) } },
  { label: 'Next 14 days', range: { _tag: 'Range', from: dateValue(addDays(0)), to: dateValue(addDays(13)) } },
  { label: 'Next 30 days', range: { _tag: 'Range', from: dateValue(addDays(0)), to: dateValue(addDays(29)) } },
  { label: 'This weekend', range: { _tag: 'Range', from: dateValue(addDays((6 - today.getDay() + 7) % 7)), to: dateValue(addDays((6 - today.getDay() + 7) % 7 + 1)) } },
]`
    : '[]'
}
const presentation = DatePickerPresentation.make({
  compact: ${configuration.pickerSize === 'site' ? "settings.size === 'compact'" : configuration.pickerSize === 'compact'}, disabled: ${configuration.disabled}, variant: ${JSON.stringify(configuration.variant)},
  orientation: ${JSON.stringify(configuration.calendarOrientation)}, numberOfMonths: ${configuration.numberOfMonths}, cellSize: null,
  showWeekNumber: ${configuration.showWeekNumber}, locale: null, hourCycle: ${configuration.clock === 'locale' ? 'null' : configuration.clock}, step: ${configuration.step},
  triggerId: null, placeholder: ${JSON.stringify(configuration.placeholder)}, name: null, ariaLabel: null,
  clearable: ${configuration.clearable}, className: '', required: false, min: 0, max: 0, presets,
})
const picker = yield* prepareDatePicker({ id: 'picker', mode: ${JSON.stringify(configuration.type)}, ${configuration.type === 'range' ? 'value: undefined' : 'value: today'}${configuration.type === 'single' && configuration.time === 'time' ? ", time: '11:00'" : ''}${configuration.type === 'single' && configuration.time === 'timeRange' ? ", timeRange: { start: '11:00', end: '12:45' }" : ''} }, presentation)
const Picker = Page.makeRequiredFieldBinding(DatePickerBlock, { field: 'picker', init: { contextToArgs: () => [picker] } })
// Acknowledge value and time events with Picker.requestAction({ action: { _tag: 'Accepted', ...controlledValues } }).
Picker.embedView({ slotId: 'picker', model: model.picker, viewInputs: { ...calendarInputs, highlight } })`
