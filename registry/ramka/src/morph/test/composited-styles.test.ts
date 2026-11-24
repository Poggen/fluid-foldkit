// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { required } from '../../../test/fixtures/required'
import { createMorphStyles } from '../styles'
import { createCompositedMorph } from '../vt-composited-morph'

const browserWindow = required(document.defaultView)
const gestureDescriptor = Object.getOwnPropertyDescriptor(browserWindow, 'GestureEvent')
const adoptedStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets')
const resources = new Set<ReturnType<typeof fixture>>()

function fixture() {
  Object.defineProperty(browserWindow, 'GestureEvent', { configurable: true, value: class {} })
  document.documentElement.style.cssText = 'width: 800px; height: 600px; transform-origin: 0px 0px'
  const styles = createMorphStyles(document)
  const compositor = createCompositedMorph(document, styles)
  const resource = {
    compositor,
    dispose() {
      compositor.dispose()
      styles.dispose()
    },
  }
  resources.add(resource)
  return resource
}

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line asyncFunction:off -- The native ready/finished promise chains must settle independently of the real CSSOM updates.
async function flushTransition() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line asyncFunction:off -- HappyDOM has no native CSSAnimation or View Transition implementation; this models their delivery while preserving the real stylesheet lifecycle.
async function start(
  resource: ReturnType<typeof fixture>,
  from: Keyframe,
  to: Keyframe,
  options: {
    crossfade?: boolean
    missingTrack?: string
    radii?: { from: string; to: string }
  } = {},
) {
  const finished = Promise.withResolvers<void>()
  const tracks: {
    animationName: string
    currentTime: number
    startTime: number | null
    effect: { pseudoElement: string; frames: Keyframe[]; setKeyframes(frames: Keyframe[]): void }
  }[] = ['group', 'radius', ...(options.crossfade ? [] : ['old', 'new'])].map<
    (typeof tracks)[number]
  >((track) => ({
    animationName: `ramka-vt-cm-${track}`,
    currentTime: 0,
    startTime: null,
    effect: {
      pseudoElement: `::view-transition-${track === 'radius' ? 'group' : track}(lightbox-morph)`,
      frames: [],
      setKeyframes(frames: Keyframe[]) {
        this.frames = frames
      },
    },
  }))
  const ua = {
    animationName: '-ua-view-transition-group-anim-lightbox-morph',
    currentTime: 0,
    cancelled: false,
    playing: true,
    cancel() {
      this.cancelled = true
      this.playing = false
    },
    play() {
      this.playing = true
    },
    effect: {
      pseudoElement: '::view-transition-group(lightbox-morph)',
      getKeyframes: () => [
        { offset: 0, ...from },
        { offset: 1, ...to },
      ],
      getComputedTiming: () => ({ duration: 360 }),
    },
  }
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () =>
      document.documentElement.hasAttribute('data-ramka-vt-composited-css')
        ? tracks.filter((track) => track.animationName !== options.missingTrack)
        : [ua],
  })
  document.documentElement.toggleAttribute('data-ramka-crossfade', !!options.crossfade)
  resource.compositor.prewarmCompositedCssSheet()
  resource.compositor.maybeUpgradeToCompositedMorph(
    { ready: Promise.resolve(), finished: finished.promise },
    options.radii,
  )
  await flushTransition()
  return { finished, tracks, ua }
}

const small = { transform: 'matrix(1, 0, 0, 1, 100, 200)', width: '200px', height: '150px' }
const large = { transform: 'matrix(1, 0, 0, 1, 0, 0)', width: '800px', height: '600px' }
const sheets = () => [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])]
const rules = () => sheets().flatMap((sheet) => Array.from(sheet.cssRules))

afterEach(() => {
  for (const resource of resources) resource.dispose()
  resources.clear()
  if (gestureDescriptor) Object.defineProperty(browserWindow, 'GestureEvent', gestureDescriptor)
  else Reflect.deleteProperty(browserWindow, 'GestureEvent')
  if (adoptedStyleSheetsDescriptor) {
    Object.defineProperty(document, 'adoptedStyleSheets', adoptedStyleSheetsDescriptor)
  } else {
    Reflect.deleteProperty(document, 'adoptedStyleSheets')
  }
  document.adoptedStyleSheets = []
  Reflect.deleteProperty(document, 'getAnimations')
  document.documentElement.removeAttribute('data-ramka-vt-composited-css')
  document.documentElement.removeAttribute('data-ramka-crossfade')
  document.documentElement.removeAttribute('style')
  document.head.replaceChildren()
})

