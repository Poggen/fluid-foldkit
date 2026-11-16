// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Option, Predicate, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import * as Render from 'foldkit/render'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  ScrollAreaModel,
  ScrollSettings,
  ScrollAxis,
  scrollAreaInitial,
  scrollPointerPosition,
  scrollAxisMetrics,
} from './scroll-area-state.js'
import type { ScrollAreaConfig } from './scroll-area-state.js'
import { ScrollObservation, observeScrollArea } from './scroll-area-observer.js'
import { scrollAreaView } from './scroll-area-parts.js'
import type { ScrollAreaProps } from './scroll-area-parts.js'

const Model = ScrollAreaModel

const Message = defineMessageUnion({
  Measured: ScrollObservation.Measured.fields,
  Scrolled: ScrollObservation.Scrolled.fields,
  TouchChanged: ScrollObservation.TouchChanged.fields,
  Hovered: ScrollObservation.Hovered.fields,
  PointerDown: ScrollObservation.PointerDown.fields,
  PointerMoved: ScrollObservation.PointerMoved.fields,
  PointerReleased: ScrollObservation.PointerReleased.fields,
  Wheeled: ScrollObservation.Wheeled.fields,
  Settled: { axis: ScrollAxis, generation: Schema.Natural },
  CompletedScroll: {},
  Unmounted: {},
})

const OutMessage = defineMessageUnion({ Scrolled: { left: Schema.Finite, top: Schema.Finite } })

export const InMessage = defineInMessageUnion({
  RequestedSettings: { settings: ScrollSettings },
  RequestedScroll: { left: Schema.Finite, top: Schema.Finite },
})

export const ScrollAreaKey = Symbol('ScrollArea')

const effects = Block.makeEffectsContract()

export const ScrollAreaBlock = Block.make('ScrollArea', {
  key: ScrollAreaKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      orientation: Schema.optionalKey(ScrollSettings.fields.orientation),
      direction: Schema.optionalKey(ScrollSettings.fields.direction),
    }),
  ]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ScrollAreaProps>() },
  effects,
})

const Observe = ScrollAreaBlock.makeMountStream('Observe', {
  messages: [
    Message.Measured,
    Message.Scrolled,
    Message.TouchChanged,
    Message.Hovered,
    Message.PointerDown,
    Message.PointerMoved,
    Message.PointerReleased,
    Message.Wheeled,
  ],
  *handler() {
    return ({ element, viewStateChanges }) => observeScrollArea(element, viewStateChanges)
  },
})

const Settle = ScrollAreaBlock.makeCommand('Settle', {
  args: { axis: ScrollAxis, generation: Schema.Natural },
  messages: [Message.Settled],
  *handler() {
    return (args) => Effect.sleep('500 millis').pipe(Effect.as(Message.Settled(args)))
  },
})

const Scroll = ScrollAreaBlock.makeCommand('Scroll', {
  args: { id: Schema.String, left: Schema.Finite, top: Schema.Finite },
  messages: [Message.CompletedScroll],
  *handler() {
    return ({ id, left, top }) =>
      Render.afterCommit.pipe(
        Effect.andThen(
          Effect.sync(() => {
            globalThis.document
              ?.getElementById(id)
              ?.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]')
              ?.scrollTo({ left, top, behavior: 'instant' })

            return Message.CompletedScroll()
          }),
        ),
      )
  },
})

const ScrollAreaComposition = ScrollAreaBlock.makeComposition({
  mounts: [Observe],
})

const init = ScrollAreaComposition.makeInit((config: ScrollAreaConfig) => ({
  model: scrollAreaInitial(config),
}))

