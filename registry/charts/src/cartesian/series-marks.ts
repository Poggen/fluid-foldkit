import { preserveGapRows } from './decimate'
import { fadePaint } from './series-fade'
import type { Paint } from './series-fade'

import { dot } from '@tanstack/charts'
import type { areaY as areaYRaw, lineY as lineYRaw } from '@tanstack/charts'
import { d3Curve } from '@tanstack/charts/d3/shape'

import { keyAttr, pushDecorative, yScaleOf } from './build-state'
import type { BuildState, SeriesMark } from './build-state'
import type { AreaSeries, ResolvedSeries } from './series'
import { keyHas, keyIs, keyStarts } from '../kit/renderer-dom'

const areaFill: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  area: ResolvedSeries & AreaSeries,
) => string = function areaFill<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  area: ResolvedSeries & AreaSeries,
) {
  if (isGradientRef(area.fill)) {
    return area.fill satisfies string
  }

  if (area.pattern) {
    return area.pattern.color satisfies string
  }

  const id = `${ctx.input.uid}-area-${area.index}`
  const span = Math.min(1, Math.max(0.01, area.gradientSpan))
  ctx.state.gradients.push({
    id,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      { offset: 0, color: area.fill, opacity: area.fillOpacity },
      { offset: span, color: area.fill, opacity: area.gradientToOpacity ?? 0 },
      ...(span < 1 ? [{ offset: 1, color: area.fill, opacity: area.gradientToOpacity ?? 0 }] : []),
    ],
  })

  return `url(#${id})` satisfies string
}

const pushAreaFill: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
  area: ResolvedSeries & AreaSeries,
) => void = function pushAreaFill<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
  area: ResolvedSeries & AreaSeries,
) {
  const curve = d3Curve(s.curve)
  const baseline = ctx.yDomains.get(s.yAxisId)?.[0] ?? 0
  const fill = areaFill(ctx, area)
  pushDecorative(
    ctx.state.marks,
    ctx.wrap(
      ctx.areaY(ctx.rows, {
        id: `${s.id}:fill${fadeSuffix(area.fadeEdges)}`,
        ...yScaleOf(s),
        x: ctx.xAccessor,
        y1: baseline,
        y2: (d: Row) => ctx.valueOf(d, s) satisfies number,
        fill,
        fillOpacity: 1,
        curve,
        key: ctx.keyOf,
      }),
      'a',
    ),
  )

  if (s.kind !== 'pattern') {
    ctx.state.hoverDim.push({
      select: `g${keyStarts(`${keyAttr(s.id)}:fill`)}`,
      opacity: dimOpacityOf(s),
      series: s.index,
      legendOpacity: dimOpacityOf(s),
    })
  }
}

const profitLossStroke: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) => LinePaint = function profitLossStroke<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) {
  const { profitLoss } = s

  if (!profitLoss) {
    return { stroke: s.stroke, plOpacity: 1 } satisfies LinePaint
  }

  const { state, input } = ctx
  const hoveredSign = input.profitLossHovered ?? null

  const signOpacity: (sign: 0 | 1) => number = (sign: 0 | 1) =>
    hoveredSign !== null && hoveredSign !== sign ? 0.25 : 1

  let lo = Number.POSITIVE_INFINITY
  let hi = Number.NEGATIVE_INFINITY

  for (const row of ctx.rows) {
    const v = ctx.valueOf(row, s)

    if (Number.isFinite(v)) {
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  }

  const lineGroup = `g${keyStarts(`${keyAttr(s.id)}:`)}:not(${keyStarts(`${keyAttr(s.id)}:hl`)}):not(${keyStarts(`${keyAttr(s.id)}:fill`)}):not(${keyIs(`${keyAttr(s.id)}:dot`)})`

  if (hi <= 0) {
    state.plRules.push({ kind: 'dim', select: lineGroup, sign: 1 })

    return { stroke: profitLoss.negative, plOpacity: signOpacity(1) } satisfies LinePaint
  }

  if (lo >= 0) {
    state.plRules.push({ kind: 'dim', select: lineGroup, sign: 0 })

    return { stroke: profitLoss.positive, plOpacity: signOpacity(0) } satisfies LinePaint
  }

  const id = `${input.uid}-pl-${s.index}`
  const zero = hi / (hi - lo)
  state.gradients.push({
    id,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      { offset: 0, color: profitLoss.positive, opacity: signOpacity(0) },
      { offset: zero, color: profitLoss.positive, opacity: signOpacity(0) },
      { offset: zero, color: profitLoss.negative, opacity: signOpacity(1) },
      { offset: 1, color: profitLoss.negative, opacity: signOpacity(1) },
    ],
  })
  state.plRules.push({ kind: 'stops', gradient: id })

  return { stroke: `url(#${id})`, plOpacity: 1 } satisfies LinePaint
}

