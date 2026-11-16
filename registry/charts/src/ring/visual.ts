import { animateSingleValue, createAnimationState, motionValue, SVGVisualElement } from 'motion-dom'
import type { MotionNodeOptions } from 'motion-dom'
import { mountProgressOptions } from '../kit/motion/transition-options'
import { ringArcGenerator } from './arc'
import type { RingArcRow } from './arc'
import { ringColor } from './geometry'
import { Option, Schema } from 'effect'
import type { RingChartProps, RingProps } from './options'

const SVG_NS = 'http://www.w3.org/2000/svg'

const decodeScale = Schema.decodeUnknownOption(Schema.Number)

/** The lifetime of one authored Ring, including periods where its datum is absent. */
export function createRingVisual(
  initialProps: RingChartProps,
  initialRing: RingProps,
  initialFocus: number | null = null,
) {
  const element = document.createElementNS(SVG_NS, 'g')
  const track = document.createElementNS(SVG_NS, 'path')
  const path = document.createElementNS(SVG_NS, 'path')
  const expand = motionValue(0)
  const progress = motionValue(0)
  let props = initialProps
  let ring = initialRing
  let hovered: number | null = initialFocus
  let initialFilter: string | undefined
  let trackRow: RingArcRow | undefined
  let progressRow: RingArcRow | undefined
  let fit = 1
  let expandComplete = false
  let progressComplete = false
  let lastExpandDelay: number | undefined
  let lastProgressDelay: number | undefined
  let lastIndex: number | undefined
  let visual: SVGVisualElement | undefined
  let animation: ReturnType<typeof createAnimationState> | undefined
  element.classList.add('cursor-pointer')
  element.append(track)

  const hoverScale = () => {
    if (hovered === ring.index) {
      return 1.03
    }

    return hovered !== null && hovered < ring.index ? 1.02 : 1
  }

  const opacity = () => (hovered !== null && hovered !== ring.index ? 0.35 : 1)

  const motionProps = (): MotionNodeOptions => ({
    animate: { scale: hoverScale(), opacity: opacity() },
    transition: {
      scale: { type: 'spring', stiffness: 400, damping: 25 },
      opacity: { duration: 0.15 },
    },
  })

  const stopVisual = () => {
    if (visual === undefined) {
      return
    }

    for (const value of visual.values.values()) {
      value.stop()
    }

    visual.unmount()
    visual = undefined
    animation = undefined
  }

  const paintPaths = (row: RingArcRow, enterDone: boolean) => {
    const arc = ringArcGenerator(fit)()
    track.setAttribute('d', arc(row) ?? '')
    track.setAttribute('fill', row.fill)
    const canSweep = enterDone || expandComplete
    const value = enterDone || progressComplete ? 1 : progress.get()

    const end =
      progressRow === undefined
        ? 0
        : progressRow.startAngle + (progressRow.endAngle - progressRow.startAngle) * value

    const d =
      progressRow === undefined || !canSweep || end <= progressRow.startAngle + 0.01
        ? ''
        : (arc({ ...progressRow, endAngle: end }) ?? '')

    if (d === '' && (enterDone || !expandComplete)) {
      path.remove()
    } else {
      path.setAttribute('d', d)
      path.setAttribute('fill', progressRow?.fill ?? '')
      element.append(path)
    }

    // Source raw SVG styles are captured when this physical group first appears.
    initialFilter ??=
      ring.showGlow !== false && hovered === ring.index
        ? `drop-shadow(0 0 12px ${ringColor(props.data, ring)})`
        : 'none'
    element.style.filter = initialFilter
  }

  const paintMotion = (enterDone: boolean) => {
    if (props.geometryScrubbing === true) {
      stopVisual()
      element.style.removeProperty('scale')
      element.style.removeProperty('transform')
      element.style.removeProperty('opacity')

      return
    }

    if (!enterDone && !expandComplete) {
      stopVisual()
      element.style.transform = ''
      element.classList.add('[transform-origin:0px_0px]')
      element.style.scale = String(Math.max(0, Math.min(1, expand.get())))
      element.style.opacity = String(opacity())

      return
    }

    element.style.removeProperty('scale')

    if (visual === undefined) {
      const scale = enterDone ? hoverScale() : 1
      visual = new SVGVisualElement({
        visualState: {
          latestValues: { scale, opacity: opacity() },
          renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
        },
        props: motionProps(),
        presenceContext: null,
        reducedMotionConfig: 'never',
      })
      animation = createAnimationState(visual)
      visual.animationState = animation
      visual.mount(element)
    }

    visual.update(motionProps(), null)
    visual.render()
    void animation?.animateChanges()
  }

  const paint = () => {
    if (trackRow === undefined) {
      initialFilter = undefined
      stopVisual()
      element.remove()

      return
    }

    const enterDone = ring.animate === false || (expandComplete && progressComplete)
    paintPaths(trackRow, enterDone)
    paintMotion(enterDone)
  }

  const releaseExpand = expand.on('change', (value) => {
    expandComplete ||= value >= 1
    paint()
  })

  const releaseProgress = progress.on('change', (value) => {
    progressComplete ||= value >= 1
    paint()
  })

  const configure = (
    nextProps: RingChartProps,
    nextRing: RingProps,
    nextTrack: RingArcRow | undefined,
    nextProgress: RingArcRow | undefined,
    nextFit: number,
  ) => {
    props = nextProps
    ring = nextRing
    trackRow = nextTrack
    progressRow = nextProgress
    fit = nextFit
    const stagger = props.enterStaggerScale ?? 1
    const expandDelay = ring.index * 0.08 * stagger
    const progressDelay = (0.6 + ring.index * 0.1) * stagger
    const changedIndex = ring.index !== lastIndex

    if (props.geometryScrubbing === true) {
      expand.stop()
      progress.stop()
      expandComplete = true
      progressComplete = true
      paint()

      return
    }

    if (changedIndex || expandDelay !== lastExpandDelay) {
      expand.stop()
      expand.set(0)

      animateSingleValue(expand, 1, {
        ...mountProgressOptions(props.enterTransition),
        delay: expandDelay,
      })

      lastExpandDelay = expandDelay
    }

    if (changedIndex || progressDelay !== lastProgressDelay) {
      progress.stop()
      progress.set(0)

      animateSingleValue(progress, 1, {
        ...mountProgressOptions(props.enterTransition),
        delay: progressDelay,
      })

      lastProgressDelay = progressDelay
    }

    lastIndex = ring.index
    paint()
  }

  return {
    element,
    configure,
    hover(index: number | null) {
      hovered = index
      paint()
    },
    scale() {
      return Option.getOrElse(decodeScale(visual?.getValue('scale')?.get()), () =>
        Math.max(0, Math.min(1, expand.get())),
      )
    },
    destroy() {
      releaseExpand()
      releaseProgress()
      stopVisual()
      expand.destroy()
      progress.destroy()
      element.remove()
    },
  }
}
