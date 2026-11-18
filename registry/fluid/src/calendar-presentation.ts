/* @license Fluid calendar 200b4534, MIT. Pure geometry; the Calendar Block owns its lifetime. */
import { localDate } from './calendar-domain/date-boundary.js'
import type { TargetMotionOptions } from './motion-target.js'
import { spring } from './lib/springs.js'
import { rangeContainsModifiers } from './calendar-domain/matchers.js'
import type { Matcher } from './calendar-domain/matcher-types.js'
import { dayNumber } from './calendar-domain/rules.js'
import { restoreDate, Selection } from './calendar-state.js'

const addDays: (date: Date, days: number) => Date = function addDays(date: Date, days: number) {
  return localDate(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export const calendarSlide: (options: {
  readonly direction: number
  readonly stride: number | null
  readonly stacked: boolean
  readonly single: boolean
  readonly reduceMotion: boolean
  readonly present: boolean
}) => TargetMotionOptions = function calendarSlide(options: {
  readonly direction: number
  readonly stride: number | null
  readonly stacked: boolean
  readonly single: boolean
  readonly reduceMotion: boolean
  readonly present: boolean
}) {
  const offset = options.reduceMotion ? 0 : 10
  const carousel = options.stride !== null && offset > 0

  const strideScale = options.single ? 3 : 1
  const strideDistance = options.stride === null ? offset : options.stride / strideScale
  const distance = carousel ? strideDistance : offset

  const solid = carousel && !options.single
  const at = (value: number) => (options.stacked ? { y: value } : { x: value })

  return {
    initial: { opacity: solid ? 1 : 0, ...at(options.direction * distance) },
    animate: { opacity: 1, x: 0, y: 0, transition: spring.moderate },
    exit: {
      opacity: solid ? 1 : 0,
      ...at(-options.direction * distance),
      transition: carousel ? spring.moderate : spring.moderate.exit,
    },
    present: options.present,
  }
}

export const calendarFits: (width: number, cellSize: number, showWeekNumber: boolean) => boolean =
  function calendarFits(width: number, cellSize: number, showWeekNumber: boolean) {
    return width >= (7 + (showWeekNumber ? 0.75 : 0)) * cellSize * 2 + 24 + 16
  }

export interface Band {
  readonly from: number
  readonly to: number
}

function previewBand(
  from: Date | undefined,
  to: Date | undefined,
  picking: boolean,
  firstDay: Date | undefined,
  activeIndex: number | null,
  disabled: Array<Matcher>,
) {
  let band: Band | null = null
  let previewEnd: number | null = null

  const preview = firstDay && activeIndex !== null ? addDays(firstDay, activeIndex) : undefined

  if (from) {
    if (picking && preview) {
      const a = from < preview ? from : preview
      const b = from < preview ? preview : from

      if (disabled.length === 0 || !rangeContainsModifiers({ from: a, to: b }, disabled)) {
        previewEnd = dayNumber(preview)
        band = {
          from: Math.min(dayNumber(from), previewEnd),
          to: Math.max(dayNumber(from), previewEnd),
        }
      }
    } else if (to) {
      band = { from: dayNumber(from), to: dayNumber(to) }
    }
  }

  return { band, previewEnd }
}

export function calendarBand(
  selection: Selection,
  firstDay: Date | undefined,
  activeIndex: number | null,
  disabled: Array<Matcher>,
) {
  const range = Selection.isAnyOf(['Range'])(selection) ? selection : null
  const from = range?.from ? restoreDate(range.from) : undefined
  const to = range?.to ? restoreDate(range.to) : undefined
  const picking = from !== undefined && to === undefined
  const { band, previewEnd } = previewBand(from, to, picking, firstDay, activeIndex, disabled)

  const gridStart = firstDay ? dayNumber(firstDay) : 0
  const litDay = activeIndex === null ? null : gridStart + activeIndex

  const litFilled =
    litDay !== null &&
    (Selection.isAnyOf(['Single'])(selection)
      ? selection.date.ordinal === litDay
      : (!!from && dayNumber(from) === litDay) || (!!to && !picking && dayNumber(to) === litDay))

  return {
    band,
    previewEnd,
    picking,
    gridStart,
    litFilled,
    previewGlides: previewEnd !== null && !!from && previewEnd !== dayNumber(from),
  }
}

const corner = (edge: boolean, touching: boolean) => (edge && !touching ? '2px' : 0)

export function calendarBandSlice(input: {
  readonly day: Date
  readonly displayMonth: Date
  readonly gridFirst: number
  readonly gridLast: number
  readonly hidden: boolean
  readonly outsideHidden: boolean
  readonly band: Band | null
}) {
  const { day, displayMonth, gridFirst, gridLast, outsideHidden, band } = input
  const n = dayNumber(day)

  if (!band || input.hidden || band.from === band.to || n < band.from || n > band.to) {
    return null
  }

  const weekday = (((n - gridFirst) % 7) + 7) % 7

  const drawn = (m: number) =>
    m >= gridFirst &&
    m <= gridLast &&
    (!outsideHidden || addDays(day, m - n).getMonth() === displayMonth.getMonth())

  const left = n > band.from && (weekday === 0 || (day.getDate() === 1 && outsideHidden))

  const right =
    n < band.to &&
    (weekday === 6 || (addDays(day, 1).getMonth() !== day.getMonth() && outsideHidden))

  const atLeft = (m: number) => drawn(m) && m > band.from && m <= band.to
  const atRight = (m: number) => drawn(m) && m >= band.from && m < band.to

  return {
    left: n > band.from ? 0 : '50%',
    right: n < band.to ? 0 : '50%',
    borderTopLeftRadius: corner(left, atLeft(n - 7)),
    borderBottomLeftRadius: corner(left, atLeft(n + 7)),
    borderTopRightRadius: corner(right, atRight(n - 7)),
    borderBottomRightRadius: corner(right, atRight(n + 7)),
  }
}
