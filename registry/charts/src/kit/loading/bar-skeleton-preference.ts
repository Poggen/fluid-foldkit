import { Effect, Option, Queue, Stream } from 'effect'

const QUERY = '(prefers-reduced-motion: reduce)'

function currentPreference(): boolean {
  return typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches
}

/** Sample in Program Flags before pure initialization, including each later occurrence creation. */
export const initialReducedMotion = Effect.sync(currentPreference)

/** Each occurrence acquires and releases its own listener, independently of SVG output. */
export const reducedMotionChanges = Stream.callback<boolean>((queue) => {
  const changed = () => {
    Queue.offerUnsafe(queue, currentPreference())
  }

  return Effect.acquireRelease(
    Effect.sync(() => {
      if (typeof window === 'undefined') {
        return Option.none<MediaQueryList>()
      }

      const list = window.matchMedia(QUERY)

      list.addEventListener('change', changed)

      return Option.some(list)
    }),
    (acquired) =>
      Effect.sync(() => {
        if (Option.isSome(acquired)) {
          acquired.value.removeEventListener('change', changed)
        }
      }),
  ).pipe(Effect.andThen(Effect.sync(changed)))
})
