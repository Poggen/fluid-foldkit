import { constant } from 'effect/Function'
import { exampleHoverConfig } from './example-presentation.js'
import type { CalendarPrepareOptions } from '@foldkit-visuals/fluid/calendar/environment'
import { Effect, Match, Random, Schema } from 'effect'

export const Settings = Schema.Struct({
  mode: Schema.Literals(['single', 'range']),
  months: Schema.Literals([1, 2]),
  orientation: Schema.Literals(['auto', 'horizontal', 'vertical']),
  cellSize: Schema.NullOr(Schema.Literals([40, 44, 48])),
  days: Schema.Literals(['all', 'booked', 'weekdays']),
  weekNumbers: Schema.Boolean,
})

export type Settings = typeof Settings.Type

export const defaults: Settings = {
  mode: 'range',
  months: 2,
  orientation: 'auto',
  cellSize: null,
  days: 'all',
  weekNumbers: false,
}

export const controls = [
  {
    key: 'mode',
    label: 'Mode',
    items: [
      { value: 'single', label: 'Single' },
      { value: 'range', label: 'Range' },
    ],
  },
  {
    key: 'months',
    label: 'Months',
    items: [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
    ],
  },
  {
    key: 'orientation',
    label: 'Orientation',
    items: [
      { value: 'auto', label: 'Auto' },
      { value: 'horizontal', label: 'Horizontal' },
      { value: 'vertical', label: 'Vertical' },
    ],
  },
  {
    key: 'cellSize',
    label: 'Cell size',
    items: [
      { value: 'auto', label: 'Size' },
      { value: '40', label: '40px' },
      { value: '44', label: '44px' },
      { value: '48', label: '48px' },
    ],
  },
  {
    key: 'days',
    label: 'Days',
    items: [
      { value: 'all', label: 'All open' },
      { value: 'booked', label: 'Booked + past' },
      { value: 'weekdays', label: 'Weekdays only' },
    ],
  },
] satisfies ReadonlyArray<{
  key: keyof Settings
  label: string
  items: ReadonlyArray<{ value: string; label: string }>
}>

export const valueFor = (settings: Settings, key: keyof Settings) => String(settings[key] ?? 'auto')

export const demoRate = (day: Date) => {
  const seed = day.getFullYear() * 400 + day.getMonth() * 32 + day.getDate()
  const signed = Math.imul(seed, 2_654_435_761)
  const unsigned = signed < 0 ? signed + 4_294_967_296 : signed

  return 99 + (Math.floor(unsigned / 256) % 10) * 10
}

export const revisionFor = (days: Settings['days']) =>
  Match.value(days).pipe(
    Match.when('booked', () => 1),
    Match.when('weekdays', () => 2),
    Match.when('all', () => 0),
    Match.exhaustive,
  )

export const orientationFor: (key: string) => Settings['orientation'] = (key: string) =>
  Match.value(key).pipe(
    Match.when('stacked', constant<Settings['orientation']>('vertical')),
    Match.when('range', constant<Settings['orientation']>('horizontal')),
    Match.orElse(constant<Settings['orientation']>('auto')),
  )

export const occurrenceOptions: (key: string, today: Date) => CalendarPrepareOptions = (
  key: string,
  today: Date,
) => {
  const options: CalendarPrepareOptions = {
    id: `authored-${key}`,
    controlled: true,
    mode: ['range', 'stacked', 'booking', 'playground'].includes(key) ? 'range' : 'single',
    presentation: {
      ...exampleHoverConfig,
      numberOfMonths: ['range', 'stacked', 'playground'].includes(key) ? 2 : 1,
      orientation: orientationFor(key),
      showWeekNumber: key === 'week',
    },
  }

  return ['single', 'big', 'week'].includes(key) ? { ...options, selected: today } : options
}

export const cellSizeFor: (value: string) => Settings['cellSize'] = (value: string) =>
  Match.value(value).pipe(
    Match.when('40', constant<Settings['cellSize']>(40)),
    Match.when('44', constant<Settings['cellSize']>(44)),
    Match.when('48', constant<Settings['cellSize']>(48)),
    Match.orElse(() => null),
  )

export const shuffleSettings = Effect.gen(function* shuffleSettings() {
  const mode = yield* Random.next
  const months = yield* Random.next
  const orientation = yield* Random.next
  const cell = yield* Random.next
  const weeks = yield* Random.next
  const days = yield* Random.next
  const orientationChoices: ReadonlyArray<Settings['orientation']> = [
    'auto',
    'horizontal',
    'vertical',
  ]
  const cellChoices: ReadonlyArray<Settings['cellSize']> = [null, null, 40, 44, 48]
  const dayChoices: ReadonlyArray<Settings['days']> = ['all', 'booked', 'weekdays']

  return {
    mode: mode < 1 / 3 ? 'single' : 'range',
    months: months < 0.5 ? 1 : 2,
    orientation: orientationChoices[Math.floor(orientation * 3)] ?? 'auto',
    cellSize: cellChoices[Math.floor(cell * 5)] ?? null,
    weekNumbers: weeks > 0.6,
    days: dayChoices[Math.floor(days * 3)] ?? 'all',
  } satisfies Settings
})

export const examples = [
  {
    key: 'single',
    title: 'Single',
    description:
      'Click a day, or arrow to it and press Enter. PageUp and PageDown change the month.',
    height: 360,
  },
  {
    key: 'range',
    title: 'Range',
    description:
      '2 months, one hover. Pick a start, then move: the band follows the pointer across the month break.',
    height: 360,
  },
  {
    key: 'stacked',
    title: 'Stacked months',
    description:
      'orientation="vertical" stacks the months under one weekday row, which stays put when they scroll in a shorter box. auto picks this when 2 months don’t fit side by side.',
    height: 0,
  },
  {
    key: 'booking',
    title: 'Booked and unavailable',
    description:
      'Booked days are struck through and a range can’t cross them. Past days only fade.',
    height: 360,
  },
  {
    key: 'weekday',
    title: '',
    description: 'available flips the rule: every day it doesn’t match is unavailable.',
    height: 360,
  },
  {
    key: 'big',
    title: 'Cell size',
    description:
      'cellSize sets the cell in px; the numbers keep their size. dayDetail puts a line under each number, a price here, and needs the room of a taller cell. It takes any node: good deals show green.',
    height: 420,
  },
  {
    key: 'week',
    title: 'Week numbers',
    description: 'ISO week numbers in a muted column, with weeks starting on Monday.',
    height: 360,
  },
]

export const authoredRules = ({
  id,
  revision,
  booked,
  today,
}: {
  id: string
  revision: number
  booked: Array<Date>
  today: Date
}) => {
  if (id.endsWith('booking') || revision === 1) {
    return { booked, disabled: { before: today } }
  }

  if (id.endsWith('weekday') || revision === 2) {
    return { available: { dayOfWeek: [1, 2, 3, 4, 5] } }
  }

  return {}
}
