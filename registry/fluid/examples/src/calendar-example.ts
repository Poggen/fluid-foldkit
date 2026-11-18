import * as classNames from './calendar-example-classes.js'
import { Button } from '@foldkit/ui'
import { Clock, DateTime, Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  CalendarBlock,
  calendarTooltipKeys,
  calendarViewInputs,
  layer as CalendarLayer,
} from '@foldkit-visuals/fluid/calendar'
import type { CalendarViewInputs } from '@foldkit-visuals/fluid/calendar'
import {
  CalendarEnvironment,
  makeCalendarEnvironment,
  prepareCalendar,
} from '@foldkit-visuals/fluid/calendar/environment'
import {
  DocumentTooltipBlock,
  layer as DocumentTooltipLayer,
  makeTooltipDomLayer,
} from '@foldkit-visuals/fluid/tooltip'
import type { TooltipDom } from '@foldkit-visuals/fluid/tooltip'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { calendarExampleLocale } from './calendar-example-locale.js'
import './calendar-example.css'

const Settings = Schema.Struct({
  mode: Schema.Literals(['single', 'range']),
  months: Schema.Literals([1, 2]),
  orientation: Schema.Literals(['auto', 'horizontal', 'vertical']),
  admission: Schema.Literals(['uncontrolled', 'accept', 'refuse']),
  controlledMonth: Schema.Boolean,
  days: Schema.Literals(['all', 'booked', 'weekdays', 'disabled']),
  locale: Schema.Literals(['en-US', 'sv-SE']),
  outside: Schema.Literals(['auto', 'show', 'hide']),
  required: Schema.Boolean,
  limits: Schema.Boolean,
  weekNumbers: Schema.Boolean,
  compact: Schema.Boolean,
  fill: Schema.Boolean,
  details: Schema.Boolean,
  cellSize: Schema.NullOr(Schema.Literals([40, 44, 48, 56])),
})
type Settings = typeof Settings.Type
type Selection = typeof CalendarBlock.Model.Type.calendar.selection.selected
type CalendarOptions = ReturnType<Parameters<typeof makeCalendarEnvironment>[0]>

const profiles = Settings.fields.locale.literals.flatMap((locale) =>
  Settings.fields.days.literals.flatMap((days) =>
    Settings.fields.outside.literals.map((outside) => ({ locale, days, outside })),
  ),
)
const revisionFor = (settings: Settings) =>
  profiles.findIndex(
    (profile) =>
      profile.locale === settings.locale &&
      profile.days === settings.days &&
      profile.outside === settings.outside,
  )
const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(timestamp)
const describe: (selection: Selection) => string = (selection: Selection) => {
  if (selection._tag === 'Single') return formatDate(selection.date.timestamp)
  if (selection._tag === 'Range') {
    return `${selection.from === null ? 'Choose a start' : formatDate(selection.from.timestamp)} → ${selection.to === null ? 'Choose an end' : formatDate(selection.to.timestamp)}`
  }
  return 'No date selected'
}

