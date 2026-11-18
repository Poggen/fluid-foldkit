import { curveLinearClosed } from 'd3-shape'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { defineChart } from '@tanstack/charts/scene'
import { polar, radialArea, radialDot, radialLine, radialText } from '@tanstack/charts/polar'
import type { RadialAreaOptions, RadialDotOptions, RadialTextOptions } from '@tanstack/charts/polar'
import type {
  ChartLayerRenderer,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionTransition,
  ChartPoint,
  DomChartDefinition,
} from '@tanstack/charts'
import type { RadarAxisProps } from './axis'
import { createRadarFocus } from './focus'
import type { RadarHitShape } from './focus'
import type { RadarGridProps } from './grid'
import type { RadarLabelsProps } from './labels'
import { metricRows, ringRows, seriesRows, RADAR_VALUE_MAX } from './rows'
import type { RadarData, RadarMetric, RadarRow } from './rows'
import { toChartTransition } from './transition'
import { toMotionTransition } from '../kit/motion/enter-transition'
import type { RadarEnterTransition } from './transition'

const joinClasses: (...names: ReadonlyArray<string | boolean | undefined>) => string = (
  ...names: ReadonlyArray<string | boolean | undefined>
) => names.filter(Boolean).join(' ')

export const MS_BASE_DURATION = 1100

export const GRID_STAGGER_MS = 80

const SPOKE_STAGGER_MS = 50

export const SERIES_STAGGER_MS = 150

export const SERIES_BASE_MS = 200

const LEVEL_LABEL_STAGGER_MS = 60

const GRID_SPRING: ChartMotionTransition = { damping: 15, mass: 1, stiffness: 100, type: 'spring' }

const MOTION_REST_PX = { delta: 0.5, speed: 2 }

const spokeSpring: (radius: number) => ChartMotionTransition = (radius: number) => ({
  damping: 15,
  mass: 1,
  restDelta: MOTION_REST_PX.delta / radius,
  restSpeed: MOTION_REST_PX.speed / radius,
  stiffness: 80,
  type: 'spring',
})

const LABEL_TWEEN: ChartMotionTransition = { duration: 500, type: 'tween' }

const INSTANT: ChartMotionTransition = { duration: 0, type: 'tween' }

const LABEL_FILL = 'var(--chart-label, oklch(0.65 0.01 260))'

const LABEL_MARK_ID = 'radar:axis-labels'

const FILL_REST = 0.15

const STROKE_REST = 2

const DOT_REST = 4

export const LABEL_OFFSET = 24

const LABEL_FONT = 11

const LEVEL_FONT = 9

type Motion = ChartMotionDefinition<RadarRow>

const enterMotion: (
  animate: boolean,
  delayMs: number,
  transition: ChartMotionTransition,
  perDatumMs?: number,
) => Motion = (
  animate: boolean,
  delayMs: number,
  transition: ChartMotionTransition,
  perDatumMs = 0,
) => {
  if (!animate) {
    return false satisfies Motion
  }

  return ((ctx: Readonly<ChartMotionContext<RadarRow>>) =>
    ctx.phase === 'enter'
      ? { delay: delayMs + ctx.datumIndex * perDatumMs, transition }
      : { transition: INSTANT }) satisfies Motion
}

const seriesEnter: (
  animate: boolean,
  delay: number,
  transition: ChartMotionTransition,
) => Motion = (animate: boolean, delay: number, transition: ChartMotionTransition) => {
  if (!animate) {
    return false
  }

  return (ctx: Readonly<ChartMotionContext<RadarRow>>) =>
    ctx.phase === 'enter' ? { delay, transition } : false
}

export interface ResolvedArea {
  readonly role: number
  readonly index: number
  readonly color: string
  readonly showPoints: boolean
  readonly showStroke: boolean
  readonly showGlow: boolean
  readonly className?: string
}

interface BuildOptions {
  readonly motionReplayKey: string
  readonly areaRenderer?: ChartLayerRenderer<RadarRow, string | number, number>
  readonly data: ReadonlyArray<RadarData>
  readonly metrics: ReadonlyArray<RadarMetric>
  readonly areas: ReadonlyArray<ResolvedArea>
  readonly grid?: RadarGridProps
  readonly axis?: RadarAxisProps
  readonly labels?: RadarLabelsProps
  readonly levels: number
  readonly margin: number
  /** Plot radius in the chart's own units (the span a spoke grows over). */
  readonly radius: number
  readonly animate: boolean
  readonly enterDurationMs: number
  readonly staggerScale: number
  readonly enterTransition?: RadarEnterTransition
}