const update = ScrollAreaComposition.makeUpdate({
  Measured: (model, geometry) => ({
    model: modifyFields(model, { geometry: () => geometry, ready: () => true }),
  }),
  TouchChanged: (model, { touch }) => ({
    model:
      touch === model.touch
        ? model
        : modifyFields(model, { touch: () => touch, drag: () => Option.none() }),
  }),
  Hovered: (model, { hovered }) => ({ model: modifyFields(model, { hovered: () => hovered }) }),
  Scrolled: (model, { left, top }) => {
    const changedX = left !== model.geometry.left
    const changedY = top !== model.geometry.top
    const generationX = model.generationX + (changedX ? 1 : 0)
    const generationY = model.generationY + (changedY ? 1 : 0)

    const result = {
      model: modifyFields(model, {
        geometry: (currentGeometry) =>
          modifyFields(currentGeometry, { left: () => left, top: () => top }),
        scrollingX: (currentScrollingX) => changedX || currentScrollingX,
        scrollingY: (currentScrollingY) => changedY || currentScrollingY,
        generationX: () => generationX,
        generationY: () => generationY,
      }) satisfies ScrollAreaModel,
      commands: [
        ...(changedX ? [Settle({ axis: 'x', generation: generationX })] : []),
        ...(changedY ? [Settle({ axis: 'y', generation: generationY })] : []),
      ],
    }

    return changedX || changedY
      ? { ...result, outMessage: OutMessage.Scrolled({ left, top }) }
      : result
  },
  Settled: (model, { axis, generation }) => {
    if (axis === 'x') {
      return {
        model:
          generation === model.generationX
            ? modifyFields(model, { scrollingX: () => false })
            : model,
      }
    }

    return {
      model:
        generation === model.generationY ? modifyFields(model, { scrollingY: () => false }) : model,
    }
  },
  PointerDown: (model, drag) => {
    if (Option.isSome(model.drag)) {
      return { model }
    }

    const next = modifyFields(model, { drag: () => Option.some(drag) })
    const metric = scrollAxisMetrics(next, drag.axis)
    const coordinate = drag.start

    const position =
      drag.thumbOffset === 0
        ? ((coordinate - drag.trackStart - metric.size / 2 - metric.padding + metric.margin / 2) /
            (metric.travel || 1)) *
            metric.maximum -
          (metric.rtl ? metric.maximum : 0)
        : scrollPointerPosition(next, coordinate)

    const origin =
      drag.thumbOffset === 0
        ? modifyFields(next, {
            drag: () => Option.some(modifyFields(drag, { position: () => position })),
          })
        : next

    return {
      model: origin,
      commands: [
        Scroll({
          id: model.id,
          left: drag.axis === 'x' ? position : model.geometry.left,
          top: drag.axis === 'y' ? position : model.geometry.top,
        }),
      ],
    }
  },
  PointerMoved: (model, { pointer, coordinate }) => {
    if (Option.isNone(model.drag) || pointer !== model.drag.value.pointer) {
      return { model }
    }

    const { axis } = model.drag.value
    const position = scrollPointerPosition(model, coordinate)

    return {
      model,
      commands: [
        Scroll({
          id: model.id,
          left: axis === 'x' ? position : model.geometry.left,
          top: axis === 'y' ? position : model.geometry.top,
        }),
      ],
    }
  },
  PointerReleased: (model, { pointer }) => {
    if (Option.isNone(model.drag) || model.drag.value.pointer !== pointer) {
      return { model }
    }

    const { axis } = model.drag.value

    return {
      model: modifyFields(model, {
        drag: () => Option.none(),
        scrollingX: (currentScrollingX) => (axis === 'x' ? false : currentScrollingX),
        scrollingY: (currentScrollingY) => (axis === 'y' ? false : currentScrollingY),
        generationX: (currentGenerationX) => currentGenerationX + (axis === 'x' ? 1 : 0),
        generationY: (currentGenerationY) => currentGenerationY + (axis === 'y' ? 1 : 0),
      }),
    }
  },
  Wheeled: (model, { axis, delta }) => ({
    model,
    commands: [
      Scroll({
        id: model.id,
        left: model.geometry.left + (axis === 'x' ? delta : 0),
        top: model.geometry.top + (axis === 'y' ? delta : 0),
      }),
    ],
  }),
  CompletedScroll: (model) => ({ model }),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      ready: () => false,
      hovered: () => false,
      scrollingX: () => false,
      scrollingY: () => false,
      drag: () => Option.none(),
      generationX: Number.increment,
      generationY: Number.increment,
    }),
  }),
})

const inMessageUpdate = ScrollAreaComposition.makeInMessageUpdate({
  RequestedSettings: (model, { settings }) => ({
    model: modifyFields(model, { settings: () => settings }),
  }),
  RequestedScroll: (model, { left, top }) => ({
    model,
    commands: [Scroll({ id: model.id, left, top })],
  }),
})

const view = ScrollAreaComposition.makeView.withInputs<ScrollAreaProps>((model, inputs, h) =>
  scrollAreaView(
    model,
    inputs,
    [
      h.OnMount(Observe()),
      ...(Predicate.isUndefined(globalThis.window) ? [] : [h.OnUnmount(Message.Unmounted())]),
    ],
    h,
  ),
)

export const layer = ScrollAreaBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(Observe.layer, Scroll.layer, Settle.layer),
})

export { ScrollBar } from './scroll-area-parts.js'

export { scrollSettings } from './scroll-area-state.js'

export type { ScrollAreaConfig } from './scroll-area-state.js'

export type { ScrollAreaProps } from './scroll-area-parts.js'

export type { ScrollBarProps } from './scroll-area-parts.js'

export const test = { Settle, Scroll, Observe }
