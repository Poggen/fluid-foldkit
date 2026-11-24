// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  attachThumbnailStrip,
  type ThumbnailStripResource,
  type ThumbnailStripState,
} from '../src/thumbnail.js'
function deferred() {
  let resolve: () => void = () => {}
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line newPromise:off -- This finite native-platform clock resolves independently from Effect so the real resource can exercise late delivery, cancellation and readiness races.
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const dispose of cleanups.splice(0)) dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.replaceChildren()
})
function fixture(dir: 'ltr' | 'rtl' = 'ltr', uniform = false) {
  const slides = document.createElement('div')
  const root = document.createElement('div')
  const track = document.createElement('div')
  track.setAttribute('data-ramka-thumbnail-strip-track', '')
  root.append(track)
  document.body.append(slides, root)
  Object.defineProperty(root, 'clientWidth', { configurable: true, value: 300 })
  Object.defineProperties(slides, {
    clientWidth: { configurable: true, value: 500 },
    scrollWidth: { configurable: true, value: uniform ? 1500 : 1900 },
  })
  for (const [index, width] of (uniform ? [500, 500, 500] : [500, 500, 900]).entries()) {
    const slide = document.createElement('div')
    slide.setAttribute('data-ramka-slide', '')
    Object.defineProperties(slide, {
      offsetParent: { configurable: true, value: slides },
      offsetWidth: { configurable: true, value: width },
      offsetLeft: {
        configurable: true,
        value: dir === 'ltr' ? index * 500 : !uniform && index === 2 ? -1400 : -index * 500,
      },
    })
    slides.append(slide)
  }
  for (const [index, width] of [40, 60, 80].entries()) {
    const thumb = document.createElement('button')
    thumb.setAttribute('data-ramka-thumbnail', '')
    thumb.setAttribute('data-index', String(index))
    Object.defineProperties(thumb, {
      offsetWidth: { configurable: true, value: width },
      offsetLeft: {
        configurable: true,
        value: (dir === 'ltr' ? [0, 60, 160] : [160, 80, -40])[index],
      },
    })
    track.append(thumb)
  }
  let state: ThumbnailStripState = {
    index: 0,
    scrolling: false,
    dir,
    reducedMotion: false,
    scrubOnSelect: false,
    selectViewTransition: true,
  }
  let resource: ThumbnailStripResource | undefined
  const commits: number[] = []
  const sources: (string | undefined)[] = []
  const read = () => state
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  const commit = async (index: number, source?: string) => {
    commits.push(index)
    sources.push(source)
    state = { ...state, index }
    slides.scrollLeft = (dir === 'rtl' ? -1 : 1) * ([0, 500, 1200][index] ?? 0)
    resource?.reconcile()
  }
  const attach = (
    wrapSelectCommit?: (commit: () => void, slides: HTMLElement | null, index: number) => void,
  ) => {
    resource = attachThumbnailStrip(slides, root, {
      read,
      commit,
      ...(wrapSelectCommit ? { wrapSelectCommit } : {}),
    })
    cleanups.push(resource.dispose)
    return resource
  }
  return {
    root,
    track,
    slides,
    commits,
    sources,
    attach,
    read,
    set: (patch: Partial<ThumbnailStripState>) => {
      state = { ...state, ...patch }
    },
  }
}
describe('thumbnail-strip resource', () => {
  it('recovers initially zero-width thumbnails through the scheduled resize observer', () => {
    const callbacks: FrameRequestCallback[] = []
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: real-iPhone gallery parity checks thumbnail positioning; this controls the browser frame clock to check resize coalescing.
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback)
      return callbacks.length
    })
    const observed = new Set<Element>()
    let resized: (() => void) | undefined
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: real-iPhone gallery parity checks image loading; HappyDOM has no layout-driven ResizeObserver delivery.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback
        }
        observe(element: Element) {
          observed.add(element)
        }
        unobserve(element: Element) {
          observed.delete(element)
        }
        disconnect() {
          observed.clear()
        }
      },
    )
    const { root, track, attach } = fixture()
    const thumb = track.firstElementChild
    if (!thumb) throw new Error('Missing thumbnail fixture')
    Object.defineProperty(thumb, 'offsetWidth', { configurable: true, value: 0 })
    attach()
    expect(observed.has(thumb)).toBe(true)
    expect(root.hasAttribute('data-positioned')).toBe(false)
    Object.defineProperty(thumb, 'offsetWidth', { configurable: true, value: 40 })
    resized?.()
    resized?.()
    expect(root.hasAttribute('data-positioned')).toBe(false)
    expect(callbacks).toHaveLength(1)
    callbacks[0]?.(0)
    expect(root.hasAttribute('data-positioned')).toBe(true)
    expect(track.style.paddingInlineStart).toBe('130px')
  })
  it.each(['keyboard', 'button', 'thumbnail'] as const)(
    'wraps a %s selection with preserved source while suppressing the Stage transition',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (source) => {
      const f = fixture()
      let pending: (() => void) | undefined
      const transition = vi.fn()
      Object.defineProperty(f.slides, 'startViewTransition', { value: transition })
      const resource = f.attach((commit) => {
        pending = commit
      })
      resource.select(2, { source, stageViewTransition: false })
      expect(f.commits).toEqual([])
      pending?.()
      await Promise.resolve()
      expect(transition).not.toHaveBeenCalled()
      expect(f.commits).toEqual([2])
      expect(f.sources).toEqual([source])
    },
  )
  it.each(['ltr', 'rtl'] satisfies ('ltr' | 'rtl')[])(
    'centers variable-width thumbnails against variable slide snap progress in %s',
    (dir) => {
      const { root, track, slides, attach } = fixture(dir)
      const resource = attach()
      slides.scrollLeft = dir === 'rtl' ? -850 : 850
      resource.reconcile()
      expect(track.style.transform).toBe(`translate3d(${dir === 'rtl' ? 125 : -125}px, 0, 0)`)
      expect(track.style.paddingInlineStart).toBe('130px')
      expect(track.style.paddingInlineEnd).toBe('110px')
      expect(root.hasAttribute('data-positioned')).toBe(true)
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('lets the wrapper defer a pointer commit and awaits the element transition callback', async () => {
    const fixtureValue = fixture()
    let wrapped: (() => void) | undefined
    let capture: (() => Promise<void>) | undefined
    Object.defineProperty(fixtureValue.slides, 'startViewTransition', {
      configurable: true,
      value: (callback: () => Promise<void>) => {
        capture = callback
        return undefined
      },
    })
    const resource = fixtureValue.attach((commit, slides, index) => {
      expect(slides).toBe(fixtureValue.slides)
      expect(index).toBe(2)
      wrapped = commit
    })
    resource.select(2)
    expect(fixtureValue.commits).toEqual([])
    wrapped?.()
    wrapped?.()
    expect(fixtureValue.commits).toEqual([])
    expect(capture).toBeTypeOf('function')
    await capture?.()
    expect(fixtureValue.commits).toEqual([2])
    expect(fixtureValue.read().index).toBe(2)
    expect(fixtureValue.track.style.transform).toBe('translate3d(-180px, 0, 0)')
  })
  it('retires deferred commits and restores authored styles when disposed', () => {
    const { root, track, commits, attach } = fixture()
    track.style.transform = 'translateX(4px)'
    track.style.paddingInlineStart = '7px'
    root.setAttribute('data-positioned', 'authored')
    let deferred: (() => void) | undefined
    const resource = attach((commit) => {
      deferred = commit
    })
    resource.select(2)
    resource.dispose()
    deferred?.()
    expect(commits).toEqual([])
    expect(track.style.transform).toBe('translateX(4px)')
    expect(track.style.paddingInlineStart).toBe('7px')
    expect(root.getAttribute('data-positioned')).toBe('authored')
    expect(root.hasAttribute('data-scrubbing')).toBe(false)
  })
})
function animationPlatform() {
  vi.useFakeTimers()
  class Timeline {
    readonly options: { source: Element; axis: string }
    constructor(options: { source: Element; axis: string }) {
      this.options = options
    }
  }
  class FrameEffect {
    readonly target: Element
    readonly frames: Keyframe[]
    readonly options: KeyframeEffectOptions
    constructor(target: Element, frames: Keyframe[], options: KeyframeEffectOptions) {
      this.target = target
      this.frames = frames
      this.options = options
    }
  }
  const animations: PlatformAnimation[] = []
  class PlatformAnimation {
    playState = 'idle'
    currentTime = 0
    readonly finished = deferred()
    readonly readiness = deferred()
    readonly ready = this.readiness.promise
    readonly effect: FrameEffect | undefined
    readonly timeline: Timeline | undefined
    constructor(effect?: FrameEffect, timeline?: Timeline) {
      this.effect = effect
      this.timeline = timeline
      animations.push(this)
    }
    play() {
      this.playState = 'running'
    }
    pause() {
      this.playState = 'paused'
    }
    cancel() {
      this.playState = 'idle'
    }
    commitStyles() {}
  }
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks thumbnail motion; HappyDOM lacks ScrollTimeline, so this controls only timeline readiness.
  vi.stubGlobal('ScrollTimeline', Timeline)
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks thumbnail motion; this supplies independent WAAPI ready and finished clocks for handoff races.
  vi.stubGlobal('KeyframeEffect', FrameEffect)
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks thumbnail motion; this supplies independent WAAPI ready and finished clocks for handoff races.
  vi.stubGlobal('Animation', class extends PlatformAnimation {})
  const scrubs: PlatformAnimation[] = []
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: (frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = new PlatformAnimation(new FrameEffect(document.body, frames, options))
      scrubs.push(animation)
      return {
        play: () => animation.play(),
        pause: () => animation.pause(),
        cancel: () => animation.cancel(),
        commitStyles: () => animation.commitStyles(),
        finished: animation.finished.promise,
        currentTime: 0,
      }
    },
  })
  cleanups.push(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate')
  })
  return { animations, scrubs }
}
describe('thumbnail animation ownership', () => {
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('lets the Model scroll lock own long touch flings and rejects thumbnail selection until rest', async () => {
    const platform = animationPlatform()
    const f = fixture()
    f.set({ scrubOnSelect: true })
    const resource = f.attach()
    f.slides.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    vi.advanceTimersByTime(300)
    f.set({ scrolling: true, index: 1 })
    f.slides.scrollLeft = 500
    resource.reconcile()
    expect(platform.scrubs).toHaveLength(0)
    expect(f.track.style.transform).toBe('translate3d(-70px, 0, 0)')
    resource.select(2)
    expect(f.commits).toEqual([])
    f.set({ scrolling: false })
    resource.select(2)
    await Promise.resolve()
    expect(f.commits).toEqual([2])
  })
  it.each(['ltr', 'rtl'] satisfies ('ltr' | 'rtl')[])(
    'keeps scrub fill until the replacement timeline is ready plus two frames in %s',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (dir) => {
      const platform = animationPlatform()
      const f = fixture(dir, true)
      f.set({ scrubOnSelect: true })
      const resource = f.attach()
      const original = platform.animations.find((animation) => animation.timeline)
      expect(original?.timeline?.options).toMatchObject({ source: f.slides, axis: 'inline' })
      resource.select(1)
      await Promise.resolve()
      expect(original?.playState).toBe('idle')
      const scrub = platform.scrubs[0]
      expect(scrub?.playState).toBe('running')
      expect(scrub?.effect?.options).toMatchObject({ duration: 450, fill: 'forwards' })
      scrub?.finished.resolve()
      await Promise.resolve()
      const replacement = platform.animations.filter((animation) => animation.timeline).at(-1)
      expect(replacement).not.toBe(original)
      vi.advanceTimersByTime(64)
      expect(scrub?.playState).toBe('running')
      replacement?.readiness.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(16)
      expect(scrub?.playState).toBe('running')
      vi.advanceTimersByTime(32)
      expect(scrub?.playState).toBe('idle')
      expect(f.root.hasAttribute('data-scrubbing')).toBe(false)
      expect(f.track.style.transform).toBe('')
    },
  )
  it('drops a timeline on zoom and restores it when zoom ends', () => {
    const platform = animationPlatform()
    const f = fixture('ltr', true)
    const dialog = document.createElement('div')
    dialog.setAttribute('data-ramka-content', '')
    document.body.append(dialog)
    dialog.append(f.slides, f.root)
    const resource = f.attach()
    const original = platform.animations[0]
    dialog.setAttribute('data-zoomed', '')
    f.slides.scrollLeft = 500
    resource.reconcile()
    expect(original?.playState).toBe('idle')
    expect(f.track.style.transform).toBe('translate3d(-70px, 0, 0)')
    dialog.removeAttribute('data-zoomed')
    resource.reconcile()
    expect(platform.animations.at(-1)?.playState).toBe('running')
  })
})
