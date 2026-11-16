import { Effect, FiberSet } from 'effect'
import { constant } from 'effect/Function'
import type { HTMLVisualElement, SVGVisualElement } from 'motion-dom'

/** Acquired after visual/projection mount; released before visual unmount. */
export interface MotionResource {
  readonly key: object
  readonly mount: (visual: HTMLVisualElement | SVGVisualElement) => () => void
}

export function createMotionResources() {
  const mounted = new Map<Element, { readonly key: object; readonly release: () => void }>()

  return {
    update(
      element: Element,
      visual: HTMLVisualElement | SVGVisualElement,
      resource: MotionResource | undefined,
    ) {
      const previous = mounted.get(element)

      if (previous?.key === resource?.key) {
        return
      }

      previous?.release()
      mounted.delete(element)

      if (resource) {
        mounted.set(element, { key: resource.key, release: resource.mount(visual) })
      }
    },
    release(element: Element) {
      mounted.get(element)?.release()
      mounted.delete(element)
    },
  }
}

export const acquireMotionCompletion = (complete: (element: Element, generation: number) => void) =>
  Effect.gen(function* () {
    const run = yield* FiberSet.makeRuntime()

    return (settled: Promise<unknown>, element: Element, generation: number) => {
      run(
        Effect.promise(constant(settled)).pipe(
          Effect.andThen(() =>
            Effect.sync(() => {
              complete(element, generation)
            }),
          ),
        ),
      )
    }
  })