describe('document WebKit keyframes', () => {
  it.each(['constructed', 'style element'] as const)(
    'keeps %s rules unchanged across distinct geometries and roots',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Native transition delivery is controlled while real CSSOM rules prove bounded geometry-independent stylesheet state.
    async (delivery) => {
      if (delivery === 'style element') {
        Object.defineProperty(document, 'adoptedStyleSheets', {
          configurable: true,
          value: undefined,
        })
      }
      const first = fixture()
      const second = fixture()
      first.compositor.prewarmCompositedCssSheet()
      const prewarmedSheets = sheets()
      const prewarmedRules = rules()
      expect(prewarmedRules.filter((rule) => rule instanceof CSSKeyframesRule)).toHaveLength(4)
      for (let index = 0; index < 24; index += 1) {
        const x = 100 + index * 10
        const resource = index % 2 === 0 ? first : second
        const transition = await start(
          resource,
          { ...small, transform: `matrix(1, 0, 0, 1, ${x}, 200)` },
          large,
        )
        expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(true)
        const group = required(
          transition.tracks.find((track) => track.animationName.endsWith('group')),
        )
        expect(group.effect.frames[0]).toEqual({
          offset: 0,
          transform: `translate(${x}px, 200px) scale(0.25, 0.25)`,
        })
        expect(group.effect.frames.at(-1)).toEqual({
          offset: 1,
          transform: 'translate(0px, 0px) scale(1, 1)',
        })
        expect(sheets()).toEqual(prewarmedSheets)
        expect(rules()).toEqual(prewarmedRules)
        expect(
          transition.tracks.every((track) => track.currentTime === 0 && track.startTime === null),
        ).toBe(true)
        transition.finished.resolve()
        await flushTransition()
        expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(false)
      }
      second.dispose()
      expect(rules()).toEqual(prewarmedRules)
      first.dispose()
      expect(rules()).toHaveLength(0)
    },
  )

  it(
    'retains upstream sample offsets, radius separation and captured snapshot dimensions',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Controlled native effects expose the observable motion samples without advancing their CSS-owned clocks.
    async () => {
      const transition = await start(fixture(), small, large, {
        radii: { from: '8px', to: '20px' },
      })
      const group = required(transition.tracks[0]).effect.frames
      const radius = required(transition.tracks[1]).effect.frames
      const old = required(transition.tracks[2]).effect.frames
      const fresh = required(transition.tracks[3]).effect.frames
      expect(group.length).toBeGreaterThan(24)
      expect(radius).toHaveLength(group.length)
      expect(group.every((frame) => frame.borderRadius === undefined)).toBe(true)
      expect(radius.every((frame) => frame.transform === undefined)).toBe(true)
      expect(group.map((frame) => frame.offset)).toEqual(
        group.map((_, index) => Number(((index / (group.length - 1)) * 100).toFixed(3)) / 100),
      )
      expect(old[0]).toMatchObject({ width: '200px', height: '150px' })
      expect(old.at(-1)).toMatchObject({ width: '200px', height: '150px' })
      expect(fresh[0]).toMatchObject({ width: '800px', height: '600px' })
      expect(fresh.at(-1)).toMatchObject({ width: '800px', height: '600px' })
      expect(
        old.slice(1, -1).every((frame) => frame.width === undefined && frame.height === undefined),
      ).toBe(true)
      transition.finished.resolve()
      await flushTransition()
    },
  )

  it(
    'preserves the stock snapshot dissolve for crossfade transitions',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Controlled native delivery distinguishes group replacement from untouched snapshot animations.
    async () => {
      const transition = await start(fixture(), small, large, { crossfade: true })
      expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(true)
      expect(transition.tracks).toHaveLength(2)
      expect(required(transition.tracks[0]).effect.frames.length).toBeGreaterThan(24)
      expect(required(transition.tracks[1]).effect.frames).toEqual([])
      transition.finished.resolve()
      await flushTransition()
    },
  )

  it(
    'restores the UA morph when a required CSS effect is unavailable',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Missing native animation delivery must leave a complete stock transition rather than a partially upgraded pseudo tree.
    async () => {
      const transition = await start(fixture(), small, large, { missingTrack: 'ramka-vt-cm-new' })
      expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(false)
      expect(transition.ua.cancelled).toBe(true)
      expect(transition.ua.playing).toBe(true)
      transition.finished.resolve()
      await flushTransition()
    },
  )

  it(
    'keeps a newer owner active when the previous transition settles or is disposed',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Native promises settle independently to expose interrupted cross-root lifecycle ordering.
    async () => {
      const first = fixture()
      const second = fixture()
      const old = await start(first, small, large)
      first.compositor.cancel()
      const current = await start(second, large, small)
      old.finished.resolve()
      await flushTransition()
      first.dispose()
      expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(true)
      expect(rules().length).toBeGreaterThan(0)
      current.finished.resolve()
      await flushTransition()
      expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(false)
    },
  )
})
