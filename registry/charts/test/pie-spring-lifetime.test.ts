// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { createSpringDriver } from '../src/pie/private/spring-driver'
import { HOVER_SPRING } from '../src/kit/motion/springs'

it.live('destroy cancels only its pending spring frame and remains idempotent', () =>
  Effect.gen(function* () {
    const request = vi.spyOn(globalThis, 'requestAnimationFrame')
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const external = Promise.withResolvers<void>()
    const externalFrame = requestAnimationFrame(() => external.resolve())
    const element = document.createElement('div')
    const driver = createSpringDriver(() => performance.now())
    try {
      driver.play({
        el: element,
        spring: HOVER_SPRING,
        target: 1,
        rest: 0,
        frame: (value) => ({ opacity: value }),
        frames: true,
      })
      const springFrame = request.mock.results.at(-1)?.value
      expect(springFrame).toBeDefined()
      expect(springFrame).not.toBe(externalFrame)
      expect(element.style.opacity).not.toBe('')

      driver.destroy()
      driver.destroy()

      expect(cancel).toHaveBeenCalledTimes(1)
      expect(cancel).toHaveBeenCalledWith(springFrame)
      expect(cancel).not.toHaveBeenCalledWith(externalFrame)
      expect(element.style.opacity).toBe('')
      yield* Effect.promise(() => external.promise)
    } finally {
      driver.destroy()
      cancelAnimationFrame(externalFrame)
      request.mockRestore()
      cancel.mockRestore()
    }
  }),
)
