import { DateTime, Effect, Schema } from 'effect'
import { curveMonotoneX } from 'd3-shape'
import {
  Background,
  Grid,
  Line,
  SegmentBackground,
  SegmentLineFrom,
  SegmentLineTo,
  lineLoadingSweepConfiguration,
  initialLineLoadingSweepPreference,
} from '@foldkit-visuals/charts/line'
import type {
  BackgroundProps,
  SegmentBackgroundProps,
  SegmentLineProps,
  SegmentLineVariant,
  LineLoadingPulseStrokeProps,
  TimeSeriesProps,
} from '@foldkit-visuals/charts/line'

export const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

export const rows = [20, 70, 45].map((value, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
    value,
  }),
)

export const LoadingSegmentFlags = Schema.Struct({ reducedMotion: Schema.Boolean })

export const loadingSegmentFlags = initialLineLoadingSweepPreference.pipe(
  Effect.map((reducedMotion) => LoadingSegmentFlags.make({ reducedMotion })),
)

export const standaloneSweep = lineLoadingSweepConfiguration({
  curve: curveMonotoneX,
  innerWidth: 400,
  innerHeight: 140,
  withArea: true,
})

export const contextSweep = lineLoadingSweepConfiguration({ curve: curveMonotoneX })

const background: BackgroundProps = { pattern: 'dots', opacity: 0.4 }

const segmentBackground: SegmentBackgroundProps = { fill: 'var(--chart-segment-background)' }

const gradient: SegmentLineVariant = 'gradient'

const segmentLine: SegmentLineProps = { variant: gradient, strokeWidth: 2 }

export const lineProps: TimeSeriesProps<typeof Row.Type> = {
  width: 640,
  height: 280,
  children: [
    Background(background),
    Grid(),
    Line({ dataKey: 'value', loading: false }),
    SegmentBackground(segmentBackground),
    SegmentLineFrom({ variant: 'dashed' }),
    SegmentLineTo(segmentLine),
  ],
}

const pathD = 'M0,80C80,10,160,120,240,60S320,20,400,80'

const pulseStroke =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('pulseStroke')
    ? { stroke: 'var(--chart-1)', strokeOpacity: 1, strokeWidth: 3 }
    : {}

export const pulseConfiguration: LineLoadingPulseStrokeProps = {
  ...pulseStroke,
  pathD,
  innerWidth: 400,
  innerHeight: 140,
  loopEpoch: 0,
}
