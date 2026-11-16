// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import { Match, SchemaGetter } from 'effect'
import { rect, ruleX } from '@tanstack/charts'
import type { ChartGradient } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { CartesianLayer } from './layers'
import type { SegmentBackgroundProps, SegmentLineProps } from './segment-options'

// Retain Source's Date TimeClip, including invalid results, instead of DateTime's throwing boundary.
const segmentDate = Match.value(SchemaGetter.Date<number>()).pipe(
  Match.tag('Transform', (getter) => getter.transform),
  Match.orElse(() => {
    throw new Error('Effect Date conversion requires a synchronous Transform')
  }),
)

export interface SegmentProps {
  readonly background: Readonly<SegmentBackgroundProps> | undefined
  readonly lines: readonly [
    Readonly<SegmentLineProps> | undefined,
    Readonly<SegmentLineProps> | undefined,
  ]
}

/** Source reads only the first carrier for each role, independent of child order between roles. */
export function readSegmentProps<Row>(children: ReadonlyArray<CartesianLayer<Row>>): SegmentProps {
  return {
    background: children.find((child) => child.kind === 'segmentBackground')?.props,
    lines: [
      children.find((child) => child.kind === 'segmentLineFrom')?.props,
      children.find((child) => child.kind === 'segmentLineTo')?.props,
    ],
  }
}

export const hasSegments = (props: SegmentProps): boolean =>
  Boolean(props.background) || props.lines.some(Boolean)

interface SegmentDomain {
  readonly explicit: boolean
  readonly count: number
  readonly first: number
  readonly last: number
}

/** Native domain population stays compiler-owned; this is Source's finite/equal-bound admission. */
export function resolveSegmentProps<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  domain: SegmentDomain,
): SegmentProps | null {
  const props = readSegmentProps(children)

  const present =
    domain.explicit ||
    (domain.count > 0 && (domain.first === domain.last || Number.isFinite(domain.first)))

  return present && hasSegments(props) ? props : null
}

interface SegmentContext {
  readonly uid: string
  readonly xDomain: readonly [Date, Date]
  readonly yDomain: readonly [number, number]
  readonly plotWidth: number
  readonly gradients: Array<ChartGradient>
}

function gradientRule(
  line: Readonly<SegmentLineProps>,
  index: number,
  perPx: number,
  { uid, xDomain, yDomain: [lo, hi], gradients }: SegmentContext,
) {
  const color = line.stroke ?? 'var(--chart-segment-line)'
  const id = `${uid}-segment-line-${index}`
  const half = ((line.strokeWidth ?? 1) / 2) * perPx

  gradients.push({
    id,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [0, 0.1, 0.9, 1].map((offset) => ({
      offset,
      color,
      opacity: offset === 0 || offset === 1 ? 0 : 1,
    })),
  })

  return decorative(
    rect([xDomain[0]], {
      x1: (date: Date) => segmentDate(date.getTime() - half),
      x2: (date: Date) => segmentDate(date.getTime() + half),
      y1: () => lo,
      y2: () => hi,
      id: `segment-edge-${index}`,
      key: () => `segment:edge:${index}`,
      fill: `url(#${id})`,
    }),
  )
}

function plainRule(
  line: Readonly<SegmentLineProps>,
  index: number,
  { xDomain, yDomain: [lo, hi] }: SegmentContext,
) {
  const options = {
    x: (date: Date) => date,
    y1: () => lo,
    y2: () => hi,
    id: `segment-edge-${index}`,
    key: () => `segment:edge:${index}`,
    stroke: line.stroke ?? 'var(--chart-segment-line)',
    strokeWidth: line.strokeWidth ?? 1,
  }

  return decorative(
    ruleX(
      [xDomain[0]],
      (line.variant ?? 'dashed') === 'dashed' ? { ...options, strokeDasharray: '4 4' } : options,
    ),
  )
}

/** Static full-domain marks. The existing drawing resource projects the owner's accepted pixel edges. */
export function segmentMarks(props: SegmentProps, context: SegmentContext) {
  const {
    xDomain,
    yDomain: [lo, hi],
    plotWidth,
  } = context

  const { background } = props

  const band =
    background === undefined
      ? []
      : [
          decorative(
            rect([xDomain], {
              x1: (domain: readonly [Date, Date]) => domain[0],
              x2: (domain: readonly [Date, Date]) => domain[1],
              y1: () => lo,
              y2: () => hi,
              id: 'segment-band',
              key: () => 'segment:band',
              fill: background.fill ?? 'var(--chart-segment-background)',
            }),
          ),
        ]

  const perPx = plotWidth > 0 ? (xDomain[1].getTime() - xDomain[0].getTime()) / plotWidth : 0

  const lines = props.lines.flatMap<ReturnType<typeof gradientRule> | ReturnType<typeof plainRule>>(
    (line, index) => {
      if (line === undefined) {
        return []
      }

      if (line.variant === 'gradient' && perPx > 0) {
        return [gradientRule(line, index, perPx, context)]
      }

      return [plainRule(line, index, context)]
    },
  )

  return [...band, ...lines]
}
