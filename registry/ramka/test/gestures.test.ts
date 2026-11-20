// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  attachGestureController,
  type GestureState,
  type GestureOptions,
  type GestureIntent,
} from '../src/gestures.js'
import {
  bakeDiscreteZoomPath,
  bakeSettlePath,
  computePullVelocity,
  computePullTransform,
  elasticClamp,
  invertElasticClamp,
  PAN_PHYSICS_SPRING_TOUCH,
  panOffsetRange,
  pullReturnFraction,
  pinchPanOffset,
  resolvePinchZoom,
  rubberBandClamp,
  shouldDismissPull,
  scaleZoom,
} from '../src/gesture/math.js'
describe('native gesture geometry', () => {
  it('preserves the content point under a moving pinch centroid', () => {
    const offset = pinchPanOffset(30, 120, 2, 180, 3)
    const originalContentPoint = 120 / 2 - 30
    expect(180 / 3 - offset).toBeCloseTo(originalContentPoint)
  })
  it('keeps both edges reachable with an asymmetric stage inset', () => {
    const range = panOffsetRange(500, 2, 0, 800, 450)
    expect(range.overflows).toBe(true)
    expect(450 + 2 * (range.min + 250)).toBeCloseTo(800)
    expect(450 + 2 * (range.max - 250)).toBeCloseTo(0)
  })
  it('locks letterboxed axes continuously through their fit threshold', () => {
    const fit = panOffsetRange(300, 2, 0, 600, 350)
    const overflow = panOffsetRange(300, 2.000001, 0, 600, 350)
    expect(fit.min).toBe(fit.max)
    expect(fit.min).toBeCloseTo(-25)
    expect(overflow.min).toBeCloseTo(fit.min, 3)
    expect(overflow.max).toBeCloseTo(fit.max, 3)
  })
})
describe('touch intent and release', () => {
  it('does not turn a two-finger pan with span jitter into a zoom', () => {
    const result = resolvePinchZoom({
      initialZoom: 2,
      initialDistance: 200,
      currentDistance: 220,
      engaged: false,
      alignment: 0.99,
      panTravel: 80,
    })
    expect(result.zoom).toBe(2)
    expect(result.engaged).toBe(false)
  })
  it('retains a decisive pinch instead of discarding its initial spread', () => {
    const result = resolvePinchZoom({
      initialZoom: 1,
      initialDistance: 100,
      currentDistance: 150,
      engaged: false,
      alignment: -1,
      panTravel: 0,
    })
    expect(result.zoom).toBe(1.5)
    expect(result.engaged).toBe(true)
  })
  it('keeps pull travel bounded without reversing at long distances', () => {
    const at = (y: number) => computePullTransform(0, y, 100, 0.85).y
    expect(at(10)).toBeGreaterThan(9)
    expect(at(1000)).toBeGreaterThan(at(200))
    expect(at(100000)).toBeLessThanOrEqual(120)
    expect(at(-50)).toBe(-at(50))
    const diagonal = computePullTransform(100000, 50, 100, 0.85)
    expect(diagonal.x).toBeLessThanOrEqual(50)
    expect(diagonal.progress).toBe(0.5)
    expect(diagonal.scale).toBeCloseTo(0.925)
  })
  it('catches an interrupted elastic zoom on the same displayed scale', () => {
    const displayed = 4.12
    expect(elasticClamp(invertElasticClamp(displayed, 1, 4), 1, 4)).toBeCloseTo(displayed)
    expect(elasticClamp(invertElasticClamp(0.86, 1, 4), 1, 4)).toBeCloseTo(0.86)
  })
  it('resists pan past an edge with bounded, monotone travel', () => {
    const modest = rubberBandClamp(150, -100, 100, 40)
    const far = rubberBandClamp(10000, -100, 100, 40)
    expect(modest).toBeGreaterThan(100)
    expect(far).toBeGreaterThan(modest)
    expect(far).toBeLessThan(140)
  })
  it('bakes combined elastic zoom and pan release to an exact bounded rest', () => {
    const release = bakeSettlePath({
      zoom: 4.2,
      minZoom: 1,
      maxZoom: 4,
      offsetX: 140,
      offsetY: 0,
      vx: 300,
      vy: 0,
      panSpring: PAN_PHYSICS_SPRING_TOUCH,
      geometryAt: () => ({
        x: { min: -100, max: 100, overflows: true },
        y: { min: 0, max: 0, overflows: false },
      }),
      restOffsetsAt: (_zoom, x) => ({ x: Math.min(100, Math.max(-100, x)), y: 0 }),
    })
    expect(release).not.toBeNull()
    expect(release?.zoom).toBe(4)
    expect(release?.offsetX).toBeLessThanOrEqual(100)
    expect(release?.offsetX).toBeGreaterThanOrEqual(-100)
    expect(release?.offsetY).toBe(0)
    expect(release?.path[0]?.zoom).toBeGreaterThan(4)
    expect(release?.durationMs).toBeGreaterThan(0)
  })
  it('preserves the focal content point through the sampled 300ms discrete zoom', () => {
    const baked = bakeDiscreteZoomPath({
      from: { zoom: 1, offsetX: 0, offsetY: 0 },
      to: { zoom: 3, offsetX: -80, offsetY: 0 },
      durationMs: 300,
    })
    expect(baked?.durationMs).toBe(300)
    expect(baked?.path[15]?.zoom).toBeCloseTo(2)
    for (const point of baked?.path ?? []) expect(120 / point.zoom - point.offsetX).toBeCloseTo(120)
  })
  it('carries zoom velocity when a discrete zoom is retargeted', () => {
    const input = {
      from: { zoom: 2, offsetX: 0, offsetY: 0 },
      to: { zoom: 4, offsetX: 0, offsetY: 0 },
      durationMs: 300,
    }
    const resting = bakeDiscreteZoomPath(input)
    const carried = bakeDiscreteZoomPath({ ...input, vZoom: 5 })
    expect(carried?.path[0]?.zoom).toBeGreaterThan(resting?.path[0]?.zoom ?? Infinity)
  })
  it('carries pull release velocity into follow-through before returning exactly home', () => {
    expect(pullReturnFraction(0, 2.5)).toBe(0)
    expect(pullReturnFraction(0.02, 2.5)).toBeLessThan(0)
    expect(pullReturnFraction(1, 2.5)).toBe(1)
    for (const progress of [0.1, 0.2, 0.4, 0.8])
      expect(pullReturnFraction(progress, 2.5)).toBeLessThanOrEqual(1)
  })
  it('dismisses by distance or matching release velocity, preserving a reversed flick', () => {
    const velocity = computePullVelocity([
      { y: 0, t: 0 },
      { y: 50, t: 50 },
    ])
    expect(shouldDismissPull(50, velocity, 100, 400)).toBe(true)
    expect(shouldDismissPull(50, -velocity, 100, 400)).toBe(false)
    expect(shouldDismissPull(110, 0, 100, 400)).toBe(true)
  })
})
function deferred() {
  let resolve: () => void = () => {}
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line newPromise:off -- This finite native-platform clock resolves independently from Effect so the real resource can exercise late delivery, cancellation and readiness races.
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
const resourceCleanups: (() => void)[] = []
afterEach(() => {
  for (const dispose of resourceCleanups.splice(0)) dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.replaceChildren()
})
// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line globalDate:off -- The external performance.now fixture follows Vitest fake Date time; an independent Effect Clock would desynchronize the native gesture scheduler.
const testClockTime = () => Date.now()
function gestureFixture(
  initial: Partial<GestureState> = {},
  config: Partial<GestureOptions> = {},
  deferredDelivery = false,
) {
  vi.useFakeTimers()
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check release trajectories; this synchronizes the external high-resolution clock with finite frame delivery.
  vi.spyOn(window.performance, 'now').mockImplementation(testClockTime)
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production motion comparisons check interruption and retirement; this controls external RAF delivery to reproduce late acknowledgement races.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
    window.setTimeout(() => callback(window.performance.now()), 16),
  )
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production motion comparisons check interruption and retirement; this controls external RAF delivery to reproduce late acknowledgement races.
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id))
  const stage = document.createElement('div')
  const item = document.createElement('div')
  const surface = document.createElement('div')
  const media = document.createElement('img')
  const transformHost = document.createElement('div')
  transformHost.setAttribute('data-lightbox-transform', '')
  item.setAttribute('data-ramka-item', '')
  item.setAttribute('data-active', '')
  surface.setAttribute('data-ramka-zoom', '')
  transformHost.append(media)
  surface.append(transformHost)
  item.append(surface)
  stage.append(item)
  document.body.append(stage)
  let state: GestureState = {
    open: true,
    index: 0,
    zoom: 1,
    x: 0,
    y: 0,
    minZoom: 1,
    maxZoom: 4,
    step: 2,
    enabled: true,
    scrolling: false,
    pull: true,
    reducedMotion: false,
    ...initial,
  }
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check pinch and pan bounds; HappyDOM has no layout, so this supplies measured host rectangles.
  vi.spyOn(stage, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 500, 500))
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check pinch and pan bounds; HappyDOM has no layout, so this supplies measured host rectangles.
  vi.spyOn(surface, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 500, 500))
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check pinch and pan bounds; HappyDOM has no layout, so this supplies measured host rectangles.
  vi.spyOn(media, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, 0, 500 * state.zoom, 500 * state.zoom),
  )
  const captures = new Set<number>()
  Object.assign(stage, {
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  })
  const intents: GestureIntent[] = []
  const controller = attachGestureController(stage, {
    ...config,
    read: () => state,
    emit: (intent) => {
      intents.push(intent)
      if (!deferredDelivery && intent._tag === 'PoseRequested')
        state = {
          ...state,
          zoom: intent.zoom,
          x: intent.x,
          y: intent.y,
          ...(intent.sample === undefined ? {} : { poseSample: intent.sample }),
        }
    },
  })
  resourceCleanups.push(controller.dispose)
  const wheel = (deltaY: number, extra: WheelEventInit = {}) => {
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY,
      clientX: 250,
      clientY: 250,
      ...extra,
    })
    Object.assign(event, {
      ctrlKey: extra.ctrlKey ?? false,
      clientX: extra.clientX ?? 250,
      clientY: extra.clientY ?? 250,
    })
    media.dispatchEvent(event)
    return event
  }
  const pointer = (
    type: string,
    id: number,
    x: number,
    y: number,
    pointerType = 'touch',
    isPrimary = false,
  ) => {
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: id,
      pointerType,
      isPrimary,
      button: 0,
      clientX: x,
      clientY: y,
    })
    Object.defineProperty(event, 'timeStamp', { value: performance.now() })
    media.dispatchEvent(event)
  }
  const gesture = (type: string, scale = 1, x = 250, y = 250) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, { scale, clientX: x, clientY: y })
    media.dispatchEvent(event)
  }
  return {
    stage,
    media,
    transformHost,
    flush: () => {
      for (const intent of intents)
        if (intent._tag === 'PoseRequested')
          state = {
            ...state,
            zoom: intent.zoom,
            x: intent.x,
            y: intent.y,
            ...(intent.sample === undefined ? {} : { poseSample: intent.sample }),
          }
    },
    controller,
    intents,
    wheel,
    pointer,
    gesture,
    read: () => state,
    set: (patch: Partial<GestureState>) => {
      state = { ...state, ...patch }
    },
  }
}
describe('native gesture delivery', () => {
  it('publishes dragging on contact, retains it through pinch handoff, and clears on final release', () => {
    const f = gestureFixture({ zoom: 2 })
    f.pointer('pointerdown', 1, 200, 250)
    expect(f.intents).toContainEqual({ _tag: 'DraggingChanged', dragging: true })
    f.pointer('pointerdown', 2, 300, 250)
    f.pointer('pointerup', 1, 200, 250)
    expect(f.intents).not.toContainEqual({ _tag: 'DraggingChanged', dragging: false })
    f.pointer('pointerup', 2, 300, 250)
    expect(f.intents).toContainEqual({ _tag: 'DraggingChanged', dragging: false })
  })
  it('retires a wheel pull before a discrete zoom takes pose ownership', () => {
    const f = gestureFixture()
    f.wheel(-20)
    f.controller.zoomTo(3)
    vi.advanceTimersByTime(400)
    expect(f.read().zoom).toBe(3)
    expect(f.intents.filter((intent) => intent._tag === 'PullChanged').at(-1)).toMatchObject({
      offset: 0,
    })
  })
  it('pans above one-to-one scale even when that scale equals the configured minimum', () => {
    const f = gestureFixture({ zoom: 2, minZoom: 2 })
    f.wheel(40, { deltaX: 20 })
    expect(f.read()).toMatchObject({ x: -10, y: -20 })
    expect(f.intents.some((intent) => intent._tag === 'PullChanged')).toBe(false)
  })
  it('allows pull below one-to-one scale even above a sub-unit configured minimum', () => {
    const f = gestureFixture({ zoom: 0.8, minZoom: 0.5 })
    f.wheel(-20)
    expect(f.intents.some((intent) => intent._tag === 'PullChanged' && intent.offset > 0)).toBe(
      true,
    )
  })
  it('captures wheel zoom over Stage chrome before a button stops bubbling', () => {
    const f = gestureFixture()
    const button = document.createElement('button')
    f.stage.append(button)
    button.addEventListener('wheel', (event) => event.stopPropagation())
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -20 })
    Object.assign(event, { ctrlKey: true, clientX: 250, clientY: 250 })
    button.dispatchEvent(event)
    expect(f.read().zoom).toBeGreaterThan(1)
    expect(event.defaultPrevented).toBe(true)
  })
  it('retires a stale captured pointer before a fresh primary touch starts', () => {
    const f = gestureFixture()
    f.pointer('pointerdown', 1, 200, 200, 'touch', true)
    f.pointer('pointerdown', 2, 210, 210, 'touch', true)
    f.pointer('pointermove', 2, 280, 320)
    expect(f.read().zoom).toBe(1)
  })
  it('publishes a zero-offset active pull at direction lock and retires it at rest', () => {
    const f = gestureFixture({ reducedMotion: true })
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 260)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PullChanged', offset: 0, active: true })
    f.pointer('pointercancel', 1, 250, 260)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PullChanged', offset: 0, active: false })
  })
  it('does not let a wheel-pinch idle timer interrupt a later discrete zoom', () => {
    const f = gestureFixture()
    f.wheel(-20, { ctrlKey: true })
    f.controller.zoomTo(3)
    vi.advanceTimersByTime(350)
    expect(f.read().zoom, JSON.stringify(f.intents)).toBe(3)
  })
  it('admits a new vertical pull immediately after the slide scroll lock ends', () => {
    const f = gestureFixture({ scrolling: true })
    f.wheel(20, { deltaX: 40 })
    f.set({ scrolling: false })
    f.wheel(-30)
    expect(f.intents.some((intent) => intent._tag === 'PullChanged' && intent.offset > 0)).toBe(
      true,
    )
  })
  it('does not interpret mobile Safari GestureEvent as a second pinch recognizer', () => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch ownership; this fixes the external device capability for the touch-only branch.
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(5)
    const f = gestureFixture()
    f.gesture('gesturestart')
    f.gesture('gesturechange', 2)
    expect(f.read().zoom).toBe(1)
  })
  it('defers Safari pinch until discrete zoom settles, then rebases without jumping', () => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch ownership; this fixes the external device capability for the touch-only branch.
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(0)
    const f = gestureFixture()
    f.controller.zoomTo(3)
    vi.advanceTimersByTime(80)
    f.gesture('gesturestart')
    f.gesture('gesturechange', 1.2)
    vi.advanceTimersByTime(240)
    expect(f.read().zoom).toBe(3)
    f.gesture('gesturechange', 1.5)
    expect(f.read().zoom).toBeCloseTo(3)
    f.gesture('gesturechange', 1.6)
    expect(f.read().zoom).toBeCloseTo(3.2)
  })
  it('accepts double taps with less than ten pixels of horizontal finger jitter', () => {
    const f = gestureFixture({ reducedMotion: true })
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 258, 250)
    f.pointer('pointerup', 1, 258, 250)
    vi.advanceTimersByTime(50)
    f.pointer('pointerdown', 2, 258, 250)
    f.pointer('pointerup', 2, 258, 250)
    expect(f.read().zoom).toBe(2)
  })
  it('keeps trackpad pan screen-space one-to-one and leaves the wheel pull stream native', () => {
    const f = gestureFixture({ zoom: 2 })
    expect(f.wheel(40, { deltaX: 20 }).defaultPrevented).toBe(true)
    expect(f.read()).toMatchObject({ x: -10, y: -20 })
    f.set({ zoom: 1, x: 0, y: 0 })
    expect(f.wheel(-40).defaultPrevented).toBe(false)
    expect(f.intents.filter((intent) => intent._tag === 'Dismissed')).toHaveLength(0)
    f.wheel(-40)
    f.wheel(-40)
    expect(f.intents.filter((intent) => intent._tag === 'Dismissed')).toHaveLength(1)
  })
  it('hard clamps physical Control-wheel but elastically returns synthesized pinch', () => {
    const f = gestureFixture({ zoom: 4 })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
    f.wheel(-100, { ctrlKey: true })
    expect(f.read().zoom).toBe(4)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }))
    f.wheel(-100, { ctrlKey: true })
    expect(f.read().zoom, JSON.stringify(f.intents)).toBeGreaterThan(4)
    vi.advanceTimersByTime(2000)
    expect(f.read().zoom).toBe(4)
  })
  it('does not apply an old animation after navigation or disposal', () => {
    const f = gestureFixture()
    f.controller.zoomTo(3)
    vi.advanceTimersByTime(100)
    f.set({ index: 1, zoom: 1, x: 0, y: 0 })
    vi.advanceTimersByTime(400)
    expect(f.read().zoom).toBe(1)
    f.controller.zoomTo(3)
    f.controller.dispose()
    vi.advanceTimersByTime(400)
    expect(f.read().zoom).toBe(1)
  })
})
function compositor(f: ReturnType<typeof gestureFixture>, target: HTMLElement = f.transformHost) {
  const animations: {
    frames: Keyframe[]
    options: KeyframeAnimationOptions
    currentTime: number
    finished: Promise<void>
    finish: () => void
    cancelled: boolean
  }[] = []
  Object.defineProperty(target, 'animate', {
    configurable: true,
    value: (frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const completion = deferred()
      const animation = {
        frames,
        options,
        currentTime: 0,
        finished: completion.promise,
        finish: () => completion.resolve(),
        cancelled: false,
        cancel() {
          this.cancelled = true
        },
      }
      animations.push(animation)
      return animation
    },
  })
  return animations
}
describe('compositor projection and Model delivery', () => {
  it('does not project a parent pull onto a nested Root morph target', () => {
    const f = gestureFixture()
    const ownItem = f.media.closest<HTMLElement>('[data-ramka-item]')
    if (!ownItem) throw new Error('Missing owning Item fixture')
    const nested = document.createElement('div')
    nested.setAttribute('data-ramka-root', '')
    const foreignTarget = document.createElement('div')
    foreignTarget.setAttribute('data-ramka-stage-morph', '')
    nested.append(foreignTarget)
    f.stage.prepend(nested)
    const ownAnimations = compositor(f, ownItem)
    const foreignAnimations = compositor(f, foreignTarget)
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 270)
    f.pointer('pointermove', 1, 250, 310)
    f.pointer('pointercancel', 1, 250, 310)
    expect(ownAnimations).toHaveLength(1)
    expect(foreignAnimations).toHaveLength(0)
  })
  it('projects programmatic zoom only on the owning Root surface', () => {
    const f = gestureFixture()
    const nested = document.createElement('div')
    nested.setAttribute('data-ramka-root', '')
    nested.innerHTML =
      '<div data-ramka-item data-active><div data-ramka-zoom><div data-lightbox-transform></div></div></div>'
    f.stage.prepend(nested)
    f.controller.zoomTo(2, undefined, true)
    expect(f.transformHost.style.transform).toBe('scale(2) translate(0px, 0px)')
    expect(nested.querySelector<HTMLElement>('[data-lightbox-transform]')?.style.transform).toBe('')
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('releases terminal fill to an acknowledged Model pose clamped by changed bounds', async () => {
    const f = gestureFixture({}, {}, true)
    const animations = compositor(f)
    f.controller.zoomTo(3)
    const animation = animations[0]
    if (animation) animation.currentTime = 150
    f.set({ maxZoom: 1.5 })
    f.controller.reconcile()
    expect(animation?.cancelled).toBe(false)
    if (animation) animation.currentTime = 300
    animation?.finish()
    await Promise.resolve()
    vi.advanceTimersByTime(32)
    expect(animation?.cancelled).toBe(false)
    f.flush()
    expect(f.read().zoom).toBe(1.5)
    f.controller.reconcile()
    expect(animation?.cancelled).toBe(true)
    expect(f.transformHost.style.transform).toBe('scale(1.5) translate(0px, 0px)')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('resets a live discrete projection when minZoom changes like the upstream session', () => {
    const f = gestureFixture()
    const animations = compositor(f)
    f.controller.zoomTo(3)
    const animation = animations[0]
    if (animation) animation.currentTime = 150
    f.set({ minZoom: 1.5 })
    vi.advanceTimersByTime(16)
    f.controller.reconcile()
    expect(animation?.cancelled).toBe(true)
    expect(f.read()).toMatchObject({ zoom: 1.5, x: 0, y: 0 })
    expect(f.transformHost.style.transform).toBe('scale(1.5) translate(0px, 0px)')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not handle pointer or wheel input owned by a nested Root', () => {
    const f = gestureFixture({ zoom: 2 })
    const nested = document.createElement('div')
    nested.setAttribute('data-ramka-root', '')
    const child = document.createElement('span')
    nested.append(child)
    f.transformHost.append(nested)
    for (const [type, x] of [
      ['pointerdown', 250],
      ['pointermove', 300],
    ] as const) {
      child.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 5,
          pointerType: 'mouse',
          button: 0,
          clientX: x,
          clientY: 250,
        }),
      )
    }
    expect(f.read().x).toBe(0)
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -20 })
    Object.assign(event, { ctrlKey: true, clientX: 250, clientY: 250 })
    child.dispatchEvent(event)
    expect(f.read().zoom).toBe(2)
    expect(event.defaultPrevented).toBe(false)
  })
  it('starts pull return from the last displayed move, ignoring different cancellation coordinates', () => {
    const f = gestureFixture()
    f.stage.setAttribute('data-ramka-morph', '')
    const animations = compositor(f, f.stage)
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 270)
    f.pointer('pointermove', 1, 260, 310)
    const displayed = computePullTransform(10, 40, 100, 0.85)
    f.pointer('pointercancel', 1, 280, 340)
    expect(animations[0]?.frames[0]?.transform).toBe(
      `translate(${displayed.x}px, ${displayed.y}px) scale(${displayed.scale})`,
    )
  })
  it('uses the five physical pull move samples without adding the release timestamp', () => {
    const f = gestureFixture()
    f.pointer('pointerdown', 1, 250, 250)
    vi.advanceTimersByTime(10)
    f.pointer('pointermove', 1, 250, 270)
    vi.advanceTimersByTime(10)
    f.pointer('pointermove', 1, 250, 310)
    vi.advanceTimersByTime(500)
    f.pointer('pointerup', 1, 250, 310)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'Dismissed' })
  })
  it('does not invent pan momentum from a pointerdown and a single move', () => {
    const f = gestureFixture({ zoom: 2 })
    const animations = compositor(f)
    f.pointer('pointerdown', 1, 250, 250, 'mouse')
    vi.advanceTimersByTime(20)
    f.pointer('pointermove', 1, 300, 250, 'mouse')
    vi.advanceTimersByTime(20)
    f.pointer('pointerup', 1, 300, 250, 'mouse')
    expect(animations).toHaveLength(0)
    expect(f.read().x).toBe(25)
  })
  it('qualifies a second tap on pointerdown even if its stationary release is delayed', () => {
    const f = gestureFixture()
    f.pointer('pointerdown', 1, 250, 250)
    vi.advanceTimersByTime(20)
    f.pointer('pointerup', 1, 250, 250)
    vi.advanceTimersByTime(80)
    f.pointer('pointerdown', 2, 250, 250)
    vi.advanceTimersByTime(400)
    f.pointer('pointerup', 2, 250, 250)
    vi.advanceTimersByTime(350)
    expect(f.read().zoom).toBe(2)
  })
  it('retires contacts older than500ms without turning a new lone contact into a pinch', () => {
    const f = gestureFixture()
    f.pointer('pointerdown', 1, 200, 200)
    vi.advanceTimersByTime(501)
    f.pointer('pointerdown', 2, 210, 210)
    f.pointer('pointermove', 2, 280, 320)
    expect(f.read().zoom).toBe(1)
  })
  it('does not cancel a discrete compositor animation while retiring a stale primary contact', () => {
    const f = gestureFixture()
    const animations = compositor(f)
    f.pointer('pointerdown', 1, 200, 200)
    f.controller.zoomTo(3)
    const animation = animations[0]
    if (animation) animation.currentTime = 150
    f.pointer('pointerdown', 2, 210, 210, 'touch', true)
    expect(animation?.cancelled).toBe(false)
  })
  it('uses raw wheel zoom deltas for line-mode input like the upstream zoom handler', () => {
    const f = gestureFixture()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
    f.wheel(-1, { ctrlKey: true, deltaMode: 1 })
    expect(f.read().zoom).toBeCloseTo(scaleZoom(1, 1, 100))
  })
  it('keeps a dismissed wheel stream latched past the idle gap until the session closes', () => {
    const f = gestureFixture()
    f.wheel(-40)
    f.wheel(-40)
    f.wheel(-40)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'Dismissed' })
    const count = f.intents.length
    vi.advanceTimersByTime(200)
    f.wheel(-20)
    expect(f.intents).toHaveLength(count)
  })
  it('measures pan bounds from untransformed layout dimensions', () => {
    const f = gestureFixture({ zoom: 2, reducedMotion: true })
    Object.defineProperties(f.media, { offsetWidth: { value: 100 }, offsetHeight: { value: 100 } })
    f.controller.panBy(100, 0)
    expect(f.read().x).toBe(0)
  })
  it('keeps the zooming gesture marker through the350ms release cover', () => {
    const f = gestureFixture({ zoom: 2 })
    f.pointer('pointerdown', 1, 250, 250)
    expect(f.intents).toContainEqual({ _tag: 'ZoomingChanged', zooming: true })
    f.pointer('pointerup', 1, 250, 250)
    vi.advanceTimersByTime(349)
    expect(f.intents).not.toContainEqual({ _tag: 'ZoomingChanged', zooming: false })
    vi.advanceTimersByTime(1)
    expect(f.intents).toContainEqual({ _tag: 'ZoomingChanged', zooming: false })
  })
  it('zooms and pans a standalone Zoom without an Item context', () => {
    const f = gestureFixture()
    const surface = f.media.closest('[data-ramka-zoom]')
    if (!surface) throw new Error('Missing Zoom fixture')
    surface.parentElement?.replaceWith(surface)
    f.controller.zoomTo(3)
    vi.advanceTimersByTime(350)
    expect(f.read().zoom).toBe(3)
    f.pointer('pointerdown', 1, 250, 250, 'mouse')
    f.pointer('pointermove', 1, 300, 250, 'mouse')
    expect(f.read().x).toBeCloseTo(50 / 3)
  })
  it('continues a pull when implicit child capture transfers to the Stage', () => {
    const f = gestureFixture()
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 270)
    expect(f.stage.hasPointerCapture(1)).toBe(true)
    f.pointer('lostpointercapture', 1, 250, 270)
    f.pointer('pointermove', 1, 250, 390)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PullChanged', active: true })
    f.pointer('pointerup', 1, 250, 390)
    expect(f.intents.at(-1)).toEqual({ _tag: 'Dismissed' })
  })

  it('cancels a pull when the Stage itself loses pointer capture', () => {
    const f = gestureFixture()
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 270)
    f.pointer('pointermove', 1, 250, 310)
    f.stage.releasePointerCapture(1)
    f.stage.dispatchEvent(
      new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1, pointerType: 'touch' }),
    )
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PullChanged', active: false })
    f.pointer('pointermove', 1, 250, 390)
    f.pointer('pointerup', 1, 250, 390)
    expect(f.intents).not.toContainEqual({ _tag: 'Dismissed' })
  })

  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('publishes zero-duration pull timing under reduced motion', async () => {
    const f = gestureFixture({ reducedMotion: true })
    f.stage.setAttribute('data-ramka-morph', '')
    const animations = compositor(f, f.stage)
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 270)
    f.pointer('pointermove', 1, 250, 310)
    f.pointer('pointercancel', 1, 250, 310)
    expect(animations[0]?.options.duration).toBe(0)
    expect(f.intents.at(-1)).toMatchObject({
      _tag: 'PullChanged',
      active: false,
      animation: { duration: 0 },
    })
    animations[0]?.finish()
    await Promise.resolve()
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PullChanged', offset: 0 })
    expect(f.intents.at(-1)).not.toHaveProperty('animation')
  })
  it('animates an offset-only reset with the upstream two-keyframe easing', () => {
    const f = gestureFixture({ zoom: 2, minZoom: 2, x: 40, y: 20 })
    const animations = compositor(f)
    f.controller.reset()
    expect(animations[0]?.frames).toHaveLength(2)
    expect(animations[0]?.frames[0]).toMatchObject({ easing: 'ease-in-out' })
    expect(animations[0]?.options.duration).toBe(300)
    if (animations[0]) animations[0].currentTime = 150
    vi.advanceTimersByTime(16)
    expect(f.read().x).toBeCloseTo(20)
    expect(f.read().y).toBeCloseTo(10)
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('projects pull snap-back on the Stage compositor and publishes matching consumer timing', async () => {
    const f = gestureFixture()
    f.stage.setAttribute('data-ramka-morph', '')
    const animations = compositor(f, f.stage)
    f.pointer('pointerdown', 1, 250, 250)
    f.pointer('pointermove', 1, 250, 270)
    f.pointer('pointermove', 1, 260, 310)
    f.pointer('pointercancel', 1, 260, 310)
    const animation = animations[0]
    expect(animation?.frames).toHaveLength(2)
    expect(animation?.frames[1]?.transform).toBe('translate(0, 0) scale(1)')
    expect(animation?.options.duration).toBe(270)
    expect(animation?.options.easing).toMatch(/^linear\(/)
    expect(f.intents.at(-1)).toMatchObject({
      _tag: 'PullChanged',
      active: false,
      animation: { duration: 270, easing: animation?.options.easing },
    })
    if (animation) animation.currentTime = 270
    animation?.finish()
    await Promise.resolve()
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PullChanged', offset: 0, active: false })
    expect(f.intents.at(-1)).not.toHaveProperty('animation')
  })
  it('publishes callback commits at discrete boundaries while visual samples remain silent', () => {
    const f = gestureFixture()
    f.controller.zoomTo(3)
    expect(f.intents.at(-1)).toMatchObject({
      _tag: 'PoseRequested',
      animationTarget: { zoom: 3 },
      notify: true,
    })
    vi.advanceTimersByTime(80)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PoseRequested', notify: false })
    vi.advanceTimersByTime(300)
    expect(f.intents.at(-1)).toMatchObject({ _tag: 'PoseRequested', zoom: 3, notify: true })
  })
  it('hands the current compositor pose to closing even when no animation frame observed it', () => {
    const f = gestureFixture()
    const animations = compositor(f)
    f.controller.zoomTo(3)
    const animation = animations[0]
    if (animation) animation.currentTime = 150
    f.set({ open: false })
    f.controller.reconcile()
    expect(animation?.cancelled).toBe(true)
    expect(f.read().zoom).toBeCloseTo(2)
    expect(f.intents.at(-1)).not.toHaveProperty('animationTarget')
  })
  it('retargets from the compositor clock after unsampled frames and carries zoom velocity', () => {
    const f = gestureFixture()
    const animations = compositor(f)
    f.controller.zoomTo(3)
    const first = animations[0]
    expect(f.intents.at(-1)).toMatchObject({ zoom: 1, animationTarget: { zoom: 3, x: 0, y: 0 } })
    expect(first?.options).toMatchObject({ duration: 300, easing: 'linear', fill: 'forwards' })
    expect(f.read().zoom).toBe(1)
    if (first) first.currentTime = 150
    f.controller.zoomTo(4)
    const retargeted = animations[1]
    expect(first?.cancelled).toBe(true)
    const firstFrame = String(retargeted?.frames[0]?.transform)
    expect(Number(firstFrame.match(/matrix\(([^,]+)/)?.[1])).toBeCloseTo(2)
    expect(retargeted?.frames.length).toBeGreaterThan(20)
    const cold = bakeDiscreteZoomPath({
      from: { zoom: 2, offsetX: 0, offsetY: 0 },
      to: { zoom: 4, offsetX: 0, offsetY: 0 },
      durationMs: 300,
    })
    const early = Number(String(retargeted?.frames[1]?.transform).match(/matrix\(([^,]+)/)?.[1])
    expect(early).toBeGreaterThan(cold?.path[0]?.zoom ?? Infinity)
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('holds the completed compositor fill until its terminal pose is accepted by the Model', async () => {
    const f = gestureFixture({}, {}, true)
    const animations = compositor(f)
    f.controller.zoomTo(3)
    const animation = animations[0]
    if (animation) animation.currentTime = 300
    animation?.finish()
    await Promise.resolve()
    expect(f.intents.at(-1)).not.toHaveProperty('animationTarget')
    vi.advanceTimersByTime(32)
    expect(animation?.cancelled).toBe(false)
    expect(f.read().zoom).toBe(1)
    f.flush()
    f.controller.reconcile()
    expect(f.read().zoom).toBe(3)
    expect(animation?.cancelled).toBe(true)
    expect(f.transformHost.style.transform).toBe('scale(3) translate(0px, 0px)')
  })
  it('settles an out-of-bounds pinch released before the Model has delivered any move sample', () => {
    const f = gestureFixture({}, {}, true)
    f.pointer('pointerdown', 1, 230, 250)
    f.pointer('pointerdown', 2, 270, 250)
    f.pointer('pointermove', 1, 130, 250)
    f.pointer('pointermove', 2, 370, 250)
    f.pointer('pointerup', 1, 130, 250)
    f.pointer('pointerup', 2, 370, 250)
    expect(f.read().zoom).toBe(1)
    expect(f.intents.some((intent) => intent._tag === 'PoseRequested' && intent.zoom > 4)).toBe(
      true,
    )
    vi.advanceTimersByTime(2000)
    f.flush()
    expect(f.read().zoom).toBe(4)
  })
})
