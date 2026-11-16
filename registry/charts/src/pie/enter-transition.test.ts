import { expect, it } from 'vitest'
import { mountProgressOptions } from '../kit/motion/transition-options'

const ease = (value: number) => value * value

it('keeps chart defaults separate from Motion defaults for an explicitly supplied transition', () => {
  expect(mountProgressOptions()).toEqual({
    type: 'tween',
    duration: 1.1,
    ease: [0.85, 0, 0.15, 1],
  })
  expect(mountProgressOptions({})).toEqual({})
  expect(mountProgressOptions({ type: 'spring', damping: 12, bounce: 0.3, duration: 0.6 })).toEqual(
    {
      type: 'spring',
      damping: 12,
      bounce: 0.3,
      duration: 0.6,
    },
  )
})

it('passes actual named, function and keyframe easings and refuses unsupported input instead of replacing it', () => {
  expect(mountProgressOptions({ ease }).ease).toBe(ease)
  expect(mountProgressOptions({ ease: 'linear' }).ease).toBe('linear')
  expect(mountProgressOptions({ ease: [[0, 0, 1, 1], 'easeOut'] }).ease).toEqual([
    [0, 0, 1, 1],
    'easeOut',
  ])
  expect(() => mountProgressOptions({ ease: 'not-a-Motion-ease' })).toThrow('Unknown Motion easing')
  expect(() => mountProgressOptions({ type: 'not-a-Motion-generator' })).toThrow(
    'Unsupported Motion animation generator',
  )
})
