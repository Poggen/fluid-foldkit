import { CalendarBlock } from '@foldkit-visuals/fluid/calendar'
import { DatePickerBlock } from '@foldkit-visuals/fluid/date-picker'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { Update } from 'foldkit'
import { FluidGalleryBlock } from './block'
const RawCalendar = FluidGalleryBlock.makeRequiredFieldBinding(CalendarBlock, {
  field: 'calendar',
  init: { contextToArgs: (flags) => [flags.calendar] },
})
export const Calendar = RawCalendar.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CalendarBlock, {
    Transitioned: ({ events }) =>
      FluidGalleryBlock.makeStep((model) => {
        let selections = model.calendarSelections
        let selected = false

        const completedMode = model.calendar.calendar.selection.mode
        for (const event of events) {
          if (event._tag !== 'Selected') continue
          if (completedMode === 'single' && event.value._tag !== 'Range') {
            selections = { ...selections, single: event.value }
            selected = true
          } else if (completedMode === 'range' && event.value._tag !== 'Single') {
            selections = { ...selections, range: event.value }
            selected = true
          }
        }
        if (!selected) return { model }
        const mode = model.calendar.calendar.selection.mode
        return Update.combineSteps([
          FluidGalleryBlock.makeFieldsStep(() => ({ calendarSelections: () => selections })),
          RawCalendar.requestAcceptance({
            selection: {
              ...model.calendar.calendar.selection,
              controlled: true,
              mode,
              selected: selections[mode],
            },
            month: model.calendar.calendar.month,
            controlledMonth: model.calendar.calendar.controlledMonth,
          }),
        ])
      }),
  }),
})
export const PickerRequests = FluidGalleryBlock.makeRequiredFieldBinding(DatePickerBlock, {
  field: 'picker',
  init: { contextToArgs: (flags) => [flags.picker] },
})
export const Picker = PickerRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DatePickerBlock, {
    Transitioned: ({ notices }) =>
      FluidGalleryBlock.makeStep((model) => {
        let selections = model.pickerSelections,
          time = model.pickerTime,
          timeRange = model.pickerTimeRange,
          changed = false
        const state = model.picker.picker
        for (const notice of notices) {
          if (notice._tag !== 'Picker') continue
          const event = notice.event
          if (event._tag === 'ValueChanged') {
            if (state.mode === 'single' && event.value._tag !== 'Range') {
              selections = { ...selections, single: event.value }
              changed = true
            }
            if (state.mode === 'range' && event.value._tag !== 'Single') {
              selections = { ...selections, range: event.value }
              changed = true
            }
          }
          if (event._tag === 'TimeChanged') {
            time = event.time
            changed = true
          }
          if (event._tag === 'TimeRangeChanged') {
            timeRange = event.range
            changed = true
          }
        }
        return changed
          ? Update.combineSteps([
              FluidGalleryBlock.makeFieldsStep(() => ({
                pickerSelections: () => selections,
                pickerTime: () => time,
                pickerTimeRange: () => timeRange,
              })),
              PickerRequests.requestAction({
                action: {
                  _tag: 'Accepted',
                  ...state,
                  value: selections[state.mode],
                  time,
                  timeRange,
                },
              }),
            ])
          : { model }
      }),
  }),
})
export const CalendarTooltips = FluidGalleryBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'calendarTooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: FluidGalleryBlock.makeNoopStep,
  }),
})
export const datesBindings = [Calendar, Picker, CalendarTooltips] as const
