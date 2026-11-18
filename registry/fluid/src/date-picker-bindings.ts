import { CalendarBlock } from './calendar.js'
import type { CalendarPreparedConfig } from './calendar-environment.js'
import { DatePickerBlock } from './date-picker-definition.js'
import { PopupBlock } from './date-picker-popup.js'
import type { PopupConfig } from './date-picker-popup-definition.js'
import type { DatePickerPreparedConfig } from './date-picker-config.js'
import { timeFieldConfig } from './date-picker-config.js'
import { TimeFieldBlock } from './date-picker-time.js'
import type { TimeFieldConfig } from './date-picker-time-state.js'

export const RawPopup = DatePickerBlock.makeRequiredFieldBinding(PopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [
        {
          id: `${config.initial.id}-popup`,
          anchorId: config.initial.id,

          kind: 'trigger',
          align: 'start',
        },
        config.initial.open,
        config.initial.draft !== null,
      ] satisfies [PopupConfig, boolean, boolean],
  },
})

export const RawCalendar = DatePickerBlock.makeRequiredFieldBinding(CalendarBlock, {
  field: 'calendar',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [config.calendar] satisfies [CalendarPreparedConfig],
  },
})

export const RawPrimaryTime = DatePickerBlock.makeRequiredFieldBinding(TimeFieldBlock, {
  field: 'primaryTime',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [timeFieldConfig(config.initial, config.presentation, config.now, false)] satisfies [
        typeof TimeFieldConfig.Type,
      ],
  },
})

export const RawEndTime = DatePickerBlock.makeRequiredFieldBinding(TimeFieldBlock, {
  field: 'endTime',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [timeFieldConfig(config.initial, config.presentation, config.now, true)] satisfies [
        typeof TimeFieldConfig.Type,
      ],
  },
})
