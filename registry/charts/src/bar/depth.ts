// Native-mark equivalents of bklit's BarDepthBack / BarDepthFront / BarPulse: side face, lid, ground shadow,
// glass tip and pulse wave are plain scene nodes; the pulse sweep is a CSS keyframe class.
import { createMark } from '@tanstack/charts'
import type { ChartGradient, ChartMark, ChartPoint, SceneNode } from '@tanstack/charts'

const joinClasses = (...values: ReadonlyArray<string | undefined>): string =>
  values.filter((value) => value !== undefined).join(' ')

import type { BarLayer } from './options'
import { barIndexClass } from './hover'
import type { HoverTarget } from './hover'
import { DEFAULT_GROUND_SHADOW, GLASS_TIP_OPACITY, lidPoints, sidePoints } from './geometry'
import { projectDepthEntry, depthSidePieces, depthSilhouette } from './depth-frame'
import type { DepthFrame, ProjectedDepthEntry } from './depth-frame'
import type { PulseClip } from './pulse-clips'
import type { DepthMotionTarget } from './depth-motion'
import type { BarDatum, BarSeries } from './model'

export interface DepthMarkInput<Row> {
  readonly depthFrame: DepthFrame
  readonly revealed: boolean
  readonly children: ReadonlyArray<BarLayer<Row>>
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly series: ReadonlyArray<BarSeries>
  readonly uid: string
  readonly faded: number
  /** Pulse waits until the existing checked entrance has started and finished. */
  readonly seed: boolean
}

// bklit bar-depth.tsx:88-106: wave height ratio, minimum height (px) and the gradient's peak opacity.
const PULSE_WAVE_HEIGHT_RATIO = 0.55

const PULSE_WAVE_HEIGHT_MIN_PX = 36

const PULSE_WAVE_PEAK_OPACITY = 0.85

// bklit bar-depth.tsx:967-1010: [offset, share of the peak] of the wave's bell-curve stops.
const PULSE_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.1, 0],
  [0.22, 0.18],
  [0.34, 0.5],
  [0.44, 0.85],
  [0.5, 1],
  [0.56, 0.85],
  [0.66, 0.5],
  [0.78, 0.18],
  [0.9, 0],
  [1, 0],
]

export interface DepthMarks<Row> {
  readonly marks: Array<ChartMark<BarDatum<Row>, string, number>>
  readonly gradients: Array<ChartGradient>
  readonly hover: Array<HoverTarget>
  readonly clips: ReadonlyArray<PulseClip>
  readonly targets: ReadonlyArray<DepthMotionTarget>
}

