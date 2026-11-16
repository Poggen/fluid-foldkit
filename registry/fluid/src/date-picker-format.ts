// Derived from Fluid Functionalism 200b4534, MIT © 2026 Micka Touillaud.
import { DateTime } from 'effect'
import { localDate } from './calendar-domain/date-boundary.js'
import type { DateRange } from './calendar-domain/matcher-types.js'
import type { TimeRange } from './date-picker-types.js'

const DAY_MINUTES = 24 * 60

const LAST_MINUTE = DAY_MINUTES - 1

export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)

  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])

  if (h > 23 || min > 59) return null

  return h * 60 + min
}

/** Minutes after midnight → "HH:mm". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Reads a typed time: `1130`, `11:30`, `11.30`, `9h30`, `9h`, `930`, `9`,
 * `11:30am`, `9pm`, `12am`. A separator (`:`, `.`, `h`) may end the hour on
 * its own (`9h` is 9:00). Three bare digits read as H:MM (`123` is 1:23).
 * Returns minutes after midnight, or null when it isn't a time.
 */
export function parseTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  // Hour, then minutes after a separator (optional there) or two bare digits.
  const m = /^(\d{1,2})(?:[:.h](\d{2})?|(\d{2}))?(a|am|p|pm)?$/.exec(s)

  if (!m) {
    // Three or four bare digits: "930", "1130".
    const d = /^(\d{3,4})(a|am|p|pm)?$/.exec(s)

    if (!d || d[1] === undefined) return null
    const digits = d[1].padStart(4, '0')

    return parseTime(`${digits.slice(0, 2)}:${digits.slice(2)}${d[2] ?? ''}`)
  }

  let h = Number(m[1])
  const minutes = m[2] ?? m[3]
  const min = minutes === undefined ? 0 : Number(minutes)
  const suffix = m[4]

  if (min > 59) return null

  if (suffix) {
    if (h < 1 || h > 12) return null
    const pm = suffix.startsWith('p')

    if (h === 12) h = pm ? 12 : 0
    else if (pm) h += 12
  } else if (h > 23) {
    return null
  }

  return h * 60 + min
}

/** `15min`, `1h`, `1h 15min`. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  if (h === 0) return `${m}min`

  if (m === 0) return `${h}h`

  return `${h}h ${m}min`
}

/** 12 or 24 hours: the override, else the locale's own clock. */
export function resolveHourCycle(locale?: string, override?: 12 | 24): 12 | 24 {
  if (override) return override
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle

  return cycle === 'h11' || cycle === 'h12' ? 12 : 24
}

/** Minutes after midnight as the locale shows a time: `11:00` or `11:00 AM`. */
export function formatTime(minutes: number, hourCycle: 12 | 24, locale?: string): string {
  return makeTimeFormatter(hourCycle, locale)(minutes)
}

// A slot list shares one locale/clock configuration; constructing Intl per row
// makes unrelated DatePicker open/close updates pay for every hidden time slot.
export function makeTimeFormatter(hourCycle: 12 | 24, locale?: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: hourCycle === 12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle: hourCycle === 12 ? 'h12' : 'h23',
  })

  return (minutes: number): string =>
    formatter.format(localDate(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
}

/** Changing the start keeps the duration: the end moves with it, and
 *  stops at the end of the day. */
export function shiftEnd(prevStart: number, prevEnd: number, nextStart: number): number {
  const duration = Math.max(prevEnd - prevStart, 0)

  return Math.min(nextStart + duration, LAST_MINUTE)
}

export interface TimeSlot {
  minutes: number
  /** Minutes after the range start, for an end list. */
  duration?: number
}

/** Start (or single) slots: the whole day in `step` minutes. End slots:
 *  from one step after `after` to the end of the same day. */
export function buildSlots(step: number, after?: number): Array<TimeSlot> {
  const slots: Array<TimeSlot> = []
  const safeStep = Math.max(1, Math.round(step))

  if (after === undefined) {
    for (let t = 0; t < DAY_MINUTES; t += safeStep) slots.push({ minutes: t })

    return slots
  }

  for (let t = after + safeStep; t <= LAST_MINUTE; t += safeStep) {
    slots.push({ minutes: t, duration: t - after })
  }

  if (slots.length === 0 && after < LAST_MINUTE) {
    slots.push({ minutes: LAST_MINUTE, duration: LAST_MINUTE - after })
  }

  return slots
}

/** The slot nearest a time, by index. */
export function nearestSlotIndex(
  slots: ReadonlyArray<Pick<TimeSlot, 'minutes'>>,
  minutes: number,
): number {
  let best = -1
  let bestDistance = Infinity
  slots.forEach((slot, i) => {
    const d = Math.abs(slot.minutes - minutes)

    if (d < bestDistance) {
      best = i
      bestDistance = d
    }
  })

  return best
}

// ---------------------------------------------------------------------------
// Date labels (exported for the unit tests)
// ---------------------------------------------------------------------------

interface LabelPart {
  type: Intl.DateTimeFormatPartTypes
  value: string
}

function singleLabelOptions(withYear: boolean): Intl.DateTimeFormatOptions {
  return {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  }
}

function rangeLabelOptions(withYear: boolean): Intl.DateTimeFormatOptions {
  return { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) }
}

