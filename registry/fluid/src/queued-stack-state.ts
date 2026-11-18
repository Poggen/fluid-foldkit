/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Schema } from 'effect'
import { QueuedMessage } from './input-message-domain.js'

export const QUEUE_CARD_H = 44

export const QUEUE_CARD_H_COMPACT = 38

export const collapsedStackHeight = (count: number, cardH = QUEUE_CARD_H) =>
  cardH + Math.min(Math.max(count - 1, 0), 2) * 12

export const StackSlot = Schema.Struct({
  item: QueuedMessage,
  present: Schema.Boolean,
  initial: Schema.Boolean,
  generation: Schema.Natural,
})

export const stackFields = {
  id: Schema.String,
  bottom: Schema.Finite,
  queue: Schema.Array(QueuedMessage),
  slots: Schema.Array(StackSlot),
  compact: Schema.Boolean,
  hovered: Schema.Boolean,
  touch: Schema.Boolean,
  tapExpanded: Schema.Boolean,
  pointerDownId: Schema.NullOr(Schema.String),
  draggingId: Schema.NullOr(Schema.String),
  startY: Schema.Finite,
  dragY: Schema.Finite,
  exitSnapshot: Schema.NullOr(
    Schema.Struct({
      expanded: Schema.Boolean,
      bottom: Schema.Finite,
      count: Schema.Natural,
      compact: Schema.Boolean,
      touch: Schema.Boolean,
      draggingId: Schema.NullOr(Schema.String),
      pointerDownId: Schema.NullOr(Schema.String),
      dragY: Schema.Finite,
    }),
  ),
  rootVisible: Schema.Boolean,
  rootPresent: Schema.Boolean,
  rootGeneration: Schema.Natural,
  countPaint: Schema.NullOr(Schema.Natural),
  countPresent: Schema.Boolean,
  countGeneration: Schema.Natural,
  bump: Schema.Boolean,
  bumpGeneration: Schema.Natural,
}

export const StackState = Schema.Struct(stackFields)

export type StackState = typeof StackState.Type

export const stackExpanded = (model: StackState) =>
  model.hovered || model.pointerDownId !== null || model.draggingId !== null || model.tapExpanded

export const stackCardHeight = (model: StackState) =>
  model.compact ? QUEUE_CARD_H_COMPACT : QUEUE_CARD_H

export const stackFileKey = (item: typeof QueuedMessage.Type, index: number) => {
  const file = item.files[index]

  return `${item.id}/${file?.name ?? ''}-${file?.size ?? 0}-${index}`
}

export const stackConfigurationFields = (
  model: StackState,
  queue: ReadonlyArray<typeof QueuedMessage.Type>,
  compact: boolean,
  bottom = model.bottom,
) => {
  const slots = queue.map((item) => {
    const old = model.slots.find((slot) => slot.item.id === item.id)

    return old
      ? {
          ...old,
          item,
          present: true,
          generation: old.present ? old.generation : old.generation + 1,
        }
      : { item, present: true, initial: model.queue.length > 0, generation: 0 }
  })

  if (queue.length) {
    for (const [index, slot] of model.slots.entries()) {
      if (!queue.some((item) => item.id === slot.item.id)) {
        slots.splice(
          index,
          0,
          modifyFields(slot, {
            present: () => false,
            generation: () => (slot.present ? slot.generation + 1 : slot.generation),
          }),
        )
      }
    }
  }

  const bump = queue.length > model.queue.length && model.queue.length > 0 && !stackExpanded(model)

  const exitSnapshot = () => {
    if (queue.length > 0) {
      return null
    }

    if (model.rootPresent) {
      return {
        expanded: stackExpanded(model),
        bottom: model.bottom,
        count: model.queue.length,
        compact: model.compact,
        touch: model.touch,
        draggingId: model.draggingId,
        pointerDownId: model.pointerDownId,
        dragY: model.dragY,
      }
    }

    return model.exitSnapshot
  }

  return {
    queue: () => queue,
    compact: () => compact,
    bottom: () => bottom,
    slots: (currentSlots: StackState['slots']) => (queue.length ? slots : currentSlots),
    exitSnapshot: () => exitSnapshot(),
    tapExpanded: (currentTapExpanded: StackState['tapExpanded']) =>
      queue.length ? currentTapExpanded : false,
    rootVisible: (currentRootVisible: StackState['rootVisible']) =>
      queue.length > 0 || currentRootVisible,
    rootPresent: () => queue.length > 0,
    rootGeneration: () =>
      queue.length > 0 === model.rootPresent ? model.rootGeneration : model.rootGeneration + 1,
    countPaint: (currentCountPaint: StackState['countPaint']) =>
      queue.length > 3 ? queue.length : currentCountPaint,
    countPresent: (currentCountPresent: StackState['countPresent']) =>
      queue.length === 0 ? currentCountPresent : queue.length > 3,
    countGeneration: () =>
      queue.length > 0 && queue.length > 3 !== model.countPresent
        ? model.countGeneration + 1
        : model.countGeneration,
    bump: (currentBump: StackState['bump']) => bump || currentBump,
    bumpGeneration: (currentBumpGeneration: StackState['bumpGeneration']) =>
      bump ? currentBumpGeneration + 1 : currentBumpGeneration,
  }
}
