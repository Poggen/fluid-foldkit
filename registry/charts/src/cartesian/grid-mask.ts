import type { ChartBounds } from '@tanstack/charts'
import { inertHtml } from 'foldkit/html'
import type { Margin } from './context-types'
import type { GridGuideProps } from './grid-guides'

type GridDirection = 'rows' | 'columns'

export interface SourceGridMask {
  readonly id: string
  readonly className: string
  readonly direction: GridDirection
  readonly bounds: ChartBounds
}

// Encode each Unicode scalar or lone surrogate: unlike sanitizing, distinct caller IDs cannot collide.
export const sourceGridClass = (id: string, direction: GridDirection): string =>
  `bkm-grid-${Array.from(id, (unit) => unit.codePointAt(0)?.toString(16)).join('-')}-${direction}`

export function sourceGridMasks(
  id: string,
  width: number,
  height: number,
  margin: Margin,
  grid: GridGuideProps | undefined,
): ReadonlyArray<SourceGridMask> {
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: Math.max(1, width - margin.left - margin.right),
    height: Math.max(1, height - margin.top - margin.bottom),
  }

  const directions: Array<GridDirection> = []

  if (grid !== undefined && grid.horizontal !== false && grid.fadeHorizontal !== false) {
    directions.push('rows')
  }

  if (grid?.vertical === true && grid.fadeVertical === true) {
    directions.push('columns')
  }

  return directions.map((direction) => {
    const className = sourceGridClass(id, direction)

    return { id: `${className}-mask`, className, direction, bounds }
  })
}

export const sourceGridCss = (masks: ReadonlyArray<SourceGridMask>): string =>
  masks.map((mask) => `.${mask.className}{--bkm-grid-mask:url(#${mask.id})}`).join('')

// Literal f7 packages/ui/src/charts/grid.tsx:180–201. The mask covers the plot,
// including space beyond the last tick; a CSS fill-box mask clips that tick's stroke.
const stops = [
  { offset: '0%', opacity: '0' },
  { offset: '10%', opacity: '1' },
  { offset: '90%', opacity: '1' },
  { offset: '100%', opacity: '0' },
]

function maskAttributes(mask: SourceGridMask) {
  return {
    id: mask.id,
    maskUnits: 'objectBoundingBox',
    maskContentUnits: 'userSpaceOnUse',
  }
}

function gradientAttributes(mask: SourceGridMask) {
  return {
    id: `${mask.id}-gradient`,
    x1: '0%',
    y1: '0%',
    x2: mask.direction === 'rows' ? '100%' : '0%',
    y2: mask.direction === 'rows' ? '0%' : '100%',
  }
}

function rectAttributes(mask: SourceGridMask) {
  return {
    x: String(mask.bounds.x),
    y: String(mask.bounds.y),
    width: String(mask.bounds.width),
    height: String(mask.bounds.height),
    fill: `url(#${mask.id}-gradient)`,
  }
}

export function sourceGridView(masks: ReadonlyArray<SourceGridMask> | undefined) {
  const h = inertHtml

  if (masks === undefined) {
    return h.empty
  }

  const attributes = (values: Readonly<Record<string, string>>) =>
    Object.entries(values).map(([name, value]) => h.Attribute(name, value))

  return h.div(
    [h.Class('contents')],
    [
      h.style([], [sourceGridCss(masks)]),
      h.svg(
        [h.Class('absolute'), h.Width('0'), h.Height('0'), h.AriaHidden(true)],
        [
          h.defs(
            [],
            masks.flatMap((mask) => [
              h.linearGradient(
                attributes(gradientAttributes(mask)),
                stops.map((stop) =>
                  h.stop([
                    h.Offset(stop.offset),
                    h.StopColor('white'),
                    h.StopOpacity(stop.opacity),
                  ]),
                ),
              ),
              h.mask(attributes(maskAttributes(mask)), [h.rect(attributes(rectAttributes(mask)))]),
            ]),
          ),
        ],
      ),
    ],
  )
}

const setSvgAttributes = (element: SVGElement, values: Readonly<Record<string, string>>) => {
  for (const [name, value] of Object.entries(values)) {
    element.setAttribute(name, value)
  }
}

/** Definitions share the existing time-series SVG's acquisition and disposal. */
export function gridMaskResource(svg: SVGSVGElement) {
  const document = svg.ownerDocument
  const namespace = 'http://www.w3.org/2000/svg'

  const nodes = new Map<
    string,
    { readonly defs: SVGDefsElement; readonly mask: SVGMaskElement; readonly rect: SVGRectElement }
  >()

  return {
    draw: (masks?: ReadonlyArray<SourceGridMask>) => {
      const active = new Set(masks?.map((mask) => mask.id))

      for (const [id, node] of nodes) {
        if (!active.has(id)) {
          node.defs.remove()
          nodes.delete(id)
        }
      }

      for (const value of masks ?? []) {
        let node = nodes.get(value.id)

        if (node === undefined) {
          const defs = document.createElementNS(namespace, 'defs')
          const gradient = document.createElementNS(namespace, 'linearGradient')
          setSvgAttributes(gradient, gradientAttributes(value))

          for (const stop of stops) {
            const element = document.createElementNS(namespace, 'stop')
            setSvgAttributes(element, {
              offset: stop.offset,
              'stop-color': 'white',
              'stop-opacity': stop.opacity,
            })
            gradient.append(element)
          }

          const mask = document.createElementNS(namespace, 'mask')
          const rect = document.createElementNS(namespace, 'rect')
          mask.append(rect)
          defs.append(gradient, mask)
          svg.append(defs)
          node = { defs, mask, rect }
          nodes.set(value.id, node)
        }

        setSvgAttributes(node.mask, maskAttributes(value))
        setSvgAttributes(node.rect, rectAttributes(value))
      }
    },
  }
}
