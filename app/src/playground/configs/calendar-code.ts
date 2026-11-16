import type { Configuration } from './calendar'

export const calendarCode = (
  configuration: Configuration,
) => `import { CalendarBlock, calendarViewInputs } from '@foldkit-visuals/fluid/calendar'
import { makeCalendarEnvironment, prepareCalendar } from '@foldkit-visuals/fluid/calendar/environment'

const today = new Date()
const addDays = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
const rules = ${configuration.days === 'booked' ? '{ booked: [4, 5, 6, 12, 19, 20].map(addDays), disabled: { before: today } }' : configuration.days === 'weekdays' ? '{ available: { dayOfWeek: [1, 2, 3, 4, 5] } }' : '{}'}
const environment = makeCalendarEnvironment(() => rules)
const calendar = yield* prepareCalendar({
  id: 'calendar', mode: ${JSON.stringify(configuration.type)}, controlled: true,
  presentation: ${JSON.stringify({ numberOfMonths: configuration.numberOfMonths, orientation: configuration.orientation, showWeekNumber: configuration.showWeekNumber })},
})
const Calendar = Page.makeRequiredFieldBinding(CalendarBlock, {
  field: 'calendar', init: { contextToArgs: () => [calendar] },
})
// Acknowledge Selected events with Calendar.requestAcceptance, retaining one selection per mode.
Calendar.embedView({ slotId: 'calendar', model: model.calendar,
  viewInputs: calendarViewInputs(h, { key: 'calendar', context, motion, tooltip, keyboardTrigger: false${configuration.cellSize === 'auto' ? '' : `, cellSize: ${configuration.cellSize}`} }),
})`
