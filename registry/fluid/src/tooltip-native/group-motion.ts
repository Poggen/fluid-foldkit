// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import { Option, Schema } from 'effect'
import { animateSingleValue, motionValue, frame, cancelFrame } from 'motion-dom'
import type { AnimationPlaybackControlsWithThen, MotionValue } from 'motion-dom'
import { spring } from '../lib/springs.js'
import { capturePreviousLabel, updatePreviousLabelPresentation } from './captured-label.js'
import { GroupPaint, GroupSide } from './group-visual.js'
import type { TransferGeometry } from './group-visual.js'
import { Observation } from './observation.js'
import type { PopupObservation } from './observation.js'

export const GroupCommit = Schema.Struct({
  paint: GroupPaint,
  exitGeneration: Schema.Natural,
  side: GroupSide,
  reducedMotion: Schema.Literals(['user', 'always', 'never']),
})
export type GroupCommit = typeof GroupCommit.Type
const Codec = Schema.fromJsonString(GroupCommit)
export const encodeGroupCommit = Schema.encodeSync(Codec)
const decode = Schema.decodeUnknownOption(Codec)
const decodeSide = Schema.decodeUnknownOption(GroupSide)
export const GROUP_COMMIT_ATTRIBUTE = 'data-tooltip-group-commit'

export const transferGeometry = (
  from: DOMRect,
  target: DOMRect,
  width: number,
): TransferGeometry => {
  const scale = target.width / width || 1
  return {
    left: (from.left - target.left) / scale,
    right: (target.right - from.right) / scale,
    top: (from.top - target.top) / scale,
    bottom: (target.bottom - from.bottom) / scale,
    rideX: (from.left + from.right - target.left - target.right) / 2 / scale,
    rideY: (from.top + from.bottom - target.top - target.bottom) / 2 / scale,
  }
}

