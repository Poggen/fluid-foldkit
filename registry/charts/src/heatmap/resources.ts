import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import {
  heatmapLevelPatternId,
  heatmapLevelPatternRenderOptions,
  isHeatmapLevelPattern,
} from './colors'
import type { HeatmapLevelStyles } from './colors'
import { patternPresetTileSize } from '../kit/pattern/pattern-preset-helpers'
import { buildHeatmapSeparatorGradientStops, getHeatmapSeparatorLineY } from './separators'
import type { HeatmapSeparatorStyle } from './context'

export const heatmapResources: (
  styles: HeatmapLevelStyles,
  id: string,
  x: number,
  y: number,
  separator?: HeatmapSeparatorStyle | null,
  innerHeight?: number,
) => ReadonlyArray<SvgResource> = function (
  styles: HeatmapLevelStyles,
  id: string,
  x: number,
  y: number,
  separator?: HeatmapSeparatorStyle | null,
  innerHeight = 0,
) {
  const nodes = styles.flatMap((style, level) => {
    if (!isHeatmapLevelPattern(style) || style.pattern === undefined) {
      return [] satisfies Array<SvgResource>
    }

    const options = heatmapLevelPatternRenderOptions(style),
      preset = style.pattern

    const tile = patternPresetTileSize(preset, options.scale),
      scale = options.scale ?? 1

    const scoped = `${id}-${heatmapLevelPatternId(level)}`
    const shapes: Array<SvgResource> = []

    if (options.tileBackground) {
      shapes.push(
        node('rect', { width: tile.width, height: tile.height, fill: options.tileBackground }),
      )
    }

    const color = options.color ?? 'var(--chart-1)'

    if (preset === 'dots' || preset === 'circles') {
      const filled = preset === 'dots' && options.dotFill !== false
      const customFill = options.fill !== undefined && options.fill !== ''

      const attributes = {
        r: options.radius ?? (preset === 'dots' ? Math.max(0.5, 1.5 * scale) : 2 * scale),
        ...(filled || customFill ? { fill: customFill ? (options.fill ?? color) : color } : {}),
        ...(filled && customFill ? {} : { stroke: color }),
        'stroke-width':
          preset === 'dots'
            ? filled && !customFill
              ? (options.strokeWidth ?? 0)
              : (options.strokeWidth ?? 1)
            : (options.strokeWidth ?? tile.strokeWidth),
      }

      shapes.push(
        node('circle', {
          class: 'visx-pattern-circle',
          cx: tile.width / 2,
          cy: tile.height / 2,
          ...attributes,
        }),
      )

      if (options.complement) {
        for (const [cx, cy] of [
          [0, 0],
          [0, tile.height],
          [tile.width, 0],
          [tile.width, tile.height],
        ]) {
          shapes.push(
            node('circle', {
              class: 'visx-pattern-circle visx-pattern-circle-complement',
              cx: cx ?? 0,
              cy: cy ?? 0,
              ...attributes,
            }),
          )
        }
      }
    } else {
      for (const orientation of preset === 'cross'
        ? ['diagonal', 'diagonalRightToLeft']
        : [preset === 'accent' ? 'diagonal' : preset]) {
        shapes.push(
          node('path', {
            class: 'visx-pattern-line',
            d: path(orientation, tile.height),
            stroke: preset === 'accent' ? '#e879f9' : color,
            'stroke-width': options.strokeWidth ?? tile.strokeWidth,
            'stroke-linecap': 'square',
            'shape-rendering': 'auto',
          }),
        )
      }
    }

    return [
      node(
        'pattern',
        {
          id: `${scoped}-base`,
          width: tile.width,
          height: tile.height,
          patternUnits: 'userSpaceOnUse',
        },
        shapes,
      ),
      node('pattern', {
        id: scoped,
        href: `#${scoped}-base`,
        'xlink:href': `#${scoped}-base`,
        patternTransform: `translate(${x} ${y})`,
      }),
    ] satisfies Array<SvgResource>
  })

  if (separator?.gradient !== undefined) {
    const span = getHeatmapSeparatorLineY({
      innerHeight,
      marginTop: y,
      ...(separator.startOffset === undefined ? {} : { startOffset: separator.startOffset }),
      ...(separator.paddingY === undefined ? {} : { paddingY: separator.paddingY }),
    })

    nodes.push(
      node(
        'linearGradient',
        {
          id: `${id}-separator`,
          gradientUnits: 'userSpaceOnUse',
          x1: 0,
          x2: 0,
          y1: y + span.y1,
          y2: y + span.y2,
        },
        buildHeatmapSeparatorGradientStops(separator.gradient, separator.strokeOpacity).map(
          (stop) =>
            node('stop', {
              offset: stop.offset,
              'stop-color': stop.color,
              'stop-opacity': stop.opacity,
            }),
        ),
      ),
    )
  }

  return nodes satisfies ReadonlyArray<SvgResource>
}

export const resourceHtml: (resource: SvgResource) => Html = function (resource: SvgResource) {
  const attributes = Object.entries(resource.attributes).map(([name, value]) =>
    h.Attribute(name, String(value)),
  )

  const children = resource.children.map(resourceHtml)

  switch (resource.tag) {
    case 'pattern':
      return h.pattern(attributes, children)
    case 'path':
      return h.path(attributes, children)
    case 'rect':
      return h.rect(attributes, children)
    case 'circle':
      return h.circle(attributes, children)
    case 'linearGradient':
      return h.linearGradient(attributes, children)
    case 'stop':
      return h.stop(attributes, children)
  }
}

export const resourceElement: (resource: SvgResource) => SVGElement = function resourceElement(
  resource: SvgResource,
) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', resource.tag)

  for (const [name, value] of Object.entries(resource.attributes)) {
    if (name === 'xlink:href') {
      element.setAttributeNS('http://www.w3.org/1999/xlink', name, String(value))
    } else {
      element.setAttribute(name, String(value))
    }
  }

  element.append(...resource.children.map(resourceElement))

  return element
}

export interface SvgResource {
  readonly tag: 'pattern' | 'path' | 'rect' | 'circle' | 'linearGradient' | 'stop'
  readonly attributes: Readonly<Record<string, string | number>>
  readonly children: ReadonlyArray<SvgResource>
}

const node: (
  tag: SvgResource['tag'],
  attributes: SvgResource['attributes'],
  children?: ReadonlyArray<SvgResource>,
) => SvgResource = (
  tag: SvgResource['tag'],
  attributes: SvgResource['attributes'],
  children: ReadonlyArray<SvgResource> = [],
) => ({ tag, attributes, children }) satisfies SvgResource

const path: (kind: string, height: number) => string = (kind: string, height: number) =>
  kind === 'horizontal'
    ? `M 0,${height / 2} l ${height},0`
    : kind === 'vertical'
      ? `M ${height / 2}, 0 l 0, ${height}`
      : kind === 'diagonalRightToLeft'
        ? `M 0,0 l ${height},${height}\n      M ${-height / 4},${0.75 * height} l ${height / 2},${height / 2}\n      M ${0.75 * height},${-height / 4} l ${height / 2},${height / 2}`
        : `M 0,${height} l ${height},${-height} M ${-height / 4},${height / 4} l ${height / 2},${-height / 2}\n            M ${0.75 * height},${1.25 * height} l ${height / 2},${-height / 2}`
