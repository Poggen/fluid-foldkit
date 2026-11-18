import { createSpringDriver } from '../pie/private/spring-driver'
import { groupMarkerItems, markerSets } from './event-marker-marks'
import { leadingFloat } from '../kit/guards'
import { isMotionNode } from '../kit/renderer-dom'
import {
  MARKER_ACT_SPRING,
  MARKER_BADGE_SPRING,
  MARKER_BODY_SPRING,
  MARKER_ITEM_SPRING,
} from '../kit/motion/springs'
import type { Spring } from '../kit/motion/springs'
import type { ChartMarker } from './overlay-options'
import type { CartesianLayer } from './layers'

/** Renderer resources own delegated listeners and velocity-preserving WAAPI springs. */
export const mountEventMarkerResource: <Row>(
  element: HTMLElement,
  children: () => ReadonlyArray<CartesianLayer<Row>>,
  clock: () => number,
) => () => void = function mountEventMarkerResource<Row>(
  element: HTMLElement,
  children: () => ReadonlyArray<CartesianLayer<Row>>,
  clock: () => number,
) {
  const springDriver = createSpringDriver(clock)
  const ACT_HOVER_SCALE = 1.15
  const ACT_PRESS_SCALE = 0.95
  const ITEM_STAGGER_MS = 40
  const GROUP = '.bkm-evt-cluster'

  const play: (
    el: Element,
    spring: Spring,
    hot: boolean,
    frame: (value: number) => Keyframe,
    delay?: number,
  ) => void = (
    el: Element,
    spring: Spring,
    hot: boolean,
    frame: (value: number) => Keyframe,
    delay = 0,
  ) => {
    if (isMotionNode(el)) {
      return
    }

    springDriver.play({ delay, el, frame, rest: 0, spring, target: hot ? 1 : 0 })
  }

  const springCluster: (group: Element, hot: boolean) => void = (group: Element, hot: boolean) => {
    const body = group.querySelector('.bkm-evt-body')

    if (body !== null) {
      const lag = cssTimeMs(getComputedStyle(body).animationDelay)
      play(
        body,
        MARKER_BODY_SPRING,
        hot,
        (v) => ({
          filter: `blur(${Math.max(0, 2 * v)}px)`,
          opacity: String(1 - v),
          transform: `scale(${1 - 0.4 * v})`,
        }),
        lag,
      )
    }

    const badge = group.querySelector('.bkm-evt-badge')

    if (badge !== null) {
      play(badge, MARKER_BADGE_SPRING, hot, (v) => ({
        opacity: String(1 - v),
        transform: `scale(${1 - v})`,
      }))
    }

    const core = group.querySelector('.bkm-evt-core')

    if (core !== null) {
      play(core, MARKER_BADGE_SPRING, hot, (v) => ({
        opacity: String(0.5 * v),
        transform: `scale(${v})`,
      }))
    }

    for (const [k, item] of [...group.querySelectorAll('.bkm-evt-item')].entries()) {
      play(
        item,
        MARKER_ITEM_SPRING,
        hot,
        (v) => ({ opacity: String(v), transform: `scale(${v})` }),
        k * ITEM_STAGGER_MS,
      )
    }
  }

  const clusterOf: (node: EventTarget | null) => Element | null = (node: EventTarget | null) =>
    node instanceof Element ? node.closest(GROUP) : null

  const ACT = '.bkm-evt-act'

  const actOf: (node: EventTarget | null) => Element | null = (node: EventTarget | null) =>
    node instanceof Element ? node.closest(ACT) : null

  const REST_SHADOW: readonly [MarkerShadow, MarkerShadow] = [
    [-3, 10, 15, 0.1],
    [-4, 4, 6, 0.1],
  ]

  const HOT_SHADOW: readonly [MarkerShadow, MarkerShadow] = [
    [0, 4, 20, 0.25],
    [0, 0, 0, 0],
  ]

  const SHADOW_LAYERS: readonly [
    readonly [selector: string, layer: 0],
    readonly [selector: string, layer: 1],
  ] = [
    ['.bkm-evt-sh1', 0],
    ['.bkm-evt-sh2', 1],
  ]

  const shadowFrame: (layer: 0 | 1, rest: number, t: number) => Keyframe = (
    layer: 0 | 1,
    rest: number,
    t: number,
  ) => {
    const [s0, y0, b0, a0] = REST_SHADOW[layer]
    const [s1, y1, b1, a1] = HOT_SHADOW[layer]
    const mix: (v0: number, v1: number) => number = (v0: number, v1: number) => v0 + (v1 - v0) * t

    return {
      cy: `${mix(y0, y1)}px`,
      fillOpacity: String(Math.max(0, mix(a0, a1))),
      filter: `blur(${Math.max(0, mix(b0, b1)) / 2}px)`,
      r: `${Math.max(0, rest - s0 + mix(s0, s1))}px`,
    }
  }

  const actScale: (hover: boolean, pressed: boolean) => number = (
    hover: boolean,
    pressed: boolean,
  ) => {
    if (pressed) {
      return ACT_PRESS_SCALE
    }

    return hover ? ACT_HOVER_SCALE : 1
  }

  const springAct: (act: Element, hover: boolean, pressed: boolean) => void = (
    act: Element,
    hover: boolean,
    pressed: boolean,
  ) => {
    const scale = actScale(hover, pressed)
    springDriver.play({
      el: act,
      frame: (v) => ({ transform: `scale(${v})` }),
      rest: 1,
      spring: MARKER_ACT_SPRING,
      target: scale,
    })

    for (const [sel, layer] of SHADOW_LAYERS) {
      const sh = act.querySelector(sel)

      if (sh instanceof SVGElement) {
        const rest = Number(sh.getAttribute('r'))

        springDriver.play({
          el: sh,
          frame: (v) => shadowFrame(layer, rest, v),
          rest: 0,
          spring: MARKER_ACT_SPRING,
          target: hover ? 1 : 0,
        })
      }
    }
  }

  const ACT_INDEX = /(?:^|\s)bkm-evt-act-(?<list>\d+)-(?<group>\d+)-(?<item>\d+)(?:\s|$)/u

  const installMarkerSprings: (
    host: HTMLElement,
    getLists: () => ReadonlyArray<ReadonlyArray<Readonly<ChartMarker>>>,
  ) => () => void = (
    host: HTMLElement,
    getLists: () => ReadonlyArray<ReadonlyArray<Readonly<ChartMarker>>>,
  ) => {
    let pressed: Element | null = null

    const onOver: (event: MouseEvent) => void = (event: MouseEvent) => {
      const nextAct = actOf(event.target)
      const prevAct = actOf(event.relatedTarget)

      if (nextAct !== prevAct) {
        if (prevAct !== null) {
          springAct(prevAct, false, pressed === prevAct)
        }

        if (nextAct !== null) {
          springAct(nextAct, true, pressed === nextAct)
        }
      }

      const next = clusterOf(event.target)
      const previous = clusterOf(event.relatedTarget)

      if (next === previous) {
        return
      }

      if (previous !== null) {
        springCluster(previous, false)
      }

      if (next !== null) {
        springCluster(next, true)
      }
    }

    const onOut: (event: MouseEvent) => void = (event: MouseEvent) => {
      if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) {
        return
      }

      const act = actOf(event.target)

      if (act !== null) {
        springAct(act, false, pressed === act)
      }

      const previous = clusterOf(event.target)

      if (previous !== null) {
        springCluster(previous, false)
      }
    }

    const onDown: (event: PointerEvent) => void = (event: PointerEvent) => {
      const act = actOf(event.target)

      if (act === null || event.button !== 0) {
        return
      }

      pressed = act
      springAct(act, true, true)
    }

    const onUp: () => void = () => {
      const act = pressed
      pressed = null

      if (act !== null) {
        springAct(act, act.matches(':hover'), false)
      }
    }

    const onClick: (event: MouseEvent) => void = (event: MouseEvent) => {
      const act = actOf(event.target)
      const match = ACT_INDEX.exec(act?.getAttribute('class') ?? '')

      if (match === null) {
        return
      }

      const marker = groupMarkerItems(getLists()[Number(match.groups?.list)] ?? [])[
        Number(match.groups?.group)
      ]?.at(Number(match.groups?.item))

      if (marker === undefined) {
        return
      }

      event.stopPropagation()
      runAction(marker)
    }

    host.addEventListener('mouseover', onOver)
    host.addEventListener('mouseout', onOut)
    host.addEventListener('pointerdown', onDown)
    host.addEventListener('click', onClick)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onUp, true)

    return () => {
      host.removeEventListener('mouseover', onOver)
      host.removeEventListener('mouseout', onOut)
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('click', onClick)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
    }
  }

  const release = installMarkerSprings(element, () =>
    markerSets(children()).map((set) => set.items),
  )

  return (() => {
    release()
    springDriver.destroy()
  }) satisfies () => void
}

type MarkerShadow = readonly [spread: number, offsetY: number, blurRadius: number, alpha: number]

const cssTimeMs: (value: string) => number = (value: string) => {
  const first = value.split(',')[0]?.trim() ?? ''
  const n = leadingFloat(first)

  if (!Number.isFinite(n)) {
    return 0
  }

  return first.endsWith('ms') ? n : n * 1000
}

const runAction: (marker: Readonly<ChartMarker>) => void = (marker: Readonly<ChartMarker>) => {
  if (marker.onClick !== undefined) {
    marker.onClick()

    return
  }

  if (marker.href === undefined || marker.href === '') {
    return
  }

  if (marker.target === '_blank') {
    window.open(marker.href, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = marker.href
  }
}
