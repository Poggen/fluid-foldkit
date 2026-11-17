import { expect, test } from 'vitest'
import { DateTime, Schema } from 'effect'
import { dateValue } from '@foldkit-visuals/fluid/calendar'
import * as Calendar from './configs/calendar'
import * as Picker from './configs/date-picker'
import * as Ask from './configs/ask-user-questions'
import * as Sidebar from './configs/sidebar'
import { askUserQuestionsCode } from './configs/ask-user-questions-code'

const localDate = (year: number, month: number, day: number) =>
  DateTime.toDateUtc(
    DateTime.makeZonedUnsafe(
      { year, month, day },
      { timeZone: DateTime.zoneMakeLocal(), adjustForTimeZone: true },
    ),
  )

const enabled = (
  controls: ReadonlyArray<{ readonly prop: string; readonly enabled?: boolean }>,
  prop: string,
) => controls.find((control) => control.prop === prop)?.enabled

test('date controls distinguish range presets from single-date time and keep saved inactive choices', () => {
  const range = {
    ...Picker.defaults,
    type: 'range' as const,
    time: 'timeRange' as const,
    presets: true,
    numberOfMonths: 1 as const,
  }
  expect(Schema.is(Picker.Configuration)(range)).toBe(true)
  const controls = Picker.controlsFor(range)
  expect(enabled(controls, 'time')).toBe(false)
  expect(enabled(controls, 'step')).toBe(false)
  expect(enabled(controls, 'clock')).toBe(false)
  expect(enabled(controls, 'presets')).toBe(true)
  expect(enabled(controls, 'calendarOrientation')).toBe(false)
  const single = Picker.controlsFor({ ...range, type: 'single' })
  expect(enabled(single, 'step')).toBe(true)
  expect(enabled(single, 'presets')).toBe(false)
  expect(enabled(Picker.controlsFor({ ...range, variant: 'ghost' }), 'clearable')).toBe(false)
})

test('calendar authored rule versions are immutable and weekdays differ from booked dates', () => {
  const today = localDate(2026, 11, 12)
  expect(Calendar.calendarRulesForRevision(Calendar.calendarRuleRevision('all'), today)).toEqual({})
  expect(
    Calendar.calendarRulesForRevision(Calendar.calendarRuleRevision('weekdays'), today),
  ).toEqual({ available: { dayOfWeek: [1, 2, 3, 4, 5] } })
  const booked = Calendar.calendarRulesForRevision(Calendar.calendarRuleRevision('booked'), today)
  expect(booked.booked).toEqual([
    localDate(2026, 11, 16),
    localDate(2026, 11, 17),
    localDate(2026, 11, 18),
    localDate(2026, 11, 24),
    localDate(2026, 12, 1),
    localDate(2026, 12, 2),
  ])
  expect(booked.disabled).toEqual({ before: today })
  expect(
    enabled(Calendar.controlsFor({ ...Calendar.defaults, numberOfMonths: 1 }), 'orientation'),
  ).toBe(false)
})

test('date range presets retain inclusive end dates and roll into the next month', () => {
  const presets = Picker.datePresets(localDate(2026, 11, 28).getTime())
  expect(presets[0]).toEqual({
    label: 'Next 7 days',
    range: {
      _tag: 'Range',
      from: dateValue(localDate(2026, 11, 28)),
      to: dateValue(localDate(2026, 12, 4)),
    },
  })
  expect(presets[3]).toEqual({
    label: 'This weekend',
    range: {
      _tag: 'Range',
      from: dateValue(localDate(2026, 11, 28)),
      to: dateValue(localDate(2026, 11, 29)),
    },
  })
})

test('question composition changes the actual flow and generated literal together', () => {
  const configuration = {
    ...Ask.defaults,
    layout: 'stacked' as const,
    chip: 'left' as const,
    multiSelect: true,
    allowOther: true,
    count: 2 as const,
    skippable: false,
    label: 'Choose your role',
  }
  const questions = Ask.buildQuestions(configuration)
  expect(questions).toHaveLength(2)
  expect(questions[0]).toMatchObject({
    title: 'Choose your role',
    multiSelect: true,
    allowOther: true,
    skippable: false,
    layout: 'stacked',
    chipPosition: 'left',
  })
  expect(
    questions[0] && 'options' in questions[0] ? questions[0].options[0]?.description : undefined,
  ).toBe('Prototyping flows and pages fast, then handing the patterns to the team.')
  expect(askUserQuestionsCode(configuration)).toContain(JSON.stringify(questions, null, 2))
  const freeText = { ...configuration, type: 'freeText' as const, multiline: false }
  expect(Ask.buildQuestions(freeText)[0]).toMatchObject({
    freeText: true,
    freeTextMultiline: false,
    freeTextPlaceholder: 'e.g. Acme Design',
  })
  expect(enabled(Ask.controlsFor(freeText), 'multiSelect')).toBe(false)
  expect(enabled(Ask.controlsFor(freeText), 'multiline')).toBe(true)
})

test('sidebar nesting preserves stable row and menu identities while leaves own actions', () => {
  const nested = { ...Sidebar.defaults, l1Primary: 'menu' as const, l1Children: true }
  const flat = Sidebar.sidebarRows({ ...nested, l1Children: false })
  const rows = Sidebar.sidebarRows(nested)
  expect(rows).toHaveLength(20)
  expect(rows.filter((row) => row.level === 0).map((row) => row.value)).toEqual(
    flat.map((row) => row.value),
  )
  expect(rows.find((row) => row.value === 'primary-0-child-0')).toMatchObject({
    label: 'Design system',
    badge: '4',
    level: 1,
  })
  expect(rows.every((row) => Sidebar.sidebarMenuIds.includes(row.value))).toBe(true)
  expect(new Set(Sidebar.sidebarMenuIds).size).toBe(Sidebar.sidebarMenuIds.length)
  expect(enabled(Sidebar.controlsFor(nested), 'l1Actions')).toBe(false)
  expect(enabled(Sidebar.controlsFor({ ...nested, l1Primary: 'threads' }), 'l2Actions')).toBe(false)
  expect(enabled(Sidebar.controlsFor(Sidebar.defaults), 'footerCalloutStacked')).toBe(false)
})

test('sidebar sections partition original rows without duplicating labels or status', () => {
  const rows = Sidebar.sidebarRows(Sidebar.defaults)
  expect(rows.filter((row) => row.value.startsWith('primary-')).map((row) => row.label)).toEqual(
    Sidebar.threadRows.slice(0, 3).map((row) => row.label),
  )
  expect(
    rows.filter((row) => row.value.startsWith('secondary-')).map((row) => [row.label, row.status]),
  ).toEqual(Sidebar.threadRows.slice(3).map((row) => [row.label, row.status]))
  const menus = Sidebar.sidebarRows({ ...Sidebar.defaults, l1Primary: 'menu' })
  expect(menus.map((row) => row.value)).toEqual([
    'primary-0',
    'primary-1',
    'primary-2',
    'secondary-3',
    'secondary-4',
  ])
})
