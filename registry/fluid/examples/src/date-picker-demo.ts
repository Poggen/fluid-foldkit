import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  DatePickerAction,
  DatePickerBlock,
  layer as DatePickerLayer,
  DatePickerEvent,
  DatePickerPresentation,
  Notice,
  PopupAuthorityLayer,
  prepareDatePicker,
  hoverHighlightAnimation,
} from '@foldkit-visuals/fluid/date-picker'
import type { DatePickerViewInputs } from '@foldkit-visuals/fluid/date-picker'
import { calendarViewInputs } from '@foldkit-visuals/fluid/calendar'
import type { CalendarEnvironment } from '@foldkit-visuals/fluid/calendar/environment'
import { DefaultCalendarEnvironment } from '@foldkit-visuals/fluid/calendar/environment'
import {
  DocumentTooltipBlock,
  layer as DocumentTooltipLayer,
  makeTooltipDomLayer,
} from '@foldkit-visuals/fluid/tooltip'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { PopupAuthority } from '@foldkit-visuals/fluid/date-picker'
import type { TooltipDom } from '@foldkit-visuals/fluid/tooltip'
import './date-picker-demo.css'

const query = new URLSearchParams(window.location.search)

const sourcePreset = query.get('preset') === 'source'

const examplesUrl = new URL('./', window.location.href).href

