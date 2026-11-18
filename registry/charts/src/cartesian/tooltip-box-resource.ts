import { attachSpring, cancelFrame, frame, motionValue } from 'motion-dom'
import type { MotionNodeOptions } from 'motion-dom'
import { mountHtmlMotion as mountVisual } from '../kit/html-motion'
import type { TooltipBoxMotionPolicy, TooltipBoxPositionSources } from './tooltip-box-context'
import type { TooltipBoxGeometry, TooltipPanelSize } from './tooltip-box-geometry'
import { tooltipBoxTarget } from './tooltip-box-geometry'

type TooltipMotionProps = MotionNodeOptions

interface TooltipBoxCapabilities extends TooltipBoxPositionSources {
  readonly reducedMotion?: TooltipBoxMotionPolicy['reducedMotion']
}

function measurementChanged(previous: TooltipBoxGeometry, next: TooltipBoxGeometry) {
  return (
    !Object.is(previous.x, next.x) ||
    !Object.is(previous.y, next.y) ||
    !Object.is(previous.containerWidth, next.containerWidth) ||
    !Object.is(previous.containerHeight, next.containerHeight) ||
    !Object.is(previous.offset ?? 16, next.offset ?? 16) ||
    !Object.is(previous.left, next.left) ||
    !Object.is(previous.top, next.top) ||
    (previous.animate !== false) !== (next.animate !== false)
  )
}

function mountOccurrence(
  element: HTMLElement,
  body: HTMLElement,
  first: TooltipBoxGeometry,
  capabilities: TooltipBoxCapabilities,
) {
  const reducedMotion = capabilities.reducedMotion ?? 'never'
  let size: TooltipPanelSize = { width: 180, height: 80 }
  let measured = false
  let disposed = false
  let pendingFlipReconciliation = true
  const observesSize = typeof ResizeObserver !== 'undefined'
  let props = first
  let target = tooltipBoxTarget(props, size)
  let flip = target.flipped
  const left = motionValue(target.left)
  const top = motionValue(target.top)
  let spring = props.springConfig ?? { stiffness: 100, damping: 20 }
  let releaseLeft = attachSpring(left, target.left, spring)
  let releaseTop = attachSpring(top, target.top, spring)
  let staticPosition = { left: props.x, top: props.y }

  const position = () => {
    if (props.entrance === false) {
      return staticPosition
    }

    return props.animate === false
      ? staticPosition
      : {
          left: props.left ?? capabilities.left?.get() ?? left.get(),
          top: props.top ?? capabilities.top?.get() ?? top.get(),
        }
  }

  const paintPosition = () => {
    const current = position()
    element.style.left = `${current.left}px`
    element.style.top = `${current.top}px`
  }

  const schedulePosition = () => {
    if (props.entrance !== false && props.animate !== false) {
      frame.render(paintPosition)
    }
  }

  const releaseLeftPaint = left.on('change', () => {
    if (props.left === undefined && capabilities.left === undefined) {
      schedulePosition()
    }
  })

  const releaseTopPaint = top.on('change', () => {
    if (props.top === undefined && capabilities.top === undefined) {
      schedulePosition()
    }
  })

  const releaseSourceLeft = capabilities.left?.on('change', () => {
    if (props.left === undefined) {
      schedulePosition()
    }
  })

  const releaseSourceTop = capabilities.top?.on('change', () => {
    if (props.top === undefined) {
      schedulePosition()
    }
  })

  paintPosition()

  const outerProps: () => TooltipMotionProps = () => ({
    initial: props.entrance === false ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.1 },
  })

  const enterOuter = () => {
    if (props.entrance === false) {
      element.style.removeProperty('opacity')

      return null
    }

    return mountVisual(element, { opacity: 0 }, outerProps(), reducedMotion)
  }

  let outer = enterOuter()

  const paintOrigin = () => {
    body.style.transformOrigin =
      body.dataset.bkmTooltipTransformOrigin ?? ((props.flipped ?? flip) ? 'right top' : 'left top')
  }

  const paintPlainPanel = () => {
    body.style.opacity = body.dataset.bkmTooltipOpacity ?? ''
    body.style.transform = body.dataset.bkmTooltipTransform ?? ''
  }

  const enterBody = () => {
    const flipped = props.flipped ?? flip
    paintOrigin()

    if (props.entrance === false) {
      paintPlainPanel()

      return null
    }

    const initial = { opacity: 0, scale: 0.85, x: flipped ? 20 : -20 }

    return mountVisual(
      body,
      initial,
      {
        initial,
        animate: { opacity: 1, scale: 1, x: 0 },
        transition: { type: 'spring', stiffness: 300, damping: 25 },
      },
      reducedMotion,
    )
  }

  let inner = enterBody()

  const updatePosition = () => {
    if (props.animate === false) {
      staticPosition = target
    } else {
      if (props.left === undefined && capabilities.left === undefined) {
        left.set(target.left)
      }

      if (props.top === undefined && capabilities.top === undefined) {
        top.set(target.top)
      }
    }
  }

  const retarget = () => {
    target = tooltipBoxTarget(props, size)
    updatePosition()
    paintPosition()
  }

  const reconcileFlip = (nextFlip: boolean, entranceChanged = false) => {
    paintOrigin()

    if (nextFlip !== flip || entranceChanged) {
      flip = nextFlip
      inner?.destroy()
      inner = enterBody()
    }

    element.dataset.placement = (props.flipped ?? flip) ? 'left' : 'right'
  }

  const readPositiveSize: () => TooltipPanelSize = () => ({
    width: element.offsetWidth || size.width,
    height: element.offsetHeight || size.height,
  })

  const acceptObservedSize = () => {
    if (disposed) {
      return
    }

    const nextSize = readPositiveSize()

    if (
      nextSize.width === size.width &&
      nextSize.height === size.height &&
      !pendingFlipReconciliation
    ) {
      return
    }

    size = nextSize

    pendingFlipReconciliation = false
    retarget()
    reconcileFlip(target.flipped)
  }

  const update = (next: TooltipBoxGeometry) => {
    const entranceChanged = (props.entrance !== false) !== (next.entrance !== false)

    const measure = !measured || (!observesSize && measurementChanged(props, next))

    props = next

    const nextFlip = tooltipBoxTarget(props, size).flipped
    const nextSpring = props.springConfig ?? { stiffness: 100, damping: 20 }

    if (spring.stiffness !== nextSpring.stiffness || spring.damping !== nextSpring.damping) {
      releaseLeft()
      releaseTop()
      spring = nextSpring
      releaseLeft = attachSpring(left, left.get(), spring)
      releaseTop = attachSpring(top, top.get(), spring)
    }

    if (measure) {
      size = readPositiveSize()
      measured = true
    }

    retarget()

    if (entranceChanged) {
      outer?.destroy()
      outer = enterOuter()
    } else {
      outer?.update(outerProps())
    }

    reconcileFlip(nextFlip, entranceChanged)
  }

  update(first)

  const sizeObserver = observesSize ? new ResizeObserver(acceptObservedSize) : undefined

  if (sizeObserver) {
    sizeObserver.observe(element, { box: 'border-box' })
  } else {
    frame.read(acceptObservedSize, true)
  }

  return {
    update,
    restartEntrance() {
      outer?.destroy()
      inner?.destroy()
      outer = enterOuter()
      inner = enterBody()
    },
    refreshPresentation() {
      paintOrigin()

      if (props.entrance === false) {
        paintPlainPanel()
      } else {
        inner?.render()
      }
    },
    destroy() {
      disposed = true
      sizeObserver?.disconnect()
      cancelFrame(acceptObservedSize)
      releaseSourceLeft?.()
      releaseSourceTop?.()
      releaseLeftPaint()
      releaseTopPaint()
      cancelFrame(paintPosition)
      releaseLeft()
      releaseTop()
      outer?.destroy()
      inner?.destroy()
      left.destroy()
      top.destroy()
    },
  }
}

