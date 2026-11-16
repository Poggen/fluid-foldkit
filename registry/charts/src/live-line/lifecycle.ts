import { Message } from './message'
import { DrawingElementBase } from './drawing-element-base'
import { LiveRegistration } from './registration'
import { Clock, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { SourceRows, plannerRows } from './input'

export const LiveLineNamespace = Block.makeNamespace('LiveLine')

export const ResolveInput = LiveLineNamespace.makeCommand('ResolveInput', {
  args: { id: Schema.String, generation: Schema.Int, data: SourceRows },
  messages: [Message.CompletedInput],
  *handler() {
    const identities = yield* Effect.sync(() => new WeakMap<SourceRows, string>())

    return ({ id, generation, data }) =>
      Effect.sync(() => {
        const identity = identities.get(data) ?? `${id}/${generation}`
        identities.set(data, identity)

        return Message.CompletedInput({ generation, identity, data: plannerRows(data) })
      })
  },
})

export const Prepare = LiveLineNamespace.makeMount('Prepare', {
  messages: [Message.CompletedPrepare, Message.CompletedMount],
  *handler() {
    const register = yield* LiveRegistration

    return ({ element }) =>
      Effect.sync(() => {
        if (!element.isConnected) {
          return Message.CompletedMount()
        }

        register()

        return Message.CompletedPrepare()
      })
  },
})

export const Mount = LiveLineNamespace.makeMount('Mount', {
  messages: [Message.CompletedMount],
  *handler() {
    const wallClock = yield* Clock.Clock

    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('LiveLine Mount requires its native drawing capability')
          }

          return element.acquire(
            () => performance.now(),
            () => wallClock.currentTimeMillisUnsafe(),
          )
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(Message.CompletedMount()))
  },
})
