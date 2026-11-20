import {
  bakeDiscreteZoomPath,
  bakeSettlePath,
  clamp,
  computePullVelocity,
  computePullTransform,
  distance,
  doubleTapTargetZoom,
  elasticClamp,
  invertElasticClamp,
  KEYBOARD_PAN_FRICTION,
  PAN_PHYSICS_SPRING_MOUSE,
  PAN_PHYSICS_SPRING_TOUCH,
  panOffsetRange,
  pinchFingerAlignment,
  pinchPanOffset,
  pullReturnFraction,
  resolveDragAxis,
  resolvePinchZoom,
  rubberBandClamp,
  rubberBandPanDimension,
  scaleZoom,
  shouldDismissPull,
  stepPanPhysicsAxis,
  wheelAxis,
  ZOOM_SNAP_SPRING,
  ZOOM_SNAP_STOP_DISTANCE,
  ZOOM_SNAP_STOP_SPEED,
  zoomSnapSeedVelocity,
  type GestureAxis,
  type BakedDiscreteZoom,
} from './gesture/math.js'

export interface GestureState {
  open: boolean
  index: number
  zoom: number
  x: number
  y: number
  minZoom: number
  maxZoom: number
  step: number
  enabled: boolean
  scrolling: boolean
  pull: boolean
  reducedMotion: boolean
  poseSample?: number
  pullAnimation?: { duration: number; easing: string }
}

export type GestureIntent =
  | {
      _tag: 'PoseRequested'
      zoom: number
      x: number
      y: number
      tracking?: boolean
      sample?: number
      notify?: boolean
      animationTarget?: Pose & { changesZoom: boolean }
    }
  | { _tag: 'Dismissed' }
  | { _tag: 'DraggingChanged'; dragging: boolean }
  | { _tag: 'ZoomingChanged'; zooming: boolean }
  | {
      _tag: 'PullChanged'
      offset: number
      x?: number
      progress?: number
      scale?: number
      active?: boolean
      animation?: { duration: number; easing: string }
    }

export interface GestureOptions {
  read: () => GestureState
  emit: (intent: GestureIntent) => void
  scrollToZoom?: boolean
  wheelSensitivity?: number
  doubleClick?: boolean
  doubleClickDelay?: number
  dismissDistance?: number
  dismissVelocity?: number
}

export interface GestureController {
  reconcile: () => void
  zoomTo: (zoom: number, focal?: Point, rapid?: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
  reset: (rapid?: boolean) => void
  /** Positive deltas move the viewport right/down, and the media left/up. */
  panBy: (dx: number, dy: number) => void
  dispose: () => void
}

type Point = { x: number; y: number }
type Pointer = Point & { id: number; type: string; time: number }
type Pose = { zoom: number; x: number; y: number }
type PathPose = Pose & { time: number }
type Projection = {
  animation: Animation
  target: HTMLElement
  path: PathPose[]
  duration: number
  kind: 'discrete' | 'settle'
  index: number
  finished: boolean
  terminalSample?: number
  eased: boolean
}

const transform = (pose: Pose) => `scale(${pose.zoom}) translate(${pose.x}px, ${pose.y}px)`
const matrix = (pose: Pose) =>
  `matrix(${pose.zoom}, 0, 0, ${pose.zoom}, ${pose.zoom * pose.x}, ${pose.zoom * pose.y})`

function cubicBezierProgress(progress: number, x1: number, y1: number, x2: number, y2: number) {
  const coordinate = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3
  let low = 0
  let high = 1
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2
    if (coordinate(middle, x1, x2) < progress) low = middle
    else high = middle
  }
  return coordinate((low + high) / 2, y1, y2)
}

function samplePath(
  path: PathPose[],
  progress: number,
  kind: 'discrete' | 'settle',
  eased = false,
) {
  if (eased) progress = cubicBezierProgress(progress, 0.42, 0, 0.58, 1)
  const right = path.findIndex((point) => point.time > progress)
  if (right < 0) {
    const returnValue: Pose | undefined = path.at(-1)
    return returnValue
  }
  const a = path[Math.max(0, right - 1)]
  const b = path[right]
  if (!a || !b) return undefined
  const fraction = b.time > a.time ? (progress - a.time) / (b.time - a.time) : 1
  const zoom = a.zoom + (b.zoom - a.zoom) * fraction
  const returnValue: Pose | undefined = {
    zoom,
    x:
      kind === 'discrete'
        ? (a.x * a.zoom + (b.x * b.zoom - a.x * a.zoom) * fraction) / zoom
        : a.x + (b.x - a.x) * fraction,
    y:
      kind === 'discrete'
        ? (a.y * a.zoom + (b.y * b.zoom - a.y * a.zoom) * fraction) / zoom
        : a.y + (b.y - a.y) * fraction,
  }
  return returnValue
}
type Sample = Point & { t: number }
type Contact = {
  pointer: Pointer
  start: Point
  pose: Pose
  time: number
  moved: boolean
  zoomable: boolean
  allowPull: boolean
  needsRebase: boolean
  axis: GestureAxis
  samples: Sample[]
  pullSamples: Sample[]
  pendingTap?: Point
}
type Pinch = {
  a: Pointer
  b: Pointer
  center: Point
  pose: Pose
  distance: number
  engaged: boolean
  rawZoom: number
  samples: Sample[]
  rebaseX?: { offset: number; focal: number; zoom: number }
  rebaseY?: { offset: number; focal: number; zoom: number }
}

const IGNORED = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="slider"]',
  '[data-ramka-no-pull]',
  '[data-ramka-no-gesture]',
  'video[controls]',
  'audio[controls]',
].join(',')

/**
 * Native input resource. Session baselines and physical velocity live here;
 * every rendered pose and pull offset is emitted to the Foldkit Model.
 * Offsets use Ramka's `scale(zoom) translate(x, y)` convention.
 */
