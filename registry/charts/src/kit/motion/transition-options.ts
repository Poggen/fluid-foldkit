import { Predicate } from 'effect'
import type { GeneratorFactory, ValueAnimationTransition } from 'motion-dom'
import { DEFAULT_CHART_ENTER_TRANSITION } from './phase'
import type { EnterTransition } from './phase'

const isGenerator = (value: EnterTransition['type']): value is GeneratorFactory =>
  Predicate.isFunction(value)

type SingleEase =
  | ((progress: number) => number)
  | [number, number, number, number]
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'circIn'
  | 'circOut'
  | 'circInOut'
  | 'backIn'
  | 'backOut'
  | 'backInOut'
  | 'anticipate'

const singleEase = (value: NonNullable<EnterTransition['ease']>): SingleEase => {
  if (Predicate.isFunction(value)) {
    return value
  }

  if (Predicate.isString(value)) {
    switch (value) {
      case 'linear':
      case 'easeIn':
      case 'easeOut':
      case 'easeInOut':
      case 'circIn':
      case 'circOut':
      case 'circInOut':
      case 'backIn':
      case 'backOut':
      case 'backInOut':
      case 'anticipate': {
        return value
      }

      default: {
        throw new Error(`Unknown Motion easing: ${value}`)
      }
    }
  }

  const [a, b, c, d] = value

  if (
    value.length === 4 &&
    Predicate.isNumber(a) &&
    Predicate.isNumber(b) &&
    Predicate.isNumber(c) &&
    Predicate.isNumber(d)
  ) {
    return [a, b, c, d]
  }

  throw new Error('Expected a Motion easing function, name or cubic bezier')
}

/** Motion supplies omitted-field defaults; chart defaults apply only when the whole transition is omitted. */
export const mountProgressOptions = (
  transition?: EnterTransition,
  fallback: EnterTransition = DEFAULT_CHART_ENTER_TRANSITION,
): ValueAnimationTransition<number> => {
  const { type, ease, ...fields } = transition ?? fallback

  if (
    type !== undefined &&
    type !== false &&
    type !== 'tween' &&
    type !== 'spring' &&
    type !== 'keyframes' &&
    type !== 'inertia' &&
    type !== 'decay' &&
    !isGenerator(type)
  ) {
    throw new Error('Unsupported Motion animation generator')
  }

  const options: ValueAnimationTransition<number> = { ...fields }

  if (type !== undefined) {
    options.type = type
  }

  if (ease !== undefined) {
    options.ease =
      !Predicate.isString(ease) &&
      !Predicate.isFunction(ease) &&
      ease.some((value) => !Predicate.isNumber(value))
        ? ease.map((value) => {
            if (Predicate.isNumber(value)) {
              throw new TypeError('Mixed Motion easing list')
            }

            return singleEase(value)
          })
        : singleEase(ease)
  }

  return options
}