/** Shared by chart-owned tooltips and the public TooltipBox Block; owns no application state. */
export function createTooltipBoxResource(
  element: HTMLElement,
  capabilities: TooltipBoxCapabilities = {},
) {
  const body = element.querySelector<HTMLElement>('.ts-chart-tooltip__body')

  if (!body) {
    throw new TypeError('TooltipBox requires its view-owned panel')
  }

  body.classList.add(
    ...'min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg'.split(
      ' ',
    ),
  )

  if (body.style.backgroundColor === '') {
    body.classList.add('bg-chart-tooltip-background')
  }

  if (body.style.backdropFilter === '') {
    body.classList.add('backdrop-blur-md')
  }

  element.dataset.bkmTooltipMotion = ''
  element.classList.add(...'pointer-events-none absolute z-50'.split(' '))
  let occurrence: ReturnType<typeof mountOccurrence> | undefined

  const observer = new MutationObserver(() => {
    occurrence?.refreshPresentation()
  })

  observer.observe(body, {
    attributes: true,
    attributeFilter: [
      'data-bkm-tooltip-transform-origin',
      'data-bkm-tooltip-opacity',
      'data-bkm-tooltip-transform',
    ],
  })

  return {
    show(props: TooltipBoxGeometry, containerChanged = false) {
      element.hidden = false

      if (occurrence) {
        occurrence.update(props)

        if (containerChanged) {
          occurrence.restartEntrance()
        }
      } else {
        occurrence = mountOccurrence(element, body, props, capabilities)
      }
    },
    hide() {
      occurrence?.destroy()
      occurrence = undefined
      element.hidden = true
    },
    destroy() {
      observer.disconnect()
      occurrence?.destroy()
      occurrence = undefined
      element.hidden = true
      delete element.dataset.bkmTooltipMotion
    },
  }
}
