import { Update } from 'foldkit'
import { RawPrimaryTime, RawEndTime } from './date-picker-bindings.js'
import type { DatePickerPresentation } from './date-picker-config.js'
import type { DatePickerState } from './date-picker-state.js'
import {
  timeFieldInputs,
  timeFieldInputsEqual,
  timeFieldConfigFromInputs,
} from './date-picker-time-config.js'

interface TimeFieldSource {
  readonly picker: DatePickerState
  readonly presentation: DatePickerPresentation
  readonly now: number
}

export const synchronizeTimeFields = (previous: TimeFieldSource, next: TimeFieldSource) => {
  const primary = timeFieldInputs(next.picker, next.presentation, next.now, false)
  const end = timeFieldInputs(next.picker, next.presentation, next.now, true)
  return Update.combineSteps([
    ...(timeFieldInputsEqual(
      timeFieldInputs(previous.picker, previous.presentation, previous.now, false),
      primary,
    )
      ? []
      : [RawPrimaryTime.requestConfigure({ config: timeFieldConfigFromInputs(primary) })]),
    ...(timeFieldInputsEqual(
      timeFieldInputs(previous.picker, previous.presentation, previous.now, true),
      end,
    )
      ? []
      : [RawEndTime.requestConfigure({ config: timeFieldConfigFromInputs(end) })]),
  ])
}
