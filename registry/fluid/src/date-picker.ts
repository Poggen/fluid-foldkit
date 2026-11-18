import type { HoverMode } from './hover-observation.js'
import { RawPopup, RawCalendar, RawPrimaryTime, RawEndTime } from './date-picker-bindings.js'
import { renderDatePicker } from './date-picker-view.js'
import { Layer } from 'effect'
import { layer as HoverLayer } from './hover.js'
import { SegmentHighlight, Segments, PresetHighlight, Presets } from './date-picker-hover.js'
import { layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { PresenceBlock, layer as PresenceLayer } from './presence.js'
import { LayoutResource, PresetFocusResource } from './date-picker-layout.js'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'
import { PopupBlock, layer as PopupLayer } from './date-picker-popup.js'
import type { OpeningInteraction } from './date-picker-popup-definition.js'
import type { CalendarViewInputs } from './calendar-view/contracts.js'
import { CalendarBlock, layer as CalendarLayer } from './calendar.js'
import { Event } from './calendar-state.js'
import {
  calendarControl,
  pickerOpening,
  pickerHasClear,
  pickerCalendarPresentation,
} from './date-picker-config.js'
import type { DatePickerPreparedConfig, DatePickerPresentation } from './date-picker-config.js'
import { synchronizeTimeFields } from './date-picker-time-sync.js'
import { Message, type InMessage } from './date-picker-definition.js'
import {
  DatePickerBlock,
  Notice,
  TriggerResource,
  OutMessage,
  SampleTime,
  subscriptions,
} from './date-picker-definition.js'
import { DatePickerAction } from './date-picker-state.js'
import type { DatePickerState } from './date-picker-state.js'
import { transitionDatePicker } from './date-picker-transition.js'
import { TimeFieldBlock, layer as TimeFieldLayer } from './date-picker-time.js'

const Clear = DatePickerBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'clear',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [
        {
          id: `${config.initial.id}-clear`,
          open: pickerHasClear(config.initial, config.presentation),
        },
      ] satisfies [{ readonly id: string; readonly open: boolean }],
  },
}).withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(PresenceBlock, {
    Entered: () => DatePickerBlock.makeNoopStep(),
    StartedExit: () => DatePickerBlock.makeNoopStep(),
    Exited: () => DatePickerBlock.makeNoopStep(),
  }),
})

interface SynchronizeOptions {
  readonly now?: number
  readonly sampleTime?: boolean
  readonly previousPresentation?: DatePickerPresentation
  readonly openingInteraction?: typeof OpeningInteraction.Type
}

const synchronizeState = (picker: DatePickerState, options: SynchronizeOptions = {}) =>
  DatePickerBlock.makeStep((model) => {
    const now = options.now ?? model.renderNow
    const generation = model.timeGeneration + 1

    return Update.combineSteps([
      options.openingInteraction === undefined
        ? DatePickerBlock.makeNoopStep()
        : RawPopup.requestOpeningInteraction({ interaction: options.openingInteraction }),
      DatePickerBlock.makeFieldsStep(() => ({
        picker: () => picker,
        renderNow: () => now,
        timeGeneration: () => generation,
      })),
      pickerHasClear(picker, model.presentation) ? Clear.requestShow() : Clear.requestHide(),
      RawPopup.requestVisibility({ open: picker.open, escapeBlocked: picker.draft !== null }),
      RawCalendar.requestSynchronization({
        selection: calendarControl(picker, model.presentation),
        month: picker.month,
        controlledMonth: picker.month !== null,
        presentation: pickerCalendarPresentation(picker, model.presentation),
        occurrenceFocus: picker.open && !model.picker.open,
      }),
      synchronizeTimeFields(
        {
          picker: model.picker,
          presentation: options.previousPresentation ?? model.presentation,
          now: model.renderNow,
        },
        { picker, presentation: model.presentation, now },
      ),
      options.sampleTime === false
        ? DatePickerBlock.makeNoopStep()
        : DatePickerBlock.makeCommandsStep(() => [SampleTime({ generation })]),
    ])
  })