/** Captures and animates committed presentation only; admission and hold live in the Block. */
export function observeGroupMotion(
  window: Window,
  popup: HTMLElement,
  send: (fact: PopupObservation) => void,
) {
  const box = popup.querySelector<HTMLElement>('[data-tooltip-group-box]')
  const shape = popup.querySelector<HTMLElement>('[data-tooltip-group-shape]')
  const label = popup.querySelector<HTMLElement>('[data-tooltip-label]')
  const previousHost = popup.querySelector<HTMLElement>('[data-tooltip-previous-host]')
  if (box === null || shape === null || label === null || previousHost === null) return () => {}
  const values = {
    opacity: motionValue(0),
    slide: motionValue(0),
    left: motionValue(0),
    right: motionValue(0),
    top: motionValue(0),
    bottom: motionValue(0),
    rideX: motionValue(0),
    rideY: motionValue(0),
    label: motionValue(1),
    previous: motionValue(0),
  }
  let previous: HTMLElement | undefined
  let capturedGeneration: number | undefined
  let state: GroupCommit | undefined
  let signature = ''
  let measuredGeneration: number | undefined
  let disposed = false
  let runs: Array<AnimationPlaybackControlsWithThen> = []
  let placedSignature = ''
  const paint = () => {
    const side = state?.side
    box.style.opacity = String(values.opacity.get())
    box.style.transform =
      side === 'top' || side === 'bottom'
        ? `translateY(${values.slide.get()}px)`
        : `translateX(${values.slide.get()}px)`
    for (const edge of ['left', 'right', 'top', 'bottom'] as const)
      shape.style[edge] = `${values[edge].get()}px`
    const ride = `translate(${values.rideX.get()}px, ${values.rideY.get()}px)`
    label.style.transform = ride
    label.style.opacity = String(values.label.get())
    if (previous !== undefined) {
      previous.style.transform = ride
      previous.style.opacity = String(values.previous.get())
    }
  }
  // Motion's render queue deduplicates the geometry values changed in one update phase.
  const releases = Object.values(values).map((value) =>
    value.on('change', () => frame.render(paint)),
  )
  const settle = () => {
    for (const run of runs) run.stop()
    runs = []
  }
  const dropPrevious = () => {
    previous?.remove()
    previous = undefined
    capturedGeneration = undefined
  }
  const play = (value: MotionValue<number>, target: number, exit = false, complete?: () => void) =>
    runs.push(
      animateSingleValue(value, target, {
        ...(exit ? spring.fast.exit : spring.fast),
        ...(complete === undefined ? {} : { onComplete: complete }),
      }),
    )
  const still = (commit: GroupCommit) =>
    commit.reducedMotion === 'always' ||
    (commit.reducedMotion === 'user' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const enter = (commit: GroupCommit) => {
    dropPrevious()
    for (const edge of ['left', 'right', 'top', 'bottom', 'rideX', 'rideY'] as const)
      values[edge].set(0)
    values.label.set(1)
    values.previous.set(0)
    values.slide.set(still(commit) ? 0 : commit.side === 'top' || commit.side === 'left' ? 4 : -4)
    play(values.slide, 0)
    play(values.opacity, 1)
  }
  const actualSide = (element: HTMLElement) => decodeSide(element.dataset.side)
  const measure = (commit: GroupCommit, from: string) => {
    if (
      disposed ||
      state?.paint.generation !== commit.paint.generation ||
      measuredGeneration === commit.paint.generation
    )
      return
    const toSide = actualSide(popup)
    if (
      Option.isNone(toSide) ||
      popup.style.getPropertyValue('--tooltip-visibility') !== 'visible'
    ) {
      return
    }
    measuredGeneration = commit.paint.generation
    const source = popup.ownerDocument.getElementById(`${from}-popup`)
    const sourceShape = source?.querySelector<HTMLElement>('[data-tooltip-group-shape]')
    const sourceLabel = source?.querySelector<HTMLElement>('[data-tooltip-label]')
    const fromSide = source instanceof HTMLElement ? actualSide(source) : Option.none()
    const connected =
      sourceShape?.isConnected === true &&
      sourceLabel !== null &&
      sourceLabel !== undefined &&
      Option.isSome(fromSide)
    const geometry = transferGeometry(
      connected ? sourceShape.getBoundingClientRect() : box.getBoundingClientRect(),
      box.getBoundingClientRect(),
      box.offsetWidth,
    )
    dropPrevious()
    if (connected && fromSide.value === toSide.value) {
      previous = capturePreviousLabel(
        sourceLabel,
        label,
        `${popup.id}-previous-${commit.paint.generation}`,
      )
      capturedGeneration = commit.paint.generation
      previousHost.append(previous)
    }
    send(
      Observation.MeasuredTransfer({
        generation: commit.paint.generation,
        connected,
        fromSide: Option.getOrElse(fromSide, () => toSide.value),
        toSide: toSide.value,
        geometry,
      }),
    )
  }
  const synchronize = () => {
    const decoded = decode(popup.getAttribute(GROUP_COMMIT_ATTRIBUTE))
    if (Option.isNone(decoded)) return
    const commit = decoded.value
    const nextSignature = `${commit.paint._tag}:${commit.paint.generation}`
    const before = state
    state = commit
    if (nextSignature !== signature) {
      signature = nextSignature
      const settledTransfer = before?.paint._tag === 'Gliding' && commit.paint._tag === 'Shown'
      if (commit.paint._tag !== 'Holding' && !settledTransfer) settle()
      if (commit.paint._tag === 'Measuring') {
        values.opacity.set(0)
        measure(commit, commit.paint.from)
      } else if (commit.paint._tag === 'Gliding') {
        const generation = commit.paint.generation
        for (const edge of ['left', 'right', 'top', 'bottom', 'rideX', 'rideY'] as const) {
          values[edge].set(still(commit) ? 0 : commit.paint.geometry[edge])
          if (!still(commit)) play(values[edge], 0)
        }
        values.slide.set(0)
        values.opacity.set(1)
        values.label.set(0)
        values.previous.set(1)
        play(values.label, 1)
        if (capturedGeneration !== generation) dropPrevious()
        play(values.previous, 0, true, () => {
          dropPrevious()
          if (!disposed) send(Observation.CompletedTransfer({ generation }))
        })
      } else if (commit.paint._tag === 'Shown' && !settledTransfer) {
        if (before?.paint._tag === 'Holding') {
          play(values.slide, 0)
          play(values.opacity, 1)
          play(values.previous, 0, true, dropPrevious)
        } else enter(commit)
      } else if (commit.paint._tag === 'Exiting') {
        play(values.opacity, 0, true, () => {
          if (!disposed) send(Observation.CompletedAnimation({ generation: commit.exitGeneration }))
        })
      }
    }
    if (commit.paint._tag === 'Measuring') measure(commit, commit.paint.from)
    const side = actualSide(popup)
    const placed = Option.isSome(side) ? `${commit.paint.generation}:${side.value}` : ''
    if (
      commit.paint._tag === 'Shown' &&
      placed !== '' &&
      placed !== placedSignature &&
      Option.isSome(side)
    ) {
      placedSignature = placed
      send(Observation.PlacedGroup({ generation: commit.paint.generation, side: side.value }))
    }
    if (previous !== undefined) updatePreviousLabelPresentation(previous, label)
    cancelFrame(paint)
    paint()
  }
  const observer = new MutationObserver(synchronize)
  observer.observe(popup, {
    attributes: true,
    attributeFilter: [GROUP_COMMIT_ATTRIBUTE, 'data-side'],
  })
  observer.observe(label, { attributes: true, attributeFilter: ['class'] })
  synchronize()
  return () => {
    disposed = true
    cancelFrame(paint)
    settle()
    dropPrevious()
    observer.disconnect()
    for (const release of releases) release()
    for (const value of Object.values(values)) value.destroy()
  }
}
