/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
import { VIEW_TRANSITION_NAME } from './vt-constants.js'
import { isFirefox } from './is-firefox.js'
import { LightboxDocumentDataAttributes } from './lightbox-data-attributes.js'
import { compensatedMorphRadiusAt, parseMorphRadiusList } from './vt-morph-radius.js'
import { morphTiming, VIEW_TRANSITION_PRESETS } from './vt-timing.js'
import { LightboxDocumentCssVars } from './lightbox-css-vars.js'
import type { MorphStyles } from './styles.js'

interface UpgradeableTransition {
  ready?: Promise<void>
  finished: Promise<void>
}

type MorphAnimationEffect = AnimationEffect &
  Partial<Pick<KeyframeEffect, 'pseudoElement' | 'getKeyframes' | 'setKeyframes'>>
type MorphAnimation = Animation & Partial<Pick<CSSAnimation, 'animationName'>>
type SampledKeyframe = Keyframe & { offset: number }

interface MorphRadii {
  from: string | null
  to: string | null
}

interface CompositedCssState {
  owners: number
  activeOwner: symbol | null
}

const documentCompositedSheets = new WeakMap<Document, CompositedCssState>()
const CSS_KEYFRAMES = {
  group: 'ramka-vt-cm-group',
  radius: 'ramka-vt-cm-radius',
  old: 'ramka-vt-cm-old',
  new: 'ramka-vt-cm-new',
} as const

