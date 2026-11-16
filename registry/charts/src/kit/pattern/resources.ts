import { absurd } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import type { PatternResource, PatternShape } from './types'
import type { ChartStyle } from '../../cartesian/content-types'
import { chartStyleProperties } from '../../cartesian/style'

export const scopedPatternId = (prefix: string, id: string): string =>
  id.startsWith(`${prefix}-`) ? id : `${prefix}-${id}`

/** Gradient resources stay engine-owned; only the explicit pattern ids use this sibling defs host. */
export function scopePatternPaint(
  paint: string,
  prefix: string,
  resources: ReadonlyArray<PatternResource>,
): string {
  const ids = new Set(resources.map((resource) => resource.id))

  return paint.replaceAll(/url\(#(?<id>[^)]+)\)/gu, (match: string, id: string) =>
    ids.has(id) ? `url(#${scopedPatternId(prefix, id)})` : match,
  )
}

function shapeView(shape: PatternShape): Html {
  const { key } = shape

  if (shape.kind === 'rect') {
    return h.keyed('rect')(key, [
      h.Width(String(shape.width)),
      h.Height(String(shape.height)),
      h.Fill(shape.fill),
      ...(shape.className === undefined ? [] : [h.Class(shape.className)]),
    ])
  }

  const paint = [
    ...(shape.className === undefined ? [] : [h.Class(shape.className)]),
    ...(shape.fill === undefined ? [] : [h.Fill(shape.fill)]),
    ...(shape.stroke === undefined ? [] : [h.Stroke(shape.stroke)]),
    ...(shape.strokeWidth === undefined ? [] : [h.StrokeWidth(String(shape.strokeWidth))]),
    ...(shape.strokeDasharray === undefined
      ? []
      : [h.StrokeDasharray(String(shape.strokeDasharray))]),
  ]

  switch (shape.kind) {
    case 'circle': {
      return h.keyed('circle')(key, [
        ...paint,
        h.Cx(String(shape.cx)),
        h.Cy(String(shape.cy)),
        h.R(String(shape.radius)),
      ])
    }

    case 'path': {
      return h.keyed('path')(key, [
        ...paint,
        h.D(shape.path),
        h.StrokeLinecap(shape.strokeLinecap),
        h.ShapeRendering(String(shape.shapeRendering)),
      ])
    }

    default: {
      return absurd(shape)
    }
  }
}

export function patternResourceEntries(
  resources: ReadonlyArray<PatternResource>,
): ReadonlyArray<readonly [string, PatternResource]> {
  const occurrences = new Map<string, number>()

  return resources.map((resource) => {
    const occurrence = occurrences.get(resource.id) ?? 0
    occurrences.set(resource.id, occurrence + 1)

    return [JSON.stringify([resource.id, occurrence]), resource]
  })
}

/** The existing Foldkit renderer owns patching/removal, including SSR; no parallel DOM renderer or Layer is introduced. */
export function patternResourceView(
  prefix: string,
  resources: ReadonlyArray<PatternResource>,
  definitions: ReadonlyArray<Html> = [],
  paintStyle: ChartStyle = {},
): Html {
  if (resources.length === 0 && definitions.length === 0) {
    return h.empty
  }

  const inheritedPaint = Object.fromEntries(
    Object.entries(chartStyleProperties(paintStyle)).filter(
      ([name]) => name.startsWith('--') || name === 'color' || name === 'color-interpolation',
    ),
  )

  return h.svg(
    [
      h.Class('[height:0] overflow-hidden absolute [width:0]'),
      h.Attribute('aria-hidden', 'true'),
      h.Attribute('focusable', 'false'),
      h.Width('0'),
      h.Height('0'),
      h.Id(`${prefix}-resources`),
      h.Style({ ...inheritedPaint }),
    ],
    [
      h.defs(
        [],
        [
          ...definitions,
          ...patternResourceEntries(resources).map(([key, resource]) =>
            h.keyed('pattern')(
              key,
              [
                h.Id(scopedPatternId(prefix, resource.id)),
                h.Width(String(resource.width)),
                h.Height(String(resource.height)),
                h.PatternUnits('userSpaceOnUse'),
                ...(resource.translate === undefined
                  ? []
                  : [
                      h.Attribute(
                        'patternTransform',
                        `translate(${resource.translate[0]} ${resource.translate[1]})`,
                      ),
                    ]),
              ],
              resource.shapes.map(shapeView),
            ),
          ),
        ],
      ),
    ],
  )
}
