import { Context, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { DrawingElementBase } from '../cartesian/lifecycle'
import { PhaseTimingObservation, SweepObservation } from '../cartesian/observations'
import { BrushRange, Domains } from '../cartesian/state'
import { ChartViewport } from '../cartesian/viewport'
import { BrushObservation } from './state'

export const BrushNamespace = Block.makeNamespace('Brush')

export const Message = defineMessageUnion({
  ObservedBrush: BrushObservation.fields,
  ChangedSelection: { range: Schema.Option(BrushRange) },
  ObservedSweepCycle: SweepObservation.fields,
  ObservedPhaseTiming: PhaseTimingObservation.fields,
  ObservedPhaseDeadline: { generation: Schema.Int },
  CompletedReveal: { generation: Schema.Int },
  ObservedDomains: {
    current: Domains,
    target: Domains,
    viewport: Schema.optionalKey(ChartViewport),
  },
  CompletedMount: {},
  CompletedPrepare: {},
})

class BrushRegistration extends Context.Service<BrushRegistration, () => void>()(
  '@foldkit-visuals/charts/BrushRegistration',
) {}

export const PrepareBrush = BrushNamespace.makeMount('PrepareBrush', {
  messages: [Message.CompletedPrepare, Message.CompletedMount],
  *handler() {
    const register = yield* BrushRegistration

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

export const MountBrush = BrushNamespace.makeMount('MountBrush', {
  messages: [Message.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Brush requires its native drawing capability')
          }

          return element.acquire(() => performance.now())
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(Message.CompletedMount()))
  },
})

export const brushEffectsLayer = (registration: () => void) =>
  Layer.mergeAll(PrepareBrush.layer, MountBrush.layer).pipe(
    Layer.provide(
      Layer.effect(
        BrushRegistration,
        Effect.sync(() => {
          // Restored Models can render a mounted drawing before any Prepare Mount runs.
          registration()
          return registration
        }),
      ),
    ),
    // Each recipe closes over a different registration capability.
    Layer.fresh,
  )
