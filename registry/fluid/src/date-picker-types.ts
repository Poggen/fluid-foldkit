// Derived from Fluid Functionalism 200b4534, MIT © 2026 Micka Touillaud.
import type { DateRange } from './calendar-domain/matcher-types.js'

export interface TimeRange {
  readonly start: string
  readonly end: string
}

export interface DatePickerPreset {
  readonly label: string
  readonly range: DateRange
}
