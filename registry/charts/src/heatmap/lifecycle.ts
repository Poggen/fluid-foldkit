import { DrawingElementBase } from './drawing-element-base'
import { HeatmapRegistration } from './registration'
import { Clock, DateTime, Effect } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const HeatmapNamespace = Block.makeNamespace('Heatmap')

export const LifecycleMessage = defineMessageUnion({ CompletedPrepare: {}, CompletedMount: {} })

export const Prepare = HeatmapNamespace.makeMount('Prepare', {
  messages: [LifecycleMessage.CompletedPrepare, LifecycleMessage.CompletedMount],
  *handler() {
    const register = yield* HeatmapRegistration

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

export const Mount = HeatmapNamespace.makeMount('Mount', {
  messages: [LifecycleMessage.CompletedMount],
  *handler() {
    const calendarClock = yield* Clock.Clock

    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Heatmap Mount requires its native drawing capability')
          }

          return element.acquire(
            () => performance.now(),
            DateTime.toDateUtc(DateTime.makeUnsafe(calendarClock.currentTimeMillisUnsafe())),
          )
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(LifecycleMessage.CompletedMount()))
  },
})