const gridMarks = (
  o: BuildOptions,
  keys: ReadonlyArray<string>,
  df: number,
  gridStagger: number,
  gridTransition: ChartMotionTransition,
) => {
  const marks = []

  if (o.grid) {
    for (let level = 0; level < o.levels; level += 1) {
      marks.push(
        radialLine(ringRows(level, o.levels, o.metrics), {
          angle: 'angle',
          angleScale: 'ring',
          className: o.grid.className ?? '',
          curve: curveLinearClosed,
          id: `radar:ring-${level}-${o.motionReplayKey}`,
          key: 'metric',
          motion: enterMotion(o.animate, level * gridStagger, gridTransition),
          radius: 'value',
          states: [],
          stroke: o.grid.stroke ?? 'var(--bkm-border)',
          strokeOpacity: o.grid.strokeOpacity ?? 0.6,
          strokeWidth: 1,
          z: 'series',
        }),
      )
    }

    if (o.grid.showLabels ?? true) {
      const levelRows = Array.from(
        { length: o.levels },
        (_, level) =>
          ({
            label: String(((level + 1) * RADAR_VALUE_MAX) / o.levels),
            metric: keys[0] ?? '',
            series: -1,
            value: ((level + 1) * RADAR_VALUE_MAX) / o.levels,
          }) satisfies RadarRow,
      )

      marks.push(
        radialText(levelRows, {
          angle: 'metric',
          anchor: 'start',
          baseline: 'middle',
          className: 'bkm-radar-levels',
          dx: 4,
          fill: 'var(--chart-foreground-muted)',
          fontSize: LEVEL_FONT,
          id: `radar:level-labels-${o.motionReplayKey}`,
          key: 'value',
          motion: enterMotion(
            o.animate,
            o.levels * gridStagger * 0.5,
            LABEL_TWEEN,
            LEVEL_LABEL_STAGGER_MS * df,
          ),
          radius: 'value',
          states: [],
          text: 'label',
        }),
      )
    }
  }

  return marks
}

const axisMarks = (o: BuildOptions, keys: ReadonlyArray<string>) => {
  const marks = []

  if (o.axis) {
    const spoke = spokeSpring(o.radius)

    for (const [i, key] of keys.entries()) {
      marks.push(
        radialLine(
          [
            { label: '', metric: key, series: -1, value: 0 },
            { label: '', metric: key, series: -1, value: RADAR_VALUE_MAX },
          ],
          {
            angle: 'metric',
            className: o.axis.className ?? '',
            id: `radar:spoke-${i}`,
            key: 'value',
            motion: enterMotion(o.animate, i * SPOKE_STAGGER_MS, spoke),
            radius: 'value',
            states: [],
            stroke: o.axis.stroke ?? 'var(--bkm-border)',
            strokeOpacity: o.axis.strokeOpacity ?? 0.6,
            strokeWidth: 1,
            z: 'series',
          },
        ),
      )
    }
  }

  return marks
}

const labelMarks = (o: BuildOptions) => {
  if (o.labels === undefined) {
    return []
  }

  const options = {
    angle: 'metric',
    anchor: 'middle',
    baseline: 'middle',
    className: joinClasses(
      'bkm-radar-axis-labels',
      o.labels.interactive === true && 'bkm-radar-label-i',
      o.labels.className,
    ),
    fill: LABEL_FILL,
    fontSize: o.labels.fontSize ?? LABEL_FONT,
    fontWeight: 500,
    id: LABEL_MARK_ID,
    key: 'metric',
    motion: false,
    radius: RADAR_VALUE_MAX,
    radiusOffset: o.labels.offset ?? LABEL_OFFSET,
    states: [],
    text: 'label',
  } satisfies RadialTextOptions<RadarRow>

  return [
    radialText<RadarRow, 'metric', number, 'angle'>(
      metricRows(o.metrics, RADAR_VALUE_MAX),
      o.areaRenderer === undefined ? options : { ...options, renderer: o.areaRenderer },
    ),
  ]
}

