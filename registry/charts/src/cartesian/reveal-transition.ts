import { Predicate, Schema } from 'effect'
import type { Transition as MotionTransition } from 'motion-dom'
import type { EnterTransition } from '../kit/motion/phase'

const EASE = [0.85, 0, 0.15, 1] as const

const NamedEase = Schema.Literals([
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'circIn',
  'circOut',
  'circInOut',
  'backIn',
  'backOut',
  'backInOut',
  'anticipate',
])

type Ease = NonNullable<MotionTransition<number>['ease']>

export const markerRevealDuration = (
  supplied: EnterTransition | undefined,
  logicalDuration: number,
): number =>
  (supplied?.type === 'tween'
    ? (supplied.duration ?? logicalDuration / 1000)
    : (supplied?.duration ?? 1.1)) * 1000

const isMotionEase = (value: EnterTransition['ease']): value is Ease => {
  if (Predicate.isFunction(value) || Schema.is(NamedEase)(value)) {
    return true
  }

  if (!Array.isArray(value)) {
    return false
  }

  return value.every(Predicate.isNumber) ? value.length === 4 : value.every(isMotionEase)
}

/** Source clipRevealTransition forces SVG width to tween, but preserves an explicit tween's delay/ease/default duration. */
export function revealTransition(
  supplied: EnterTransition | undefined,
  logicalDuration: number,
): MotionTransition<number> {
  const transition = supplied ?? { type: 'tween', duration: logicalDuration / 1000 }

  if (transition.type !== 'tween') {
    return { type: 'tween', duration: transition.duration ?? 1.1, ease: [...EASE] }
  }

  const { ease: authoredEase, ...options } = transition
  const ease = authoredEase ?? [...EASE]

  if (!isMotionEase(ease)) {
    throw new TypeError('Invalid clip reveal easing')
  }

  return { ...options, type: 'tween', ease }
}