export function buildDepthMarks<Row>(input: DepthMarkInput<Row>): DepthMarks<Row> {
  // Depth faces span the full band slot like the bar itself, which is uninset whenever depth is on (bklit: bandX = barScale(label)).
  const { children, datums, series } = input

  const provider = children
    .filter((child) => child.kind === 'barDepthProvider')
    .map((child) => child.props)
    .at(0)

  const backs = children
    .filter((child) => child.kind === 'barDepthBack')
    .map((child) => child.props)

  const fronts = children
    .filter((child) => child.kind === 'barDepthFront')
    .map((child) => child.props)

  const pulses = children.filter((child) => child.kind === 'barPulse').map((child) => child.props)

  if (backs.length + fronts.length + pulses.length === 0) {
    return { marks: [], gradients: [], hover: [], clips: [], targets: [] }
  }

  const groundShadow = provider?.groundShadow ?? DEFAULT_GROUND_SHADOW
  const projected = new Map<BarDatum<Row>, ProjectedDepthEntry | undefined>()
  const frameFor = (datum: BarDatum<Row>) => {
    if (!projected.has(datum))
      projected.set(datum, projectDepthEntry(datum, provider, input.depthFrame))
    return projected.get(datum)
  }
  const clips: Array<PulseClip> = []
  const targets: Array<DepthMotionTarget> = []
  const targetClass = (family: string, datum: BarDatum<Row>) =>
    `bkm-depth-${family}-${datum.seriesIndex}-${datum.index}`

  const fillOf = (key: string): string =>
    series.find((s) => s.key === key)?.fill ?? 'var(--chart-line-primary)'

  // bklit glass: per-bar objectBoundingBox ramp, bright catch at the tip, contact shadow at the base.
  const glassId = `${input.uid}-glass`
  const negativeGlassId = `${input.uid}-glass-negative`
  const sideRtl = `${input.uid}-side-rtl`
  const sideLtr = `${input.uid}-side-ltr`
  const topShade = `${input.uid}-top-shade`
  const pulseId = `${input.uid}-pulse`

  const gradients: Array<ChartGradient> = [
    // bklit side shade: diagonal black ramp 0.05 -> 0.55 (right-of-centre bars have the side on the left).
    {
      id: sideRtl,
      x1: 1,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [
        { offset: 0, color: 'black', opacity: 0.05 },
        { offset: 1, color: 'black', opacity: 0.55 },
      ],
    },
    {
      id: sideLtr,
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      stops: [
        { offset: 0, color: 'black', opacity: 0.05 },
        { offset: 1, color: 'black', opacity: 0.55 },
      ],
    },
    // Lid shade: front lip clear, back edge picks up 0.18 black.
    {
      id: topShade,
      x1: 0,
      y1: 1,
      x2: 0,
      y2: 0,
      stops: [
        { offset: 0, color: 'black', opacity: 0 },
        { offset: 1, color: 'black', opacity: 0.18 },
      ],
    },
    {
      id: glassId,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [
        { offset: 0, color: 'white', opacity: GLASS_TIP_OPACITY },
        { offset: 0.03, color: 'white', opacity: 0.09 },
        { offset: 0.08, color: 'white', opacity: 0.02 },
        { offset: 0.55, color: 'white', opacity: 0 },
        { offset: 1, color: 'black', opacity: groundShadow },
      ],
    },
    {
      id: negativeGlassId,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [
        { offset: 0, color: 'black', opacity: groundShadow },
        { offset: 0.45, color: 'white', opacity: 0 },
        { offset: 0.92, color: 'white', opacity: 0.02 },
        { offset: 0.97, color: 'white', opacity: 0.09 },
        { offset: 1, color: 'white', opacity: GLASS_TIP_OPACITY },
      ],
    },
    // bklit BarPulse gradient (bar-depth.tsx:967-1010): a soft bell curve of white, peak 0.85 at the middle, clear at both ends.
    {
      id: pulseId,
      x1: 0,
      y1: 1,
      x2: 0,
      y2: 0,
      stops: PULSE_STOPS.map(([offset, weight]) => ({
        offset,
        color: 'white',
        opacity: PULSE_WAVE_PEAK_OPACITY * weight,
      })),
    },
  ]

  const out: Array<ChartMark<BarDatum<Row>, string, number>> = []
  const hover: Array<HoverTarget> = []

  // Our own nodes carry a documented `className` (reference/runtime-and-scene.md "Scene nodes") that the hover CSS selects:
  // `bkm-bd-<family>-s<series index>` per mark and `bkm-bi<category index>` per bar, so no selector touches the key encoding.
  const make = (
    id: string,
    family: 'back' | 'front' | 'pulse',
    key: string,
    dimTo: number,
    draw: (d: BarDatum<Row>, e: ProjectedDepthEntry, index: number) => Array<SceneNode>,
  ): ChartMark<BarDatum<Row>, string, number> => {
    const rows = datums.filter((d) => d.series === key)
    const seriesIndex = series.find((s) => s.key === key)?.index
    const familyClass = `bkm-bd-${family}-s${seriesIndex}`
    if (family !== 'pulse') {
      for (const datum of rows) {
        const entry = frameFor(datum)
        if (entry === undefined || (family === 'back' ? entry.depth < 0.5 : entry.bandWidth <= 0))
          continue
        targets.push({
          key: `${id}:${datum.index}`,
          className: targetClass(family, datum),
          clipId: `${input.uid}-depth-clip-${datum.seriesIndex}-${datum.index}`,
          kind: family,
          entry,
        })
      }
    }
    // Each draw returns one top-level node per bar (the faces group dims as one composited opacity, like bklit's wrapping motion.g).
    hover.push({
      select: `.${familyClass}`,
      keep: (index) => `.${barIndexClass(index)}`,
      dim: dimTo,
      // bklit's depth faces dim through motion's easeOut tween (the base bar rect keeps the CSS ease-in-out).
      easing: 'ease-out',
      ...(seriesIndex === undefined ? {} : { seriesIndex }),
    })

    return createMark<BarDatum<Row>, string, number>(() => ({
      id,
      channels: {
        x: { scale: 'x', values: rows.map((d) => d.category) },
        y: { scale: 'y', includeZero: true, values: rows.map((d) => d.value) },
      },
      motion: false,
      render: ({ color }) => {
        const nodes: Array<SceneNode> = []
        const points: Array<ChartPoint<BarDatum<Row>, string, number>> = []
        for (const [index, d] of rows.entries()) {
          const e = frameFor(d)

          if (e) {
            points.push({
              key: `${id}:${d.index}`,
              markId: id,
              group: d.series,
              groupLabel: d.series,
              datum: d,
              datumIndex: index,
              xValue: d.category,
              yValue: d.value,
              x: e.bandX + e.bandWidth / 2,
              y: e.topY,
              color: color(d.series),
            })

            for (const node of draw(d, e, d.index)) {
              nodes.push({
                ...node,
                className: joinClasses(node.className, familyClass, barIndexClass(d.index)),
              })
            }
          }
        }

        return { nodes, points }
      },
    }))
  }

  for (const back of backs) {
    out.push(
      make(`depth-back:${back.dataKey}`, 'back', back.dataKey, input.faded, (d, e, i) => {
        const color = back.colorAccessor?.(d.source, i) ?? back.color ?? fillOf(back.dataKey)
        const k = `depth-back:${back.dataKey}:${d.index}`
        const nodes: Array<SceneNode> = []

        if (e.depth >= 0.5) {
          nodes.push({
            kind: 'group',
            key: `${k}:faces`,
            ariaHidden: true,
            children: [
              {
                kind: 'group',
                key: `${k}:side-reveal`,
                className: `${targetClass('back', d)}-side`,
                clip: {
                  x: e.bandX - e.depth - 1,
                  y: input.revealed ? e.topY - e.perspectiveRise : e.baselineY,
                  width: e.bandWidth + 2 * e.depth + 2,
                  height: input.revealed ? e.barHeight + e.perspectiveRise : 0,
                },
                children: [
                  ...depthSidePieces(e, color).map((piece, index): SceneNode => ({
                    kind: 'area',
                    key: index === 0 ? `${k}:side` : `${k}:side:${index}`,
                    ariaHidden: true,
                    points: piece.points,
                    style: { fill: piece.color },
                  })),
                  {
                    kind: 'area',
                    key: `${k}:side-shade`,
                    ariaHidden: true,
                    points: sidePoints(e, e.topY, e.bottomY),
                    style: { fill: `url(#${e.isRightOfCenter ? sideRtl : sideLtr})` },
                  },
                  {
                    kind: 'area',
                    key: `${k}:side-glass`,
                    ariaHidden: true,
                    points: sidePoints(e, e.topY, e.bottomY),
                    style: { fill: `url(#${e.isNegative ? negativeGlassId : glassId})` },
                  },
                ],
              },
              {
                kind: 'group',
                key: `${k}:lid-reveal`,
                className: `${targetClass('back', d)}-lid`,
                translateY: input.revealed || e.isNegative ? 0 : e.barHeight,
                style: { opacity: !input.revealed && e.isNegative ? 0 : 1 },
                children: [
                  {
                    kind: 'area',
                    key: `${k}:lid`,
                    ariaHidden: true,
                    points: lidPoints(e),
                    style: { fill: e.segments.at(-1)?.color ?? color },
                  },
                  {
                    kind: 'area',
                    key: `${k}:lid-tip`,
                    ariaHidden: true,
                    points: lidPoints(e),
                    style: { fill: 'white', opacity: GLASS_TIP_OPACITY },
                  },
                  {
                    kind: 'area',
                    key: `${k}:lid-shade`,
                    ariaHidden: true,
                    points: lidPoints(e),
                    style: { fill: `url(#${topShade})` },
                  },
                ],
              },
            ],
          })
        }

        return nodes
      }),
    )
  }

  for (const front of fronts) {
    out.push(
      make(`depth-front:${front.dataKey}`, 'front', front.dataKey, input.faded, (d, e) =>
        e.bandWidth > 0
          ? [
              {
                kind: 'rect',
                key: `depth-front:${front.dataKey}:${d.index}:glass`,
                className: `${targetClass('front', d)}-glass`,
                ariaHidden: true,
                x: e.bandX,
                y: input.revealed ? e.topY : e.baselineY,
                width: e.bandWidth,
                height: input.revealed ? e.barHeight : 0,
                style: { fill: `url(#${e.isNegative ? negativeGlassId : glassId})` },
              },
            ]
          : [],
      ),
    )
  }

  for (const pulse of pulses) {
    if (pulse.pulsePaused !== true && input.revealed && pulse.activeIndex !== undefined) {
      const activeIndex = pulse.activeIndex
      const datum = datums.find(
        (item) => item.series === pulse.dataKey && item.index === activeIndex,
      )
      const full = datum === undefined ? undefined : frameFor(datum)
      const seriesIndex = series.find((item) => item.key === pulse.dataKey)?.index ?? 0
      const className = `bkm-pulse-${seriesIndex}-${activeIndex}`
      if (
        full !== undefined &&
        !input.seed &&
        full.barHeight > 0 &&
        !Number.isNaN(full.barHeight)
      ) {
        clips.push({
          id: `${input.uid}-pulse-clip-${seriesIndex}-${activeIndex}`,
          className,
          path: depthSilhouette(full),
        })
      }
      out.push(
        make(`bar-pulse:${pulse.dataKey}`, 'pulse', pulse.dataKey, input.faded, (d, e, i) => {
          const active = activeIndex

          if (i !== active || Number.isNaN(e.barHeight) || e.barHeight <= 0) {
            return []
          }

          const k = `bar-pulse:${pulse.dataKey}:${d.index}`

          // bklit bar-depth.tsx:88-106 (constants), :996-1011 (wave geometry): the wave is max(barHeight * 0.55, 36) tall and travels
          // from the floor (rect top at bottomY) to above the lid (top at topY - perspectiveRise - height) on a 2.4s ease-in-out loop.
          const waveHeight = Math.max(
            e.barHeight * PULSE_WAVE_HEIGHT_RATIO,
            PULSE_WAVE_HEIGHT_MIN_PX,
          )

          const travelTop = e.topY - e.perspectiveRise - waveHeight

          return [
            {
              kind: 'group',
              key: k,
              ariaHidden: true,
              className,
              children: [
                // The CSS sweep moves this group by its own box height (transform-box: fill-box, translateY(-100%)); the
                // transparent spacer stretches the box from the wave's travel end so the box height equals the travel distance.
                {
                  kind: 'group',
                  key: `${k}:sweep`,
                  className: e.isNegative
                    ? 'ts-bkm-bar-pulse-wave bkm-pulse-negative'
                    : 'ts-bkm-bar-pulse-wave',
                  ariaHidden: true,
                  children: [
                    {
                      kind: 'rect',
                      key: `${k}:wave`,
                      ariaHidden: true,
                      x: e.bandX - e.depth - 1,
                      y: e.bottomY,
                      width: e.bandWidth + 2 * e.depth + 2,
                      height: waveHeight,
                      style: { fill: `url(#${pulseId})` },
                    },
                    {
                      kind: 'rect',
                      key: `${k}:span`,
                      ariaHidden: true,
                      x: e.bandX,
                      y: travelTop + waveHeight,
                      width: 1,
                      height: 1,
                      style: { fill: 'none' },
                    },
                  ],
                },
              ],
            },
          ]
        }),
      )
    }
  }

  return { marks: out, gradients, hover, clips, targets }
}
