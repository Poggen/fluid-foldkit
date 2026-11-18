import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { CartesianRegistration } from './registration'

export const CartesianNamespace = Block.makeNamespace('Cartesian')

const LifecycleMessage = defineMessageUnion({ CompletedMount: {}, CompletedPrepare: {} })

export const PrepareCartesian = CartesianNamespace.makeMount('PrepareCartesian', {
  messages: [LifecycleMessage.CompletedPrepare, LifecycleMessage.CompletedMount],
  *handler() {
    const register = yield* CartesianRegistration

    return ({ element }) =>
      Effect.sync(() => {
        if (!element.isConnected) {
          return LifecycleMessage.CompletedMount()
        }

        register()

        return LifecycleMessage.CompletedPrepare()
      })
  },
})

export const DrawingElementBase =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        acquire(_clock: () => number): () => void
        acquire(_clock: () => number): never {
          throw new TypeError(`${this.localName} must implement resource acquisition`)
        }
      }

export const MountCartesian = CartesianNamespace.makeMount('MountCartesian', {
  messages: [LifecycleMessage.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Cartesian Mount requires its native drawing capability')
          }

          return element.acquire(() => performance.now())
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(LifecycleMessage.CompletedMount()))
  },
})

export const cartesianEffectsLayer = (registration: () => void) =>
  Layer.mergeAll(PrepareCartesian.layer, MountCartesian.layer).pipe(
    Layer.provide(
      Layer.effect(
        CartesianRegistration,
        Effect.sync(() => {
          registration()
          return registration
        }),
      ),
    ),

    Layer.fresh,
  )
