/* @license Date contracts from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
export interface DateRange {
  readonly from: Date | undefined
  readonly to?: Date | undefined
}

export interface DateBefore {
  readonly before: Date
}

export interface DateAfter {
  readonly after: Date
}

export interface DateInterval {
  readonly before: Date
  readonly after: Date
}

export interface DayOfWeek {
  readonly dayOfWeek: number | Array<number>
}

export type Matcher =
  | boolean
  | Date
  | Array<Date>
  | DateRange
  | DateBefore
  | DateAfter
  | DateInterval
  | DayOfWeek
  | ((date: Date) => boolean)

export interface ClosedDateRange {
  readonly from: Date
  readonly to: Date
}
