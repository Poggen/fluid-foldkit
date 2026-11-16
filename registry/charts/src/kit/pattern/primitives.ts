import { absurd } from 'effect'
import { joinClasses } from '../classes'
import { DEFAULT_CIRCLE_RADIUS, DEFAULT_HEXAGON_SIZE } from './pattern-geometry'
import type {
  PatternResource,
  PatternLayer,
  PatternShape,
  PatternStyleProps,
  PatternPathProps,
  PatternCirclesProps,
  PatternLinesProps,
  PatternHexagonsProps,
  PatternWavesProps,
  PatternOrientationType,
} from './types'

const background = (
  props: PatternStyleProps,
  width: number,
  height: number,
  className?: string,
): ReadonlyArray<PatternShape> =>
  props.background !== undefined && props.background !== ''
    ? [{ kind: 'rect', key: 'background', width, height, fill: props.background, className }]
    : []

const layer = (props: PatternResource): PatternLayer => ({ kind: 'pattern', props })

export function PatternCircles(props: PatternCirclesProps): PatternLayer {
  const circle = (key: string, cx: number, cy: number, complement: boolean): PatternShape => ({
    kind: 'circle',
    key,
    cx,
    cy,
    radius: props.radius ?? DEFAULT_CIRCLE_RADIUS,
    className: joinClasses(
      'visx-pattern-circle',
      complement && 'visx-pattern-circle-complement',
      props.className,
    ),
    fill: props.fill,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    strokeDasharray: props.strokeDasharray,
  })

  const corners: ReadonlyArray<readonly [number, number]> =
    props.complement === true
      ? [
          [0, 0],
          [0, props.height],
          [props.width, 0],
          [props.width, props.height],
        ]
      : []

  return layer({
    id: props.id,
    width: props.width,
    height: props.height,
    shapes: [
      ...background(props, props.width, props.height),
      circle('center', props.width / 2, props.height / 2, false),
      ...corners.map(([x, y]) => circle(`${props.id}-complement-${x}-${y}`, x, y, true)),
    ],
  })
}

const pathForOrientation = (height: number, orientation: PatternOrientationType): string => {
  switch (orientation) {
    case 'horizontal': {
      return `M 0,${height / 2} l ${height},0`
    }

    case 'diagonal': {
      return `M 0,${height} l ${height},${-height} M ${-height / 4},${height / 4} l ${height / 2},${-height / 2}
            M ${0.75 * height},${1.25 * height} l ${height / 2},${-height / 2}`
    }

    case 'diagonalRightToLeft': {
      return `M 0,0 l ${height},${height}
      M ${-height / 4},${0.75 * height} l ${height / 2},${height / 2}
      M ${0.75 * height},${-height / 4} l ${height / 2},${height / 2}`
    }

    case 'vertical': {
      return `M ${height / 2}, 0 l 0, ${height}`
    }

    default: {
      return absurd(orientation)
    }
  }
}

const isOrientationList = (
  value: PatternOrientationType | ReadonlyArray<PatternOrientationType>,
): value is ReadonlyArray<PatternOrientationType> => Array.isArray(value)

export function PatternLines(props: PatternLinesProps): PatternLayer {
  const input: PatternOrientationType | ReadonlyArray<PatternOrientationType> =
    props.orientation ?? ['vertical']

  const orientations = isOrientationList(input) ? input : [input]

  return layer({
    id: props.id,
    width: props.width,
    height: props.height,
    shapes: [
      ...background(props, props.width, props.height, 'visx-pattern-line-background'),
      ...orientations.map((orientation, index): PatternShape => ({
        kind: 'path',
        key: `visx-${props.id}-line-${orientation}-${index}`,
        path: pathForOrientation(props.height, orientation),
        className: joinClasses('visx-pattern-line', props.className),
        fill: undefined,
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
        strokeDasharray: props.strokeDasharray,
        strokeLinecap: props.strokeLinecap ?? 'square',
        shapeRendering: props.shapeRendering ?? 'auto',
      })),
    ],
  })
}

function pathPattern(
  props: PatternPathProps,
  width: number,
  height: number,
  path: string,
  className: string,
): PatternLayer {
  return layer({
    id: props.id,
    width,
    height,
    shapes: [
      ...background(props, width, height),
      {
        kind: 'path',
        key: 'path',
        path,
        className: joinClasses('visx-pattern-path', className, props.className),
        fill: props.fill ?? 'transparent',
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
        strokeDasharray: props.strokeDasharray,
        strokeLinecap: props.strokeLinecap ?? 'square',
        shapeRendering: props.shapeRendering ?? 'auto',
      },
    ],
  })
}

export function PatternHexagons(props: PatternHexagonsProps): PatternLayer {
  const h = props.height
  const size = props.size ?? DEFAULT_HEXAGON_SIZE
  const squareRoot = Math.sqrt(size)

  // Source tile dimensions intentionally differ from the authored path's height.
  return pathPattern(
    props,
    size,
    squareRoot,
    `M ${h},0 l ${h},0 l ${h / 2},${(h * squareRoot) / 2} l ${-h / 2},${(h * squareRoot) / 2} l ${-h},0 l ${-h / 2},${(-h * squareRoot) / 2} Z M 0,${(h * squareRoot) / 2} l ${h / 2},0 M ${3 * h},${(h * squareRoot) / 2} l ${-h / 2},0`,
    'visx-pattern-hexagon',
  )
}

export function PatternWaves(props: PatternWavesProps): PatternLayer {
  const h = props.height

  return pathPattern(
    props,
    props.width,
    h,
    `M 0 ${h / 2} c ${h / 8} ${-h / 4} , ${(h * 3) / 8} ${-h / 4} , ${h / 2} 0
             c ${h / 8} ${h / 4} , ${(h * 3) / 8} ${h / 4} , ${h / 2} 0 M ${-h / 2} ${h / 2}
             c ${h / 8} ${h / 4} , ${(h * 3) / 8} ${h / 4} , ${h / 2} 0 M ${h} ${h / 2}
             c ${h / 8} ${-h / 4} , ${(h * 3) / 8} ${-h / 4} , ${h / 2} 0`,
    'visx-pattern-wave',
  )
}
