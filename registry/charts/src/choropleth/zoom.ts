import type { ProjectionHolder } from './focus'

const writeVar: (host: HTMLElement, name: string, value: string) => void = (
  host: HTMLElement,
  name: string,
  value: string,
) => host.style.setProperty(name, value)

/** Zoom and pan state of the map, in the shape of a 2D affine matrix. */
export interface TransformMatrix {
  /** Horizontal scale; the zoom level. */
  readonly scaleX: number
  /** Vertical scale; keep it equal to `scaleX`. */
  readonly scaleY: number
  /** Horizontal pan in pixels. */
  readonly translateX: number
  /** Vertical pan in pixels. */
  readonly translateY: number
  /** Horizontal skew; unused, keep at 0. */
  readonly skewX: number
  /** Vertical skew; unused, keep at 0. */
  readonly skewY: number
}

interface Point {
  readonly x: number
  readonly y: number
}

const identityMatrix: () => TransformMatrix = () => ({
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  translateX: 0,
  translateY: 0,
})

interface ZoomTransform {
  readonly k: number
  readonly x: number
  readonly y: number
}

const toMatrix: (t: ZoomTransform) => TransformMatrix = (t: ZoomTransform) => ({
  scaleX: t.k,
  scaleY: t.k,
  skewX: 0,
  skewY: 0,
  translateX: t.x,
  translateY: t.y,
})

const fromMatrix: (m: Readonly<TransformMatrix>) => ZoomTransform = (
  m: Readonly<TransformMatrix>,
) => ({
  k: m.scaleX,
  x: m.translateX,
  y: m.translateY,
})

const invertPoint: (t: ZoomTransform, p: Point) => Point = (t: ZoomTransform, p: Point) => ({
  x: (p.x - t.x) / t.k,
  y: (p.y - t.y) / t.k,
})

/** bklit-compatible zoom facade (subset of visx ProvidedZoom + state). */
export interface ChoroplethZoomInstance<Action = void> {
  readonly transformMatrix: TransformMatrix
  readonly initialTransformMatrix: TransformMatrix
  readonly isDragging: boolean
  readonly scale: (s: { scaleX: number; scaleY?: number; point?: Point }) => Action
  readonly translate: (t: { translateX: number; translateY: number }) => Action
  readonly translateTo: (point: Point) => Action
  readonly setTransformMatrix: (matrix: TransformMatrix) => Action
  readonly reset: () => Action
  readonly center: () => Action
  readonly clear: () => Action
  readonly applyToPoint: (point: Point) => Point
  readonly applyInverseToPoint: (point: Point) => Point
  readonly toString: () => string
}

const WHEEL_IN = 1.05

const WHEEL_OUT = 0.95

const PINCH_IN = 1.1

const PINCH_OUT = 0.9

const PINCH_DOUBLE_MOVE = 2

interface UseGeoZoomOptions {
  readonly enabled: boolean
  readonly min: number
  readonly max: number
  readonly initial: TransformMatrix
  readonly host: HTMLElement
  readonly observe: (transform: TransformMatrix, dragging: boolean) => void
  readonly holder: ProjectionHolder
  /** A wheel tick zoomed the map; receives the wheel event's client position (the pointer rests there). */
  readonly onWheelZoom?: (clientX: number, clientY: number) => void
}

interface Spread {
  readonly distance: number
  readonly mid: Point
}

type ZoomVars = Readonly<Record<string, string | number>> & {
  readonly '--bkm-zk': number
  readonly '--bkm-zx': string
  readonly '--bkm-zy': string
}

/** Host custom properties carrying the transform; CSS maps them onto the marks layer (no definition rebuild, no React work per frame). */
const zoomStyle: (m: Readonly<TransformMatrix>) => ZoomVars = (m: Readonly<TransformMatrix>) => ({
  '--bkm-zk': m.scaleX,
  '--bkm-zx': `${m.translateX}px`,
  '--bkm-zy': `${m.translateY}px`,
})

const swallow: (event: Event) => void = (event: Event) => {
  event.preventDefault()
  event.stopImmediatePropagation()
}

const applyTransform: (host: HTMLElement, holder: ProjectionHolder, t: ZoomTransform) => void = (
  host: HTMLElement,
  holder: ProjectionHolder,
  t: ZoomTransform,
) => {
  holder.transform = { k: t.k, x: t.x, y: t.y }
  writeVar(host, '--bkm-zk', String(t.k))
  writeVar(host, '--bkm-zx', `${t.x}px`)
  writeVar(host, '--bkm-zy', `${t.y}px`)
}

interface ZoomControl {
  readonly set: (t: ZoomTransform) => void
  readonly scaleBy: (factor: number, point?: Point) => void
  readonly translateBy: (dx: number, dy: number) => void
  readonly translateTo: (point: Point) => void
}