export const buildDefinition = (o: BuildOptions) => {
  const keys = o.metrics.map((m) => m.key)
  const df = o.enterDurationMs / MS_BASE_DURATION
  const gridStagger = GRID_STAGGER_MS * o.staggerScale * df
  const seriesBase = (o.levels * gridStagger + SERIES_BASE_MS) * df
  const seriesTransition = toChartTransition(o.enterTransition)

  const gridTransition =
    o.enterTransition === undefined
      ? GRID_SPRING
      : toMotionTransition(o.enterTransition, {
          spring: { stiffness: 100, damping: 10, mass: 1 },
          keywordEases: true,
        })

  const marks = [
    ...gridMarks(o, keys, df, gridStagger, gridTransition),
    ...axisMarks(o, keys),
    ...labelMarks(o),
  ]

  const drawn = o.areas.flatMap((area) => {
    const datum = o.data.at(area.index)

    return datum === undefined ? [] : [{ area, datum }]
  })

  for (const { area, datum } of drawn) {
    const rows = seriesRows(datum, area.index, o.metrics)
    const delay = seriesBase + area.index * SERIES_STAGGER_MS * o.staggerScale * df
    const seriesMotion = seriesEnter(o.animate, delay, seriesTransition)

    const areaOptions = {
      angle: 'metric',
      className: joinClasses(
        `bkm-radar-area bkm-radar-s${area.index} bkm-radar-role${area.role}`,
        area.className,
      ),
      color: 'series',
      curve: curveLinearClosed,
      fill: area.color,
      fillOpacity: FILL_REST,
      id: `radar:area-${area.index}-role-${area.role}`,
      key: 'metric',
      motion: o.areaRenderer === undefined ? seriesMotion : false,
      radius: 'value',
      stroke: area.showStroke ? area.color : 'none',
      strokeWidth: STROKE_REST,
      z: 'series',
    } satisfies RadialAreaOptions<RadarRow>

    marks.push(
      radialArea<RadarRow, 'metric', 'value', 'angle'>(
        rows,
        o.areaRenderer === undefined ? areaOptions : { ...areaOptions, renderer: o.areaRenderer },
      ),
    )

    if (area.showPoints) {
      const dotOptions = {
        angle: 'metric',
        className: `bkm-radar-dot bkm-radar-s${area.index} bkm-radar-role${area.role}`,
        color: 'series',
        fill: area.color,
        id: `radar:dot-${area.index}-role-${area.role}`,
        key: 'metric',
        motion: o.areaRenderer === undefined ? seriesMotion : false,
        r: DOT_REST,
        radius: 'value',
        stroke: 'var(--chart-background)',
        strokeWidth: 2,
      } satisfies RadialDotOptions<RadarRow>

      marks.push(
        radialDot<RadarRow, 'metric', 'value', 'angle'>(
          rows,
          o.areaRenderer === undefined ? dotOptions : { ...dotOptions, renderer: o.areaRenderer },
        ),
      )
    }
  }

  const shapes = new Map<number, RadarHitShape>()

  for (const area of o.areas) {
    const held = shapes.get(area.index)
    shapes.set(area.index, {
      showPoints: area.showPoints || held?.showPoints === true,
      showStroke: area.showStroke || held?.showStroke === true,
    })
  }

  const spec = {
    focus: createRadarFocus(keys, shapes),
    focusRing: false,
    margin: o.margin,
    motion: (ctx: Readonly<ChartMotionContext<RadarRow>>) =>
      ctx.phase === 'update' ? false : undefined,
    marks: [
      polar({
        id: 'radar',
        marks,
        scales: {
          angle: { scale: scalePoint().domain(keys) },
          radius: { scale: scaleLinear().domain([0, RADAR_VALUE_MAX]) },

          ring: { channel: 'angle', scale: scaleLinear().domain([0, 360]) },
        },
      }),
    ],
    scales: { x: null, y: null },
    tooltip: false,
  } satisfies DomChartDefinition<RadarRow, string | number, number>

  return defineChart(spec, { focus: spec.focus })
}

export const isAreaPoint: (point: ChartPoint<RadarRow, string | number, number>) => boolean = (
  point: ChartPoint<RadarRow, string | number, number>,
) => point.datum.series >= 0 && /^radar:(?:area|glow|dot)-/u.test(point.markId)