export function createCompositedMorph(document: Document, styles: MorphStyles) {
  const window = document.defaultView
  const getComputedStyle = (element: Element, pseudo?: string) => {
    if (!window) throw new Error('A browsing context is required for morphing')
    return window.getComputedStyle(element, pseudo)
  }
  let disposed = false
  let generation = 0
  let releaseActive = () => {}
  const owner = Symbol()
  const cssPath: CompositedCssState = documentCompositedSheets.get(document) ?? {
    owners: 0,
    activeOwner: null,
  }
  cssPath.owners += 1
  documentCompositedSheets.set(document, cssPath)

  const COMPOSITED_ATTR = 'data-ramka-vt-composited'

  const COMPOSITED_CSS_ATTR = 'data-ramka-vt-composited-css'

  function warmCompositedStyles() {
    if (!disposed && isWebKit()) ensureCompositedCssStaticRules()
  }

  function prewarmCompositedCssSheet() {
    if (disposed) return
    cssPath.activeOwner = owner
    warmCompositedStyles()
  }

  const SNAPSHOT_ANCHOR = 'inset: 0 auto auto 0 !important;'

  const GROUP_PSEUDO = `::view-transition-group(${VIEW_TRANSITION_NAME})`
  const OLD_PSEUDO = `::view-transition-old(${VIEW_TRANSITION_NAME})`
  const NEW_PSEUDO = `::view-transition-new(${VIEW_TRANSITION_NAME})`

  function isCompositedMorphEnabled() {
    return (
      !!window && !('__RAMKA_VT_COMPOSITED__' in window && window.__RAMKA_VT_COMPOSITED__ === false)
    )
  }

  function isWebKit() {
    return !!window && 'GestureEvent' in window
  }

  function cssKeyframes(frames: SampledKeyframe[], width?: number, height?: number) {
    return frames.map((frame, index) => ({
      ...frame,
      offset: Number((frame.offset * 100).toFixed(3)) / 100,
      ...(width !== undefined &&
      height !== undefined &&
      (index === 0 || index === frames.length - 1)
        ? { width: `${fmt(width)}px`, height: `${fmt(height)}px` }
        : {}),
    }))
  }

  function ensureStyleInjected() {
    styles.ensureLibrarySheet(
      'data-ramka-vt-composited-style',
      () => `
:root[${COMPOSITED_ATTR}]${GROUP_PSEUDO} {
  animation: none !important;
  transform-origin: 0 0 !important;
}
:root[${COMPOSITED_ATTR}]:not([${LightboxDocumentDataAttributes.crossfade}])${OLD_PSEUDO},
:root[${COMPOSITED_ATTR}]:not([${LightboxDocumentDataAttributes.crossfade}])${NEW_PSEUDO} {
  width: auto !important;
  height: auto !important;
  ${SNAPSHOT_ANCHOR}
  transform-origin: 0 0 !important;
  animation: none !important;
}
`,
    )
  }

  function ensureCompositedCssStaticRules() {
    const timing = `
  animation-duration: var(${LightboxDocumentCssVars.vtDuration}, ${VIEW_TRANSITION_PRESETS.default.duration}ms) !important;
  animation-timing-function: linear !important;
  animation-delay: 0s !important;
  animation-fill-mode: both !important;`
    styles.ensureLibrarySheet(
      'data-ramka-vt-composited-css-static',
      () => `
:root[${COMPOSITED_CSS_ATTR}]${GROUP_PSEUDO} {
  transform-origin: 0 0 !important;
  animation-name: ${CSS_KEYFRAMES.group}, ${CSS_KEYFRAMES.radius} !important;
  ${timing}
}
:root[${COMPOSITED_CSS_ATTR}]:not([${LightboxDocumentDataAttributes.crossfade}])${OLD_PSEUDO},
:root[${COMPOSITED_CSS_ATTR}]:not([${LightboxDocumentDataAttributes.crossfade}])${NEW_PSEUDO} {
  ${SNAPSHOT_ANCHOR}
  transform-origin: 0 0 !important;
  ${timing}
}
:root[${COMPOSITED_CSS_ATTR}]:not([${LightboxDocumentDataAttributes.crossfade}])${OLD_PSEUDO} {
  animation-name: ${CSS_KEYFRAMES.old} !important;
}
:root[${COMPOSITED_CSS_ATTR}]:not([${LightboxDocumentDataAttributes.crossfade}])${NEW_PSEUDO} {
  animation-name: ${CSS_KEYFRAMES.new} !important;
}
@keyframes ${CSS_KEYFRAMES.group} { from { transform: none; } to { transform: none; } }
@keyframes ${CSS_KEYFRAMES.radius} {}
@keyframes ${CSS_KEYFRAMES.old} { from { transform: none; } to { transform: none; } }
@keyframes ${CSS_KEYFRAMES.new} { from { transform: none; } to { transform: none; } }
`,
    )
  }

  interface ScaleTranslate {
    sx: number
    sy: number
    tx: number
    ty: number
  }

  const AXIS_EPS = 1e-3

  function parseScaleTranslate(value: unknown) {
    if (typeof value !== 'string') return null
    const v = value.trim()

    let m = /^matrix\(([^)]+)\)$/.exec(v)
    if (m?.[1] !== undefined) {
      const p = m[1].split(',').map((n) => Number.parseFloat(n))
      if (p.length !== 6 || p.some((n) => !Number.isFinite(n))) return null
      const [a = NaN, b = NaN, c = NaN, d = NaN, e = NaN, f = NaN] = p
      if (Math.abs(b) > AXIS_EPS || Math.abs(c) > AXIS_EPS || a <= 0 || d <= 0) return null
      return { sx: a, sy: d, tx: e, ty: f }
    }

    m = /^matrix3d\(([^)]+)\)$/.exec(v)
    if (m?.[1] !== undefined) {
      const p = m[1].split(',').map((n) => Number.parseFloat(n))
      if (p.length !== 16 || p.some((n) => !Number.isFinite(n))) return null

      const [
        sx = NaN,
        xy = NaN,
        xz = NaN,
        xw = NaN,
        yx = NaN,
        sy = NaN,
        yz = NaN,
        yw = NaN,
        zx = NaN,
        zy = NaN,
        zz = NaN,
        zw = NaN,
        tx = NaN,
        ty = NaN,
        tz = NaN,
        tw = NaN,
      ] = p
      const offAxis = [xy, xz, xw, yx, yz, yw, zx, zy, zw, tz]
      if (offAxis.some((n) => Math.abs(n) > AXIS_EPS)) return null
      if (Math.abs(zz - 1) > AXIS_EPS || Math.abs(tw - 1) > AXIS_EPS) return null
      if (sx <= 0 || sy <= 0) return null
      return { sx, sy, tx, ty }
    }

    return null
  }

  function parsePx(value: unknown) {
    if (typeof value !== 'string') return null
    const n = Number.parseFloat(value)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const ENDPOINT_CORRECTION_EPS_PX = 1.5

  function correctFragmentedEndpoint(
    endpoint: ScaleTranslate,
    w: number,
    h: number,
    el: HTMLElement,
  ) {
    if (!el.isConnected) return null
    if (Math.abs(endpoint.sx - 1) > AXIS_EPS || Math.abs(endpoint.sy - 1) > AXIS_EPS) return null

    let rect: DOMRect
    try {
      rect = el.getBoundingClientRect()
    } catch {
      return null
    }
    if (!(rect.width > 0 && rect.height > 0)) return null
    if (
      Math.abs(rect.width - w) > ENDPOINT_CORRECTION_EPS_PX ||
      Math.abs(rect.height - h) > ENDPOINT_CORRECTION_EPS_PX
    ) {
      return null
    }
    if (
      Math.abs(rect.left - endpoint.tx) <= ENDPOINT_CORRECTION_EPS_PX &&
      Math.abs(rect.top - endpoint.ty) <= ENDPOINT_CORRECTION_EPS_PX
    ) {
      return null
    }
    return { sx: 1, sy: 1, tx: rect.left, ty: rect.top }
  }

  const fmt = (n: number) => Number(n.toFixed(4))

  function maybeUpgradeToCompositedMorph(
    transition: UpgradeableTransition,
    radii?: MorphRadii,
    triggerTarget?: HTMLElement | null,
  ) {
    if (!isCompositedMorphEnabled()) return
    if (!transition.ready) return

    const token = ++generation
    transition.ready
      .then(() => {
        if (!disposed && token === generation && cssPath.activeOwner === owner)
          upgrade(transition, radii, triggerTarget ?? null)
      })
      .catch(() => {})
  }

  function upgrade(
    transition: UpgradeableTransition,
    radii: MorphRadii | undefined,
    triggerTarget: HTMLElement | null,
  ) {
    const docEl = document.documentElement

    const isCrossfade = docEl.hasAttribute(LightboxDocumentDataAttributes.crossfade)
    if (typeof document.getAnimations !== 'function') return

    const groupAnimations: MorphAnimation[] = document.getAnimations().filter((a) => {
      const effect: MorphAnimationEffect | null = a.effect
      return effect?.pseudoElement === GROUP_PSEUDO
    })
    const uaAnim = groupAnimations.find((a) =>
      (a.animationName ?? '').startsWith('-ua-view-transition-group-anim'),
    )
    if (!uaAnim || !uaAnim.effect) return

    const effect: MorphAnimationEffect = uaAnim.effect
    if (!effect.getKeyframes) return
    let uaKeyframes: Record<string, unknown>[] = []
    try {
      uaKeyframes = effect.getKeyframes()
    } catch {
      uaKeyframes = []
    }
    const fromFrame = uaKeyframes.find((kf) => (kf.computedOffset ?? kf.offset ?? 0) === 0)
    if (!fromFrame) return

    let fromT = parseScaleTranslate(fromFrame.transform)
    const w0 = parsePx(fromFrame.width)
    const h0 = parsePx(fromFrame.height)
    if (!fromT || w0 == null || h0 == null) return

    const uaTiming = effect.getComputedTiming()
    const uaDuration = typeof uaTiming.duration === 'number' ? uaTiming.duration : NaN
    if (!Number.isFinite(uaDuration) || uaDuration <= 0) return

    const { duration, ease } = morphTiming(document)

    const uaElapsedRaw = uaAnim.currentTime
    const uaElapsed =
      typeof uaElapsedRaw === 'number' && Number.isFinite(uaElapsedRaw)
        ? Math.max(0, Math.min(uaElapsedRaw, uaDuration))
        : 0

    const toFrame = uaKeyframes.find((kf) => (kf.computedOffset ?? kf.offset) === 1)
    let toT = toFrame ? parseScaleTranslate(toFrame.transform) : null
    let w1 = toFrame ? parsePx(toFrame.width) : null
    let h1 = toFrame ? parsePx(toFrame.height) : null
    if (!toT || w1 == null || h1 == null) {
      uaAnim.pause()
      uaAnim.currentTime = uaDuration
      const endStyle = getComputedStyle(docEl, GROUP_PSEUDO)
      toT = parseScaleTranslate(endStyle.transform)
      w1 = parsePx(endStyle.width)
      h1 = parsePx(endStyle.height)
      if (!toT || w1 == null || h1 == null) {
        uaAnim.currentTime = 0
        uaAnim.play()
        return
      }
    }

    if (triggerTarget && isWebKit()) {
      const phase = docEl.getAttribute(LightboxDocumentDataAttributes.viewTransition)
      if (phase === 'opening') {
        fromT = correctFragmentedEndpoint(fromT, w0, h0, triggerTarget) ?? fromT
      } else if (phase === 'closing') {
        toT = correctFragmentedEndpoint(toT, w1, h1, triggerTarget) ?? toT
      }
    }

    const originStyle = getComputedStyle(docEl, GROUP_PSEUDO)
    const [originX = NaN, originY = NaN] = originStyle.transformOrigin
      .split(' ')
      .map((p) => Number.parseFloat(p))
    const originBoxW = Number.parseFloat(originStyle.width)
    const originBoxH = Number.parseFloat(originStyle.height)
    const fx =
      Number.isFinite(originX) && Number.isFinite(originBoxW) && originBoxW > 0
        ? originX / originBoxW
        : 0.5
    const fy =
      Number.isFinite(originY) && Number.isFinite(originBoxH) && originBoxH > 0
        ? originY / originBoxH
        : 0.5

    uaAnim.cancel()

    const useCssAnimations = isWebKit()
    if (!useCssAnimations) {
      ensureStyleInjected()
      docEl.setAttribute(COMPOSITED_ATTR, '')
    }

    const rFrom = parseMorphRadiusList(radii?.from ?? '')
    const rTo = parseMorphRadiusList(radii?.to ?? '')
    const hasRadius = [...rFrom, ...rTo].some((r) => r > 0)

    const steps = Math.min(120, Math.max(24, Math.round(duration / 8)))
    const groupFrames: SampledKeyframe[] = []
    const radiusFrames: SampledKeyframe[] = []
    const oldFrames: SampledKeyframe[] = []
    const newFrames: SampledKeyframe[] = []

    const lerp = (a: number, b: number, q: number) => a + (b - a) * q

    const fromEnd = fromT
    const toEnd = toT

    const sampleAt = (q: number) => {
      const w = lerp(w0, w1, q)
      const h = lerp(h0, h1, q)
      const sxm = lerp(fromEnd.sx, toEnd.sx, q)
      const sym = lerp(fromEnd.sy, toEnd.sy, q)
      const tx = lerp(fromEnd.tx, toEnd.tx, q)
      const ty = lerp(fromEnd.ty, toEnd.ty, q)

      const renderedW = w * sxm
      const renderedH = h * sym
      const left = tx + fx * w * (1 - sxm)
      const top = ty + fy * h * (1 - sym)

      let radius: string | null = null
      if (hasRadius) {
        radius = compensatedMorphRadiusAt(rFrom, rTo, q, { w0, h0, w, h, w1, h1 })
      }

      const counter = (wi: number, hi: number) => {
        const k = Math.max(w / wi, h / hi)
        const dx = (((w - k * wi) / 2) * w1) / w
        const dy = (((h - k * hi) / 2) * h1) / h
        return `translate(${fmt(dx)}px, ${fmt(dy)}px) scale(${fmt((k * w1) / w)}, ${fmt((k * h1) / h)})`
      }

      return {
        group: `translate(${fmt(left)}px, ${fmt(top)}px) scale(${fmt(renderedW / w1)}, ${fmt(renderedH / h1)})`,
        radius,
        old: counter(w0, h0),
        new: counter(w1, h1),
      }
    }

    for (let i = 0; i <= steps; i++) {
      const offset = i / steps
      const s = sampleAt(ease(offset))
      groupFrames.push({ offset, transform: s.group })
      if (s.radius !== null) radiusFrames.push({ offset, borderRadius: s.radius })

      if (!isCrossfade) {
        oldFrames.push({ offset, transform: s.old })
        newFrames.push({ offset, transform: s.new })
      }
    }

    const options: (pseudoElement: string) => KeyframeAnimationOptions = (pseudoElement) => ({
      duration,
      easing: 'linear',
      fill: 'both',
      pseudoElement,
    })

    let created: Animation[] = []

    if (useCssAnimations) {
      ensureCompositedCssStaticRules()
      docEl.setAttribute(COMPOSITED_CSS_ATTR, '')
      const animations: MorphAnimation[] = document.getAnimations()
      const tracks = [
        { name: CSS_KEYFRAMES.group, pseudo: GROUP_PSEUDO, frames: cssKeyframes(groupFrames) },
        { name: CSS_KEYFRAMES.radius, pseudo: GROUP_PSEUDO, frames: cssKeyframes(radiusFrames) },
        ...(!isCrossfade
          ? [
              {
                name: CSS_KEYFRAMES.old,
                pseudo: OLD_PSEUDO,
                frames: cssKeyframes(oldFrames, w0, h0),
              },
              {
                name: CSS_KEYFRAMES.new,
                pseudo: NEW_PSEUDO,
                frames: cssKeyframes(newFrames, w1, h1),
              },
            ]
          : []),
      ]
      try {
        for (const track of tracks) {
          const animation = animations.find((animation) => {
            const effect: MorphAnimationEffect | null = animation.effect
            return animation.animationName === track.name && effect?.pseudoElement === track.pseudo
          })
          const effect: MorphAnimationEffect | null | undefined = animation?.effect
          if (!effect?.setKeyframes) throw new Error('Missing CSS morph animation effect')
          effect.setKeyframes(track.frames)
        }
      } catch {
        docEl.removeAttribute(COMPOSITED_CSS_ATTR)
        uaAnim.currentTime = 0
        uaAnim.play()
        return
      }
    } else {
      try {
        created.push(docEl.animate(groupFrames, options(GROUP_PSEUDO)))
        if (hasRadius) {
          created.push(docEl.animate(radiusFrames, options(GROUP_PSEUDO)))
        }
        if (!isCrossfade) {
          created.push(docEl.animate(oldFrames, options(OLD_PSEUDO)))
          created.push(docEl.animate(newFrames, options(NEW_PSEUDO)))
        }
      } catch {
        for (const a of created) a.cancel()
        docEl.removeAttribute(COMPOSITED_ATTR)
        uaAnim.currentTime = 0
        uaAnim.play()
        return
      }

      const now = document.timeline?.currentTime
      const resolvePendingSynchronously = isFirefox(document)
      for (const a of created) {
        if (resolvePendingSynchronously && typeof now === 'number') {
          a.startTime = now - uaElapsed
        } else if (uaElapsed > 0) {
          a.currentTime = uaElapsed
        }
      }
    }

    const token = generation
    const cleanup = () => {
      for (const a of created) a.cancel()

      if (token === generation && cssPath.activeOwner === owner) {
        docEl.removeAttribute(COMPOSITED_ATTR)
        docEl.removeAttribute(COMPOSITED_CSS_ATTR)
      }
    }
    releaseActive = cleanup
    void transition.finished.catch(() => {}).then(cleanup)
  }

  return {
    maybeUpgradeToCompositedMorph,
    warmCompositedStyles,
    prewarmCompositedCssSheet,
    cancel() {
      releaseActive()
      releaseActive = () => {}
      generation += 1
    },
    dispose() {
      if (disposed) return
      releaseActive()
      generation += 1
      disposed = true
      cssPath.owners -= 1
      if (cssPath.owners === 0) {
        documentCompositedSheets.delete(document)
      }
    },
  }
}