/** A date's label as parts, in the locale's order. */
function labelParts(date: Date, locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(date)

  return parts.map((part, i): LabelPart =>
    // Drop the comma English puts after the weekday: "Wed Oct 21".
    part.type === 'literal' && parts[i - 1]?.type === 'weekday'
      ? { type: part.type, value: part.value.replace(',', '') }
      : { type: part.type, value: part.value },
  )
}

/** `Wed Oct 21`, or `Wed Oct 21, 2027` outside the current year. */
export function formatDateLabel(
  date: Date,
  locale?: string,
  now = DateTime.toDateUtc(DateTime.nowUnsafe()),
): string {
  const withYear = date.getFullYear() !== now.getFullYear()

  return labelParts(date, locale, singleLabelOptions(withYear))
    .map((part) => part.value)
    .join('')
}

/** `Oct 21 → Oct 24`, with years when the range leaves the current year. */
export function formatRangeLabel(
  range: DateRange,
  locale?: string,
  now = DateTime.toDateUtc(DateTime.nowUnsafe()),
): string {
  if (!range.from) return ''
  const withYear = rangeWithYear(range, now)
  const fmt = new Intl.DateTimeFormat(locale, rangeLabelOptions(withYear))

  if (!range.to) return `${fmt.format(range.from)} →`

  return `${fmt.format(range.from)} → ${fmt.format(range.to)}`
}

/** `2026-10-21`, from the date's local parts (not UTC). */
function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The hidden input's value for `name` (exported for the unit tests). */
export function formValue(
  value: Date | DateRange | undefined,
  time?: string | null,
  timeRange?: TimeRange | null,
): string {
  if (value instanceof Date) {
    const day = isoDate(value)

    if (timeRange) return `${day}T${timeRange.start}/${day}T${timeRange.end}`

    return time ? `${day}T${time}` : day
  }

  if (value?.from && value.to) return `${isoDate(value.from)}/${isoDate(value.to)}`

  return ''
}

function rangeWithYear(range: DateRange, now: Date) {
  const year = now.getFullYear()

  return (
    (!!range.from && range.from.getFullYear() !== year) ||
    (!!range.to && range.to.getFullYear() !== year)
  )
}

/**
 * The label's widest form, part by part: every weekday name stacked in one
 * cell, every month name in another, a two-digit day, the rest as written.
 * Laid out invisibly under the label, it fixes the trigger's width for any
 * date in that format, in any locale and font. Exported for the unit test.
 */
export function widestLabelParts(
  sample: Array<LabelPart>,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Array<Array<string>> {
  const fmt = new Intl.DateTimeFormat(locale, options)

  const pick = (date: Date, type: Intl.DateTimeFormatPartTypes) =>
    fmt.formatToParts(date).find((part) => part.type === type)?.value ?? ''

  const weekdays = Array.from({ length: 7 }, (_, i) => pick(localDate(2026, 0, 4 + i), 'weekday'))
  const months = Array.from({ length: 12 }, (_, m) => pick(localDate(2026, m, 28), 'month'))
  // Digits are tabular in the label, so any two-digit day is the widest.
  const day = [pick(localDate(2026, 0, 28), 'day')]

  return sample.map((part) =>
    part.type === 'weekday'
      ? [...new Set(weekdays)]
      : part.type === 'month'
        ? [...new Set(months)]
        : part.type === 'day'
          ? day
          : [part.value],
  )
}

export function dateLabelSizer(
  mode: 'single' | 'range',
  value: Date | DateRange | undefined,
  locale: string | undefined,
  now: Date,
): Array<Array<string>> {
  const year = now.getFullYear()
  const first = localDate(year, 0, 1)

  if (mode === 'range') {
    const range = value instanceof Date ? undefined : value
    const from = range?.from ?? first
    const to = range?.to ?? from
    const options = rangeLabelOptions(rangeWithYear(range ?? { from: undefined }, first))

    return widestLabelParts(
      [
        ...labelParts(from, locale, options),
        { type: 'literal', value: ' → ' },
        ...labelParts(to, locale, options),
      ],
      locale,
      options,
    )
  }

  const date = value instanceof Date ? value : first
  const options = singleLabelOptions(date.getFullYear() !== year)

  return widestLabelParts(labelParts(date, locale, options), locale, options)
}
