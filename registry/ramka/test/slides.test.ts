// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachSlides, type SlidesFact, type SlidesState } from '../src/slides.js'
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.replaceChildren()
})
function fixture({
  index = 0,
  dir = 'ltr',
  firefox = false,
  nativeScrollend = true,
}: {
  index?: number
  dir?: 'ltr' | 'rtl'
  firefox?: boolean
  nativeScrollend?: boolean
} = {}) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const cssDescriptor = Object.getOwnPropertyDescriptor(window, 'CSS')
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison covers View Transition fallback; this fixes the native CSS capability result unavailable in HappyDOM.
  Object.defineProperty(window, 'CSS', {
    configurable: true,
    value: { ...window.CSS, supports: () => false },
  })
  cleanups.push(() => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison covers View Transition fallback; this fixes the native CSS capability result unavailable in HappyDOM.
    if (cssDescriptor) Object.defineProperty(window, 'CSS', cssDescriptor)
  })
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production View Transition comparison checks browser motion; this supplies finite platform animation readiness and cancellation clocks.
  vi.stubGlobal('onscrollend', null)
  if (!nativeScrollend) Reflect.deleteProperty(window, 'onscrollend')
  if (firefox)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production View Transition comparison checks browser motion; this supplies finite platform animation readiness and cancellation clocks.
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Gecko/20100101 Firefox/153.0')
  let nextFrame = 0
  const pending = new Map<number, FrameRequestCallback>()
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production motion comparisons check interruption and retirement; this controls external RAF delivery to reproduce late acknowledgement races.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = ++nextFrame
    pending.set(id, callback)
    return id
  })
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production motion comparisons check interruption and retirement; this controls external RAF delivery to reproduce late acknowledgement races.
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    pending.delete(id)
  })
  const frames = (count = 1) => {
    for (let i = 0; i < count; i++) {
      const current = [...pending.values()]
      pending.clear()
      for (const callback of current) callback(i * 16)
    }
  }
  let resized = () => {}
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production View Transition comparison checks browser motion; this supplies finite platform animation readiness and cancellation clocks.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback
      }
      observe() {}
      disconnect() {
        resized = () => {}
      }
    },
  )
  const viewport = document.createElement('div')
  viewport.style.scrollSnapType = 'x mandatory'
  document.body.append(viewport)
  let width = 100
  let height = 100
  const widths = Array.from({ length: 8 }, () => 100)
  const lefts = Array.from({ length: 8 }, (_, i) => (dir === 'rtl' ? -i * 100 : i * 100))
  let physical = 0
  const writes: number[] = []
  Object.defineProperties(viewport, {
    clientWidth: { get: () => width },
    clientHeight: { get: () => height },
    scrollWidth: { get: () => widths.reduce((sum, item) => sum + item, 0) },
    scrollLeft: {
      get: () => physical,
      set: (value: number) => {
        physical = value
        writes.push(value)
      },
    },
  })
  for (let i = 0; i < 8; i++) {
    const slide = document.createElement('div')
    slide.setAttribute('data-ramka-slide', '')
    Object.defineProperties(slide, {
      offsetParent: { get: () => viewport },
      offsetLeft: { get: () => lefts[i] },
      offsetWidth: { get: () => widths[i] },
    })
    viewport.append(slide)
  }
  let state: SlidesState = { open: true, index, dir, zoom: 1 }
  let scrolling = false
  const facts: SlidesFact[] = []
  const resource = attachSlides(viewport, {
    read: () => state,
    emit: (fact) => {
      facts.push(fact)
      if (fact._tag === 'Navigated') state = { ...state, index: fact.index }
      else scrolling = fact.scrolling
    },
  })
  cleanups.push(() => resource.dispose())
  frames(3)
  const event = (type: string) => viewport.dispatchEvent(new Event(type))
  const scroll = (position: number, flush = true) => {
    physical = dir === 'rtl' ? -position : position
    event('scroll')
    if (flush) frames()
    resource.reconcile()
  }
  const touch = (type: string, points: [number, number][]) => {
    const touchEvent = new Event(type, { bubbles: true })
    Object.defineProperty(touchEvent, 'touches', {
      value: points.map(([clientX, clientY]) => ({ clientX, clientY })),
    })
    viewport.dispatchEvent(touchEvent)
  }
  return {
    viewport,
    resource,
    frames,
    facts,
    writes,
    event,
    scroll,
    touch,
    state: () => state,
    locked: () => scrolling,
    set: (patch: Partial<SlidesState>) => {
      state = { ...state, ...patch }
      resource.reconcile()
    },
    resize: () => resized(),
    layout: (newWidth: number, newHeight = height) => {
      width = newWidth
      height = newHeight
      for (let i = 0; i < widths.length; i++) {
        widths[i] = width
        lefts[i] = dir === 'rtl' ? -i * width : i * width
      }
    },
    variable: () => {
      widths[2] = 200
      for (let i = 2; i < 8; i++)
        lefts[i] = dir === 'rtl' ? -(i + 1) * 100 : i * 100 + (i > 2 ? 100 : 0)
    },
  }
}
describe('native slides resource', () => {
  it.each(['ltr', 'rtl'] satisfies ('ltr' | 'rtl')[])(
    'positions initial/discrete selections and derives fractional swipes in %s',
    (dir) => {
      const f = fixture({ index: 3, dir })
      expect(f.viewport.scrollLeft).toBe(dir === 'rtl' ? -300 : 300)
      f.set({ index: 6 })
      expect(f.viewport.scrollLeft).toBe(dir === 'rtl' ? -600 : 600)
      expect(f.viewport.style.scrollSnapType).toBe('none')
      f.frames(2)
      expect(f.viewport.style.scrollSnapType).toBe('x mandatory')
      f.scroll(140)
      expect(f.state().index).toBe(1)
      f.scroll(160)
      expect(f.state().index).toBe(2)
      expect(f.viewport.scrollLeft).toBe(dir === 'rtl' ? -160 : 160)
      expect(f.facts.at(-1)).toEqual({ _tag: 'Navigated', index: 2, source: 'scroll' })
      f.scroll(9900)
      expect(f.state().index).toBe(7)
    },
  )
  it('keeps the lock through a quiet trackpad continuation and settles the final position', () => {
    const f = fixture()
    f.scroll(200)
    expect(f.locked()).toBe(true)
    vi.advanceTimersByTime(500)
    f.viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -30 }))
    expect(f.locked()).toBe(true)
    f.viewport.scrollLeft = 500
    f.event('scrollend')
    expect(f.locked()).toBe(false)
    expect(f.state().index).toBe(5)
    f.frames()
    expect(f.locked()).toBe(false)
  })
  it('does not jump back when the synchronous lock fact precedes the coalesced index fact', () => {
    const f = fixture()
    f.scroll(240, false)
    f.resource.reconcile()
    expect(f.locked()).toBe(true)
    expect(f.viewport.scrollLeft).toBe(240)
    f.frames()
    f.resource.reconcile()
    expect(f.state().index).toBe(2)
    expect(f.viewport.scrollLeft).toBe(240)
  })
  it('cancels a pending scroll frame at scrollend and emits only lock changes', () => {
    const f = fixture()
    f.scroll(200, false)
    f.scroll(210, false)
    f.event('scrollend')
    f.frames()
    expect(f.locked()).toBe(false)
    expect(f.facts.filter((fact) => fact._tag === 'ScrollingChanged')).toEqual([
      { _tag: 'ScrollingChanged', scrolling: true },
      { _tag: 'ScrollingChanged', scrolling: false },
    ])
  })
  it('does not lock on first-slide echoes or rapid programmatic scrub echoes', () => {
    const f = fixture()
    f.event('scroll')
    f.frames()
    expect(f.locked()).toBe(false)
    for (const index of [1, 2, 3, 4, 5]) {
      f.set({ index })
      f.event('scroll')
      f.frames()
      f.event('scroll')
      f.frames()
      expect(f.locked()).toBe(false)
      expect(f.viewport.scrollLeft).toBe(index * 100)
    }
    f.event('scroll')
    f.frames()
    expect(f.locked()).toBe(false)
  })
  it('reasserts a long-jump target after browser snap correction and restores snap after overlapping jumps', () => {
    const f = fixture()
    f.set({ index: 6 })
    f.set({ index: 3 })
    f.viewport.scrollLeft = 100
    f.event('scroll')
    f.frames(3)
    expect(f.viewport.scrollLeft).toBe(300)
    expect(f.viewport.style.scrollSnapType).toBe('x mandatory')
    expect(f.locked()).toBe(false)
  })
  it.each(['scroll', 'scrollend', 'observer'])(
    'keeps the selected slide when resize reaches %s first',
    (first) => {
      const f = fixture({ index: 6 })
      f.layout(50)
      if (first === 'observer') f.resize()
      else {
        f.viewport.scrollLeft = 300
        f.event(first)
      }
      f.frames(1)
      f.viewport.scrollLeft = 150
      f.event('scroll')
      f.frames(4)
      expect(f.state().index).toBe(6)
      expect(f.viewport.scrollLeft).toBe(300)
    },
  )
  it('retains a fling lock after height-only resize and no-op observer delivery', () => {
    const f = fixture()
    f.scroll(300)
    f.layout(100, 600)
    f.resize()
    f.event('scroll')
    f.frames(3)
    expect(f.locked()).toBe(true)
    expect(f.viewport.scrollLeft).toBe(300)
  })
  it('guards both resize pins through overlapping geometry generations', () => {
    const f = fixture({ index: 3 })
    f.layout(50)
    f.resize()
    f.layout(40)
    f.resize()
    expect(f.viewport.style.scrollSnapType).toBe('none')
    f.frames(4)
    expect(f.viewport.style.scrollSnapType).toBe('x mandatory')
    expect(f.viewport.scrollLeft).toBe(120)
    expect(f.state().index).toBe(3)
  })
  it('uses the 140ms fallback when the browser does not support scrollend', () => {
    const f = fixture({ nativeScrollend: false })
    expect('onscrollend' in window).toBe(false)
    f.scroll(200)
    vi.advanceTimersByTime(139)
    expect(f.locked()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(f.locked()).toBe(false)
  })
  it.each(['ltr', 'rtl'] satisfies ('ltr' | 'rtl')[])(
    'remeasures content-sized offsets with an unchanged viewport in %s',
    (dir) => {
      const f = fixture({ index: 2, dir })
      f.variable()
      f.resize()
      f.frames(4)
      expect(f.viewport.scrollLeft).toBe(dir === 'rtl' ? -250 : 250)
      f.scroll(360)
      expect(f.state().index).toBe(3)
    },
  )
  it('uses Firefox quiet-gap fallback and remeasures before idle settle', () => {
    const f = fixture({ firefox: true })
    f.scroll(600)
    vi.advanceTimersByTime(139)
    expect(f.locked()).toBe(true)
    f.layout(50)
    f.viewport.scrollLeft = 300
    vi.advanceTimersByTime(1)
    f.frames(4)
    expect(f.locked()).toBe(false)
    expect(f.state().index).toBe(6)
  })
  it.each(['ctrl', 'meta', 'gesturestart', 'gesturechange'])(
    'releases a %s-interrupted swipe only after the quiet gap',
    (kind) => {
      const f = fixture()
      f.scroll(200)
      if (kind.startsWith('gesture')) f.event(kind)
      else {
        const event = new WheelEvent('wheel')
        Object.assign(event, { ctrlKey: kind === 'ctrl', metaKey: kind === 'meta' })
        f.viewport.dispatchEvent(event)
      }
      vi.advanceTimersByTime(139)
      expect(f.locked()).toBe(true)
      f.scroll(220)
      vi.advanceTimersByTime(139)
      expect(f.locked()).toBe(true)
      vi.advanceTimersByTime(1)
      expect(f.locked()).toBe(false)
    },
  )
  it('prelocks horizontal touch before compositor scroll and releases a speculative lock at lift', () => {
    const f = fixture()
    f.touch('touchstart', [[100, 100]])
    f.touch('touchmove', [[109, 100]])
    expect(f.locked()).toBe(false)
    f.touch('touchmove', [[110, 100]])
    expect(f.locked()).toBe(true)
    f.touch('touchstart', [
      [110, 100],
      [150, 100],
    ])
    expect(f.locked()).toBe(true)
    f.touch('touchend', [[110, 100]])
    expect(f.locked()).toBe(true)
    f.touch('touchcancel', [])
    expect(f.locked()).toBe(false)
  })
  it('leaves vertical pulls, zoomed pans, and leftover pinch fingers unlocked', () => {
    const f = fixture()
    f.touch('touchstart', [[100, 100]])
    f.touch('touchmove', [[100, 140]])
    expect(f.locked()).toBe(false)
    f.touch('touchend', [])
    f.set({ zoom: 2 })
    f.touch('touchstart', [[100, 100]])
    f.touch('touchmove', [[140, 100]])
    expect(f.locked()).toBe(false)
    f.touch('touchstart', [
      [140, 100],
      [200, 100],
    ])
    f.set({ zoom: 1 })
    f.touch('touchend', [[140, 100]])
    f.touch('touchmove', [[200, 100]])
    expect(f.locked()).toBe(false)
    f.touch('touchend', [])
  })
  it('recovers a dropped scrollend after the last finger lifts and rearms through momentum', () => {
    const f = fixture()
    f.scroll(200)
    f.touch('touchstart', [[200, 200]])
    f.touch('touchmove', [[200, 260]])
    vi.advanceTimersByTime(200)
    expect(f.locked()).toBe(true)
    f.touch('touchend', [])
    vi.advanceTimersByTime(100)
    f.scroll(220)
    vi.advanceTimersByTime(100)
    expect(f.locked()).toBe(true)
    vi.advanceTimersByTime(40)
    expect(f.locked()).toBe(false)
  })
  it('holds the selected offset until the SSR shift retires without another index change', () => {
    const f = fixture()
    f.viewport.setAttribute('data-ssr-shift', '')
    f.set({ index: 3 })
    expect(f.viewport.scrollLeft).toBe(0)
    f.viewport.removeAttribute('data-ssr-shift')
    f.resource.reconcile()
    expect(f.viewport.scrollLeft).toBe(300)
    f.frames(2)
    expect(f.viewport.style.scrollSnapType).toBe('x mandatory')
  })
  it('retires pending jumps, observers, timers and listeners on dispose', () => {
    const f = fixture()
    f.set({ index: 6 })
    f.resource.dispose()
    const factCount = f.facts.length
    f.viewport.scrollLeft = 200
    f.event('scroll')
    f.event('scrollend')
    f.layout(50)
    f.resize()
    f.frames(5)
    vi.advanceTimersByTime(500)
    expect(f.facts).toHaveLength(factCount)
    expect(f.viewport.scrollLeft).toBe(200)
    expect(f.viewport.style.scrollSnapType).toBe('x mandatory')
  })
})