export const mountGeoZoom = ({
  enabled,
  min,
  max,
  initial,
  host,
  holder,
  onWheelZoom,
  observe,
}: UseGeoZoomOptions) => {
  if (!enabled) throw new TypeError('Disabled zoom must not mount')
  const view = host.ownerDocument.defaultView

  if (view === null) throw new TypeError('Zoom requires window')
  let isDragging = false
  let clickTimer: number | undefined
  let clickView: Window | null = null
  let dragAnchorPending = false
  let current: ZoomTransform = fromMatrix(initial)
  let releaseDrag: (() => void) | null = null

  const commit: (t: ZoomTransform, afterApply?: () => void) => void = (
    t: ZoomTransform,
    afterApply?: () => void,
  ) => {
    current = t
    applyTransform(host, holder, t)
    afterApply?.()
    observe(toMatrix(t), isDragging)
  }

  const clampK: (k: number) => number = (k: number) => Math.max(min, Math.min(max, k))

  const scaleAbout: (t: ZoomTransform, k: number, p: Point) => ZoomTransform = (
    t: ZoomTransform,
    k: number,
    p: Point,
  ) => {
    const anchor = invertPoint(t, p)

    return { k, x: p.x - anchor.x * k, y: p.y - anchor.y * k }
  }

  const local: (clientX: number, clientY: number) => Point = (clientX: number, clientY: number) => {
    const box = host.getBoundingClientRect()

    return { x: clientX - box.left - host.clientLeft, y: clientY - box.top - host.clientTop }
  }

  const centre: () => Point = () => ({ x: host.clientWidth / 2, y: host.clientHeight / 2 })

  const isControl: (target: EventTarget | null) => boolean = (target: EventTarget | null) =>
    target instanceof Element && target.closest('button, a, input, select, textarea') !== null

  const onWheel: (event: WheelEvent) => void = (event: WheelEvent) => {
    if (isControl(event.target)) {
      return
    }

    event.preventDefault()
    const k = current.k * (event.deltaY > 0 ? WHEEL_OUT : WHEEL_IN)

    if (k < min || k > max) {
      return
    }
    commit(scaleAbout(current, k, local(event.clientX, event.clientY)), () => {
      onWheelZoom?.(event.clientX, event.clientY)
    })
  }

  const onMouseDown: (event: MouseEvent) => void = (event: MouseEvent) => {
    const view = event.view

    if (view === null || event.ctrlKey || isControl(event.target)) {
      return
    }

    event.stopImmediatePropagation()
    releaseDrag?.()
    let anchor = invertPoint(current, local(event.clientX, event.clientY))
    let moved = false

    const onMove: (move: MouseEvent) => void = (move: MouseEvent) => {
      swallow(move)
      moved ||= move.clientX !== event.clientX || move.clientY !== event.clientY

      if (dragAnchorPending) {
        dragAnchorPending = false
        anchor = invertPoint(current, local(move.clientX, move.clientY))

        return
      }

      const p = local(move.clientX, move.clientY)
      commit({ k: current.k, x: p.x - anchor.x * current.k, y: p.y - anchor.y * current.k })
    }

    const onUp: (up: MouseEvent) => void = (up: MouseEvent) => {
      release()
      swallow(up)

      if (moved) {
        view.addEventListener('click', swallow, { capture: true })
        clickView = view
        clickTimer = view.setTimeout(() => {
          view.removeEventListener('click', swallow, { capture: true })
          clickTimer = undefined
          clickView = null
        }, 0)
      }

      isDragging = false
      observe(toMatrix(current), false)
    }

    const release: () => void = () => {
      view.removeEventListener('mousemove', onMove, { capture: true })
      view.removeEventListener('mouseup', onUp, { capture: true })
      view.removeEventListener('dragstart', swallow, { capture: true })
      view.removeEventListener('selectstart', swallow, { capture: true })
      releaseDrag = null
    }

    releaseDrag = release
    view.addEventListener('mousemove', onMove, { capture: true })
    view.addEventListener('mouseup', onUp, { capture: true })
    view.addEventListener('dragstart', swallow, { capture: true })
    view.addEventListener('selectstart', swallow, { capture: true })
    isDragging = true
    observe(toMatrix(current), true)
    dragAnchorPending = true
  }

  host.addEventListener('wheel', onWheel, { passive: false })
  host.addEventListener('mousedown', onMouseDown)

  const control: ZoomControl = {
    scaleBy: (factor, point = centre()) => {
      commit(scaleAbout(current, clampK(current.k * factor), point))
    },
    set: (t) => {
      commit(t)
    },
    translateBy: (dx, dy) => {
      commit({ k: current.k, x: current.x + current.k * dx, y: current.y + current.k * dy })
    },
    translateTo: ({ x, y }) => {
      const c = centre()
      commit({ k: current.k, x: c.x - x * current.k, y: c.y - y * current.k })
    },
  }

  control.set(fromMatrix(initial))

  let panLast: Point | null = null
  let pinchStart = 0
  let pinchMoves = 0
  let pinchFactor = PINCH_IN

  const touchPoint: (touch: Touch | null) => Point = (touch: Touch | null) => {
    if (touch === null) throw new TypeError('Pinch requires two touches')
    const box = host.getBoundingClientRect()

    return { x: touch.clientX - box.left, y: touch.clientY - box.top }
  }

  const spread: (touches: TouchList) => Spread = (touches: TouchList) => {
    const a = touchPoint(touches.item(0))
    const b = touchPoint(touches.item(1))

    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }

  let pinchMid: Point = { x: 0, y: 0 }

  const pinchStep: (steps: number) => void = (steps: number) => {
    for (let i = 0; i < steps; i += 1) {
      const k = current.k * pinchFactor

      if (k < min || k > max) {
        return
      }

      control.scaleBy(pinchFactor, pinchMid)
    }
  }

  const pinchTo: (touches: TouchList, steps: number) => void = (
    touches: TouchList,
    steps: number,
  ) => {
    const { distance, mid } = spread(touches)
    pinchFactor = distance < pinchStart ? PINCH_OUT : PINCH_IN
    pinchMid = mid
    pinchStep(steps)
  }

  const onTouchStart: (event: TouchEvent) => void = (event: TouchEvent) => {
    if (isControl(event.target)) {
      return
    }

    if (event.touches.length === 1) {
      isDragging = true
      observe(toMatrix(current), true)
      dragAnchorPending = true
      panLast = touchPoint(event.touches.item(0))

      return
    }

    if (event.touches.length === 2) {
      panLast = null
      dragAnchorPending = false
      isDragging = false
      observe(toMatrix(current), false)
      pinchStart = spread(event.touches).distance
      pinchMoves = 0
      pinchTo(event.touches, 1)
    }
  }

  const onTouchMove: (event: TouchEvent) => void = (event: TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault()
    }

    if (event.touches.length === 2) {
      pinchMoves += 1
      pinchTo(event.touches, pinchMoves === PINCH_DOUBLE_MOVE ? 2 : 1)

      return
    }

    if (event.touches.length === 1 && panLast !== null) {
      const point = touchPoint(event.touches.item(0))

      if (dragAnchorPending) {
        dragAnchorPending = false
      } else {
        control.translateBy((point.x - panLast.x) / current.k, (point.y - panLast.y) / current.k)
      }

      panLast = point
    }
  }

  const onTouchEnd: (event: TouchEvent) => void = (event: TouchEvent) => {
    if (event.touches.length < 2 && pinchStart > 0) {
      pinchStart = 0
      pinchStep(1)
    }

    panLast = null
    dragAnchorPending = false
    isDragging = false
    observe(toMatrix(current), false)
  }

  host.addEventListener('touchstart', onTouchStart, { passive: true })
  host.addEventListener('touchmove', onTouchMove, { passive: false })
  host.addEventListener('touchend', onTouchEnd)
  host.addEventListener('touchcancel', onTouchEnd)

  const destroy: () => void = () => {
    host.removeEventListener('wheel', onWheel)
    host.removeEventListener('mousedown', onMouseDown)

    releaseDrag?.()

    if (clickTimer !== undefined) clickView?.clearTimeout(clickTimer)
    clickView?.removeEventListener('click', swallow, { capture: true })
    host.removeEventListener('touchstart', onTouchStart)
    host.removeEventListener('touchmove', onTouchMove)
    host.removeEventListener('touchend', onTouchEnd)
    host.removeEventListener('touchcancel', onTouchEnd)
  }

  const instance: ChoroplethZoomInstance = {
    get transformMatrix() {
      return toMatrix(current)
    },
    initialTransformMatrix: initial,
    get isDragging() {
      return isDragging
    },
    scale: ({ scaleX, point }) => control.scaleBy(scaleX, point),
    translate: ({ translateX, translateY }) =>
      control.translateBy(translateX / current.k, translateY / current.k),
    translateTo: control.translateTo,
    setTransformMatrix: (matrix) => control.set(fromMatrix(matrix)),
    reset: () => control.set(fromMatrix(initial)),
    center: () => control.set(fromMatrix(identityMatrix())),
    clear: () => control.set(fromMatrix(identityMatrix())),
    applyToPoint: ({ x, y }) => ({ x: x * current.k + current.x, y: y * current.k + current.y }),
    applyInverseToPoint: (point) => invertPoint(current, point),
    toString: () => `matrix(${current.k}, 0, 0, ${current.k}, ${current.x}, ${current.y})`,
  }

  return { instance, destroy, set: control.set }
}

export { identityMatrix, zoomStyle }
