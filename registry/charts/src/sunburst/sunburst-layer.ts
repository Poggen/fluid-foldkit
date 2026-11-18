import { applyStyle, paintLabel } from './paint'
import { renderChartSvg } from '@tanstack/charts/svg'
/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */

import type { ChartLayerRenderer, SceneNode } from '@tanstack/charts'
import { createSvgLayer, paintKeyed, setOrRemove, SVG_NS, translateOf } from './private/svg-layer'
import { prefersReducedMotion } from './private/reduced-motion'
import { createSectorPresentation } from './presentation'
import { createIntroProgress } from './intro-progress'
import type { EnterTransition } from '../kit/motion/phase'
import { ZOOM_EASING, ZOOM_MS } from './easing'
import { labelFits, lerpArc, poseOf, sameArc, sectorPath, unwrapArc, hoverArc } from './geometry'
import type { ArcValues } from './geometry'

/** Class the mark puts on the group that carries one label (its display follows the fit rule, so a label that does not fit is absent from layout like bklit's unrendered one). */
export const LABEL_BOX_CLASS = 'bk-sb-lbox'

/** The mark's `render` rewrites this feed (target geometry by node key, to tween) before the same scene reaches the layer's `render`,
 * so the layer reads it in place: keep that mark-then-layer order. */
export interface SectorFeed {
  /** `delayMs` is the intro delay of an area; labels and boxes carry none. */
  readonly geometry: Map<
    string,
    { readonly arc: ArcValues; readonly delayMs: number; readonly arcId?: string | undefined }
  >
  /** The view's root id: a change is a zoom (tweened), the same id with other geometry is a resize or data change (snaps). */
  view: string
  readonly growth: Map<string, number>
  paintHover: (() => void) | null
  sweepMs: number
  enterTransition: EnterTransition | undefined
  labelsDelayMs: number
  readonly presented: Map<
    string,
    { readonly arc: ArcValues; readonly visual: ArcValues; readonly progress: number }
  >
  /** The chart's nominal size: bklit draws in a size-unit viewBox, so strokes and text scale by width over this. */
  readonly size: number
  /** Runs after each paint: the hover push vars live on the layer's own elements (push.ts). */
  onPainted: (() => void) | null
}

export const createSectorFeed: (size: number) => SectorFeed = (size: number) => ({
  geometry: new Map(),
  presented: new Map(),
  enterTransition: undefined,
  labelsDelayMs: 0,
  growth: new Map(),
  paintHover: null,
  onPainted: null,
  size,
  sweepMs: 1100,
  view: '',
})

interface Track {
  readonly from: ArcValues
  to: ArcValues
  readonly start: number
  readonly duration: number
  readonly ease: (t: number) => number
}

interface NodeState {
  key: string
  readonly element: SVGElement
  readonly apply: (arc: ArcValues) => void
  readonly isArea: boolean

  cur: ArcValues | null

  target: ArcValues | null
  track: Track | null
  intro: ReturnType<typeof createIntroProgress> | null
}

