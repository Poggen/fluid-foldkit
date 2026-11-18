import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  hoverModeOf as pickerHoverModeOf,
  presentationOf as pickerPresentationOf,
} from '@foldkit-visuals/fluid/date-picker'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
/* @license Derived from Fluid Functionalism cc276ca0 DatePicker docs. MIT. */
import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import {
  DatePickerBlock,
  DatePickerPresentation,
  prepareDatePicker,
  layer as PickerLayer,
  hoverHighlightAnimation,
} from '@foldkit-visuals/fluid/date-picker'
import { calendarViewInputs, dateValue } from '@foldkit-visuals/fluid/calendar'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import type { DatePickerViewInputs } from '@foldkit-visuals/fluid/date-picker'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { ComponentPresentation, presentation } from '../settings'
import { CalendarEnvironmentLayer } from '../gallery/flags'
import { documentationRuntime } from '../documentation-runtime'
const cases = [
  {
    key: 'date',
    title: 'Date',
    description: 'Opens on the selected day, or today. Pick one and it closes.',
    height: 420,
  },
  {
    key: 'range',
    title: 'Range with presets',
    description:
      'Pick a start and an end, or a preset. It closes once the end is set; Escape mid-pick puts the previous range back.',
    height: 460,
  },
  {
    key: 'time-range',
    title: 'Date and time',
    description:
      '2 segments, 2 popovers. Type 1130 or 11:30am in a time, or arrow through the slots. The end list counts the duration from the start.',
    height: 420,
  },
  {
    key: 'time',
    title: '',
    description: 'time takes one time instead. step sets the minutes between slots.',
    height: 420,
  },
  {
    key: 'booking',
    title: 'Booked days',
    description: 'calendarProps reaches the calendar inside: booked nights, past days, cell size.',
    height: 460,
  },
]
const key = Symbol('AuthoredDates')
export const AuthoredDatesBlock = Block.make('AuthoredDates', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    pickers: Schema.Record(Schema.String, DatePickerBlock.Model),
    tooltips: DocumentTooltipBlock.Model,
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof DatePickerBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly ready: boolean
      readonly settings: ComponentPresentation
    }>(),
  },
})
const Root = AuthoredDatesBlock
const Pickers = Root.makeRecordBinding(DatePickerBlock, { field: 'pickers' }).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DatePickerBlock, { Transitioned: Root.makeNoopStep }),
})
const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: Root.makeNoopStep }),
})
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const initDocTabs = cases
  .map(({ key }) => key)
  .map((key) =>
    Root.makeStep((model) =>
      initAndInsert(DocTabs, model, {
        key,
        args: [
          {
            id: previewCodeTabId('dates', key),
            idPrefix: previewCodeTabId('dates', key),
            selectedIndex: 0,
          },
        ],
      }),
    ),
  )
