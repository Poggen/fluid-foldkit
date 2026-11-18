/* @license Exact fixed-data configurations from Bklit's authored demos; native public carriers. */
import {
  Line,
  Area,
  Grid,
  XAxis,
  ChartTooltip,
  ChartMarkers,
  ReferenceArea,
  SegmentBackground,
  SegmentLineFrom,
  SegmentLineTo,
  LineSeriesTerminalMarker,
  ProjectionLine,
  buildProjectionPath,
} from '@foldkit-visuals/charts/line'
import type { TimeSeriesProps } from '@foldkit-visuals/charts/line'
import { PatternArea } from '@foldkit-visuals/charts'
import {
  Bar,
  BarSquares,
  BarColumnTrack,
  BarDepthProvider,
  BarDepthBack,
  BarDepthFront,
  BarPulse,
  BarXAxis,
} from '@foldkit-visuals/charts/bar'
import type { BarChartProps } from '@foldkit-visuals/charts/bar'
import type { GaugeConfiguration } from '@foldkit-visuals/charts/gauge'
import { lineData, barData, LineRow, AreaRow, BarRow } from './chart-scenes'
import { motion } from '../motion'
const primary = 'var(--chart-line-primary)',
  secondary = 'var(--chart-line-secondary)'
const dateAt = (index: number) => lineData[index]?.date ?? lineData[0]?.date
const markers = [
  { date: dateAt(12), icon: '🚀', title: 'Launch', description: 'Release shipped' },
  { date: dateAt(12), icon: '⚠️', title: 'Alert', description: 'Threshold breached' },
  { date: dateAt(12), icon: '🔧', title: 'Fix', description: 'Hotfix deployed' },
  { date: dateAt(6), icon: '🎉', title: 'Milestone', description: '100k users' },
  { date: dateAt(21), icon: '📈', title: 'Growth', description: 'Quarterly peak' },
].flatMap((item) => (item.date === undefined ? [] : [{ ...item, date: item.date }]))
const target = buildProjectionPath({
  sourceData: lineData,
  seriesKey: 'users',
  mode: 'target',
  pathDensity: 'endpoints',
  horizonPoints: 6,
  endValue: 301,
})
const auto = buildProjectionPath({
  sourceData: lineData,
  seriesKey: 'users',
  mode: 'auto',
  autoMethod: 'lastSegment',
  pathDensity: 'endpoints',
  horizonPoints: 6,
})
export const lineVariants: Readonly<Record<string, TimeSeriesProps<typeof LineRow.Type>>> = {
  markers: {
    aspectRatio: '2/1',
    children: [
      Grid({ horizontal: true }),
      Line({
        dataKey: 'users',
        stroke: primary,
        showMarkers: true,
        markers: { radius: 5, fill: primary },
        dashFromIndex: 22,
        dashArray: '6,4',
      }),
      Line({ dataKey: 'pageviews', stroke: secondary }),
      XAxis(),
      ChartTooltip(),
      ChartMarkers({ items: markers }),
    ],
  },
  reference: {
    aspectRatio: '2/1',
    children: [
      Grid({ horizontal: true }),
      ReferenceArea({ y1: 1200, y2: 1800, showMarkers: true, strokeStyle: 'dashed' }),
      Line({ dataKey: 'users', stroke: primary }),
      XAxis(),
      ChartTooltip(),
    ],
  },
  segment: {
    aspectRatio: '2/1',
    children: [
      Grid({ horizontal: true }),
      Line({ dataKey: 'users', stroke: primary }),
      XAxis(),
      ChartTooltip(),
      SegmentBackground(),
      SegmentLineFrom(),
      SegmentLineTo(),
    ],
  },
  projection: {
    aspectRatio: '2/1',
    children: [
      Grid({ horizontal: true }),
      Line({ dataKey: 'users', stroke: primary }),
      LineSeriesTerminalMarker({ dataKey: 'users', ringGap: 6, stroke: 'var(--chart-1)' }),
      ...[target, auto].map((data) =>
        ProjectionLine({
          curveKind: 'bezier',
          data,
          gradientEnd: 'var(--chart-5)',
          gradientStart: 'var(--chart-3)',
          showEndMarker: true,
          stroke: 'var(--chart-3)',
          strokeDasharray: '1,4',
          strokeStyle: 'gradient',
          strokeWidth: 2,
        }),
      ),
      XAxis(),
      ChartTooltip(),
    ],
  },
  composition: {
    aspectRatio: '2/1',
    children: [
      Grid({ horizontal: true }),
      Line({ dataKey: 'users', stroke: primary, strokeWidth: 3 }),
      Line({ dataKey: 'pageviews', stroke: secondary }),
      XAxis(),
      ChartTooltip(),
    ],
    renderContext: (context, h) => {
      const { yScale, innerWidth } = context.stable,
        y = yScale(1500),
        tooltip = context.hover.tooltipData,
        hovered = tooltip?.yPositions.users
      return h.g(
        [h.PointerEvents('none')],
        [
          h.line([
            h.Stroke(secondary),
            h.StrokeDasharray('4 4'),
            h.X1('0'),
            h.X2(String(innerWidth)),
            h.Y1(String(y)),
            h.Y2(String(y)),
          ]),
          h.text(
            [
              h.Fill('var(--chart-label)'),
              h.FontSize('11'),
              h.TextAnchor('end'),
              h.X(String(innerWidth)),
              h.Y(String(y - 6)),
            ],
            ['Threshold 1,500'],
          ),
          ...(tooltip && hovered !== undefined
            ? [
                h.circle([
                  h.Cx(String(tooltip.x)),
                  h.Cy(String(hovered)),
                  h.R('9'),
                  h.Fill('none'),
                  h.Stroke(primary),
                  h.StrokeWidth('2'),
                ]),
              ]
            : []),
        ],
      )
    },
  },
}
export const areaVariant: TimeSeriesProps<typeof AreaRow.Type> = {
  aspectRatio: '2/1',
  children: [
    Grid({ horizontal: true }),
    PatternArea({ dataKey: 'revenue', patternPreset: 'diagonal', patternColor: 'var(--chart-1)' }),
    Area({ dataKey: 'revenue', fillOpacity: 0, strokeWidth: 2.5 }),
    XAxis(),
    ChartTooltip(),
  ],
}
export const depthProps: (paused: boolean) => BarChartProps<typeof BarRow.Type> = (
  paused: boolean,
) => ({
  xDataKey: 'month',
  aspectRatio: '2/1',
  children: [
    Grid({ horizontal: true }),
    BarDepthProvider({
      groundShadow: 0.26,
      children: [
        BarDepthBack({ dataKey: 'revenue', color: 'var(--chart-1)' }),
        Bar({ dataKey: 'revenue', fill: 'var(--chart-1)' }),
        BarDepthFront({ dataKey: 'revenue' }),
        BarPulse({ dataKey: 'revenue', activeIndex: barData.length - 1, pulsePaused: paused }),
      ],
    }),
    BarXAxis(),
    ChartTooltip(),
  ],
})
const depthPlaying = depthProps(false),
  depthPaused = depthProps(true)
