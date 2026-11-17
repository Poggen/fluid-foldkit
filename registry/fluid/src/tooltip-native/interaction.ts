import { Layer, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { evaluateBaseGrace } from './base-grace.js'
import type { GraceObservation } from './base-grace.js'
import { effectiveOpen, hoverableContent } from './domain.js'
import type { InteractionContext } from './domain.js'
import {
  OutMessage,
  TooltipInteractionComposition,
  TooltipInteractionBlock,
  ObserveTrigger,
  ObservePopup,
  subscriptions,
} from './interaction-definition.js'
import type { Model } from './interaction-definition.js'
import { view } from './interaction-view.js'

export type {
  TooltipViewInputs,
  InteractionViewInputs,
  TooltipButtonRenderer,
  TooltipAnchorRenderer,
  TooltipSpanRenderer,
  TooltipDivRenderer,
} from './interaction-view.js'

const completedExit = (model: typeof Model.Type, generation: number) =>
  Update.withOutMessage(
    {
      model: modifyFields(model, {
        exitWait: (pending) => (Option.contains(pending, generation) ? Option.none() : pending),
      }),
    },
    OutMessage.CompletedExit({ generation }),
  )

const cancel = (model: typeof Model.Type) =>
  modifyFields(model, {
    pending: () => Option.none(),
    generation: (generation) => generation + 1,
    baseGrace: () => Option.none(),
    graceWait: () => Option.none(),
  })

const request = (model: typeof Model.Type, next: boolean, reason: string) =>
  Update.withOutMessage(
    {
      model: modifyFields(cancel(model), {
        closingFromHover: (closing) => (next ? closing : reason === 'hover'),
      }),
    },
    OutMessage.RequestedVisibility({ next, reason }),
  )

const acceptsHover = (model: typeof Model.Type, pointerType: string) => {
  if (pointerType === 'touch') {
    return false
  }

  return !model.nestedHover && ['', 'mouse', 'pen'].includes(pointerType)
}

const hover = (
  model: typeof Model.Type,
  pointerType: string,
  move: boolean,
  movementSquared: number,
  context: InteractionContext,
) => {
  if (!acceptsHover(model, pointerType)) {
    return { model }
  }

  const entered = modifyFields(model, { entered: () => true })

  const instant = Option.isSome(context.group.active)

  const delay = Option.getOrElse(
    context.presentation.configuration.delayDuration,
    () => context.group.delayDuration,
  )

  if (
    instant ||
    (!move &&
      (!(delay > 0) || (model.closingFromHover && context.presentation.phase === 'exiting')))
  ) {
    return request(entered, true, 'hover')
  }

  if (
    !move ||
    effectiveOpen(context.presentation) ||
    delay === 0 ||
    (Option.isSome(model.pending) && movementSquared < 2)
  ) {
    return { model: entered }
  }

  const generation = model.generation + 1

  return {
    model: modifyFields(entered, {
      generation: () => generation,
      pending: () => Option.some({ generation, delay }),
    }),
  }
}

const baseGraceMove = (model: typeof Model.Type, observation: GraceObservation, canWait = true) => {
  if (Option.isNone(model.baseGrace)) {
    return { model }
  }

  const decision = evaluateBaseGrace(model.baseGrace.value, observation)

  const next = modifyFields(model, {
    generation: () => decision.grace.generation,
    baseGrace: () => (decision.action === 'close' ? Option.none() : Option.some(decision.grace)),
    graceWait: () =>
      decision.action === 'arm' && canWait ? Option.some(decision.grace.generation) : Option.none(),
  })

  return decision.action === 'close' ? request(next, false, 'hover') : { model: next }
}

const update = TooltipInteractionComposition.makeUpdate.withContext(
  (context: InteractionContext) => ({
    MeasuredTransfer: (model, message) =>
      Update.withOutMessage({ model }, OutMessage.MeasuredTransfer(message)),
    PlacedGroup: (model, message) =>
      Update.withOutMessage({ model }, OutMessage.PlacedGroup(message)),
    CompletedTransfer: (model, message) =>
      Update.withOutMessage({ model }, OutMessage.CompletedTransfer(message)),
    Mounted: (model) =>
      Update.withOutMessage(
        { model: modifyFields(model, { domReady: () => true }) },
        OutMessage.TriggerMounted(),
      ),
    Unmounted: (model) =>
      Update.withOutMessage(
        {
          model: modifyFields(cancel(model), {
            entered: () => false,
            nestedHover: () => false,
            domReady: () => false,
            blockedFocus: () => false,
            closingFromHover: () => false,
            exitWait: () => Option.none(),
          }),
        },
        OutMessage.TriggerUnmounted(),
      ),
    NestedHover: (model, { nested, pointerType }) => {
      const wasNested = model.nestedHover
      const next = modifyFields(nested ? cancel(model) : model, { nestedHover: () => nested })

      if (
        nested &&
        effectiveOpen(context.presentation) &&
        context.presentation.lastOpenReason === 'hover'
      ) {
        return request(next, false, 'hover')
      }

      if (
        !wasNested ||
        nested ||
        effectiveOpen(context.presentation) ||
        !['', 'mouse', 'pen'].includes(pointerType)
      ) {
        return { model: next }
      }

      const delay = Option.isSome(context.group.active)
        ? 0
        : Option.getOrElse(
            context.presentation.configuration.delayDuration,
            () => context.group.delayDuration,
          )

      if (delay === 0) {
        return request(next, true, 'hover')
      }

      const generation = next.generation + 1

      return {
        model: modifyFields(next, {
          generation: () => generation,
          pending: () => Option.some({ generation, delay }),
        }),
      }
    },
    Entered: (model, { pointerType }) => hover(model, pointerType, false, 0, context),
    Moved: (model, { pointerType, movementSquared }) =>
      hover(model, pointerType, true, movementSquared, context),
    Left: (model) => {
      const left = modifyFields(cancel(model), {
        entered: () => false,
        blockedFocus: () => false,
        nestedHover: () => false,
      })

      return !hoverableContent(context.presentation.configuration, context.group)
        ? request(left, false, 'hover')
        : { model: left }
    },
    WindowBlurred: (model) =>
      effectiveOpen(context.presentation)
        ? { model }
        : { model: modifyFields(model, { blockedFocus: () => true }) },
    StartedBaseGrace: (model, { origin, side, observation }) =>
      !hoverableContent(context.presentation.configuration, context.group)
        ? { model }
        : baseGraceMove(
            modifyFields(model, {
              baseGrace: () =>
                Option.some({
                  origin,
                  side,
                  hasLanded: false,
                  last: Option.none(),
                  generation: model.generation,
                }),
            }),
            observation,
          ),
    // A policy change cannot discard the departure owed by an already-hovered bubble.
    MovedInBaseGrace: (model, { observation }) =>
      baseGraceMove(
        model,
        observation,
        hoverableContent(context.presentation.configuration, context.group),
      ),
    CompletedBaseGraceWait: (model, { generation, hasOpenChild }) =>
      hasOpenChild || !Option.contains(model.graceWait, generation)
        ? { model }
        : request(
            modifyFields(model, { baseGrace: () => Option.none(), graceWait: () => Option.none() }),
            false,
            'hover',
          ),
    Focused: (model, { focusVisible }) =>
      focusVisible && !model.blockedFocus ? request(model, true, 'focus') : { model },
    BlurStarted: (model) => ({ model: modifyFields(model, { blockedFocus: () => false }) }),
    Blurred: (model, { remainsInBranch }) =>
      remainsInBranch ? { model } : request(model, false, 'blur'),
    Pressed: (model) => request(modifyFields(model, { blockedFocus: () => true }), false, 'press'),
    Clicked: (model) => request(modifyFields(model, { blockedFocus: () => true }), false, 'press'),
    Dismissed: (model, { reason }) => request(model, false, reason),
    Escaped: (model) => request(modifyFields(model, { blockedFocus: () => true }), false, 'escape'),
    ClearedGrace: (model) => ({
      model: modifyFields(model, {
        baseGrace: () => Option.none(),
        graceWait: () => Option.none(),
      }),
    }),
    CancelledWait: (model) => ({ model: cancel(model) }),
    CompletedWait: (model, { generation }) =>
      Option.exists(model.pending, (pending) => pending.generation === generation)
        ? request(model, true, 'hover')
        : { model },
    CompletedExit: (model, { generation }) => completedExit(model, generation),
    CompletedAnimation: (model, { generation }) =>
      context.presentation.phase === 'exiting' &&
      context.presentation.generation === generation &&
      !effectiveOpen(context.presentation)
        ? completedExit(model, generation)
        : { model },
  }),
)

const init = TooltipInteractionComposition.makeInit((input: { readonly id: string }) => ({
  model: {
    id: input.id,
    entered: false,
    nestedHover: false,
    domReady: false,
    blockedFocus: false,
    closingFromHover: false,
    generation: 0,
    pending: Option.none(),
    baseGrace: Option.none(),
    graceWait: Option.none(),
    exitWait: Option.none(),
  },
}))

const inMessageUpdate = TooltipInteractionComposition.makeInMessageUpdate({
  RequestedCancelGraceWait: (model) => ({
    model: modifyFields(model, { graceWait: () => Option.none() }),
  }),
  RequestedCancelWait: (model) => ({ model: cancel(model) }),
  RequestedExitWait: (model, { generation }) => ({
    model: modifyFields(model, { exitWait: () => generation }),
  }),
})

export const layer = TooltipInteractionBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  subscriptions,
  EffectsLayer: Layer.mergeAll(ObserveTrigger.layer, ObservePopup.layer, subscriptions.layer),
})

export {
  TooltipInteractionBlock,
  TooltipInteractionKey,
  InMessage,
} from './interaction-definition.js'
