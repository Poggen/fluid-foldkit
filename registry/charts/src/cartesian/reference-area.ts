import type { PatternPresetOptions } from '../kit/pattern/pattern-preset-helpers'
import { DateTime, Predicate } from 'effect'
import { createMark, lineY, rect } from '@tanstack/charts'
import type { SceneNode, LineYOptions } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { ReferenceAreaProps } from './reference-area-options'
import type { ReferenceAreaConfig, Margin } from './context-types'
import type { CartesianLayer } from './layers'
import { toDate } from './series'
import { yScaleForAxis } from './build-state'
import type { YScaleId } from './build-state'
import { renderPatternPreset } from '../kit/pattern/presets'
import { scopedPatternId } from '../kit/pattern/resources'
import type { PatternResource } from '../kit/pattern/types'

export const referencePatternId = (index: number): string => `refarea-pattern-${index}`

const usesPattern = (props: ReferenceAreaProps): boolean =>
  props.pattern !== undefined && props.pattern !== 'none'

function contextBound(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value)) {
    return null
  }

  return value === 0 ? 0 : value
}

const contextAxis = (value: string | number | undefined): string =>
  Predicate.isNumber(value) && !Number.isFinite(value) ? 'left' : String(value ?? 'left')

export function referenceAreaConfigs<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
): ReadonlyArray<ReferenceAreaConfig> {
  return children.flatMap((child) => {
    if (child.kind !== 'referenceArea') {
      return []
    }

    const { props } = child

    return [
      {
        yAxisId: contextAxis(props.yAxisId),
        y1: contextBound(props.y1),
        y2: contextBound(props.y2),
        axisLabelColor: props.axisLabelColor ?? null,
      },
    ]
  })
}

function referencePatternOptions(props: ReferenceAreaProps): PatternPresetOptions {
  let options: PatternPresetOptions = {
    color: props.patternColor ?? 'var(--chart-foreground-muted)',
    scale: props.patternScale ?? 1,
  }

  const strokeWidth = props.patternStrokeWidth

  if (strokeWidth !== undefined) {
    options = { ...options, strokeWidth }
  }

  const radius = props.patternRadius

  if (radius !== undefined) {
    options = { ...options, radius }
  }

  const complement = props.patternComplement

  if (complement !== undefined) {
    options = { ...options, complement }
  }

  const fill = props.patternFill

  if (fill !== undefined) {
    options = { ...options, fill }
  }

  const dotFill = props.patternDotFill

  if (dotFill !== undefined) {
    options = { ...options, dotFill }
  }

  const tileBackground = props.patternTileBackground

  if (tileBackground !== undefined) {
    options = { ...options, tileBackground }
  }

  return options
}

export function referenceAreaResources<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  margin: Margin,
): ReadonlyArray<PatternResource> {
  return children
    .filter((child) => child.kind === 'referenceArea')
    .flatMap(({ props }, index) => {
      if (!usesPattern(props) || props.pattern === undefined) {
        return []
      }

      const pattern = renderPatternPreset(
        props.pattern,
        referencePatternId(index),
        referencePatternOptions(props),
      )

      if (pattern === undefined) {
        return []
      }

      return [
        {
          ...pattern.props,
          translate: [margin.left, margin.top] satisfies readonly [number, number],
        },
      ]
    })
}

interface ReferenceAreaContext {
  readonly index: number
  readonly uid: string
  readonly xDomain: readonly [Date, Date]
  readonly yDomain: readonly [number, number]
}

interface ReferenceMarkerGeometry {
  readonly id: string
  readonly mid: Date
  readonly size: number
  readonly fill: string
  readonly yScaleId: YScaleId
  readonly top: number
  readonly bottom: number
}

function referenceMarkers({ id, mid, size, fill, yScaleId, top, bottom }: ReferenceMarkerGeometry) {
  const triangle = (x: number, key: string, y: number, direction: 1 | -1): SceneNode => ({
    kind: 'area',
    key: `${id}:${key}`,
    points: [
      [x - size / 2, y],
      [x + size / 2, y],
      [x, y + direction * size],
    ],
    style: { fill, stroke: 'none' },
  })

  return decorative(
    createMark<ReferenceAreaProps, Date, number, 'x', YScaleId>(() => ({
      id,
      channels: {},
      render: ({ scales }) => {
        const xScale = scales.x
        const yScale = scales[yScaleId] ?? scales.y

        if (xScale === undefined || yScale === undefined) {
          return { nodes: [], points: [] }
        }

        const x = xScale.map(mid)
        const topY = yScale.map(top)
        const bottomY = yScale.map(bottom)

        if (!Number.isFinite(x) || !Number.isFinite(topY) || !Number.isFinite(bottomY)) {
          return { nodes: [], points: [] }
        }

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              ariaHidden: true,
              children: [triangle(x, 'top', topY, 1), triangle(x, 'bottom', bottomY, -1)],
            },
          ],
          points: [],
        }
      },
    })),
  )
}

export function referenceAreaMarks(
  props: ReferenceAreaProps,
  { index, uid, xDomain, yDomain }: ReferenceAreaContext,
) {
  const x1 = props.x1 === undefined ? xDomain[0] : toDate(props.x1)
  const x2 = props.x2 === undefined ? xDomain[1] : toDate(props.x2)
  const top = props.y2 ?? yDomain[1]
  const bottom = props.y1 ?? yDomain[0]
  const axis = yScaleForAxis(props.yAxisId)
  const fade = props.fadeEdges === false ? '-solid' : ''

  const dash =
    (props.strokeStyle ?? 'dashed') === 'dashed'
      ? (props.strokeDasharray ?? '4,4').replace(',', ' ')
      : undefined

  const marks = [
    decorative(
      rect([props], {
        id: `refarea${fade}:${index}:fill`,
        ...axis,
        x1: () => x1,
        x2: () => x2,
        y1: () => bottom,
        y2: () => top,
        fill: usesPattern(props)
          ? `url(#${scopedPatternId(uid, referencePatternId(index))})`
          : (props.fill ?? 'color-mix(in oklch, var(--chart-foreground-muted) 12%, transparent)'),
        fillOpacity: props.fillOpacity ?? 1,
        inset: 0,
      }),
    ),
    ...(['top', 'bottom'] satisfies ReadonlyArray<'top' | 'bottom'>).map((edge) => {
      const options = {
        id: `refarea${fade}:${index}:${edge}`,
        ...axis,
        x: (value: Date) => value,
        y: () => (edge === 'top' ? top : bottom),
        stroke: props.stroke ?? 'var(--chart-foreground-muted)',
        strokeWidth: props.strokeWidth ?? 1,
        lineCap: 'butt',
      } satisfies LineYOptions<Date>

      return decorative(
        lineY([x1, x2], dash === undefined ? options : { ...options, strokeDasharray: dash }),
      )
    }),
  ]

  if (props.showMarkers !== true) {
    return marks
  }

  return [
    ...marks,
    referenceMarkers({
      id: `refarea-marker:${index}`,
      mid: DateTime.toDateUtc(DateTime.makeUnsafe((x1.getTime() + x2.getTime()) / 2)),
      size: props.markerSize ?? 6,
      fill: props.markerColor ?? 'var(--chart-1)',
      yScaleId: axis.yScale,
      top,
      bottom,
    }),
  ]
}