export const createSectorLayer: (
  feed: SectorFeed,
  _renderStart: { readonly current: number | null },
  now: () => number,
) => ChartLayerRenderer<unknown, number, number> = (
  feed: SectorFeed,
  _renderStart: { readonly current: number | null },
  now: () => number,
) => {
  const layer = createSvgLayer('bkm-sunburst-sectors', (svg) => {
    const presentation = createSectorPresentation(feed)
    const states = new Map<string, NodeState>()
    const elements = new Map<string, SVGElement>()
    const seen = new Set<string>()
    let reduced = false
    let first = true
    let view: string | null = null
    let labelIntro: ReturnType<typeof createIntroProgress> | null = null
    let frame = 0
    let scale = 1

    const arcNow: (state: NodeState, now: number) => ArcValues = (
      state: NodeState,
      now: number,
    ) => {
      const { track } = state

      if (track === null || state.cur === null) {
        return state.cur ?? track?.to ?? [0, 0, 0, 0]
      }

      const progress = Math.min(1, Math.max(0, (now - track.start) / track.duration))

      return progress >= 1 ? track.to : lerpArc(track.from, track.to, track.ease(progress))
    }

    const paintState: (state: NodeState, arc: ArcValues) => void = (
      state: NodeState,
      arc: ArcValues,
    ) => {
      const entry = feed.geometry.get(state.key)
      const visual = hoverArc(arc, entry?.arcId, feed.growth)
      const progress = state.intro?.progress ?? 1
      if (state.isArea) {
        state.element.classList.add('[animation:none]')
        state.element.classList.add('[transform-box:fill-box]')
        state.element.classList.add('[transform-origin:50%_50%]')
        state.element.style.scale = String(progress)
        state.apply([
          visual[0],
          visual[0] + (visual[1] - visual[0]) * progress,
          visual[2],
          visual[3],
        ])
        if (entry?.arcId !== undefined) feed.presented.set(entry.arcId, { arc, visual, progress })
      } else {
        state.apply(visual)
        if (state.element.localName === 'text') {
          state.element.classList.add('[animation:none]')
          state.element.style.opacity = String(labelIntro?.progress ?? 1)
          state.element.style.visibility =
            state.element.closest('[data-bk-hov]') !== null &&
            !state.element.hasAttribute('data-bk-r')
              ? 'hidden'
              : ''
        }
      }
      presentation.request()
    }

    feed.paintHover = () => {
      const current = now()
      for (const state of states.values()) paintState(state, arcNow(state, current))
    }

    const tick: (now: number) => void = (now: number) => {
      let running = false

      for (const state of states.values()) {
        const { track } = state

        if (track !== null) {
          paintState(state, arcNow(state, now))
          if (now - track.start >= track.duration) {
            state.cur = track.to
            state.track = null
          } else {
            running = true
          }
        }
      }

      frame = running ? requestAnimationFrame(tick) : 0
    }

    const wake: () => void = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(tick)
      }
    }

    const sync: (state: NodeState, id: string, introPending: boolean, current: number) => void = (
      state: NodeState,
      id: string,
      introPending: boolean,
      current: number,
    ) => {
      const geometry = feed.geometry.get(id)

      if (geometry === undefined) {
        return
      }

      const { arc } = geometry

      if (state.cur === null || state.target === null) {
        state.cur = arc
        state.target = arc
        state.track = null
        if (introPending && state.isArea)
          state.intro = createIntroProgress(feed.enterTransition, geometry.delayMs, () =>
            paintState(state, arcNow(state, now())),
          )
        paintState(state, state.cur)

        return
      }

      if (sameArc(arc, state.target)) {
        return
      }

      state.target = arc

      if (view !== null && feed.view !== view && !reduced) {
        const from = arcNow(state, current)
        state.cur = from
        state.track = {
          duration: ZOOM_MS,
          ease: ZOOM_EASING,
          from,
          start: current,
          to: unwrapArc(arc, from),
        }
      } else if (state.track === null) {
        state.cur = arc
        paintState(state, arc)
      } else {
        state.track.to = arc
      }
    }

    const create: (node: SceneNode) => NodeState | null = (node: SceneNode) => {
      if (node.kind === 'area') {
        const path = document.createElementNS(SVG_NS, 'path')

        return {
          apply: (arc) => {
            path.setAttribute(
              'd',
              arc[3] - arc[2] < 0.5 || arc[1] - arc[0] < 0.001 ? '' : sectorPath(arc),
            )
          },
          key: node.key,
          cur: null,
          element: path,
          isArea: true,
          target: null,
          track: null,
          intro: null,
        }
      }

      if (node.kind === 'label') {
        const text = document.createElementNS(SVG_NS, 'text')

        return {
          apply: (arc) => {
            const { x, y, rotate } = poseOf(arc)
            text.setAttribute('transform', `translate(${x} ${y}) rotate(${rotate})`)
          },
          key: node.key,
          cur: null,
          element: text,
          isArea: false,
          target: null,
          track: null,
          intro: null,
        }
      }

      if (node.kind === 'group' && node.className?.includes(LABEL_BOX_CLASS) === true) {
        const box = document.createElementNS(SVG_NS, 'g')

        return {
          apply: (arc) => {
            box.style.display = labelFits(arc, scale) ? '' : 'none'
          },
          key: node.key,
          cur: null,
          element: box,
          isArea: false,
          target: null,
          track: null,
          intro: null,
        }
      }

      return null
    }

    const elementOf: (
      node: SceneNode,
      id: string,
    ) => { readonly element: SVGElement; readonly state: NodeState | null } | null = (
      node: SceneNode,
      id: string,
    ) => {
      const existing = elements.get(id)

      if (existing !== undefined) {
        return { element: existing, state: states.get(id) ?? null }
      }

      const state = create(node)
      const element = state?.element ?? document.createElementNS(SVG_NS, 'g')
      elements.set(id, element)

      if (state !== null) {
        states.set(id, state)
      }

      return { element, state }
    }

    const paintNode: (
      node: SceneNode,
      id: string,
      introPending: boolean,
      now: number,
    ) => SVGElement | null = (node: SceneNode, id: string, introPending: boolean, now: number) => {
      if (node.kind !== 'area' && node.kind !== 'label' && node.kind !== 'group') {
        return null
      }

      const { element, state } = elementOf(node, id) ?? {}

      if (element === undefined) {
        return null
      }

      if (node.kind === 'label') {
        if (labelIntro === null && !reduced)
          labelIntro = createIntroProgress(feed.enterTransition, feed.labelsDelayMs, () => {
            for (const current of states.values())
              if (current.element.localName === 'text')
                current.element.style.opacity = String(labelIntro?.progress ?? 1)
          })
        paintLabel(element, node, scale)
      } else {
        if (node.kind === 'area') {
          applyStyle(element, node.style, scale)
        }

        setOrRemove(element, 'class', node.className)
        setOrRemove(element, 'aria-hidden', node.ariaHidden === true ? 'true' : undefined)

        if (node.kind === 'group') {
          if (state === null) {
            setOrRemove(element, 'transform', translateOf(node))
          }

          // eslint-disable-next-line no-use-before-define -- mutual recursion with paintNodes
          paintNodes(node.children, element, id, introPending, now)
        }
      }

      if (state !== null && state !== undefined) {
        sync(state, node.key, introPending, now)
      }

      return element
    }

    const paintNodes: (
      nodes: ReadonlyArray<SceneNode>,
      parent: SVGElement,
      path: string,
      introPending: boolean,
      now: number,
    ) => void = (
      nodes: ReadonlyArray<SceneNode>,
      parent: SVGElement,
      path: string,
      introPending: boolean,
      now: number,
    ) => {
      paintKeyed(nodes, parent, path, seen, (node, id) => paintNode(node, id, introPending, now))
    }

    return {
      destroy: () => {
        presentation.destroy()
        cancelAnimationFrame(frame)
        frame = 0
        for (const state of states.values()) state.intro?.destroy()
        labelIntro?.destroy()
        feed.presented.clear()
        feed.paintHover = null
      },
      getPresentationPoints: () => presentation.getPresentationPoints(),
      subscribePresentationPoints: (
        ...args: Parameters<typeof presentation.subscribePresentationPoints>
      ) => presentation.subscribePresentationPoints(...args),
      render: (scene) => {
        const current = now()
        scale = scene.width / feed.size
        reduced = prefersReducedMotion()
        const introPending = first && !reduced

        paintNodes(scene.nodes, svg, '', introPending, current)
        ;({ view } = feed)
        first = false

        for (const [id, element] of elements) {
          if (!seen.has(id)) {
            states.get(id)?.intro?.destroy()
            element.remove()
            elements.delete(id)
            states.delete(id)
          }
        }

        if (![...states.values()].some((state) => state.element.localName === 'text')) {
          labelIntro?.destroy()
          labelIntro = null
        }
        seen.clear()
        feed.onPainted?.()
        presentation.setScene(
          scene,
          new Set(
            [...states.values()].flatMap((state) => {
              const id = feed.geometry.get(state.key)?.arcId
              return state.isArea && id !== undefined ? [id] : []
            }),
          ),
        )
        wake()
      },
    }
  })

  layer.prerender = (scene, options) => {
    const scale = scene.width / feed.size

    const paint: (node: SceneNode) => Array<SceneNode> = (node: SceneNode) => {
      const entry = feed.geometry.get(node.key)

      if (node.kind === 'group') {
        if (
          entry !== undefined &&
          node.className?.includes(LABEL_BOX_CLASS) &&
          !labelFits(entry.arc, scale)
        )
          return []

        return [{ ...node, children: node.children.flatMap(paint) }]
      }

      if (entry === undefined) return [node]

      if (node.kind === 'area')
        return [
          {
            ...node,
            path: sectorPath(entry.arc),
            ...(node.style === undefined
              ? {}
              : {
                  style: {
                    ...node.style,
                    ...(node.style.strokeWidth === undefined
                      ? {}
                      : { strokeWidth: node.style.strokeWidth * scale }),
                  },
                }),
          },
        ]

      if (node.kind === 'label') {
        const pose = poseOf(entry.arc)

        return [
          {
            ...node,
            x: pose.x,
            y: pose.y,
            rotate: pose.rotate,
            ...(node.fontSize === undefined ? {} : { fontSize: node.fontSize * scale }),
            ...(node.style === undefined
              ? {}
              : {
                  style: {
                    ...node.style,
                    ...(node.style.strokeWidth === undefined
                      ? {}
                      : { strokeWidth: node.style.strokeWidth * scale }),
                  },
                }),
          },
        ]
      }

      return [node]
    }

    return renderChartSvg({ ...scene, nodes: scene.nodes.flatMap(paint) }, options)
  }

  return layer
}