const dashedAt: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) => number | undefined = function dashedAt<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) {
  return (
    s.dashFromIndex !== undefined && s.dashFromIndex > 0 && s.dashFromIndex < ctx.input.data.length
      ? s.dashFromIndex
      : undefined
  ) satisfies number | undefined
}

const splitAtDash: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  dashAt: number,
) => DashSplit<Row> = function splitAtDash<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  dashAt: number,
) {
  const { data } = ctx.input

  if (!ctx.focusRows) {
    return { head: data.slice(0, dashAt + 1), tail: data.slice(dashAt) } satisfies DashSplit<Row>
  }

  const row = data[dashAt]
  const at = row === undefined ? Number.NaN : ctx.keyOf(row)

  return {
    head: ctx.rows.filter((r) => ctx.keyOf(r) <= at),
    tail: ctx.rows.filter((r) => ctx.keyOf(r) >= at),
  } satisfies DashSplit<Row>
}

const pushLine: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) => number | undefined = function pushLine<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) {
  const { input, rows, state } = ctx
  const curve = d3Curve(s.curve)
  const yValue: (d: Row) => number = (d: Row) => ctx.valueOf(d, s)
  const { stroke, plOpacity } = profitLossStroke(ctx, s)
  const fade = s.profitLoss ? false : s.fadeEdges
  let paintFor: Paint<Row> = () => stroke
  let lineValue = yValue

  if (fade !== false) {
    ;({ paintFor, lineValue } = fadePaint(ctx, s, fade, yValue))
  }

  const dashAt = dashedAt(ctx, s)

  const common = {
    ...yScaleOf(s),
    x: ctx.xAccessor,
    y: lineValue,
    z: () => s.dataKey satisfies string,
    key: ctx.keyOf,
    strokeWidth: s.strokeWidth,
    curve,
    strokeOpacity: plOpacity,
  }

  const lineId = `${input.uid}-line-${s.kind}-${s.index}`
  state.hoverDim.push({
    select: `g${keyStarts(`${keyAttr(s.id)}:`)}:not(${keyStarts(`${keyAttr(s.id)}:hl`)}):not(${keyStarts(`${keyAttr(s.id)}:fill`)}):not(${keyIs(`${keyAttr(s.id)}:dot`)}):not(${keyStarts(`${keyAttr(s.id)}:active-`)}):not(${keyHas(':marker')})`,
    opacity: dimOpacityOf(s),
    series: s.index,
    legendOpacity: dimOpacityOf(s),
  })

  const pushLineMark: (mark: SeriesMark<Row>) => void = (mark: SeriesMark<Row>) => {
    if (ctx.focusRows === undefined) {
      state.marks.push(mark)
    } else {
      pushDecorative(state.marks, mark)
    }
  }

  if (dashAt === undefined) {
    pushLineMark(
      ctx.wrap(ctx.lineY(rows, { id: s.id, ...common, stroke: paintFor(rows, lineId) }), 'l'),
    )
  } else {
    const { head, tail } = splitAtDash(ctx, dashAt)
    pushLineMark(
      ctx.wrap(ctx.lineY(head, { id: s.id, ...common, stroke: paintFor(head, lineId) }), 'l'),
    )
    pushLineMark(
      ctx.wrap(
        ctx.lineY(tail, {
          id: `${s.id}:tail`,
          ...common,
          stroke: paintFor(tail, `${lineId}-tail`),
          strokeDasharray: s.dashArray.replace(',', ' '),
        }),
        'l',
      ),
    )
  }

  if (ctx.focusRows !== undefined) {
    state.marks.push(
      ctx.wrap(
        ctx.lineY(ctx.focusRows, {
          id: `${s.id}:focus`,
          ...common,
          stroke: 'transparent',
          strokeOpacity: 0,
          strokeWidth: 0,
        }),
        'l',
      ),
    )
  }

  if (s.loading && s.loading.style !== 'sweep') {
    pushDecorative(
      state.marks,
      ctx.wrap(
        ctx.lineY(rows, {
          id: `${s.id}:loading`,
          ...common,
          stroke: s.loading.stroke,
          strokeOpacity: 1,
        }),
        'l',
      ),
    )
  }

  return dashAt satisfies number | undefined
}