const start = Effect.gen(function* () {
  const clock = yield* Clock.Clock
  const localNow = yield* DateTime.nowInCurrentZone.pipe(DateTime.withCurrentZoneLocal)
  const today = DateTime.toDateUtc(localNow)
  const dayAfter = (days: number) =>
    DateTime.toDateUtc(DateTime.add(DateTime.startOf(localNow, 'day'), { days }))
  const environment = makeCalendarEnvironment((_id, revision) => {
    const profile = profiles[revision]
    if (profile === undefined) throw new Error(`Unknown Calendar example profile ${revision}`)
    return {
      ...calendarExampleLocale(profile.locale),
      ...(profile.outside === 'auto' ? {} : { showOutsideDays: profile.outside === 'show' }),
      ...(profile.days === 'booked'
        ? {
            booked: [4, 5, 6, 12, 19, 20].map(dayAfter),
            disabled: {
              before: DateTime.toDateUtc(DateTime.makeUnsafe(clock.currentTimeMillisUnsafe())),
            },
          }
        : {}),
      ...(profile.days === 'weekdays' ? { available: { dayOfWeek: [1, 2, 3, 4, 5] } } : {}),
      ...(profile.days === 'disabled' ? { disabled: true } : {}),
    } satisfies CalendarOptions
  })
  const query = new URLSearchParams(window.location.search)
  const examplesUrl = new URL('./', window.location.href).href
  const source = query.get('preset') === 'source'
  const settings = Settings.make({
    mode:
      query.get('mode') === 'single'
        ? 'single'
        : source || query.get('mode') === 'range'
          ? 'range'
          : 'single',
    months: query.get('months') === '1' ? 1 : source || query.get('months') === '2' ? 2 : 1,
    orientation:
      query.get('orientation') === 'vertical'
        ? 'vertical'
        : query.get('orientation') === 'horizontal'
          ? 'horizontal'
          : 'auto',
    admission: 'accept',
    controlledMonth: false,
    days: 'all',
    locale: 'en-US',
    outside: 'auto',
    required: false,
    limits: false,
    weekNumbers: false,
    compact: false,
    fill: false,
    details: false,
    cellSize: null,
  })
  const prepared = yield* prepareCalendar({
    id: 'calendar-example',
    mode: settings.mode,
    controlled: true,
    ...(settings.mode === 'single' ? { selected: today } : {}),
    revision: revisionFor(settings),
    presentation: { numberOfMonths: settings.months, orientation: settings.orientation },
  }).pipe(Effect.provide(environment))
  const Model = Schema.Struct({
    calendar: CalendarBlock.Model,
    tooltips: DocumentTooltipBlock.Model,
    settings: Settings,
    latest: Schema.String,
  })
  const Message = defineMessageUnion({ Configured: { settings: Settings } })
  const CalendarExampleKey = Symbol('CalendarExample')
  const CalendarExampleBlock = Block.make('CalendarExample', {
    key: CalendarExampleKey,
    InitArgs: Schema.Tuple([]),
    Model,
    Message,
    view: { kind: 'Document' },
    effects: Block.makeEffectsContract<never, CalendarEnvironment | TooltipDom>(),
  })
  const Calendar = CalendarExampleBlock.makeRequiredFieldBinding(CalendarBlock, {
    field: 'calendar',
    init: { contextToArgs: () => [prepared] },
  })
  const CalendarPolicy = Calendar.withOutMessagePolicy({
    fold: CalendarExampleBlock.makeOutMessageFold(CalendarBlock, {
      Transitioned: ({ events }) =>
        CalendarExampleBlock.makeStep((model) => {
          const state = model.calendar.calendar
          let selection = state.selection.selected
          let month = state.month
          let picked = false
          let navigated = false
          for (const event of events) {
            if (event._tag === 'Selected') {
              selection = event.value
              picked = true
            }
            if (event._tag === 'MonthChanged') {
              month = event.month
              navigated = true
            }
          }
          if (!picked && !navigated) return CalendarExampleBlock.makeNoopStep()
          const refused = model.settings.admission === 'refuse' && (picked || state.controlledMonth)
          return Update.combineSteps([
            CalendarExampleBlock.makeFieldsStep(() => ({
              latest: () =>
                `${refused ? 'Refused' : 'Accepted'} ${picked ? describe(selection) : formatDate(month.timestamp)}`,
            })),
            model.settings.admission === 'accept'
              ? Calendar.requestAcceptance({
                  selection: { ...state.selection, selected: selection },
                  month,
                  controlledMonth: state.controlledMonth,
                })
              : CalendarExampleBlock.makeNoopStep(),
          ])
        }),
    }),
  })
  const Tooltips = CalendarExampleBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
    field: 'tooltips',
    init: { contextToArgs: () => [] },
  }).withOutMessagePolicy({
    fold: CalendarExampleBlock.makeOutMessageFold(DocumentTooltipBlock, {
      Transaction: () => CalendarExampleBlock.makeNoopStep(),
    }),
  })
  const CalendarExampleComposition = CalendarExampleBlock.makeComposition({
    bindings: [CalendarPolicy, Tooltips],
  })
  const init = CalendarExampleComposition.makeInit(() => ({
    model: { settings, latest: 'Choose a date or navigate to another month.' },
    steps: calendarTooltipKeys('calendar').map((key) => Tooltips.requestAdd({ key })),
  }))
  const update = CalendarExampleComposition.makeUpdate({
    Configured: CalendarExampleBlock.makeStep((model, message: typeof Message.Configured.Type) => {
      const next = message.settings.details
        ? ({ ...message.settings, cellSize: 56 } satisfies Settings)
        : message.settings
      const state = model.calendar.calendar
      const empty: Selection = { _tag: 'Empty' }
      return Update.combineSteps([
        CalendarExampleBlock.makeFieldsStep(() => ({
          settings: () => next,
          latest: () => 'Options updated.',
        })),
        Calendar.requestRefresh({ revision: revisionFor(next) }),
        Calendar.requestSynchronization({
          selection: {
            ...state.selection,
            mode: next.mode,
            controlled: next.admission !== 'uncontrolled',
            selected: state.selection.mode === next.mode ? state.selection.selected : empty,
            required: next.required,
            min: next.limits ? 2 : 0,
            max: next.limits ? 7 : 0,
          },
          month: state.month,
          controlledMonth: next.controlledMonth && next.admission !== 'uncontrolled',
          presentation: {
            numberOfMonths: next.months,
            orientation: next.orientation,
            showWeekNumber: next.weekNumbers,
          },
          occurrenceFocus: false,
        }),
      ])
    }),
  })
  const motion = createTargetMotionScope(classNames.calendarExample)
  const view = CalendarExampleComposition.makeView((model, h) => {
    const triggers = new Map<string, Parameters<CalendarViewInputs['tooltip']>[0]['render']>()
    const context = createPresentationContext({
      size: model.settings.compact ? 'compact' : 'default',
      reducedMotion: 'user',
    })
    return {
      title: 'Calendar · Fluid',
      body: h.block(
        Tooltips.embedView({
          slotId: 'calendar-tooltips',
          model: model.tooltips,
          viewInputs: {
            renderTrigger: (key, { button }) => {
              const render = triggers.get(key)
              if (render === undefined) throw new Error(`Missing Calendar tooltip trigger ${key}`)
              return render({ button })
            },
            render: ({ tooltip }) => {
              const options = model.settings
              const inputs: CalendarViewInputs = {
                ...calendarViewInputs(h, {
                  key: 'calendar',
                  context,
                  motion,
                  keyboardTrigger: false,
                  tooltip,
                  fill: options.fill,
                  ...(options.cellSize === null ? {} : { cellSize: options.cellSize }),
                  registerTrigger: (key, render) => {
                    triggers.set(key, render)
                  },
                }),
                ...(options.details
                  ? {
                      dayDetail: (date: Date) => {
                        const deal = ![0, 5, 6].includes(date.getDay())
                        return h.span(
                          [h.Class(classNames.calendarRate), h.DataAttribute('deal', String(deal))],
                          [deal ? '$109' : '$169'],
                        )
                      },
                    }
                  : {}),
              }
              const calendar = h.block(
                Calendar.embedView({
                  slotId: 'calendar',
                  model: model.calendar,
                  viewInputs: inputs,
                }),
              )
              if (source)
                return h.main(
                  [h.Class('flex min-h-screen p-[40px_24px] items-start justify-center')],
                  [calendar],
                )
              const choice = <Key extends keyof Settings>(
                label: string,
                key: Key,
                values: ReadonlyArray<readonly [Settings[Key], string]>,
                disabled = false,
              ) =>
                h.fieldset(
                  [],
                  [
                    h.legend([], [label]),
                    h.div(
                      [h.Class(classNames.calendarOptions)],
                      values.map(([value, text]) =>
                        Button.view(
                          {
                            onClick: Message.Configured({ settings: { ...options, [key]: value } }),
                            type: 'button',
                            toView: (attributes) =>
                              h.button(
                                [
                                  h.Class('[font:inherit]'),
                                  ...attributes.button,
                                  h.Disabled(disabled),
                                  h.AriaPressed(String(options[key] === value)),
                                ],
                                [text],
                              ),
                          },
                          h,
                        ),
                      ),
                    ),
                  ],
                )
              return h.main(
                [h.Class(classNames.calendarExample)],
                [
                  h.a([h.Href(examplesUrl)], ['← Fluid examples']),
                  h.h1([], ['Make room for a date.']),
                  h.p(
                    [h.Class('intro')],
                    [
                      'One day or a whole trip. Try the month layout, booking rules and selection controls; the calendar keeps its keyboard and motion behavior throughout.',
                    ],
                  ),
                  h.div(
                    [h.Class(classNames.calendarWorkspace)],
                    [
                      h.aside(
                        [h.Class(classNames.calendarControls), h.AriaLabel('Calendar options')],
                        [
                          choice('Selection', 'mode', [
                            ['single', 'Single'],
                            ['range', 'Range'],
                          ]),
                          choice('Months', 'months', [
                            [1, 'One'],
                            [2, 'Two'],
                          ]),
                          choice(
                            'Orientation',
                            'orientation',
                            [
                              ['auto', 'Auto'],
                              ['horizontal', 'Horizontal'],
                              ['vertical', 'Vertical'],
                            ],
                            options.months === 1,
                          ),
                          choice('Application control', 'admission', [
                            ['uncontrolled', 'Internal'],
                            ['accept', 'Accept'],
                            ['refuse', 'Refuse'],
                          ]),
                          choice(
                            'Control month proposals',
                            'controlledMonth',
                            [
                              [false, 'Off'],
                              [true, 'On'],
                            ],
                            options.admission === 'uncontrolled',
                          ),
                          choice('Days', 'days', [
                            ['all', 'All open'],
                            ['booked', 'Booked + past'],
                            ['weekdays', 'Weekdays'],
                            ['disabled', 'Disabled'],
                          ]),
                          choice('Locale', 'locale', [
                            ['en-US', 'English'],
                            ['sv-SE', 'Svenska'],
                          ]),
                          choice(
                            'Outside days',
                            'outside',
                            [
                              ['auto', 'Auto'],
                              ['show', 'Show'],
                              ['hide', 'Hide'],
                            ],
                            options.months === 2,
                          ),
                          choice('Required selection', 'required', [
                            [false, 'Off'],
                            [true, 'On'],
                          ]),
                          choice(
                            'Range: 2–7 nights',
                            'limits',
                            [
                              [false, 'Off'],
                              [true, 'On'],
                            ],
                            options.mode !== 'range',
                          ),
                          choice('Week numbers', 'weekNumbers', [
                            [false, 'Off'],
                            [true, 'On'],
                          ]),
                          choice('Size', 'compact', [
                            [false, 'Default'],
                            [true, 'Compact'],
                          ]),
                          choice(
                            'Cell size',
                            'cellSize',
                            [
                              [null, 'Auto'],
                              [40, '40'],
                              [44, '44'],
                              [48, '48'],
                              [56, '56'],
                            ],
                            options.details,
                          ),
                          choice('Stretch columns', 'fill', [
                            [false, 'Off'],
                            [true, 'On'],
                          ]),
                          choice('Daily rates · 56px', 'details', [
                            [false, 'Off'],
                            [true, 'On'],
                          ]),
                        ],
                      ),
                      h.section(
                        [h.Class(classNames.calendarPreview), h.AriaLabel('Calendar preview')],
                        [
                          h.div([h.Class('overflow-auto max-h-140 p-1')], [calendar]),
                          h.dl(
                            [h.Class(classNames.calendarState)],
                            [
                              h.dt([], ['Accepted selection']),
                              h.dd([], [describe(model.calendar.calendar.selection.selected)]),
                              h.dt([], ['Displayed month']),
                              h.dd(
                                [],
                                [
                                  new Intl.DateTimeFormat(options.locale, {
                                    month: 'long',
                                    year: 'numeric',
                                  }).format(model.calendar.calendar.month.timestamp),
                                ],
                              ),
                              h.dt([], ['Latest proposal']),
                              h.dd([h.AriaLive('polite')], [model.latest]),
                            ],
                          ),
                          h.p(
                            [h.Class('m-[24px_0_0] [color:var(--muted-foreground)] text-[12px]')],
                            [
                              'Arrow keys move by day. Home and End move within a week; Page Up and Page Down change the month. Enter or Space selects. The source booking example blocks days 4–6, 12 and 19–20 after page load.',
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            },
            renderDocument: (content, popups) => h.div([], [content, ...popups]),
          },
        }),
      ),
    }
  })
  const layer = CalendarExampleBlock.makeLayer({ init, update, view }).pipe(
    Layer.provide(Layer.mergeAll(CalendarLayer, DocumentTooltipLayer)),
  )
  Runtime.run(
    Program.make({
      block: CalendarExampleBlock,
      layer,
      container: document.querySelector<HTMLDivElement>('#root'),
    }).provide(Layer.mergeAll(environment, motion.layer, makeTooltipDomLayer(document, window))),
  )
})

void Effect.runPromise(Effect.catchCause(start, (cause) => Effect.logError(cause)))
