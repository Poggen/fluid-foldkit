import { constUndefined } from 'effect/Function'
import { Context, Data, Effect, Layer, Predicate, Queue, Stream } from 'effect'

const CardRefEvent = Data.taggedEnum<{ readonly _tag: 'CapturedRef' }>()

export type CardGroupRef =
  | ((element: HTMLDivElement | null) => void)
  | { current: HTMLDivElement | null }

export class CardGroupRefs extends Context.Service<
  CardGroupRefs,
  {
    readonly observe: (
      id: string,
      identity: string,
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<{ readonly _tag: 'CapturedRef' }>
  }
>()('FluidCardGroupRefs') {}

/** Capture the original ref callback for each mounted lifetime, including its null cleanup. */
export function makeCardGroupRefsLayer(
  ref: (id: string, identity: string) => CardGroupRef | undefined,
) {
  return Layer.succeed(
    CardGroupRefs,
    CardGroupRefs.of({
      observe: (id, identity, element, states) =>
        states.pipe(
          Stream.switchMap((state) =>
            state === 'Live'
              ? Stream.callback<{ readonly _tag: 'CapturedRef' }>((queue) =>
                  Effect.acquireRelease(
                    Effect.sync(() => {
                      const root = element.parentElement

                      if (!(root instanceof HTMLDivElement)) {
                        throw new Error('CardGroup ref requires a live HTML root')
                      }

                      const captured = ref(id, identity)

                      if (Predicate.isFunction(captured)) {
                        captured(root)
                      } else if (captured !== undefined) {
                        captured.current = root
                      }

                      Queue.offerUnsafe(queue, CardRefEvent.CapturedRef())

                      return () => {
                        if (Predicate.isFunction(captured)) {
                          captured(null)
                        } else if (captured !== undefined) {
                          captured.current = null
                        }
                      }
                    }),
                    (release) => Effect.sync(release),
                  ).pipe(Effect.flatMap(() => Effect.never)),
                )
              : Stream.never,
          ),
        ),
    }),
  )
}

export const CardGroupRefsServerLayer = Layer.succeed(
  CardGroupRefs,
  CardGroupRefs.of({ observe: () => Stream.never }),
)

export const CardGroupRefsDefaultLayer = makeCardGroupRefsLayer(constUndefined)
