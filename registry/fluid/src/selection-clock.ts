import { Context, Effect, Layer, Schema } from 'effect'

/** Timers advance authored geometry phases; Motion completion alone releases exit slots. */
export const mountSelectionClock: (
  element: Element,
  deadline: (id: number) => void,
  advanced: (ids: ReadonlyArray<number>) => void,
) => SelectionClock = function mountSelectionClock(
  element: Element,
  deadline: (id: number) => void,
  advanced: (ids: ReadonlyArray<number>) => void,
) {
  const window = element.ownerDocument.defaultView

  if (window === null) throw new Error('Fluid selection requires a live document')
  const timers = new Map<number, number>()
  let frame: number | undefined
  let disposed = false

  return {
    synchronize: (plan) => {
      if (disposed) return

      for (const [id, timer] of timers)
        if (!plan.deadlines.some((entry) => entry.id === id)) {
          window.clearTimeout(timer)
          timers.delete(id)
        }

      for (const { id, delay } of plan.deadlines)
        if (!timers.has(id)) {
          timers.set(
            id,
            window.setTimeout(() => {
              timers.delete(id)

              if (!disposed) deadline(id)
            }, delay),
          )
        }

      if (frame !== undefined) window.cancelAnimationFrame(frame)
      frame = undefined

      if (plan.nextFrame.length > 0)
        frame = window.requestAnimationFrame(() => {
          frame = undefined

          if (!disposed) advanced(plan.nextFrame)
        })
    },
    dispose: () => {
      if (disposed) return
      disposed = true

      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()

      if (frame !== undefined) window.cancelAnimationFrame(frame)
    },
  }
}

const Deadline = Schema.Struct({ id: Schema.Natural, delay: Schema.Finite })

export const SelectionClockPlan = Schema.Struct({
  deadlines: Schema.Array(Deadline),
  nextFrame: Schema.Array(Schema.Natural),
})

export interface SelectionClockPlan extends Schema.Schema.Type<typeof SelectionClockPlan> {}

export interface SelectionClock {
  readonly synchronize: (plan: SelectionClockPlan) => void
  readonly dispose: () => void
}

export class SelectionClocks extends Context.Service<
  SelectionClocks,
  Map<string, SelectionClock>
>()('@foldkit-visuals/fluid/SelectionClocks') {}

export const SelectionClocksLayer = Layer.effect(
  SelectionClocks,
  Effect.acquireRelease(
    Effect.sync(() => new Map<string, SelectionClock>()),
    (clocks) =>
      Effect.sync(() => {
        for (const clock of clocks.values()) clock.dispose()
        clocks.clear()
      }),
  ),
)
