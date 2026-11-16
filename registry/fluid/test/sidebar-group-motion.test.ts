// oxlint-disable no-comments/no-comments -- Vitest needs the real DOM environment for native Motion ownership.

// @vitest-environment happy-dom

// oxlint-enable no-comments/no-comments -- Resume comment policy after required test metadata.

import { HTMLVisualElement } from 'motion-dom'
import { afterEach, expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Function } from 'effect'
import { sidebarGroupMotion, sidebarMenuSubMotion } from '../src/sidebar-group-motion.js'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

for (const { name, resource, openAttribute, settledOverflow } of [
  {
    name: 'group',
    resource: sidebarGroupMotion,
    openAttribute: 'data-sidebar-group-open',
    settledOverflow: 'visible',
  },
  {
    name: 'submenu',
    resource: sidebarMenuSubMotion,
    openAttribute: 'data-sidebar-sub-open',
    settledOverflow: 'hidden',
  },
]) {
  it.effect(
    `${name} measures height, toggles, snaps descendant resize and releases observers`,
    () =>
      Effect.gen(function* ownsMeasuredGroup() {
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

        vi.stubGlobal('ResizeObserver', Observer)
        const panel = document.createElement('div')
        const inner = document.createElement('div')
        panel.append(inner)
        document.body.append(panel)
        let height = 120
        Object.defineProperty(inner, 'offsetHeight', { get: () => height })
        panel.setAttribute(openAttribute, 'true')

        const visual = new HTMLVisualElement({
          visualState: {
            latestValues: {},
            renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
          },
          props: { initial: false, animate: {} },
          presenceContext: null,
        })

        visual.mount(panel)
        const release = resource.mount(visual)

        yield* Effect.gen(function* togglesAndResizesGroup() {
          yield* Effect.tryPromise(
            Function.constant(
              vi.waitFor(() => {
                expect(panel.style.height).toBe('120px')
              }),
            ),
          )
          expect(panel.style.overflow).toBe(settledOverflow)
          height = 160

          for (const measure of measurements) {
            measure()
          }

          yield* Effect.tryPromise(
            Function.constant(
              vi.waitFor(() => {
                expect(panel.style.height).toBe('160px')
              }),
            ),
          )
          expect(panel.style.overflow).toBe(settledOverflow)
          panel.setAttribute(openAttribute, 'false')
          yield* Effect.tryPromise(
            Function.constant(
              vi.waitFor(() => {
                expect(panel.style.overflow).toBe('hidden')
              }),
            ),
          )
          yield* Effect.tryPromise(
            Function.constant(
              vi.waitFor(() => {
                expect(panel.style.height).toBe('0px')
              }),
            ),
          )
          expect(panel.style.opacity).toBe('0')
          panel.setAttribute(openAttribute, 'true')
          yield* Effect.tryPromise(
            Function.constant(
              vi.waitFor(() => {
                expect(panel.style.height).toBe('160px')
              }),
            ),
          )
          yield* Effect.tryPromise(
            Function.constant(
              vi.waitFor(() => {
                expect(panel.style.overflow).toBe(settledOverflow)
              }),
            ),
          )
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              release()
              visual.unmount()
            }),
          ),
        )

        expect(disconnected).toBe(true)
      }),
  )
}
