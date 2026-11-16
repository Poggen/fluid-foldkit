import { modifyFields } from 'foldkit/struct'
import { CalendarVisuals } from './calendar-view/mount.js'
import {
  Observation,
  initialVisual,
  observeVisual,
  transitionVisual,
  syncOverlaySlots,
} from './calendar-view/state.js'
import { renderCalendar } from './calendar-view/view.js'
import type { CalendarViewInputs } from './calendar-view/contracts.js'
import { Layer, Number, Struct } from 'effect'
import { Update } from 'foldkit'
import type { CalendarPreparedConfig } from './calendar-environment.js'
import { Action } from './calendar-state.js'
import {
  CalendarBlock,
  CalendarEffects,
  ComputeTransition,
  ContinueQueue,
  FocusDay,
  InMessage,
  Message,
  Model,
  OutMessage,
} from './calendar-definition.js'

const Composition = CalendarBlock.makeComposition({
  mounts: [CalendarVisuals],
})

const init = Composition.makeInit((config: CalendarPreparedConfig) => ({
  model: Model.make({
    calendar: config.initial,
    visual: initialVisual(config.initial.selection.selected),
    pending: [],
    working: false,
    generation: 0,
  }),
}))

// Hover is accepted synchronously; queued transitions own date/projection state.
const withAcceptedHover = (
  calendar: Model['calendar'],
  presentation: Model['calendar']['presentation'],
) =>
  calendar.presentation.hoverMode === presentation.hoverMode
    ? calendar
    : modifyFields(calendar, {
        presentation: (current) =>
          Struct.assign(
            Struct.omit(current, ['hoverMode']),
            Struct.pick(presentation, ['hoverMode']),
          ),
      })

const requestAction = (previous: Model, action: Action) => {
  const model = Action.isAnyOf(['Presented', 'Synchronized'])(action)
    ? modifyFields(previous, {
        calendar: (calendar) => withAcceptedHover(calendar, action.presentation),
      })
    : previous
  const queued = Action.isAnyOf(['Accepted', 'Synchronized'])(action)
    ? [
        ...model.pending.filter((item) => Action.isAnyOf(['Accepted', 'Synchronized'])(item)),
        action,
        ...model.pending.filter((item) => !Action.isAnyOf(['Accepted', 'Synchronized'])(item)),
      ]
    : [...model.pending, action]

  if (model.working) {
    return { model: modifyFields(model, { pending: () => queued }) }
  }

  const [next, ...pending] = queued

  if (next === undefined) {
    return { model }
  }

  const generation = model.generation + 1

  return {
    model: modifyFields(model, {
      generation: () => generation,
      pending: () => pending,
      working: () => true,
    }),
    commands: [ComputeTransition({ generation, calendar: model.calendar, action: next })],
  }
}