export function attachGestureController(stage: HTMLElement, options: GestureOptions) {
  const win = stage.ownerDocument.defaultView
  if (!win) {
    const returnValue: GestureController = {
      reconcile: () => {},
      zoomTo: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
      reset: () => {},
      panBy: () => {},
      dispose: () => {},
    }
    return returnValue
  }
  const dismissDistance = Math.max(1, options.dismissDistance ?? 100)
  const dismissVelocity = Math.max(0, options.dismissVelocity ?? 400)
  const pointers = new Map<number, Pointer>()
  const captured = new Set<number>()
  let contact: Contact | undefined
  let pinch: Pinch | undefined
  let safariPinch: { rawZoom: number; deferred: boolean } | undefined
  let sessionIndex = options.read().index
  let sessionMinZoom = options.read().minZoom
  let frame = 0
  let timer = 0
  let pinchTimer = 0
  let zoomingTimer = 0
  let zoomingPhysical = false
  let wheelDismissed = false
  let physicalCtrl = false
  let wheelPinch: { raw: number } | undefined
  let lastFocal: Point | undefined
  let zoomReturnHaptic = false
  let wheelDirection: GestureAxis = 'none'
  let wheelLockedByScroll = false
  let wheelPassive: boolean | undefined
  let wheelDistance = 0
  let wheelX = 0
  let wheelCount = 0
  let wheelTail = false
  let pulling = false
  let disposed = false
  let animationKind: 'discrete' | 'settle' | undefined
  let animationTarget: (Pose & { changesZoom: boolean }) | undefined
  let animationVelocity = 0
  let animationSampleTime = -Infinity
  let afterDiscrete: (() => void)[] = []
  let suppressClickUntil = 0
  let suppressDoubleClickUntil = 0
  let lastTap: (Point & { time: number; index: number }) | undefined
  let projection: Projection | undefined
  let pullProjection:
    | {
        animation: Animation
        target: HTMLElement
        finished: boolean
      }
    | undefined
  let sampleSequence = options.read().poseSample ?? 0
  let pendingSample: (Pose & { sample: number }) | undefined

  const owns = (target: Element) => {
    if (target.closest('[data-ramka-root]') !== stage.closest('[data-ramka-root]')) return false
    const portal = target.closest('[data-ramka-portal][data-ramka-for]')
    const ownerPortal = stage.closest('[data-ramka-portal][data-ramka-for]')
    return (
      !portal ||
      portal.getAttribute('data-ramka-for') === ownerPortal?.getAttribute('data-ramka-for')
    )
  }

  const activeZoom = () =>
    [
      ...stage.querySelectorAll<HTMLElement>(
        '[data-ramka-item][data-active] [data-ramka-zoom], [data-ramka-item][data-active][data-ramka-zoom]',
      ),
    ].find(owns) ??
    (![...stage.querySelectorAll('[data-ramka-item]')].some(owns)
      ? [...stage.querySelectorAll<HTMLElement>('[data-ramka-zoom]')].find(owns)
      : undefined)

  const transformTarget = () =>
    [...(activeZoom()?.querySelectorAll<HTMLElement>('[data-lightbox-transform]') ?? [])].find(owns)
  const observedProjection = () =>
    projection &&
    samplePath(
      projection.path,
      clamp(
        (typeof projection.animation.currentTime === 'number'
          ? projection.animation.currentTime
          : 0) / projection.duration,
        0,
        1,
      ),
      projection.kind,
      projection.eased,
    )
  const publishPose = (next: Pose, tracking: boolean, notify = true) => {
    sampleSequence = Math.max(sampleSequence, options.read().poseSample ?? 0) + 1
    pendingSample = { ...next, sample: sampleSequence }
    if (!projection) {
      const target = transformTarget()
      if (target) target.style.transform = transform(next)
    }
    options.emit({
      _tag: 'PoseRequested',
      ...next,
      tracking,
      notify,
      sample: sampleSequence,
      ...(animationTarget === undefined ? {} : { animationTarget }),
    })
  }
  const cancelFrame = (preserve = true, notify = true) => {
    if (pullProjection) {
      const previous = pullProjection
      pullProjection = undefined
      previous.target.style.transform = ''
      previous.animation.cancel()
      pull(0)
    }
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    const current = projection
    const observed = preserve ? observedProjection() : undefined
    projection = undefined
    animationTarget = undefined
    if (current) {
      if (observed) current.target.style.transform = transform(observed)
      current.animation.cancel()
      if (observed) publishPose(observed, true, notify)
    }
    animationKind = undefined
  }

  const releaseCapture = (id: number) => {
    captured.delete(id)
    if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id)
  }

  const capture = (id: number) => {
    try {
      stage.setPointerCapture(id)
      captured.add(id)
    } catch {}
  }

  const setZooming = (active: boolean) => {
    if (zoomingTimer) win.clearTimeout(zoomingTimer)
    zoomingTimer = 0
    if (active) {
      zoomingPhysical = true
      options.emit({ _tag: 'ZoomingChanged', zooming: true })
    } else if (zoomingPhysical)
      zoomingTimer = win.setTimeout(() => {
        zoomingTimer = 0
        zoomingPhysical = false
        options.emit({ _tag: 'ZoomingChanged', zooming: false })
      }, 350)
  }

  const pullBlocked = () =>
    zoomingPhysical || stage.closest('[data-ramka-content]')?.hasAttribute('data-zooming') === true

  const clearContacts = () => {
    if (contact || pinch) options.emit({ _tag: 'DraggingChanged', dragging: false })
    contact = undefined
    pinch = undefined
    pointers.clear()
    for (const id of captured) releaseCapture(id)
  }

  const reset = (resetPull = true) => {
    if (zoomingTimer) win.clearTimeout(zoomingTimer)
    zoomingTimer = 0
    if (zoomingPhysical) options.emit({ _tag: 'ZoomingChanged', zooming: false })
    zoomingPhysical = false
    wheelDismissed = false
    clearContacts()
    cancelFrame(false)
    pendingSample = undefined
    if (timer) win.clearTimeout(timer)
    if (pinchTimer) win.clearTimeout(pinchTimer)
    timer = 0
    pinchTimer = 0
    wheelPinch = undefined
    safariPinch = undefined
    wheelDirection = 'none'
    wheelLockedByScroll = false
    wheelDistance = 0
    wheelX = 0
    wheelCount = 0
    wheelTail = false
    lastTap = undefined
    afterDiscrete = []
    animationVelocity = 0
    animationSampleTime = -Infinity
    lastFocal = undefined
    zoomReturnHaptic = false
    if (resetPull && pulling)
      options.emit({ _tag: 'PullChanged', offset: 0, x: 0, progress: 0, scale: 1, active: false })
    pulling = false
  }

  const read = () => {
    const state = options.read()
    const minimumChanged = state.minZoom !== sessionMinZoom
    if (!state.open || state.index !== sessionIndex || minimumChanged) {
      if (!state.open && state.index === sessionIndex && projection) cancelFrame(true, false)

      reset(state.open && state.index !== sessionIndex)
      sessionIndex = state.index
      sessionMinZoom = state.minZoom
      if (state.open && minimumChanged) publishPose({ zoom: state.minZoom, x: 0, y: 0 }, false)
    }
    if (
      pendingSample &&
      ((state.poseSample !== undefined && state.poseSample >= pendingSample.sample) ||
        (state.poseSample === undefined &&
          state.zoom === pendingSample.zoom &&
          state.x === pendingSample.x &&
          state.y === pendingSample.y))
    )
      pendingSample = undefined
    const physical = observedProjection() ?? pendingSample
    return physical && state.open
      ? { ...state, zoom: physical.zoom, x: physical.x, y: physical.y }
      : state
  }

  const ignored = (target: EventTarget | null, pointerInput = true) => {
    if (!(target instanceof Element) || !stage.contains(target) || !owns(target)) return true
    if (target.closest(pointerInput ? IGNORED : '[data-ramka-no-gesture]')) return true

    for (
      let element: Element | null = target;
      element && element !== stage;
      element = element.parentElement
    ) {
      if (element.hasAttribute('data-ramka-slides')) continue
      const style = win.getComputedStyle(element)
      if (
        (/(auto|scroll)/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 1) ||
        (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)
      )
        return true
    }
    return false
  }

  const geometry = (state: GestureState, zoom: number) => {
    const surface = activeZoom()
    if (!surface) return undefined
    const viewport = stage.getBoundingClientRect()
    const bounds = surface.getBoundingClientRect()
    const media = [...surface.querySelectorAll<HTMLElement>('[data-ramka-media]')].find(owns)
    const image = [...surface.querySelectorAll('img')].find(owns)
    const measured =
      media && media.offsetWidth > 0 ? media : image && image.offsetWidth > 0 ? image : undefined
    const width = measured?.offsetWidth ?? bounds.width
    const height = measured?.offsetHeight ?? bounds.height
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
    const rangesAt = (z: number) => ({
      x: panOffsetRange(width, z, viewport.left, viewport.right, center.x, state.minZoom),
      y: panOffsetRange(height, z, viewport.top, viewport.bottom, center.y, state.minZoom),
    })
    return {
      center,
      viewport,
      rangesAt,
      ...rangesAt(zoom),
    }
  }

  const pose = (
    state: GestureState,
    zoom: number,
    x: number,
    y: number,
    tracking = false,
    elasticPan?: 'touch' | 'mouse',
    notify = true,
  ) => {
    const z = tracking ? zoom : clamp(zoom, state.minZoom, state.maxZoom)
    const geo = geometry(state, z)
    if (!geo) return
    const offset = (value: number, range: typeof geo.x, viewportSize: number) => {
      if (elasticPan) {
        if (elasticPan === 'touch' && !range.overflows) return range.min
        return rubberBandClamp(
          value,
          range.min,
          range.max,
          rubberBandPanDimension(viewportSize, z, elasticPan === 'touch' ? 0.16 : 0.09),
        )
      }
      return tracking ? value : clamp(value, range.min, range.max)
    }
    publishPose(
      {
        zoom: z,
        x: offset(x, geo.x, geo.viewport.width),
        y: offset(y, geo.y, geo.viewport.height),
      },
      tracking,
      notify,
    )
  }

  const focalPose = (state: GestureState, zoom: number, focal: Point, elastic = false) => {
    const z = elastic
      ? Math.max(state.minZoom * 0.1, elasticClamp(zoom, state.minZoom, state.maxZoom))
      : clamp(zoom, state.minZoom, state.maxZoom)
    const geo = geometry(state, z)
    if (!geo) return
    lastFocal = { x: focal.x - geo.center.x, y: focal.y - geo.center.y }
    const returnValue: Pose | undefined = {
      zoom: z,
      x: clamp(
        pinchPanOffset(state.x, lastFocal.x, state.zoom, lastFocal.x, z),
        geo.x.min,
        geo.x.max,
      ),
      y: clamp(
        pinchPanOffset(state.y, lastFocal.y, state.zoom, lastFocal.y, z),
        geo.y.min,
        geo.y.max,
      ),
    }
    return returnValue
  }

  const zoomAt = (state: GestureState, zoom: number, focal: Point, elastic = false) => {
    const to = focalPose(state, zoom, focal, elastic)
    if (to) pose(state, to.zoom, to.x, to.y, elastic)
  }

  const playPath = (
    state: GestureState,
    baked: BakedDiscreteZoom,
    to: Pose,
    kind: 'discrete' | 'settle',
    eased = false,
  ) => {
    cancelFrame()
    animationKind = kind
    animationTarget =
      kind === 'discrete' ? { ...to, changesZoom: state.zoom !== to.zoom } : undefined
    const start = win.performance.now()
    const index = state.index
    const path: PathPose[] = [
      { time: 0, zoom: state.zoom, x: state.x, y: state.y },
      ...baked.path.map((point, i) => ({
        time: baked.offsets[i] ?? 0,
        zoom: point.zoom,
        x: point.offsetX,
        y: point.offsetY,
      })),
      { time: 1, ...to },
    ]
    const target = transformTarget()
    let current: Projection | undefined
    if (target && typeof target.animate === 'function') {
      try {
        target.style.transform = transform(state)
        const animation = target.animate(
          path.map((point, i) => ({
            ...(eased ? (i === 0 ? { easing: 'ease-in-out' } : {}) : { offset: point.time }),
            transform: kind === 'discrete' ? matrix(point) : transform(point),
          })),
          { duration: baked.durationMs, easing: 'linear', fill: 'forwards' },
        )
        current = {
          animation,
          target,
          path,
          duration: baked.durationMs,
          kind,
          index,
          finished: false,
          eased,
        }
        projection = current
      } catch {}
    }
    publishPose({ zoom: state.zoom, x: state.x, y: state.y }, true, kind === 'discrete')
    const finish = () => {
      if (current && projection !== current) return
      const live = read()
      if (current && projection !== current) return
      if (disposed || !live.open || live.index !== index || live.minZoom !== state.minZoom) return
      if (current?.finished) return
      if (current) current.finished = true
      if (frame) win.cancelAnimationFrame(frame)
      frame = 0
      animationKind = undefined
      animationTarget = undefined
      animationVelocity = 0
      pose(live, to.zoom, to.x, to.y)
      if (current) current.terminalSample = sampleSequence
      if (kind === 'discrete') {
        const finished = { ...live, ...to }
        if (pointers.size === 2) armPinch(finished)
        else if (contact) {
          contact.pose = panOrigin(finished, contact.pointer.type === 'touch')
          contact.start = pointers.get(contact.pointer.id) ?? contact.start
        }
        const queued = afterDiscrete
        afterDiscrete = []
        for (const run of queued) run()
      }
      if (current && projection === current)
        frame = win.requestAnimationFrame(() => {
          frame = 0
          reconcile()
        })
    }
    let previousZoom = state.zoom
    let previousTime = start
    const tick = (time: number) => {
      frame = 0
      if (current && projection !== current) return
      const live = read()
      if ((current && projection !== current) || live.minZoom !== state.minZoom) return
      if (disposed || !live.open || !live.enabled || live.index !== index || live.scrolling) {
        cancelFrame(false)
        return
      }
      const elapsed = current
        ? typeof current.animation.currentTime === 'number'
          ? current.animation.currentTime
          : 0
        : time - start
      const progress = clamp(elapsed / baked.durationMs, 0, 1)
      if (progress === 1) {
        finish()
        return
      }
      const observed = samplePath(path, progress, kind, eased)
      if (!observed) return
      animationVelocity =
        time > previousTime ? (observed.zoom - previousZoom) / ((time - previousTime) / 1000) : 0
      animationSampleTime = time
      previousTime = time
      previousZoom = observed.zoom
      pose(live, observed.zoom, observed.x, observed.y, true, undefined, false)
      frame = win.requestAnimationFrame(tick)
    }
    if (current) void current.animation.finished.then(finish, () => {})
    frame = win.requestAnimationFrame(tick)
  }

  const dropWheelPinch = () => {
    if (pinchTimer) win.clearTimeout(pinchTimer)
    pinchTimer = 0
    wheelPinch = undefined
  }

  const retirePull = () => {
    if (timer) win.clearTimeout(timer)
    timer = 0
    wheelDirection = 'none'
    wheelDistance = 0
    wheelX = 0
    wheelCount = 0
    if (pulling) pull(0)
  }

  const animateTo = (state: GestureState, to: Pose) => {
    retirePull()
    dropWheelPinch()
    let vZoom = win.performance.now() - animationSampleTime < 50 ? animationVelocity : 0
    if (projection) {
      const time =
        typeof projection.animation.currentTime === 'number' ? projection.animation.currentTime : 0
      const dt = Math.min(8, time)
      const before = samplePath(
        projection.path,
        Math.max(0, time - dt) / projection.duration,
        projection.kind,
        projection.eased,
      )
      const now = observedProjection()
      vZoom = dt > 0 && before && now ? ((now.zoom - before.zoom) / dt) * 1000 : 0
    }
    cancelFrame(true, false)
    if (state.reducedMotion) {
      pose(state, to.zoom, to.x, to.y)
      return
    }
    const baked = bakeDiscreteZoomPath({
      from: { zoom: state.zoom, offsetX: state.x, offsetY: state.y },
      to: { zoom: to.zoom, offsetX: to.x, offsetY: to.y },
      durationMs: 300,
      vZoom,
    })
    if (baked) playPath(state, baked, to, 'discrete')
    else if (state.zoom !== to.zoom || state.x !== to.x || state.y !== to.y)
      playPath(state, { path: [], offsets: [], durationMs: 300 }, to, 'discrete', true)
    else pose(state, to.zoom, to.x, to.y)
  }

  const animateZoomAt = (state: GestureState, zoom: number, focal?: Point) => {
    const bounds = activeZoom()?.getBoundingClientRect()
    if (!bounds) return
    const to = focalPose(
      state,
      zoom,
      focal ?? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
    )
    if (to) animateTo(state, to)
  }

  const toggleZoomAt = (focal: Point) => {
    if (animationKind === 'discrete') {
      afterDiscrete.push(() => toggleZoomAt(focal))
      return
    }
    const state = read()
    if (state.open && state.enabled) {
      setZooming(true)
      animateZoomAt(
        state,
        doubleTapTargetZoom(state.zoom, state.minZoom, state.maxZoom, state.step),
        focal,
      )
      setZooming(false)
    }
  }

  const panOrigin = (state: GestureState, touch: boolean) => {
    const geo = geometry(state, state.zoom)
    if (!geo) {
      const returnValue: Pose = state
      return returnValue
    }
    const invert = (value: number, range: typeof geo.x, size: number) => {
      const bound = clamp(value, range.min, range.max)
      const over = value - bound
      const dimension = rubberBandPanDimension(size, state.zoom, touch ? 0.16 : 0.09)
      if (!over || dimension <= Math.abs(over)) return value

      return bound + (over * dimension) / (0.28 * (dimension - Math.abs(over)))
    }
    const returnValue: Pose = {
      zoom: state.zoom,
      x: invert(state.x, geo.x, geo.viewport.width),
      y: invert(state.y, geo.y, geo.viewport.height),
    }
    return returnValue
  }

  const pull = (
    offset: number,
    x = 0,
    progress = 0,
    scale = 1,
    active = offset !== 0,
    animation?: { duration: number; easing: string },
  ) => {
    pulling = active
    options.emit({
      _tag: 'PullChanged',
      offset,
      x,
      progress,
      scale,
      active,
      ...(animation ? { animation } : {}),
    })
  }

  const snapPull = (raw: number, velocity = 0, rawX = 0) => {
    cancelFrame()
    const state = read()
    const from = computePullTransform(rawX, raw, dismissDistance, 0.85)
    if (!state.open || Math.abs(from.y) < 0.1) {
      pull(0)
      return
    }
    const start = win.performance.now()
    const index = state.index
    const duration = state.reducedMotion ? 0 : 270
    const normalizedVelocity =
      duration > 0 && Math.abs(from.y) > 1
        ? clamp((velocity * (duration / 1000)) / from.y, -2.5, 2.5)
        : 0
    let easing = `linear(${Array.from({ length: 40 }, (_, i) => Math.round(pullReturnFraction(i / 39, normalizedVelocity) * 10_000) / 10_000).join(', ')})`
    let fallback = false
    const target = stage.matches('[data-ramka-morph]')
      ? stage
      : ([...stage.querySelectorAll<HTMLElement>('[data-ramka-stage-morph]')].find(owns) ??
        [...stage.querySelectorAll<HTMLElement>('[data-ramka-item][data-active]')].find(owns))
    let current: typeof pullProjection
    if (target && typeof target.animate === 'function') {
      target.style.transform = ''
      const keyframes = [
        { transform: `translate(${from.x}px, ${from.y}px) scale(${from.scale})` },
        { transform: 'translate(0, 0) scale(1)' },
      ]
      const animate = () => target.animate(keyframes, { duration, easing, fill: 'forwards' })
      try {
        current = { animation: animate(), target, finished: false }
      } catch {
        fallback = true
        easing = 'cubic-bezier(0.33, 1, 0.68, 1)'
        try {
          current = { animation: animate(), target, finished: false }
        } catch {}
      }
      pullProjection = current
    }
    const timing = { duration, easing }
    pull(from.y, from.x, from.progress, from.scale, false, timing)
    let finished = false
    const finish = () => {
      if (finished || (current && pullProjection !== current)) return
      finished = true
      if (frame) win.cancelAnimationFrame(frame)
      frame = 0
      if (current) current.finished = true
      pull(0)
      if (current)
        frame = win.requestAnimationFrame(() => {
          frame = 0
          reconcile()
        })
    }
    const tick = (time: number) => {
      frame = 0
      if (current && pullProjection !== current) return
      const live = read()
      if (current && pullProjection !== current) return
      if (disposed || !live.open || live.index !== index || live.minZoom !== state.minZoom) return
      const elapsed =
        current && typeof current.animation.currentTime === 'number'
          ? current.animation.currentTime
          : time - start
      const progress = duration === 0 ? 1 : clamp(elapsed / duration, 0, 1)
      if (progress === 1) {
        finish()
        return
      }
      const normalized = fallback
        ? cubicBezierProgress(progress, 0.33, 1, 0.68, 1)
        : pullReturnFraction(progress, normalizedVelocity)
      pull(
        from.y * (1 - normalized),
        from.x * (1 - normalized),
        from.progress * (1 - normalized),
        from.scale + (1 - from.scale) * normalized,
        false,
        timing,
      )
      frame = win.requestAnimationFrame(tick)
    }
    if (current) void current.animation.finished.then(finish, () => {})
    frame = win.requestAnimationFrame(tick)
  }

  const snapHaptic = (state: GestureState) => {
    const bound = clamp(state.zoom, state.minZoom, state.maxZoom)
    if (
      zoomReturnHaptic ||
      state.reducedMotion ||
      !(bound > 0) ||
      Math.abs(state.zoom - bound) / bound < 0.01
    )
      return
    zoomReturnHaptic = true
    if (typeof win.navigator.vibrate === 'function') {
      try {
        win.navigator.vibrate(10)
      } catch {}
    }
  }

  const settle = (
    state: GestureState,
    samples: Sample[] = [],
    touch = false,
    impulse?: { vx: number; vy: number; friction: number },
  ) => {
    cancelFrame()
    const first = samples[0]
    const last = samples.at(-1)
    const geo = geometry(state, state.zoom)
    if (!geo) return
    const dt = first && last ? (last.t - first.t) / 1000 : 0
    const vx = first && last && dt > 0 ? (last.x - first.x) / dt / state.zoom : 0
    const vy = first && last && dt > 0 ? (last.y - first.y) / dt / state.zoom : 0
    const moving = Math.hypot(vx, vy) * state.zoom > 50
    if (state.reducedMotion) {
      pose(state, state.zoom, state.x, state.y)
      return
    }
    const baked = bakeSettlePath({
      zoom: state.zoom,
      minZoom: state.minZoom,
      maxZoom: state.maxZoom,
      offsetX: state.x,
      offsetY: state.y,
      vx: impulse?.vx ?? (moving ? vx : 0),
      vy: impulse?.vy ?? (moving ? vy : 0),
      panSpring: touch ? PAN_PHYSICS_SPRING_TOUCH : PAN_PHYSICS_SPRING_MOUSE,
      ...(impulse ? { panFriction: impulse.friction } : {}),
      geometryAt: geo.rangesAt,
      restOffsetsAt: (zoom, x, y) => {
        const ranges = geo.rangesAt(zoom)
        return { x: clamp(x, ranges.x.min, ranges.x.max), y: clamp(y, ranges.y.min, ranges.y.max) }
      },
      ...(lastFocal ? { focalX: lastFocal.x, focalY: lastFocal.y } : {}),
    })
    if (!baked) {
      pose(state, state.zoom, state.x, state.y)
      return
    }
    snapHaptic(state)
    playPath(state, baked, { zoom: baked.zoom, x: baked.offsetX, y: baked.offsetY }, 'settle')
  }

  const snapZoomWhilePanning = (state: GestureState) => {
    const target = clamp(state.zoom, state.minZoom, state.maxZoom)
    if (target === state.zoom) return
    cancelFrame(true, false)
    if (state.reducedMotion) {
      pose(state, target, state.x, state.y)
      return
    }
    snapHaptic(state)
    let velocity = zoomSnapSeedVelocity(state.zoom, target)
    let previous = win.performance.now()
    const index = state.index
    const tick = (time: number) => {
      frame = 0
      const live = read()
      if (!live.open || !live.enabled || live.index !== index || disposed) return
      const step = stepPanPhysicsAxis(
        { position: live.zoom, velocity, min: target, max: target, canCoast: false },
        Math.min((time - previous) / 1000, 1 / 30),
        3.2,
        ZOOM_SNAP_SPRING.stiffness,
        ZOOM_SNAP_SPRING.damping,
        ZOOM_SNAP_STOP_SPEED,
        ZOOM_SNAP_STOP_DISTANCE,
      )
      previous = time
      velocity = step.velocity
      const zoom = step.settled ? target : step.position
      const geo = geometry(live, zoom)
      if (!geo) return
      const x = geo.x.overflows ? live.x : geo.x.min
      const y = geo.y.overflows ? live.y : geo.y.min
      pose(live, zoom, x, y, true)
      if (contact) {
        contact.pose = panOrigin({ ...live, zoom, x, y }, true)
        contact.start = pointers.get(contact.pointer.id) ?? contact.start
      }
      if (!step.settled) frame = win.requestAnimationFrame(tick)
    }
    frame = win.requestAnimationFrame(tick)
  }

  const armPinch = (state: GestureState) => {
    const [a, b] = pointers.values()
    if (!a || !b) return
    options.emit({ _tag: 'DraggingChanged', dragging: true })
    setZooming(true)
    pinch = {
      a: { ...a },
      b: { ...b },
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      pose: state,
      distance: distance(a.x, a.y, b.x, b.y),
      engaged: false,
      rawZoom: invertElasticClamp(state.zoom, state.minZoom, state.maxZoom),
      samples: [],
    }
    zoomReturnHaptic = false
    if (contact) contact.moved = true
    lastTap = undefined
    for (const id of pointers.keys()) capture(id)
  }

  const onDown = (event: PointerEvent) => {
    const state = read()
    if (!state.open || state.scrolling || event.button !== 0 || ignored(event.target)) return
    if (!state.enabled && !(state.pull && event.pointerType === 'touch')) return
    if (
      pointers.size &&
      ((event.pointerType === 'touch' && event.isPrimary) ||
        event.timeStamp - Math.max(...[...pointers.values()].map((pointer) => pointer.time)) > 500)
    )
      clearContacts()
    if (pointers.size && state.zoom <= 1 && contact?.moved) return
    const surface = activeZoom()
    const onMedia = surface?.contains(event.target instanceof Node ? event.target : null)
    if (!onMedia && !(state.pull && event.pointerType === 'touch')) return
    if (animationKind !== 'discrete') cancelFrame()
    if (pinchTimer) win.clearTimeout(pinchTimer)
    pinchTimer = 0
    wheelPinch = undefined
    if (pulling) pull(0)
    const pointer: Pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      type: event.pointerType,
      time: event.timeStamp,
    }
    pointers.set(pointer.id, pointer)
    if (pointers.size === 1) {
      contact = {
        pointer,
        start: pointer,
        pose: panOrigin(state, event.pointerType === 'touch'),
        time: event.timeStamp,
        moved: false,
        zoomable: !!onMedia,
        allowPull: !pullBlocked(),
        needsRebase: false,
        axis: 'none',
        samples: [],
        pullSamples: [{ ...pointer, t: event.timeStamp }],
        ...(lastTap &&
        lastTap.index === state.index &&
        event.timeStamp - lastTap.time < (options.doubleClickDelay ?? 300) &&
        distance(pointer.x, pointer.y, lastTap.x, lastTap.y) < 50
          ? { pendingTap: { x: pointer.x, y: pointer.y } }
          : {}),
      }
      if (state.enabled && (state.zoom > 1 || (animationTarget?.zoom ?? 0) > 1)) {
        options.emit({ _tag: 'DraggingChanged', dragging: true })
        setZooming(true)
        capture(pointer.id)
      }
    } else if (pointers.size === 2 && state.enabled && onMedia) {
      if (contact) contact.moved = true
      if (animationKind !== 'discrete') armPinch(state)
      event.preventDefault()
    }
  }

  const onMove = (event: PointerEvent) => {
    const state = read()
    if (!state.open || !pointers.has(event.pointerId)) return
    if (state.scrolling || (!state.enabled && !state.pull)) {
      reset()
      return
    }
    const pointer: Pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      type: event.pointerType,
      time: event.timeStamp,
    }
    pointers.set(pointer.id, pointer)
    if (animationKind === 'discrete') {
      if (contact) {
        if (distance(pointer.x, pointer.y, contact.pointer.x, contact.pointer.y) > 10)
          contact.moved = true
        contact.pose = panOrigin(state, pointer.type === 'touch')
        contact.start = pointer
      }
      if (state.zoom > 1) event.preventDefault()
      return
    }
    if (pinch && state.enabled && pointers.size >= 2) {
      const a = pointers.get(pinch.a.id)
      const b = pointers.get(pinch.b.id)
      if (!a || !b) return
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const resolved = resolvePinchZoom({
        initialZoom: pinch.rawZoom,
        initialDistance: pinch.distance,
        currentDistance: distance(a.x, a.y, b.x, b.y),
        engaged: pinch.engaged,
        alignment: pinchFingerAlignment(
          pinch.a.x,
          pinch.a.y,
          a.x,
          a.y,
          pinch.b.x,
          pinch.b.y,
          b.x,
          b.y,
        ),
        panTravel: distance(center.x, center.y, pinch.center.x, pinch.center.y),
      })
      pinch.engaged = resolved.engaged
      pinch.distance = resolved.baselineDistance
      const zoom = Math.max(
        state.minZoom * 0.1,
        elasticClamp(resolved.zoom, state.minZoom, state.maxZoom),
      )
      const geo = geometry(state, zoom)
      if (!geo) return
      const currentPinch = pinch
      const pinchAxis = (axis: 'x' | 'y') => {
        const range = geo[axis]
        const focal = center[axis] - geo.center[axis]
        if (!range.overflows) {
          const rebase = { offset: range.min, focal, zoom }
          if (axis === 'x') currentPinch.rebaseX = rebase
          else currentPinch.rebaseY = rebase
          return range.min
        }
        const rebase = axis === 'x' ? currentPinch.rebaseX : currentPinch.rebaseY
        return pinchPanOffset(
          rebase?.offset ?? currentPinch.pose[axis],
          rebase?.focal ?? currentPinch.center[axis] - geo.center[axis],
          rebase?.zoom ?? currentPinch.pose.zoom,
          focal,
          zoom,
        )
      }
      lastFocal = { x: center.x - geo.center.x, y: center.y - geo.center.y }
      currentPinch.samples.push({ ...center, t: event.timeStamp })
      currentPinch.samples = currentPinch.samples.filter(
        (sample) => event.timeStamp - sample.t <= 100,
      )
      pose(state, zoom, pinchAxis('x'), pinchAxis('y'), true, 'touch')
      event.preventDefault()
      return
    }
    if (!contact || pointer.id !== contact.pointer.id) return
    if (contact.needsRebase) {
      contact.needsRebase = false
      contact.start = pointer
      contact.pose = panOrigin(state, true)
      contact.samples = []
      event.preventDefault()
      return
    }
    const dx = pointer.x - contact.start.x
    const dy = pointer.y - contact.start.y
    if (distance(pointer.x, pointer.y, contact.pointer.x, contact.pointer.y) > 10)
      contact.moved = true
    if (state.enabled && state.zoom > 1) {
      contact.samples.push({ ...pointer, t: event.timeStamp })
      contact.samples = contact.samples.filter((sample) => event.timeStamp - sample.t <= 100)
      pose(
        state,
        state.zoom,
        contact.pose.x + dx / state.zoom,
        contact.pose.y + dy / state.zoom,
        true,
        pointer.type === 'touch' ? 'touch' : 'mouse',
      )
      event.preventDefault()
    } else if (state.pull && contact.allowPull && pointer.type === 'touch') {
      if (pullBlocked()) {
        if (pulling) {
          const last = contact.pullSamples.at(-1)
          snapPull(
            (last?.y ?? contact.start.y) - contact.start.y,
            0,
            (last?.x ?? contact.start.x) - contact.start.x,
          )
        }
        clearContacts()
        return
      }
      if (contact.axis === 'none') {
        contact.axis = resolveDragAxis(dx, dy, 6)
        if (contact.axis === 'vertical') {
          contact.moved = true
          contact.start = pointer
          capture(pointer.id)
          contact.pullSamples.push({ ...pointer, t: event.timeStamp })
          contact.pullSamples = contact.pullSamples.slice(-5)
          pull(0, 0, 0, 1, true)
          event.preventDefault()
          return
        }
      }
      if (contact.axis === 'vertical') {
        contact.pullSamples.push({ ...pointer, t: event.timeStamp })
        contact.pullSamples = contact.pullSamples.slice(-5)
        const transform = computePullTransform(dx, dy, dismissDistance, 0.85)
        pull(transform.y, transform.x, transform.progress, transform.scale)
        event.preventDefault()
      }
    }
  }

  const onEnd = (event: PointerEvent) => {
    const state = read()
    const lastPointer = pointers.get(event.pointerId)
    if (!lastPointer) return
    const cancelled = event.type !== 'pointerup'
    const hadPinch = pinch !== undefined
    pointers.delete(event.pointerId)
    if (!pointers.size) setZooming(false)
    releaseCapture(event.pointerId)
    if (pinch && event.pointerId !== pinch.a.id && event.pointerId !== pinch.b.id) return
    if (hadPinch) {
      const centroidSamples = pinch?.samples ?? []
      pinch = undefined
      if (pointers.size >= 2 && !cancelled) {
        armPinch(state)
        return
      }
      const remaining = pointers.values().next().value
      contact = remaining
        ? {
            pointer: remaining,
            start: remaining,
            pose: panOrigin(state, true),
            time: event.timeStamp,
            moved: true,
            zoomable: true,
            allowPull: false,
            needsRebase: true,
            axis: 'none',
            samples: centroidSamples,
            pullSamples: [],
          }
        : undefined
      suppressClickUntil = win.performance.now() + 350
      if (remaining && !cancelled) snapZoomWhilePanning(state)
      else {
        options.emit({ _tag: 'DraggingChanged', dragging: false })
        settle(state)
      }
      return
    }
    const finished = contact
    contact = undefined
    if (!finished) return
    options.emit({ _tag: 'DraggingChanged', dragging: false })
    const raw = event.clientY - finished.start.y
    if (finished.moved) suppressClickUntil = win.performance.now() + 350
    if (finished.moved || cancelled) lastTap = undefined
    if (animationKind === 'discrete' && (cancelled || finished.moved)) return
    if (finished.axis === 'vertical' && state.zoom <= 1) {
      const samples = finished.pullSamples
      if (
        !cancelled &&
        shouldDismissPull(raw, computePullVelocity(samples), dismissDistance, dismissVelocity)
      ) {
        options.emit({ _tag: 'Dismissed' })
      } else
        snapPull(
          lastPointer.y - finished.start.y,
          cancelled ? 0 : computePullVelocity(samples),
          lastPointer.x - finished.start.x,
        )
    } else if (!cancelled && !finished.moved && finished.zoomable && state.enabled) {
      if (finished.pendingTap && options.doubleClick !== false) {
        toggleZoomAt(finished.pendingTap)
        lastTap = undefined
        suppressClickUntil = win.performance.now() + 350
        suppressDoubleClickUntil = win.performance.now() + 350
        event.preventDefault()
      } else
        lastTap = { x: event.clientX, y: event.clientY, time: finished.time, index: state.index }
    } else if (state.enabled && (finished.moved || cancelled)) {
      const last = finished.samples.at(-1)
      const samples = last && event.timeStamp - last.t <= 100 ? finished.samples : []
      settle(state, cancelled ? [] : samples, event.pointerType === 'touch')
    } else if (state.enabled && animationKind !== 'discrete') {
      pose(state, state.zoom, state.x, state.y)
    }
  }

  const onLostCapture = (event: PointerEvent) => {
    if (event.target === stage) onEnd(event)
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (win.performance.now() < suppressDoubleClickUntil) {
      event.preventDefault()
      return
    }
    const state = read()
    if (
      !state.open ||
      !state.enabled ||
      state.scrolling ||
      options.doubleClick === false ||
      ignored(event.target)
    )
      return
    if (!(event.target instanceof Node) || !activeZoom()?.contains(event.target)) return
    toggleZoomAt({ x: event.clientX, y: event.clientY })
    event.preventDefault()
  }

  const onWheel = (event: WheelEvent) => {
    const state = read()
    if (!state.open || ignored(event.target, false) || pointers.size) return
    if (animationKind === 'discrete') {
      dropWheelPinch()
      if (!wheelPassive) event.preventDefault()
      event.stopPropagation()
      return
    }
    if (state.scrolling) {
      wheelLockedByScroll = true
      wheelDirection = 'horizontal'
      if (timer) win.clearTimeout(timer)
      timer = win.setTimeout(() => {
        wheelDirection = 'none'
        timer = 0
      }, 90)
      return
    }
    if (wheelLockedByScroll) {
      wheelLockedByScroll = false
      wheelDirection = 'none'
    }
    if (safariPinch && event.ctrlKey) return
    if (
      state.enabled &&
      (event.ctrlKey || options.scrollToZoom) &&
      Math.abs(event.deltaY) > Math.abs(event.deltaX)
    ) {
      cancelFrame()
      if (pulling) pull(0)
      const delta = event.deltaY
      const elastic = event.ctrlKey && !physicalCtrl
      if (elastic) {
        if (!wheelPinch) {
          wheelPinch = { raw: invertElasticClamp(state.zoom, state.minZoom, state.maxZoom) }
          zoomReturnHaptic = false
        }
        wheelPinch.raw = scaleZoom(
          wheelPinch.raw,
          -delta,
          Math.max(1, options.wheelSensitivity ?? 100),
        )
      } else wheelPinch = undefined
      zoomAt(
        state,
        elastic && wheelPinch
          ? wheelPinch.raw
          : scaleZoom(state.zoom, -delta, Math.max(1, options.wheelSensitivity ?? 100)),
        { x: event.clientX, y: event.clientY },
        elastic,
      )
      if (pinchTimer) win.clearTimeout(pinchTimer)
      if (elastic)
        pinchTimer = win.setTimeout(() => {
          pinchTimer = 0
          wheelPinch = undefined
          const live = read()
          if (live.open && !pointers.size) settle(live)
        }, 120)
      event.preventDefault()
      event.stopPropagation()
    } else if (state.enabled && state.zoom > 1) {
      cancelFrame()
      if (!options.scrollToZoom)
        pose(
          state,
          state.zoom,
          state.x - event.deltaX / state.zoom,
          state.y - event.deltaY / state.zoom,
        )
      event.preventDefault()
      event.stopPropagation()
    } else if (state.pull && !pullBlocked() && event.deltaMode === 0 && !event.ctrlKey) {
      if (wheelDismissed) return
      if (wheelTail) {
        if (timer) win.clearTimeout(timer)
        timer = win.setTimeout(() => {
          wheelTail = false
          timer = 0
        }, 90)
        return
      }
      if (wheelDirection === 'none') wheelDirection = wheelAxis(event.deltaX, event.deltaY)
      if (
        wheelDirection === 'vertical' &&
        Math.abs(event.deltaX) >= 4 &&
        Math.abs(event.deltaX) > Math.abs(event.deltaY) * 2
      )
        return
      if (timer) win.clearTimeout(timer)
      const finish = () => {
        timer = 0
        const raw = wheelDistance
        const rawX = wheelX
        const dismiss =
          wheelDirection === 'vertical' && Math.abs(raw) >= dismissDistance && wheelCount >= 3
        wheelDirection = 'none'
        wheelDistance = 0
        wheelX = 0
        wheelCount = 0
        wheelTail = true
        timer = win.setTimeout(() => {
          wheelTail = false
          timer = 0
        }, 90)
        if (dismiss) {
          wheelDismissed = true
          options.emit({ _tag: 'Dismissed' })
        } else if (pulling) snapPull(raw, 0, rawX)
      }
      timer = win.setTimeout(finish, 90)
      if (wheelDirection !== 'vertical') return
      cancelFrame()
      wheelDistance -= event.deltaY
      wheelX -= event.deltaX
      wheelCount += 1
      const transform = computePullTransform(wheelX, wheelDistance, dismissDistance, 0.85)
      pull(transform.y, transform.x, transform.progress, transform.scale)
      if (Math.abs(wheelDistance) >= dismissDistance && wheelCount >= 3) {
        win.clearTimeout(timer)
        finish()
      }
    }
  }

  const onSafariGesture = (event: Event) => {
    if (win.navigator.maxTouchPoints > 0) return
    const state = read()
    if (!state.open || !state.enabled || ignored(event.target, false)) return
    event.preventDefault()
    if (state.scrolling) {
      safariPinch = undefined
      return
    }
    if (event.type === 'gesturestart') {
      if (!activeZoom()) return
      const deferred = animationKind === 'discrete'
      if (!deferred) cancelFrame()
      dropWheelPinch()
      zoomReturnHaptic = false
      if (pulling) pull(0)
      safariPinch = {
        rawZoom: invertElasticClamp(state.zoom, state.minZoom, state.maxZoom),
        deferred,
      }
    } else if (event.type === 'gestureend') {
      const active = safariPinch
      safariPinch = undefined
      if (active && !active.deferred) settle(state)
    } else if (safariPinch && 'scale' in event && typeof event.scale === 'number') {
      if (safariPinch.deferred) {
        if (animationKind === 'discrete') return
        safariPinch.deferred = false
        safariPinch.rawZoom =
          invertElasticClamp(state.zoom, state.minZoom, state.maxZoom) / Math.max(event.scale, 1e-6)
      }
      const bounds = activeZoom()?.getBoundingClientRect()
      if (!bounds) return
      zoomAt(
        state,
        safariPinch.rawZoom * event.scale,
        {
          x:
            'clientX' in event && typeof event.clientX === 'number'
              ? event.clientX
              : bounds.left + bounds.width / 2,
          y:
            'clientY' in event && typeof event.clientY === 'number'
              ? event.clientY
              : bounds.top + bounds.height / 2,
        },
        true,
      )
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    if (
      pinch ||
      (event.touches.length === 1 && contact?.axis === 'vertical') ||
      (contact && read().zoom > 1)
    )
      event.preventDefault()
  }
  const onClick = (event: MouseEvent) => {
    if (win.performance.now() < suppressClickUntil && !ignored(event.target)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  const onDragStart = (event: DragEvent) => {
    if (
      !ignored(event.target) &&
      activeZoom()?.contains(event.target instanceof Node ? event.target : null)
    )
      event.preventDefault()
  }
  const onBlur = () => {
    const state = options.read()
    reset()
    physicalCtrl = false
    if (state.open && state.enabled) pose(state, state.zoom, state.x, state.y)
  }
  const onControlDown = (event: KeyboardEvent) => {
    if (event.key === 'Control') physicalCtrl = true
  }
  const onControlUp = (event: KeyboardEvent) => {
    if (event.key === 'Control') physicalCtrl = false
  }
  const onResize = () => {
    const state = read()
    if (state.open && state.enabled) pose(state, state.zoom, state.x, state.y)
  }
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onResize)
  observer?.observe(stage)
  stage.addEventListener('pointerdown', onDown)
  win.addEventListener('pointermove', onMove, { passive: false })
  win.addEventListener('pointerup', onEnd)
  win.addEventListener('pointercancel', onEnd)
  stage.addEventListener('lostpointercapture', onLostCapture)
  stage.addEventListener('dblclick', onDoubleClick)
  const reconcile = () => {
    if (disposed) return
    const state = read()
    if (pullProjection?.finished) {
      if (!state.pullAnimation) {
        const completed = pullProjection
        pullProjection = undefined
        completed.target.style.transform = ''
        completed.animation.cancel()
      } else if (!frame)
        frame = win.requestAnimationFrame(() => {
          frame = 0
          reconcile()
        })
    }
    const settled = projection
    if (settled?.finished) {
      const accepted = options.read()
      const final = settled.path.at(-1)
      const acknowledged =
        accepted.poseSample !== undefined &&
        settled.terminalSample !== undefined &&
        accepted.poseSample >= settled.terminalSample
      const legacyAccepted =
        accepted.poseSample === undefined &&
        final &&
        accepted.zoom === final.zoom &&
        accepted.x === final.x &&
        accepted.y === final.y &&
        !pendingSample
      if (acknowledged || legacyAccepted) {
        settled.target.style.transform = transform(accepted)
        projection = undefined
        settled.animation.cancel()
        if (frame) win.cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame)
        frame = win.requestAnimationFrame(() => {
          frame = 0
          reconcile()
        })
    }
    const passive = 'GestureEvent' in win && state.zoom <= 1 && !options.scrollToZoom
    if (passive === wheelPassive) return
    stage.removeEventListener('wheel', onWheel, true)

    stage.addEventListener('wheel', onWheel, { passive, capture: true })
    wheelPassive = passive
  }
  reconcile()
  stage.addEventListener('gesturestart', onSafariGesture, { passive: false })
  stage.addEventListener('gesturechange', onSafariGesture, { passive: false })
  stage.addEventListener('gestureend', onSafariGesture, { passive: false })
  stage.addEventListener('touchmove', onTouchMove, { passive: false })
  stage.addEventListener('click', onClick, true)
  stage.addEventListener('dragstart', onDragStart)
  win.addEventListener('blur', onBlur)
  win.addEventListener('keydown', onControlDown, true)
  win.addEventListener('keyup', onControlUp, true)
  win.addEventListener('resize', onResize)
  const dispose = () => {
    if (disposed) return
    disposed = true
    stage.removeEventListener('pointerdown', onDown)
    win.removeEventListener('pointermove', onMove)
    win.removeEventListener('pointerup', onEnd)
    win.removeEventListener('pointercancel', onEnd)
    stage.removeEventListener('lostpointercapture', onLostCapture)
    stage.removeEventListener('dblclick', onDoubleClick)
    stage.removeEventListener('wheel', onWheel, true)
    stage.removeEventListener('gesturestart', onSafariGesture)
    stage.removeEventListener('gesturechange', onSafariGesture)
    stage.removeEventListener('gestureend', onSafariGesture)
    stage.removeEventListener('touchmove', onTouchMove)
    stage.removeEventListener('click', onClick, true)
    stage.removeEventListener('dragstart', onDragStart)
    win.removeEventListener('blur', onBlur)
    win.removeEventListener('keydown', onControlDown, true)
    win.removeEventListener('keyup', onControlUp, true)
    win.removeEventListener('resize', onResize)
    observer?.disconnect()
    reset()
  }
  const zoomTo = (zoom: number, focal?: Point, rapid = false) => {
    const state = read()
    if (disposed || !state.open || !state.enabled) return
    if (rapid) {
      retirePull()
      dropWheelPinch()
      const bounds = activeZoom()?.getBoundingClientRect()
      if (!bounds) return
      const to = focalPose(
        state,
        zoom,
        focal ?? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
      )
      if (!to) return
      cancelFrame()
      afterDiscrete = []
      pose(state, to.zoom, to.x, to.y)
    } else animateZoomAt(state, zoom, focal)
  }
  const returnValue: GestureController = {
    dispose,
    reconcile,
    zoomTo,
    zoomIn: () => {
      const state = read()
      const target = state.zoom * state.step
      zoomTo(state.zoom < 1 && target > 1 ? 1 : target)
    },
    zoomOut: () => {
      const state = read()
      const target = state.zoom / state.step
      zoomTo(state.zoom > 1 && target < 1 ? 1 : target)
    },
    reset: (rapid = false) => {
      const state = read()
      if (disposed || !state.open || !state.enabled) return
      const to = { zoom: state.minZoom, x: 0, y: 0 }
      if (rapid) {
        retirePull()
        dropWheelPinch()
        afterDiscrete = []
        cancelFrame()
        pose(state, to.zoom, to.x, to.y)
      } else animateTo(state, to)
    },
    panBy: (dx, dy) => {
      const state = read()
      if (disposed || !state.open || !state.enabled || animationKind === 'discrete') return
      if (state.reducedMotion) {
        cancelFrame()
        pose(state, state.zoom, state.x - dx, state.y - dy)
        return
      }
      const impulse = (delta: number) =>
        delta === 0 ? 0 : -(delta * KEYBOARD_PAN_FRICTION + Math.sign(delta) * 12)
      settle(state, [], false, {
        vx: impulse(dx),
        vy: impulse(dy),
        friction: KEYBOARD_PAN_FRICTION,
      })
    },
  }
  return returnValue
}

export function attachGestures(stage: HTMLElement, options: GestureOptions) {
  const returnValue: () => void = attachGestureController(stage, options).dispose
  return returnValue
}