const Composition = Root.makeComposition({ bindings: [DocTabs, Pickers, Tooltips] })
export const layer = Layer.unwrap(
  Effect.gen(function* constructDateExamples() {
    const now = yield* DateTime.nowInCurrentZone.pipe(DateTime.withCurrentZoneLocal)
    const today = DateTime.toDateUtc(now),
      day = (days: number) => DateTime.toDateUtc(DateTime.add(now, { days }))
    const base = DatePickerPresentation.make({
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
    const weekend = (6 - today.getUTCDay() + 7) % 7
    const ranges = [
      { label: 'Next 7 days', range: { from: today, to: day(6) } },
      { label: 'Next 14 days', range: { from: today, to: day(13) } },
      { label: 'Next 30 days', range: { from: today, to: day(29) } },
      { label: 'This weekend', range: { from: day(weekend), to: day(weekend + 1) } },
    ]
    const presets = ranges.map(({ label, range }) => ({
      label,
      range: { _tag: 'Range' as const, from: dateValue(range.from), to: dateValue(range.to) },
    }))
    const prepared = yield* Effect.all([
      prepareDatePicker({ id: 'docs-picker-date' }, base),
      prepareDatePicker({ id: 'docs-picker-range', mode: 'range' }, { ...base, presets }),
      prepareDatePicker(
        {
          id: 'docs-picker-time-range',
          defaultValue: today,
          defaultTimeRange: { start: '11:00', end: '12:45' },
        },
        { ...base, variant: 'ghost' },
      ),
      prepareDatePicker({ id: 'docs-picker-time', defaultTime: null }, { ...base, step: 30 }),
      prepareDatePicker(
        { id: 'docs-picker-booking', mode: 'range' },
        { ...base, placeholder: 'Check in → check out' },
      ),
    ]).pipe(Effect.provide(CalendarEnvironmentLayer))
    const motion = createTargetMotionScope('authored-dates')
    return Root.makeLayer({
      init: Composition.makeInit(() => ({
        model: { pickers: {}, docTabs: {} },
        steps: [
          ...initDocTabs,
          ...prepared.flatMap((config, index) => {
            const scene = cases[index]
            return scene === undefined
              ? []
              : [
                  Root.makeStep((model) =>
                    initAndInsert(Pickers, model, { key: scene.key, args: [config] }),
                  ),
                ]
          }),
          ...cases.flatMap(({ key }) => [
            Tooltips.requestAdd({ key: `authored-picker-${key}:previous` }),
            Tooltips.requestAdd({ key: `authored-picker-${key}:next` }),
          ]),
        ],
      })),
      update: Composition.makeUpdate({}),
      inMessageUpdate: Composition.makeInMessageUpdate({
        InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
          Update.combineSteps([
            ...Object.entries(model.docTabs).flatMap(([key, child]) =>
              tabsHoverModeOf(child) === settings.hover
                ? []
                : [DocTabs.requestHoverMode(key, { mode: settings.hover })],
            ),
            ...Object.entries(model.pickers).flatMap(([key, child]) => {
              const current = pickerPresentationOf(child)
              const compact = settings.size === 'compact'
              return [
                ...(current.compact === compact ? [] : [Pickers.requestDensity(key, { compact })]),
                ...(pickerHoverModeOf(child) === settings.hover
                  ? []
                  : [Pickers.requestHoverMode(key, { mode: settings.hover })]),
              ]
            }),
          ]),
        ),
      }),
      view: Composition.makeView.withInputs((model, { ready, settings }, h) => {
        if (!ready) return h.empty
        const context = presentation(settings),
          triggers = new Map<string, Parameters<DatePickerViewInputs['tooltip']>[0]['render']>()
        const documentationTabs = (key: string) => {
          const child = model.docTabs[key]
          return child === undefined
            ? h.empty
            : h.block(
                DocTabs.embedView({
                  key,
                  slotId: child.tabs.id,
                  model: child,
                  viewInputs: previewCodeTabsViewInputs(h, {
                    context,
                    animate: motion.node,
                    ariaLabel: `${key} example`,
                  }),
                }),
              )
        }
        return h.block(
          Tooltips.embedView({
            slotId: 'authored-date-tooltips',
            model: model.tooltips,
            viewInputs: {
              renderTrigger: (key, { button }) => {
                const render = triggers.get(key)
                if (render === undefined) throw new Error(`Missing date tooltip ${key}`)
                return render({ button })
              },
              renderDocument: (content, popups) => h.div([], [content, ...popups]),
              render: ({ tooltip }) =>
                h.div(
                  [],
                  cases.flatMap((scene) => {
                    const child = model.pickers[scene.key]
                    if (child === undefined) return []
                    const viewInputs: DatePickerViewInputs = {
                      ...calendarViewInputs(h, {
                        key: `authored-picker-${scene.key}`,
                        context,
                        motion,
                        keyboardTrigger: false,
                        tooltip,
                        registerTrigger: (key, render) => {
                          triggers.set(key, render)
                        },
                      }),
                      highlight: hoverHighlightAnimation(motion),
                    }
                    return [
                      docSection(h, {
                        title: scene.title,
                        description: scene.description,
                        source: documentationRuntime().sources['authored-dates'],
                        presentation: { context },
                        pane:
                          model.docTabs[scene.key]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
                        tabs: documentationTabs(scene.key),
                        tabsId: previewCodeTabId('dates', scene.key),
                        previewMinHeight: scene.height,
                        previewAlign: 'top',
                        className: 'w-full',
                        children: [
                          h.block(
                            Pickers.embedView({
                              key: scene.key,
                              slotId: child.picker.id,
                              model: child,
                              viewInputs,
                            }),
                          ),
                        ],
                      }),
                    ]
                  }),
                ),
            },
          }),
        )
      }),
    }).pipe(
      Layer.provide(Layer.mergeAll(PickerLayer, TooltipLayer, PreviewControlsLayer)),
      Layer.provide(CalendarEnvironmentLayer),
      Layer.provideMerge(motion.layer),
    )
  }),
)