const pushPointMarkers: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) => void = function pushPointMarkers<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
) {
  const { markerRows: rows, state } = ctx

  const mk = s.marker
  state.hoverDim.push({
    select: `g${keyStarts(`${keyAttr(s.id)}:marker`)}`,
    opacity: mk.fadeOnHover ? mk.inactiveOpacity : 1,
    series: s.index,
    legendOpacity: mk.fadeOnHover ? mk.inactiveOpacity : 1,
    marker: {
      opacity: mk.fadeOnHover ? mk.inactiveOpacity : 1,
      blur: mk.fadeOnHover ? mk.inactiveBlur : 0,
      enterBlur: mk.enterBlur,
      animate: mk.animate,
    },
  })

  const r = mk.radius

  const xy = {
    ...yScaleOf(s),
    x: ctx.xAccessor,
    y: (d: Row) => ctx.valueOf(d, s) satisfies number,
    key: ctx.keyOf,
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]

    if (row === undefined) {
      continue
    }

    const part = [row]
    const marker = (mark: SeriesMark<Row>) => ctx.wrap(mark, 'marker')

    if (mk.outlineWidth > 0) {
      const ringOuter = mk.strokeWidth > 0 ? r + mk.ringGap + mk.strokeWidth : r
      pushDecorative(
        state.marks,
        marker(
          dot(part, {
            ...xy,
            id: `${s.id}:marker-out:${index}`,
            r: ringOuter + mk.outlineWidth / 2,
            fill: 'none',
            stroke: mk.outlineColor,
            strokeWidth: mk.outlineWidth,
          }),
        ),
      )
    }

    if (mk.strokeWidth > 0) {
      pushDecorative(
        state.marks,
        marker(
          dot(part, {
            ...xy,
            id: `${s.id}:marker-ring:${index}`,
            r: r + mk.ringGap + mk.strokeWidth / 2,
            fill: 'none',
            stroke: mk.stroke,
            strokeWidth: mk.strokeWidth,
          }),
        ),
      )
    }

    pushDecorative(
      state.marks,
      marker(dot(part, { ...xy, id: `${s.id}:marker:${index}`, r, fill: mk.fill })),
    )
  }
}

const pushHighlight: <Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
  dashAt: number | undefined,
) => void = function pushHighlight<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
  dashAt: number | undefined,
) {
  const hlRows = dashAt === undefined ? ctx.rows : ctx.input.data.slice(0, dashAt + 1)
  ctx.state.hoverHighlights.push({ select: `path${keyStarts(`${keyAttr(s.id)}:hl`)}` })
  const yScale = yScaleOf(s)
  const curve = d3Curve(s.curve)
  pushDecorative(
    ctx.state.marks,
    ctx.wrap(
      ctx.lineY(hlRows, {
        id: `${s.id}:hl`,
        ...yScale,
        x: ctx.xAccessor,
        y: (d: Row) => ctx.valueOf(d, s) satisfies number,
        key: ctx.keyOf,
        stroke: s.stroke,
        strokeWidth: s.strokeWidth,
        curve,
      }),
      'l',
    ),
  )
}