const synchronize = (
  picker: DatePickerState,
  notices: ReadonlyArray<typeof Notice.Type>,
  options: SynchronizeOptions = {},
) => {
  const steps = synchronizeState(picker, options)

  return DatePickerBlock.makeStep(
    () => (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(
        steps(registered),
        notices.length === 0 ? undefined : OutMessage.Transitioned({ notices }),
      ),
  )
}

const applyAction = (
  action: DatePickerAction,
  metrics?: {
    readonly now: number
    readonly viewportWidth: number | null
    readonly interaction: typeof OpeningInteraction.Type
  },
) =>
  DatePickerBlock.makeStep((model) => {
    const result = transitionDatePicker(
      model.picker,
      action,
      pickerOpening(
        model.picker,
        model.presentation,
        metrics?.now ?? model.renderNow,
        metrics?.viewportWidth ?? null,
      ),
    )

    if (DatePickerAction.isAnyOf(['Disposed'])(action)) {
      return Update.combineSteps([
        DatePickerBlock.makeFieldsStep(() => ({
          picker: () => result.state,
          timeGeneration: (value) => value + 1,
        })),
        RawPopup.requestReset(),
        RawPrimaryTime.requestReset(),
        RawEndTime.requestReset(),
        Clear.requestReset(),
        Segments.requestClear(),
        Presets.requestClear(),
        SegmentHighlight.requestHide(),
        PresetHighlight.requestHide(),
      ])
    }

    if (result.state === model.picker && result.events.length === 0) {
      return metrics
        ? RawPopup.requestOpeningInteraction({ interaction: metrics.interaction })
        : DatePickerBlock.makeNoopStep()
    }

    const baseOptions: SynchronizeOptions =
      metrics === undefined
        ? {}
        : { now: metrics.now, sampleTime: false, openingInteraction: metrics.interaction }

    const options =
      DatePickerAction.isAnyOf(['Accepted'])(action) && result.state.open && !model.picker.open
        ? { ...baseOptions, openingInteraction: null }
        : baseOptions

    return synchronize(
      result.state,
      result.events.map((event) => Notice.cases.Picker.make({ event })),
      options,
    )
  })

const Popup = RawPopup.withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(PopupBlock, {
    DismissRequested: () => applyAction(DatePickerAction.cases.OpenRequested.make({ open: false })),
    Released: () => DatePickerBlock.makeNoopStep(),
  }),
})

const Calendar = RawCalendar.withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(CalendarBlock, {
    Transitioned: ({ events }) =>
      DatePickerBlock.makeStep((model) => {
        let { picker } = model
        let changed = false
        const notices: Array<typeof Notice.Type> = []

        for (const event of events) {
          let action: typeof DatePickerAction.Type | null = null

          if (Event.isAnyOf(['Selected'])(event)) {
            action = DatePickerAction.cases.CalendarSelected.make({ value: event.value })
          } else if (Event.isAnyOf(['MonthChanged'])(event)) {
            action = DatePickerAction.cases.MonthChanged.make({ month: event.month })
          }

          if (action !== null) {
            const result = transitionDatePicker(
              picker,
              action,
              pickerOpening(picker, model.presentation, model.renderNow, null),
            )

            picker = result.state
            changed = true
            notices.push(
              ...result.events.map((output) => Notice.cases.Picker.make({ event: output })),
            )
          }

          notices.push(Notice.cases.Calendar.make({ event }))
        }

        if (changed) {
          return synchronize(picker, notices)
        }

        return notices.length === 0
          ? DatePickerBlock.makeNoopStep()
          : DatePickerBlock.makeOutMessageStep(() => OutMessage.Transitioned({ notices }))
      }),
  }),
})

const PrimaryTime = RawPrimaryTime.withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(TimeFieldBlock, {
    Committed: ({ minutes }) =>
      DatePickerBlock.makeStep((model) =>
        applyAction(
          model.picker.hasTime
            ? DatePickerAction.cases.TimeCommitted.make({ minutes })
            : DatePickerAction.cases.StartCommitted.make({ minutes }),
        ),
      ),
  }),
})

const EndTime = RawEndTime.withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(TimeFieldBlock, {
    Committed: ({ minutes }) => applyAction(DatePickerAction.cases.EndCommitted.make({ minutes })),
  }),
})

