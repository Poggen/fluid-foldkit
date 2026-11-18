import type {
  ChartLayerRenderer,
  ChartRenderer,
  ChartSurface,
  SceneGroup,
  SceneNode,
} from '@tanstack/charts'
import { composeLayers } from './compose-layers'

export const SVG_NS = 'http://www.w3.org/2000/svg'

/** Scene style key to SVG property, for the layers' `applyStyle`. */
export const STYLE_PROPERTIES = [
  ['fill', 'fill'],
  ['fillOpacity', 'fill-opacity'],
  ['stroke', 'stroke'],
  ['strokeOpacity', 'stroke-opacity'],
  ['strokeWidth', 'stroke-width'],
  ['opacity', 'opacity'],
  ['lineJoin', 'stroke-linejoin'],
] satisfies ReadonlyArray<
  readonly [keyof NonNullable<import('@tanstack/charts').SceneArea['style']>, string]
>

export const setOrRemove: (
  element: Element,
  name: string,
  value: string | number | undefined,
) => void = (element: Element, name: string, value: string | number | undefined) => {
  if (value === undefined) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, String(value))
  }
}

const place: (parent: Element, element: Element, cursor: ChildNode | null) => ChildNode | null = (
  parent: Element,
  element: Element,
  cursor: ChildNode | null,
) => {
  if (element === cursor) {
    return cursor.nextSibling
  }

  if (cursor === null) {
    parent.append(element)
  } else {
    cursor.before(element)
  }

  return cursor
}

export const translateOf: (group: SceneGroup) => string | undefined = (group: SceneGroup) => {
  const { translateX = 0, translateY = 0 } = group

  return translateX === 0 && translateY === 0 ? undefined : `translate(${translateX} ${translateY})`
}

/** Walks `nodes` in order under `parent`, keyed by scene path: `paint` returns each node's element (or null to skip), and it is placed and marked in `seen`. */
export const paintKeyed: (
  nodes: ReadonlyArray<SceneNode>,
  parent: SVGElement,
  path: string,
  seen: Set<string>,
  paint: (node: SceneNode, id: string, path: string) => SVGElement | null,
) => void = (
  nodes: ReadonlyArray<SceneNode>,
  parent: SVGElement,
  path: string,
  seen: Set<string>,
  paint: (node: SceneNode, id: string, path: string) => SVGElement | null,
) => {
  let cursor: ChildNode | null = parent.firstChild

  for (const node of nodes) {
    const id = `${path}/${node.key}`
    const element = paint(node, id, path)

    if (element !== null) {
      seen.add(id)
      cursor = place(parent, element, cursor)
    }
  }
}

type Surface = ChartSurface<unknown, number, number>

/** What a layer supplies per mount: its teardown and its per-scene paint (the viewBox is set before `render`). */
export type SvgLayerParts = Pick<
  Surface,
  'destroy' | 'render' | 'getPresentationPoints' | 'subscribePresentationPoints'
>

/** A chart-layer renderer whose child surface is one owned `<svg>`; `mount` builds the layer's state over it. */
export const createSvgLayer: (
  id: string,
  mount: (svg: SVGSVGElement, layer: ChartLayerRenderer<unknown, number, number>) => SvgLayerParts,
) => ChartLayerRenderer<unknown, number, number> = (
  id: string,
  mount: (svg: SVGSVGElement, layer: ChartLayerRenderer<unknown, number, number>) => SvgLayerParts,
) => {
  const compositions = new WeakMap<
    ChartRenderer<unknown, number, number>,
    ChartRenderer<unknown, number, number>
  >()
  const layer: ChartLayerRenderer<unknown, number, number> = {
    compose: (defaultRenderer) => {
      const existing = compositions.get(defaultRenderer)
      if (existing !== undefined) return existing
      const composed = composeLayers(defaultRenderer, layer)
      compositions.set(defaultRenderer, composed)
      return composed
    },
    id,
    kind: 'chart-layer-renderer',
    mount: (container) => {
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('class', 'block overflow-visible absolute inset-0 w-full h-full')
      container.replaceChildren(svg)
      const { destroy, render, getPresentationPoints, subscribePresentationPoints } = mount(
        svg,
        layer,
      )

      return {
        destroy,
        ...(getPresentationPoints === undefined ? {} : { getPresentationPoints }),
        ...(subscribePresentationPoints === undefined ? {} : { subscribePresentationPoints }),
        element: svg,
        paintFocus: () => undefined satisfies void,
        render: (scene, ...rest) => {
          svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
          render(scene, ...rest)
        },
        renderer: layer,
        supportsStateFocus: true,
      } satisfies Surface
    },
    prerender: () => '',
  }

  return layer
}
