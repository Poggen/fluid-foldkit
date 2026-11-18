// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- real Motion resource with controlled layout measurements
import { constant } from 'effect/Function'
import { HTMLVisualElement } from 'motion-dom'
import { expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { thinkingCollapseMotion } from '../src/thinking-collapse-motion.js'

it.live(
  'preserves the first visible snap and opens to current collapsed layout without a resize delivery',
  () =>
    Effect.gen(function* testThinkingCollapse() {
      const measurements: Array<() => void> = []
      let disconnected = false

      class Observer implements ResizeObserver {
        readonly observed = new Set<Element>()

        constructor(deliver: ResizeObserverCallback) {
          measurements.push(() => {
            deliver([], this)
          })
        }
        observe(element: Element) {
          this.observed.add(element)
        }
        unobserve(element: Element) {
          this.observed.delete(element)
        }
        disconnect() {
          this.observed.clear()
          disconnected = true
        }
      }

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          // oxlint-disable-next-line landmines-testing/no-test-doubles -- Controlled ResizeObserver delivery exercises generation/resize races; native resize keeper: host-geometry-contracts.e2e.ts.
          vi.stubGlobal('ResizeObserver', Observer)
        }),
        () =>
          Effect.sync(() => {
            vi.unstubAllGlobals()
          }),
      )

      const panel = document.createElement('div')
      const inner = document.createElement('div')
      let height = 0

      Object.defineProperty(inner, 'offsetHeight', { get: () => height })
      panel.append(inner)
      panel.dataset.thinkingOpen = 'true'
      panel.dataset.thinkingCompletion = 'thinking-close-0'
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          document.body.append(panel)
        }),
        () =>
          Effect.sync(() => {
            panel.remove()
          }),
      )

      const visual = new HTMLVisualElement({
        visualState: {
          latestValues: {},
          renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
        },
        props: { initial: false, animate: {} },
        presenceContext: null,
      })

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          visual.mount(panel)
        }),
        () =>
          Effect.sync(() => {
            visual.unmount()
          }),
      )

      yield* Effect.acquireRelease(
        Effect.sync(() => thinkingCollapseMotion.mount(visual)),
        (release) =>
          Effect.sync(() => {
            release()
            expect(disconnected).toBe(true)
          }),
      )

      const closed = vi.fn<() => void>()

      const closeCompleted = Promise.withResolvers<void>()
      panel.addEventListener('thinking-close-1', () => {
        closed()
        closeCompleted.resolve()
      })
      yield* Effect.promise(
        constant(Promise.resolve(expect.poll(() => panel.style.height).toBe('0px'))),
      )

      const value = visual.getValue('height')

      if (value === undefined) {
        throw new Error('Measured collapse must own its height Motion value')
      }

      const visibleHeights: Array<unknown> = []

      yield* Effect.scoped(
        Effect.gen(function* observeInitialSnap() {
          yield* Effect.acquireRelease(
            Effect.sync(() =>
              value.on('change', (current) => {
                visibleHeights.push(current)
              }),
            ),
            (stop) => Effect.sync(stop),
          )

          height = 124

          for (const measure of measurements) {
            measure()
          }

          yield* Effect.promise(
            constant(Promise.resolve(expect.poll(() => panel.style.height).toBe('124px'))),
          )
          expect(visibleHeights).toEqual([124])
        }),
      )

      panel.dataset.thinkingCompletion = 'thinking-close-1'
      panel.dataset.thinkingOpen = 'false'
      yield* Effect.promise(
        constant(Promise.resolve(expect.poll(() => panel.style.height).toBe('0px'))),
      )
      yield* Effect.promise(() => closeCompleted.promise)
      expect(closed).toHaveBeenCalledTimes(1)

      height = 204
      panel.dataset.thinkingOpen = 'true'
      yield* Effect.promise(
        constant(Promise.resolve(expect.poll(() => panel.style.height).toBe('204px'))),
      )

      height = 240

      for (const measure of measurements) {
        measure()
      }

      yield* Effect.promise(
        constant(Promise.resolve(expect.poll(() => panel.style.height).toBe('240px'))),
      )
      panel.dataset.thinkingOpen = 'false'
      yield* Effect.promise(constant(Promise.resolve()))
      panel.dataset.thinkingOpen = 'true'
      yield* Effect.promise(
        constant(Promise.resolve(expect.poll(() => panel.style.height).toBe('240px'))),
      )
      expect(closed).toHaveBeenCalledTimes(1)
    }),
)