const childBindings: readonly [
  typeof Calendar,
  typeof PrimaryTime,
  typeof EndTime,
  typeof Popup,
  typeof Segments,
  typeof SegmentHighlight,
  typeof Presets,
  typeof PresetHighlight,
  typeof Clear,
] = [
  Calendar,
  PrimaryTime,
  EndTime,
  Popup,
  Segments,
  SegmentHighlight,
  Presets,
  PresetHighlight,
  Clear,
]

const mounts: readonly [typeof TriggerResource, typeof LayoutResource, typeof PresetFocusResource] =
  [TriggerResource, LayoutResource, PresetFocusResource]

const Composition: ReturnType<
  typeof DatePickerBlock.makeComposition<typeof mounts, typeof childBindings>
> = DatePickerBlock.makeComposition({ bindings: childBindings, mounts })

const init = Composition.makeInit((config: DatePickerPreparedConfig) => ({
  childInitContext: config,
  model: {
    twoRows: false,
    picker: config.initial,
    presentation: config.presentation,
    renderNow: config.now,
    timeGeneration: 0,
  },
}))

const update = Composition.makeUpdate({
  CalendarRequested: DatePickerBlock.makeStep.fromMessage(
    ({ action }: typeof Message.CalendarRequested.Type) => RawCalendar.requestAction({ action }),
  ),
  RowsMeasured: DatePickerBlock.makeStep.fromMessage(
    ({ twoRows }: typeof Message.RowsMeasured.Type) =>
      DatePickerBlock.makeStep((model) =>
        model.twoRows === twoRows
          ? DatePickerBlock.makeNoopStep()
          : Update.combineSteps([
              DatePickerBlock.makeFieldsStep(() => ({ twoRows: () => twoRows })),
              Segments.requestConfigure({
                options: {
                  axis: twoRows ? 'xy' : 'x',
                  gapClick: false,
                  nearest: model.segments.options.nearest,
                  maxDistance: model.segments.options.maxDistance ?? Infinity,
                },
              }),
            ]),
      ),
  ),
  PresetFocused: DatePickerBlock.makeStep.fromMessage(
    ({ index }: typeof Message.PresetFocused.Type) => Presets.requestHighlight({ index }),
  ),
  Requested: DatePickerBlock.makeStep.fromMessage(({ action }: typeof Message.Requested.Type) =>
    applyAction(action),
  ),
  TriggeredOpen: DatePickerBlock.makeStep.fromMessage(
    ({ open, now, viewportWidth, interaction }: typeof Message.TriggeredOpen.Type) =>
      applyAction(DatePickerAction.cases.OpenRequested.make({ open }), {
        now,
        viewportWidth,
        interaction,
      }),
  ),
  CapturedTime: DatePickerBlock.makeStep.fromMessage(
    ({ generation, now }: typeof Message.CapturedTime.Type) =>
      DatePickerBlock.makeStep((model) =>
        generation === model.timeGeneration
          ? Update.combineSteps([
              DatePickerBlock.makeFieldsStep(() => ({ renderNow: () => now })),
              synchronizeTimeFields(
                { picker: model.picker, presentation: model.presentation, now: model.renderNow },
                { picker: model.picker, presentation: model.presentation, now },
              ),
            ])
          : DatePickerBlock.makeNoopStep(),
      ),
  ),
  Disposed: applyAction(DatePickerAction.cases.Disposed.make({})),
})

const configureHover = (mode: HoverMode) =>
  DatePickerBlock.makeStep((model) =>
    Update.combineSteps([
      DatePickerBlock.makeFieldsStep(() => ({
        presentation: (presentation) => ({ ...presentation, hoverMode: mode }),
      })),
      Segments.requestConfigure({
        options: { mode, axis: 'x', nearest: true, gapClick: false, maxDistance: Infinity },
      }),
      Presets.requestConfigure({
        options: { mode, axis: 'xy', nearest: true, gapClick: true, maxDistance: Infinity },
      }),
      SegmentHighlight.informOfSource({ snapshot: model.segments, hidden: false, mode }),
      PresetHighlight.informOfSource({ snapshot: model.presets, hidden: false, mode }),
      RawCalendar.requestHoverMode({ mode }),
      RawPrimaryTime.requestHoverMode({ mode }),
      RawEndTime.requestHoverMode({ mode }),
    ]),
  )

