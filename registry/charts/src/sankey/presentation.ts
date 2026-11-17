import { frame, cancelFrame } from 'motion-dom'
import { motion } from '@tanstack/charts/motion'
import type { ChartRenderer, ChartPoint, ChartScene } from '@tanstack/charts'
import type { SankeyDatum } from './marks'
import { hitFlow } from './focus'

type Point = ChartPoint<SankeyDatum, number, number>

type Scene = ChartScene<SankeyDatum, number, number>

const groupOf = (root: HTMLElement, id: string) =>
  root.querySelector<SVGGElement>(`g[data-ts-key="${CSS.escape(id)}"]`)

const isInvertible = (matrix: DOMMatrix) => {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  return Number.isFinite(determinant) && determinant !== 0
}

const toLocal = (element: SVGGraphicsElement, x: number, y: number) => {
  const screen = element.ownerSVGElement?.getScreenCTM()
  const local = element.getScreenCTM()

  // A delayed node starts at scaleY(0), which has no invertible local hit area.
  if (screen === null || screen === undefined || local === null || !isInvertible(local)) {
    return null
  }

  return new DOMPoint(x, y).matrixTransform(screen).matrixTransform(local.inverse())
}

const toScene = (
  element: SVGGraphicsElement,
  x: number,
  y: number,
  screen: DOMMatrix | null | undefined,
) => {
  const local = element.getScreenCTM()

  if (screen === null || screen === undefined || local === null || !isInvertible(screen)) {
    return null
  }

  return new DOMPoint(x, y).matrixTransform(local).matrixTransform(screen.inverse())
}

const hitText = (text: SVGTextElement, x: number, y: number) => {
  const position = toLocal(text, x, y)
  const box = text.getBBox()

  return (
    position !== null &&
    position.x >= box.x &&
    position.x <= box.x + box.width &&
    position.y >= box.y &&
    position.y <= box.y + box.height
  )
}

/** Query the SVG geometry Motion actually presents, through the native focus strategy. */
export function hitSankeyPresentation(
  root: HTMLElement,
  point: Pick<Point, 'markId' | 'datumIndex'>,
  x: number,
  y: number,
) {
  const group = groupOf(root, point.markId)

  if (group === null) {
    return null
  }

  if (point.markId.startsWith('sankey:flow')) {
    const path = group.querySelectorAll<SVGPathElement>(':scope > path').item(point.datumIndex)
    const position = path === null ? null : toLocal(path, x, y)

    if (path === null || position === null) return false

    // Source focus covers the full bump curve while its stroke entrance is still drawing.
    const start = path.getPointAtLength(0)
    const end = path.getPointAtLength(path.getTotalLength())
    return hitFlow(
      {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        width: Number(path.getAttribute('stroke-width')),
      },
      position.x,
      position.y,
    )
  }

  const rect = group.querySelector<SVGRectElement>(':scope > rect')

  if (rect === null || !Object.hasOwn(rect.dataset, 'bkmOwnedMotion')) {
    return null
  }

  const local = toLocal(rect, x, y)

  if (local !== null && rect.isPointInFill(local)) {
    return true
  }

  const suffix = /^sankey:sankey-node-(?<index>\d+)-role-(?<occurrence>\d+)$/u.exec(point.markId)

  for (const kind of ['nlabel', 'vlabel']) {
    const label = groupOf(
      root,
      `sankey:${kind}-role-${suffix?.groups?.occurrence}-node-${suffix?.groups?.index}`,
    )

    const text = label?.querySelector<SVGTextElement>(':scope > text')

    if (text !== null && text !== undefined && hitText(text, x, y)) {
      return true
    }
  }

  return false
}

/** Surface notifications keep a resting native pointer attached to the currently painted shapes. */
export function createSankeyRenderer(sync: (root: HTMLElement, scene: Scene) => void) {
  const base = motion({ initial: 'always', respectReducedMotion: true })
  const listeners = new Set<(points: ReadonlyArray<Point>) => void>()
  let root: HTMLElement | undefined
  let scene: Scene | undefined
  let svg: SVGSVGElement | undefined
  let points: ReadonlyArray<Point> = []
  let pending = false

  const publish = () => {
    pending = false

    if (scene === undefined || root === undefined) {
      return
    }

    const host = root
    const screen = svg?.getScreenCTM()

    points = scene.points.flatMap((point) => {
      const group = groupOf(host, point.markId)

      if (group === null) {
        return [point]
      }

      if (point.markId.startsWith('sankey:flow')) {
        const path = group.querySelectorAll<SVGPathElement>(':scope > path').item(point.datumIndex)

        if (path === null) {
          return []
        }

        const p = path.getPointAtLength(path.getTotalLength() / 2)
        const pose = toScene(path, p.x, p.y, screen)

        return pose === null ? [] : [{ ...point, x: pose.x, y: pose.y }]
      }

      const rect = group.querySelector<SVGRectElement>(':scope > rect')

      if (rect === null) {
        return [point]
      }

      const box = rect.getBBox()
      const pose = toScene(rect, box.x + box.width / 2, box.y + box.height / 2, screen)

      return pose === null ? [] : [{ ...point, x: pose.x, y: pose.y }]
    })

    for (const listener of listeners) {
      listener(points)
    }
  }

  const request = () => {
    if (!pending) {
      pending = true
      frame.postRender(publish)
    }
  }

  const renderer: ChartRenderer<SankeyDatum, number, number> = {
    id: 'sankey-motion',
    capabilities: base.capabilities ?? {},
    prerender: (next, options) => base.prerender(next, options),
    mount(container, requestRender) {
      root = container
      const surface = base.mount<SankeyDatum, number, number>(container, requestRender)

      return {
        renderer,
        get element() {
          return surface.element
        },
        get defaultElement() {
          return surface.defaultElement ?? surface.element
        },
        supportsStateFocus: true,
        clientToScene: (next, clientX, clientY) =>
          surface.clientToScene?.(next, clientX, clientY) ?? null,
        paintFocus(focus, pointer, cursor, options) {
          const result = surface.paintFocus(focus, pointer, cursor, options)

          // Native focus reconciles destination SVG attributes as well as focus guides.
          // Reattach the current Motion pose before returning control to interaction.
          if (scene !== undefined) {
            sync(container, scene)
          }

          return result
        },
        render(next, options) {
          surface.render(next, options)
          scene = next
          const element = surface.element
          const view = element.ownerDocument.defaultView
          svg = view !== null && element instanceof view.SVGSVGElement ? element : undefined
          sync(container, next)
          publish()
        },
        getPresentationPoints: () => points,
        subscribePresentationPoints(listener) {
          listeners.add(listener)

          return () => {
            listeners.delete(listener)
          }
        },
        destroy() {
          cancelFrame(publish)
          pending = false
          listeners.clear()
          scene = undefined
          root = undefined
          svg = undefined
          points = []
          surface.destroy()
        },
      }
    },
  }

  return { renderer, request }
}