export const barVariants: Readonly<Record<string, BarChartProps<typeof BarRow.Type>>> = {
  depth: depthPaused,
  pulse: depthPlaying,
  squares: {
    xDataKey: 'month',
    aspectRatio: '2/1',
    children: [
      Grid({ horizontal: true }),
      BarColumnTrack({ fill: 'var(--muted)', opacity: 0.15 }),
      BarSquares({
        dataKey: 'revenue',
        fill: 'var(--chart-1)',
        useGradient: true,
        gradientStops: [
          { offset: 0, color: 'var(--chart-1)' },
          { offset: 100, color: 'var(--chart-2)' },
        ],
      }),
      BarSquares({ dataKey: 'profit', fill: 'var(--chart-2)', patternPreset: 'diagonal' }),
      BarXAxis(),
      ChartTooltip(),
    ],
  },
  composition: {
    xDataKey: 'month',
    aspectRatio: '2/1',
    barGap: 0,
    children: [
      Grid({ horizontal: true }),
      Bar({ dataKey: 'revenue', fill: primary }),
      Bar({ dataKey: 'profit', fill: secondary }),
      BarXAxis(),
      ChartTooltip({ showCrosshair: false, showDots: false }),
    ],
    renderContext: (context, h) => {
      const { barScale, bandWidth, innerHeight, yScale } = context.stable
      if (barScale === undefined || bandWidth === undefined) return h.empty
      return h.g(
        [h.PointerEvents('none')],
        barData.flatMap((row, index) =>
          ['revenue', 'profit'].map((dataKey, seriesIndex) =>
            motion.node(
              h.rect([
                h.Key(`${row.month}-${dataKey}`),
                h.Fill('var(--chart-indicator-color)'),
                h.Height('2'),
                h.Width(String(bandWidth / 2)),
                h.X(String((barScale(row.month) ?? 0) + (seriesIndex * bandWidth) / 2)),
              ]),
              {
                initial: false,
                animate: {
                  y:
                    context.hover.hoveredBarIndex === index
                      ? yScale(dataKey === 'revenue' ? row.revenue : row.profit)
                      : innerHeight,
                  opacity: context.hover.hoveredBarIndex === index ? 1 : 0,
                },
                transition: { type: 'spring', stiffness: 300, damping: 30 },
              },
            ),
          ),
        ),
      )
    },
  },
}
export const pulseOptions = (paused: boolean) => (paused ? depthPaused : depthPlaying)
const formatOptions = { style: 'currency' as const, currency: 'USD', maximumFractionDigits: 0 }
export const gauges: Readonly<Record<string, GaugeConfiguration>> = {
  arc: {
    value: 66,
    centerValue: 428000,
    defaultLabel: 'ARR run rate',
    formatOptions,
    inactiveFillOpacity: 0.4,
    spacing: 25,
  },
  track: {
    value: 72,
    orientation: 'linear',
    inactiveFillOpacity: 0.4,
    notchCornerRadius: 3,
    notchLengthPercent: 38,
    spacing: 0,
    totalNotches: 72,
    useGradient: true,
  },
  label: {
    value: 72,
    orientation: 'linear',
    centerValue: 428000,
    defaultLabel: 'ARR run rate',
    formatOptions,
    inactiveFillOpacity: 0.4,
    labelAlign: 'center',
    labelPlacement: 'bottom',
    notchCornerRadius: 3,
    spacing: 0,
    totalNotches: 72,
    useGradient: true,
  },
}
