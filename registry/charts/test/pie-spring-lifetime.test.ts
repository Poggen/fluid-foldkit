// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { createSpringDriver } from '../src/pie/private/spring-driver'
import { HOVER_SPRING } from '../src/kit/motion/springs'

afterEach(() => vi.unstubAllGlobals())

test('destroy cancels only its pending spring frame and remains idempotent', () => {
  let nextFrame = 0
  let now = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  const element = document.createElement('div')
  const externalFrame = requestAnimationFrame(() => {})
  const driver = createSpringDriver(() => now)
  driver.play({
    el: element,
    spring: HOVER_SPRING,
    target: 1,
    rest: 0,
    frame: (value) => ({ opacity: value }),
    frames: true,
  })
  const scheduled = [...frames.entries()].find(([id]) => id !== externalFrame)
  if (scheduled === undefined) throw new Error('Spring did not schedule its animation')
  frames.delete(scheduled[0])
  now = 30
  scheduled[1](now)
  expect(Number(element.style.opacity)).toBeGreaterThan(0)
  expect(Number(element.style.opacity)).toBeLessThan(1)
  expect(frames.size).toBe(2)

  driver.destroy()
  driver.destroy()

  expect([...frames.keys()]).toEqual([externalFrame])
  expect(element.style.opacity).toBe('')
})