const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedDensity: DatePickerBlock.makeStep.fromMessage(
    ({ compact }: typeof InMessage.RequestedDensity.Type) =>
      DatePickerBlock.makeStep((model) =>
        model.presentation.compact === compact
          ? DatePickerBlock.makeNoopStep()
          : DatePickerBlock.makeFieldsStep(() => ({
              presentation: (presentation) => ({ ...presentation, compact }),
            })),
      ),
  ),
  RequestedHoverMode: DatePickerBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) => configureHover(mode),
  ),
  RequestedAction: DatePickerBlock.makeStep.fromMessage(
    ({ action }: typeof InMessage.RequestedAction.Type) => applyAction(action),
  ),
  RequestedCalendar: DatePickerBlock.makeStep.fromMessage(
    ({ action }: typeof InMessage.RequestedCalendar.Type) => RawCalendar.requestAction({ action }),
  ),
  RequestedOpen: DatePickerBlock.makeStep.fromMessage(
    ({ open, now, viewportWidth }: typeof InMessage.RequestedOpen.Type) =>
      applyAction(DatePickerAction.cases.OpenRequested.make({ open }), {
        now,
        viewportWidth,
        interaction: null,
      }),
  ),
  RequestedConfigure: DatePickerBlock.makeStep.fromMessage(
    ({ presentation, calendarRevision }: typeof InMessage.RequestedConfigure.Type) =>
      DatePickerBlock.makeStep((model) =>
        Update.combineSteps([
          DatePickerBlock.makeFieldsStep(() => ({ presentation: () => presentation })),
          RawCalendar.requestRefresh({ revision: calendarRevision }),
          ...((model.presentation.hoverMode ?? 'fluid') === (presentation.hoverMode ?? 'fluid')
            ? []
            : [configureHover(presentation.hoverMode ?? 'fluid')]),

          synchronizeState(model.picker, { previousPresentation: model.presentation }),
        ]),
      ),
  ),
})

export interface DatePickerViewInputs extends Omit<CalendarViewInputs, 'compact' | 'cellSize'> {
  readonly highlight: HoverHighlightViewInputs['animate']
}

export interface DatePickerViewBindings {
  readonly Segments: typeof Segments
  readonly SegmentHighlight: typeof SegmentHighlight
  readonly Presets: typeof Presets
  readonly PresetHighlight: typeof PresetHighlight
  readonly Popup: typeof Popup
  readonly Calendar: typeof Calendar
  readonly PrimaryTime: typeof PrimaryTime
  readonly EndTime: typeof EndTime
  readonly Clear: typeof Clear
}

const viewBindings: DatePickerViewBindings = {
  Segments,
  SegmentHighlight,
  Presets,
  PresetHighlight,
  Popup,
  Calendar,
  PrimaryTime,
  EndTime,
  Clear,
}

export type DatePickerViewBuilder = Block.ViewBuilderFor<typeof Composition>

const view: ReturnType<typeof Composition.makeView.withInputs<DatePickerViewInputs>> =
  Composition.makeView.withInputs<DatePickerViewInputs>((model, inputs, h) =>
    renderDatePicker(model, inputs, h, viewBindings, {
      Requested: Message.Requested,
      Disposed: Message.Disposed,
    }),
  )

const EffectsLayer = Layer.mergeAll(
  TriggerResource.layer,
  LayoutResource.layer,
  PresetFocusResource.layer,
  SampleTime.layer,
  subscriptions.layer,
)

export const layer = DatePickerBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  subscriptions,
  EffectsLayer,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      HoverLayer,
      HighlightLayer,
      PresenceLayer,
      PopupLayer,
      CalendarLayer,
      TimeFieldLayer,
    ),
  ),
)

export { DatePickerBlock, DatePickerKey, InMessage } from './date-picker-definition.js'

export const hoverModeOf = (model: typeof DatePickerBlock.Model.Type) =>
  model.presentation.hoverMode ?? 'fluid'

export const presentationOf = (model: typeof DatePickerBlock.Model.Type) => model.presentation
export const calendarRevisionOf = (model: typeof DatePickerBlock.Model.Type) =>
  model.calendar.calendar.revision
