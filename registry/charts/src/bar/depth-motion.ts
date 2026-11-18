import { animateSingleValue, motionValue } from 'motion-dom'
import { mountProgressOptions } from '../kit/motion/transition-options'
import type { Transition } from '../kit/motion/phase'
import type { DepthEntry } from './geometry'
import { cssAttr } from './hover'

export interface DepthMotionTarget {
  readonly key: string
  readonly className: string
  readonly clipId: string
  readonly kind: 'back' | 'front'
  readonly entry: DepthEntry
}

export interface DepthMotionOptions {
  readonly loaded: boolean
  readonly delay: number
  readonly transition: Transition | undefined
}

const ns = 'http://www.w3.org/2000/svg'

/** These handles share Bar's existing refresh and lifetime; only Motion advances their values. */
export function acquireDepthMotion(
  element: HTMLElement,
  definitions: SVGDefsElement,
  initial: DepthMotionTarget,
  options: DepthMotionOptions,
) {
  const side = element.querySelector<SVGGElement>(`.${initial.className}-side`)
  const lid = element.querySelector<SVGGElement>(`.${initial.className}-lid`)
  const glass = element.querySelector<SVGRectElement>(`.${initial.className}-glass`)
  if (initial.kind === 'back' ? side === null || lid === null : glass === null) return

  const clip = initial.kind === 'back' ? document.createElementNS(ns, 'clipPath') : undefined
  const rect = clip === undefined ? undefined : document.createElementNS(ns, 'rect')
  if (clip !== undefined && rect !== undefined) {
    clip.id = initial.clipId
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse')
    clip.append(rect)
    definitions.append(clip)
  }
  const previousClip = side?.style.clipPath ?? ''
  if (side !== null) side.style.clipPath = `url("#${cssAttr(initial.clipId)}")`

  let target = initial
  let loaded = options.loaded
  const top = (value: DepthMotionTarget) =>
    value.entry.topY - (value.kind === 'back' ? value.entry.perspectiveRise : 0)
  const size = (value: DepthMotionTarget) =>
    value.entry.barHeight + (value.kind === 'back' ? value.entry.perspectiveRise : 0)
  const y = motionValue(loaded ? top(initial) : initial.entry.baselineY)
  const height = motionValue(loaded ? size(initial) : 0)
  const lift = motionValue(loaded || initial.entry.isNegative ? 0 : initial.entry.barHeight)
  const opacity = motionValue(!loaded && initial.entry.isNegative ? 0 : 1)
  const paintY = (value: number) => (rect ?? glass)?.setAttribute('y', String(value))
  const paintHeight = (value: number) => (rect ?? glass)?.setAttribute('height', String(value))
  const paintLift = (value: number) => lid?.setAttribute('transform', `translate(0 ${value})`)
  const paintOpacity = (value: number) => lid?.setAttribute('opacity', String(value))
  const releases = [
    y.on('change', paintY),
    height.on('change', paintHeight),
    lift.on('change', paintLift),
    opacity.on('change', paintOpacity),
  ]
  const timing = (next: DepthMotionOptions) =>
    next.loaded
      ? mountProgressOptions({ duration: 0.3, ease: 'easeOut' })
      : { ...mountProgressOptions(next.transition), delay: next.delay }
  const draw = () => {
    if (side !== null) side.style.clipPath = `url("#${cssAttr(target.clipId)}")`
    if (rect !== undefined) {
      rect.setAttribute('x', String(target.entry.bandX - target.entry.depth - 1))
      rect.setAttribute('width', String(target.entry.bandWidth + 2 * target.entry.depth + 2))
    }
    paintY(y.get())
    paintHeight(height.get())
    paintLift(lift.get())
    paintOpacity(opacity.get())
  }
  const animateGeometry = (next: DepthMotionOptions) => {
    void animateSingleValue(y, top(target), timing(next))
    void animateSingleValue(height, size(target), timing(next))
  }
  draw()
  if (!loaded) {
    animateGeometry(options)
    if (initial.kind === 'back') {
      void animateSingleValue(lift, 0, timing(options))
      if (initial.entry.isNegative) void animateSingleValue(opacity, 1, timing(options))
    }
  }

  return {
    current() {
      return initial.kind === 'back'
        ? side === element.querySelector(`.${initial.className}-side`) &&
            lid === element.querySelector(`.${initial.className}-lid`)
        : glass === element.querySelector(`.${initial.className}-glass`)
    },
    update(next: DepthMotionTarget, nextOptions: DepthMotionOptions) {
      const changed = top(next) !== top(target) || size(next) !== size(target)
      target = next
      if (!loaded && nextOptions.loaded) {
        y.jump(top(next))
        height.jump(size(next))
        lift.jump(0)
        opacity.jump(1)
      } else if (changed) animateGeometry(nextOptions)
      loaded = nextOptions.loaded
      draw()
    },
    destroy() {
      for (const value of [y, height, lift, opacity]) value.stop()
      for (const release of releases) release()
      for (const value of [y, height, lift, opacity]) value.destroy()
      clip?.remove()
      if (side !== null) side.style.clipPath = previousClip
      glass?.setAttribute('y', String(target.entry.topY))
      glass?.setAttribute('height', String(target.entry.barHeight))
      lid?.setAttribute('transform', 'translate(0 0)')
      lid?.setAttribute('opacity', '1')
    },
  }
}
