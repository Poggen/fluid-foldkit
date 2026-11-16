// Derived from Fluid Functionalism 200b4534; original hook adapted from Lina by SameerJS6.
import { modifyFields } from 'foldkit/struct'
import { Context, Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export class TouchPrimaryResources extends Context.Service<
  TouchPrimaryResources,
  { readonly changes: Stream.Stream<boolean> }
>()('FluidTouchPrimaryResources') {}

/** Each mounted consumer owns its subscription, just as the source hook does. */
export function makeTouchPrimaryLayer(window: Window) {
  return Layer.succeed(
    TouchPrimaryResources,
    TouchPrimaryResources.of({
      changes: Stream.callback<boolean>((queue) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const controller = new AbortController()

            const update = () => {
              const hasTouch = 'ontouchstart' in window || window.navigator.maxTouchPoints > 0
              Queue.offerUnsafe(queue, hasTouch && window.matchMedia('(pointer: coarse)').matches)
            }

            const media = window.matchMedia('(pointer: coarse)')
            media.addEventListener('change', update, { signal: controller.signal })
            window.addEventListener('pointerdown', update, { signal: controller.signal })
            update()

            return controller
          }),
          (controller) =>
            Effect.sync(() => {
              controller.abort()
            }),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
    }),
  )
}

export const TouchPrimaryServerLayer = Layer.succeed(
  TouchPrimaryResources,
  TouchPrimaryResources.of({ changes: Stream.never }),
)

const Model = Schema.Struct({ id: Schema.String, isTouchPrimary: Schema.Boolean })

type Model = typeof Model.Type

const Message = defineMessageUnion({ Observed: { value: Schema.Boolean } })

const OutMessage = defineMessageUnion({ Changed: { value: Schema.Boolean } })

export const TouchPrimaryKey = Symbol('FluidTouchPrimary')

const effects = Block.makeEffectsContract<never, TouchPrimaryResources>()

export const TouchPrimaryBlock = Block.make('TouchPrimary', {
  key: TouchPrimaryKey,
  InitArgs: Schema.Tuple([Schema.Struct({ id: Schema.String })]),
  effects,
  Model,
  Message,
  OutMessage,
})

const subscriptions = TouchPrimaryBlock.makeSubscriptions((entry) => ({
  observe: entry('Observe', {
    messages: [Message.Observed],
    *handler() {
      const resources = yield* TouchPrimaryResources

      return () => resources.changes.pipe(Stream.map((value) => Message.Observed({ value })))
    },
  }),
}))

const TouchPrimaryComposition = TouchPrimaryBlock.makeComposition()

const init = TouchPrimaryComposition.makeInit((config: { readonly id: string }) => ({
  model: Model.make({ id: config.id, isTouchPrimary: false }),
}))

const update = TouchPrimaryComposition.makeUpdate({
  Observed: (model, { value }) =>
    model.isTouchPrimary === value
      ? { model }
      : {
          model: modifyFields(model, { isTouchPrimary: () => value }),
          outMessage: OutMessage.Changed({ value }),
        },
})

export const layer = TouchPrimaryBlock.makeLayer({
  init,
  update,
  subscriptions,
  EffectsLayer: subscriptions.layer,
})

/** Native projection: bind TouchPrimaryBlock once where the source mounts its hook. */
export const useTouchPrimary = (model: Model): boolean => model.isTouchPrimary