const start = Effect.gen(function* start() {
  const presentation = DatePickerPresentation.make({
    ...exampleHoverConfig,
    compact: false,
    disabled: false,
    variant: 'outline',
    orientation: 'auto',
    numberOfMonths: null,
    cellSize: 36,
    showWeekNumber: false,
    locale: 'en-US',
    hourCycle: 12,
    step: 15,
    triggerId: null,
    placeholder: null,
    name: null,
    ariaLabel: null,
    clearable: true,
    className: '',
    required: false,
    min: 0,
    max: 0,
    presets: [],
  })

  const [single, range, time, controlled] = yield* Effect.all([
    prepareDatePicker({ id: 'demo-single' }, { ...presentation, ariaLabel: 'Choose a date' }),
    prepareDatePicker({ id: 'demo-range', mode: 'range' }, presentation),
    prepareDatePicker({ id: 'demo-time', defaultTime: '09:00' }, presentation),
    prepareDatePicker(
      sourcePreset
        ? { id: 'demo-controlled', value: DateTime.toDateUtc(DateTime.nowUnsafe()) }
        : { id: 'demo-controlled', value: DateTime.toDateUtc(DateTime.nowUnsafe()), open: false },
      presentation,
    ),
  ]).pipe(Effect.provide(DefaultCalendarEnvironment))

  const motion = createTargetMotionScope('date-picker-demo')
  const context = createPresentationContext({ reducedMotion: 'user', ...examplePresentation })

  const Model = Schema.Struct({
    single: DatePickerBlock.Model,
    range: DatePickerBlock.Model,
    time: DatePickerBlock.Model,
    controlled: DatePickerBlock.Model,
    tooltips: DocumentTooltipBlock.Model,
    latest: Schema.String,
  })

  const Message = defineMessageUnion({})
  const DatePickerDemoKey = Symbol('DatePickerDemo')

  const DatePickerDemoBlock = Block.make('DatePickerDemo', {
    key: DatePickerDemoKey,
    InitArgs: Schema.Tuple([]),
    Model,
    Message,
    view: { kind: 'Document' },
    effects: Block.makeEffectsContract<never, CalendarEnvironment | PopupAuthority | TooltipDom>(),
  })

  const Single = DatePickerDemoBlock.makeRequiredFieldBinding(DatePickerBlock, {
    field: 'single',
    init: { contextToArgs: () => [single] },
  }).withOutMessagePolicy({
    fold: DatePickerDemoBlock.makeOutMessageFold(DatePickerBlock, {
      Transitioned: () => DatePickerDemoBlock.makeNoopStep(),
    }),
  })

  const Range = DatePickerDemoBlock.makeRequiredFieldBinding(DatePickerBlock, {
    field: 'range',
    init: { contextToArgs: () => [range] },
  }).withOutMessagePolicy({
    fold: DatePickerDemoBlock.makeOutMessageFold(DatePickerBlock, {
      Transitioned: () => DatePickerDemoBlock.makeNoopStep(),
    }),
  })

  const Time = DatePickerDemoBlock.makeRequiredFieldBinding(DatePickerBlock, {
    field: 'time',
    init: { contextToArgs: () => [time] },
  }).withOutMessagePolicy({
    fold: DatePickerDemoBlock.makeOutMessageFold(DatePickerBlock, {
      Transitioned: () => DatePickerDemoBlock.makeNoopStep(),
    }),
  })

  const ControlledBinding = DatePickerDemoBlock.makeRequiredFieldBinding(DatePickerBlock, {
    field: 'controlled',
    init: { contextToArgs: () => [controlled] },
  })

  const Controlled = ControlledBinding.withOutMessagePolicy({
    fold: DatePickerDemoBlock.makeOutMessageFold(DatePickerBlock, {
      Transitioned: ({ notices }) =>
        DatePickerDemoBlock.makeStep((model) => {
          if (
            sourcePreset &&
            !notices.some(
              (notice) =>
                Notice.isAnyOf(['Picker'])(notice) &&
                DatePickerEvent.isAnyOf(['ValueChanged'])(notice.event),
            )
          ) {
            return DatePickerDemoBlock.makeNoopStep()
          }

          const accepted = { ...model.controlled.picker }

          for (const notice of notices) {
            if (!Notice.isAnyOf(['Picker'])(notice)) {
              continue
            }

            const { event } = notice

            if (DatePickerEvent.isAnyOf(['ValueChanged'])(event)) {
              Object.assign(accepted, { value: event.value })
            }

            if (DatePickerEvent.isAnyOf(['OpenChanged'])(event)) {
              Object.assign(accepted, { open: event.open })
            }
          }

          return ControlledBinding.requestAction({
            action: DatePickerAction.cases.Accepted.make(accepted),
          })
        }),
    }),
  })

  const Tooltips = DatePickerDemoBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
    field: 'tooltips',
    init: { contextToArgs: () => [] },
  }).withOutMessagePolicy({
    fold: DatePickerDemoBlock.makeOutMessageFold(DocumentTooltipBlock, {
      Transaction: () => DatePickerDemoBlock.makeNoopStep(),
    }),
  })

  const DatePickerDemoComposition = DatePickerDemoBlock.makeComposition({
    bindings: [Single, Range, Time, Controlled, Tooltips],
  })

  const init = DatePickerDemoComposition.makeInit(() => ({
    model: { latest: '' },
    steps: ['single', 'range', 'time', 'controlled'].flatMap((key) => [
      Tooltips.requestAdd({
        key: `${key}:previous`,
      }),
      Tooltips.requestAdd({
        key: `${key}:next`,
      }),
    ]),
  }))

  const update = DatePickerDemoComposition.makeUpdate({})

  const view = DatePickerDemoComposition.makeView((model, h) => {
    const triggers = new Map<string, Parameters<DatePickerViewInputs['tooltip']>[0]['render']>()

    return {
      title: 'Calendar & DatePicker · Fluid',
      body: h.block(
        Tooltips.embedView({
          slotId: 'date-picker-tooltips',
          model: model.tooltips,
          viewInputs: {
            renderTrigger: (key, { button }) => {
              const render = triggers.get(key)

              if (!render) {
                throw new Error(`Missing tooltip trigger ${key}`)
              }

              return render({ button })
            },
            render: ({ tooltip }) => {
              const inputs = (key: string): DatePickerViewInputs => ({
                ...calendarViewInputs(h, {
                  key,
                  context,
                  motion,
                  keyboardTrigger: false,
                  tooltip,
                  registerTrigger: (triggerKey, render) => {
                    triggers.set(triggerKey, render)
                  },
                }),
                highlight: hoverHighlightAnimation(motion),
              })

              return h.main(
                [
                  h.Class(
                    sourcePreset
                      ? 'flex justify-center items-start min-h-screen p-[500px_24px_80px] [background:var(--background)]'
                      : 'max-w-256 m-[0_auto] p-[64px_28px_120px] [&_>_a]:text-example-picker-muted [&_>_a]:no-underline [&_h1]:m-[36px_0_12px] [&_h1]:text-[clamp(28px,4vw,42px)] [&_h1]:font-[550] [&_h1]:tracking-[-0.04em] [@media_(max-width:_700px)]:p-[32px_18px_80px]',
                  ),
                ],
                sourcePreset
                  ? [
                      h.block(
                        Controlled.embedView({
                          slotId: 'controlled',
                          model: model.controlled,
                          viewInputs: inputs('controlled'),
                        }),
                      ),
                    ]
                  : [
                      h.a([h.Href(examplesUrl)], ['← Fluid examples']),
                      h.h1([], ['Dates, without the friction.']),
                      h.p(
                        [h.Class('intro text-example-picker-muted max-w-145 mb-9.5')],
                        [
                          'Native Calendar and DatePicker. Keyboard navigation, motion, and popup focus share the same component lifecycle.',
                        ],
                      ),
                      h.div(
                        [
                          h.Class(
                            'grid grid-cols-2 gap-6 [&_>_section]:min-h-50 [&_>_section]:p-6.5 [&_>_section]:border [&_>_section]:border-example-picker-border [&_>_section]:rounded-[16px] [&_>_section]:bg-white [&_>_section]:[box-shadow:0_3px_12px_#141d2b04] [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:m-[0_0_6px] [&_section_>_p]:text-example-picker-help [&_section_>_p]:m-[0_0_24px] [&_section_>_p]:text-[13px] [@media_(max-width:_700px)]:grid-cols-[1fr]',
                          ),
                        ],
                        [
                          h.section(
                            [],
                            [
                              h.h2([], ['Single date']),
                              h.p([], ['Pick a day for your next appointment.']),
                              h.block(
                                Single.embedView({
                                  slotId: 'single',
                                  model: model.single,
                                  viewInputs: inputs('single'),
                                }),
                              ),
                            ],
                          ),
                          h.section(
                            [],
                            [
                              h.h2([], ['Date range']),
                              h.p([], ['Choose a start and end for your trip.']),
                              h.block(
                                Range.embedView({
                                  slotId: 'range',
                                  model: model.range,
                                  viewInputs: inputs('range'),
                                }),
                              ),
                            ],
                          ),
                          h.section(
                            [],
                            [
                              h.h2([], ['Date and time']),
                              h.p([], ['A date with a quarter-hour time field.']),
                              h.block(
                                Time.embedView({
                                  slotId: 'time',
                                  model: model.time,
                                  viewInputs: inputs('time'),
                                }),
                              ),
                            ],
                          ),
                          h.section(
                            [],
                            [
                              h.h2([], ['Controlled date']),
                              h.p([], ['The application accepts value and open proposals.']),
                              h.block(
                                Controlled.embedView({
                                  slotId: 'controlled',
                                  model: model.controlled,
                                  viewInputs: inputs('controlled'),
                                }),
                              ),
                              h.output(
                                [h.Class('block mt-4.5 text-example-picker-help text-[12px]')],
                                [
                                  model.controlled.picker.open
                                    ? 'Application state: open'
                                    : 'Application state: closed',
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
            ...examplePresentation,
          },
        }),
      ),
    }
  })

  const layer = DatePickerDemoBlock.makeLayer({ init, update, view }).pipe(
    Layer.provide(Layer.mergeAll(DatePickerLayer, DocumentTooltipLayer)),
  )

  Runtime.run(
    Program.make({
      block: DatePickerDemoBlock,
      layer,
      container: document.querySelector<HTMLDivElement>('#root'),
    }).provide(
      Layer.mergeAll(
        DefaultCalendarEnvironment,
        motion.layer,
        makeTooltipDomLayer(document, window),
        PopupAuthorityLayer,
      ),
    ),
  )
})

void Effect.runPromise(Effect.catchCause(start, (cause) => Effect.logError(cause)))
