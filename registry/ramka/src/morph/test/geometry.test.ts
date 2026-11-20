import { required } from '../../../test/fixtures/required'
import { describe, expect, it } from 'vitest'
import { compensatedMorphRadiusAt } from '../vt-morph-radius'
import { resolveObjectPosition } from '../lightbox-placeholder'
import { resolveViewTransitionTiming } from '../vt-timing'
describe('shared-element geometry', () => {
  it('preserves round corners under nonuniform scaling while progressing from a rounded stage into a circle', () => {
    const value = compensatedMorphRadiusAt([28, 28, 28, 28], [28, 28, 28, 28], 0.5, {
      w0: 360,
      h0: 640,
      w: 208,
      h: 348,
      w1: 56,
      h1: 56,
    })
    const [horizontal, vertical] = value
      .split('/')
      .map((list) => list.trim().split(/\s+/).map(Number.parseFloat))
    const expected = ((28 / 360 + 28 / 56) / 2) * 208
    expect((required(required(horizontal)[0]) * 208) / 56).toBeCloseTo(expected, 2)
    expect((required(required(vertical)[0]) * 348) / 56).toBeCloseTo(expected, 2)
    expect(expected).toBeGreaterThan(28)
  })
  it.each(['default', 'snappy', 'relaxed', 'spring'] as const)(
    '%s timing has continuous forward travel and exact endpoints',
    (preset) => {
      const { ease } = resolveViewTransitionTiming(preset)
      expect(ease(0)).toBe(0)
      expect(ease(1)).toBe(1)
      let previous = 0
      for (let step = 1; step <= 100; step += 1) {
        const value = ease(step / 100)
        expect(value).toBeGreaterThanOrEqual(previous)
        expect(value).toBeLessThanOrEqual(1)
        previous = value
      }
    },
  )
})
describe('thumbnail object positioning', () => {
  it.each([
    ['left top', 100, 60, 0, 0],
    ['right bottom', 100, 60, 100, 60],
    ['25% 75%', 100, 60, 25, 45],
    ['right', 100, 60, 100, 30],
    ['center', 100, 60, 50, 30],
    ['25% 75%', -200, -80, -50, -60],
    ['12px 7px', 100, 60, 50, 30],
  ] as const)('places %s into the image free space', (position, freeX, freeY, x, y) => {
    expect(resolveObjectPosition(position, freeX, freeY)).toEqual({ x, y })
  })
})