const update = Composition.makeUpdate({
  Mounted: (model) =>
    requestAction(model, Action.cases.Refreshed.make({ revision: model.calendar.revision })),
  Requested: (model, { action }) => requestAction(model, action),
  VisualObserved: (model, { observation }) => {
    const visual = syncOverlaySlots(observeVisual(model.visual, observation))

    if (
      !Observation.isAnyOf(['Active'])(observation) ||
      observation.ordinal === model.visual.active
    ) {
      return { model: modifyFields(model, { visual: () => visual }) }
    }

    return {
      model: modifyFields(model, {
        visual: () => visual,
        pending: (currentPending) => [
          ...currentPending,
          Action.cases.HoverPreview.make({ ordinal: observation.ordinal }),
        ],
      }),
      commands: model.working ? [] : [ContinueQueue()],
    }
  },
  CompletedTransition: (model, result) => {
    if (!model.working || result.generation !== model.generation) {
      return { model }
    }

    const calendar = withAcceptedHover(result.calendar, model.calendar.presentation)

    return Update.withOutMessage(
      {
        model: modifyFields(model, {
          visual: () =>
            syncOverlaySlots(
              transitionVisual(
                model.visual,
                model.calendar,
                calendar,
                model.calendar.projection.preview.previewEnd,
              ),
            ),
          calendar: () => calendar,
          working: () => false,
          generation: Number.increment,
        }),
        commands: [
          ...(result.focus === null
            ? []
            : [FocusDay({ id: result.calendar.id, date: result.focus })]),
          ContinueQueue(),
        ],
      },
      result.events.length === 0
        ? undefined
        : OutMessage.cases.Transitioned.make({ events: result.events }),
    )
  },
  ContinuedQueue: (model) => {
    if (model.working) {
      return { model }
    }

    const [action, ...pending] = model.pending

    if (action === undefined) {
      return { model }
    }

    const generation = model.generation + 1

    return {
      model: modifyFields(model, {
        generation: () => generation,
        pending: () => pending,
        working: () => true,
      }),
      commands: [ComputeTransition({ generation, calendar: model.calendar, action })],
    }
  },
  CompletedFocus: (model) => ({ model }),
  Disposed: (model) => ({
    model: modifyFields(model, {
      visual: () =>
        modifyFields(initialVisual(model.calendar.selection.selected), {
          occurrence: () => model.visual.occurrence + 1,
          ghostGeneration: () => model.visual.ghostGeneration + 1,
          committedEndGeneration: () => model.visual.committedEndGeneration + 1,
        }),
      pending: () => [],
      working: () => false,
      generation: Number.increment,
    }),
  }),
})

const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedHoverMode: CalendarBlock.makeFieldsStep(
    (_model, { mode }: typeof InMessage.RequestedHoverMode.Type) => ({
      calendar: (calendar) =>
        modifyFields(calendar, {
          presentation: () => Struct.assign(calendar.presentation, { hoverMode: mode }),
        }),
    }),
  ),
  RequestedAction: (model, { action }) => requestAction(model, action),
  RequestedOccurrenceFocus: (model) => requestAction(model, Action.cases.OccurrenceFocus.make({})),
  RequestedPresentation: (model, { presentation }) =>
    requestAction(model, Action.cases.Presented.make({ presentation })),
  RequestedSynchronization: (
    model,
    { selection, month, controlledMonth, presentation, occurrenceFocus },
  ) =>
    requestAction(
      model,
      Action.cases.Synchronized.make({
        selection,
        month,
        controlledMonth,
        presentation,
        occurrenceFocus,
      }),
    ),
  RequestedRefresh: (model, { revision }) =>
    requestAction(model, Action.cases.Refreshed.make({ revision })),
  RequestedAcceptance: (model, { selection, month, controlledMonth }) =>
    requestAction(model, Action.cases.Accepted.make({ selection, month, controlledMonth })),
  RequestedEscape: (model) => requestAction(model, Action.cases.Escaped.make({})),
})

const view = Composition.makeView.withInputs<CalendarViewInputs>((model, inputs, h) =>
  renderCalendar(
    model.calendar,
    model.visual,
    model.calendar.projection,
    inputs,
    h,
    [
      h.OnMount(CalendarVisuals({ autoFocus: model.calendar.autoFocus })),
      ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Message.Disposed())]),
    ],
    (action) => Message.Requested({ action }),
  ),
)

export const layer = CalendarBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(CalendarEffects, CalendarVisuals.layer),
})

export { CalendarBlock, CalendarKey, InMessage } from './calendar-definition.js'

export type { CalendarViewInputs } from './calendar-view/contracts.js'

export { calendarViewInputs, calendarTooltipKeys } from './calendar-view/composition.js'

// Public adapters for the schema-backed values accepted by Calendar and DatePicker.
export { dateValue, selectionValue, Selection } from './calendar-state.js'

export const hoverModeOf = (model: typeof CalendarBlock.Model.Type) =>
  model.calendar.presentation.hoverMode ?? 'fluid'