/** Appends every series' marks (area fill, line, loading overlay, markers, highlight) in series order. */
export const pushSeriesMarks: <Row extends Readonly<Record<string, unknown>>>(
  input: SeriesContext<Row>,
) => void = function pushSeriesMarks<Row extends Readonly<Record<string, unknown>>>(
  input: SeriesContext<Row>,
) {
  for (const s of input.input.series) {
    const ctx =
      s.kind === 'line'
        ? input
        : {
            ...input,
            rows: preserveGapRows(input.input.data, input.rows, input.pathIndices, (row) =>
              input.valueOf(row, s),
            ),
          }

    if (isAreaLike(s)) {
      pushAreaFill(ctx, s, s)
    }

    if (!drawsLine(s)) {
      continue
    }

    const dashAt = pushLine(ctx, s)

    if (s.showMarkers) {
      pushPointMarkers(ctx, s)
    }

    if (drawsHighlight(s)) {
      pushHighlight(ctx, s, dashAt)
    }
  }
}

const fadeSuffix: (fadeEdges: ResolvedSeries['fadeEdges']) => string = function fadeSuffix(
  fadeEdges: ResolvedSeries['fadeEdges'],
) {
  if (fadeEdges === false) {
    return ''
  }

  if (fadeEdges === 'left') {
    return ':fade-left'
  }

  return fadeEdges === 'right' ? ':fade-right' : ':fade'
}

const isGradientRef: (paint: string) => boolean = (paint: string) => paint.startsWith('url(')

export interface SeriesContext<Row> {
  readonly wrap: (mark: SeriesMark<Row>, prefix: string) => SeriesMark<Row>
  readonly valueOf: (row: Row, series: ResolvedSeries) => number
  readonly input: {
    readonly data: ReadonlyArray<Row>
    readonly uid: string
    readonly plotHeight?: number
    readonly profitLossHovered?: number | null
    readonly series: ReadonlyArray<ResolvedSeries>
  }
  readonly pathIndices?: ReadonlyArray<number> | undefined
  readonly rows: ReadonlyArray<Row>
  /** The rows the point markers draw: `rows` clipped to the brushed window (paths draw past it, under the clip). */
  readonly markerRows: ReadonlyArray<Row>
  /** Every row, only when `rows` is decimated: bklit hovers on every row (use-chart-interaction.ts:81, data = visiblePlotData), so a hidden full-row line takes the focus. */
  readonly focusRows?: ReadonlyArray<Row>
  readonly yDomains: ReadonlyMap<string, readonly [number, number]>
  readonly fadeDomain: [Date, Date] | undefined
  readonly xAccessor: (d: Row) => Date
  readonly keyOf: (d: Row) => number
  readonly lineY: typeof lineYRaw
  readonly areaY: typeof areaYRaw
  readonly state: BuildState<Row>
}

const dimOpacityOf: (s: ResolvedSeries) => number = (s: ResolvedSeries) => {
  if (!s.showHighlight) {
    return 1
  }

  return s.kind === 'area' ? 0.6 : 0.3
}

interface LinePaint {
  readonly stroke: string
  readonly plOpacity: number
}

interface DashSplit<Row> {
  readonly head: ReadonlyArray<Row>
  readonly tail: ReadonlyArray<Row>
}

const isAreaLike = (s: ResolvedSeries): s is ResolvedSeries & AreaSeries =>
  s.kind === 'area' || s.kind === 'pattern'

const drawsLine: (s: ResolvedSeries) => boolean = (s: ResolvedSeries) =>
  !isAreaLike(s) || (s.kind !== 'pattern' && s.showLine)

/** The highlight subscribes to chart hover independently of the tooltip panel. */
export const drawsHighlight: (s: ResolvedSeries) => boolean = (s: ResolvedSeries) =>
  drawsLine(s) && s.showHighlight && !s.profitLoss
