import type { FunnelChartProps } from '@foldkit-visuals/charts/funnel'
import { FunnelChart } from '@foldkit-visuals/charts/funnel'
import type { HeatmapChartProps } from '@foldkit-visuals/charts/heatmap'
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from '@foldkit-visuals/charts/heatmap'
import { ChartTooltip as LiveTooltip } from '@foldkit-visuals/charts/line'
import type { LiveLineChartProps } from '@foldkit-visuals/charts/live-line'
import { LiveLine, LiveLineChart, LiveXAxis } from '@foldkit-visuals/charts/live-line'
import type { PieChartProps } from '@foldkit-visuals/charts/pie'
import { PieCenter, PieChart, PieData, PieSlice } from '@foldkit-visuals/charts/pie'
import type { RadarChartProps } from '@foldkit-visuals/charts/radar'
import {
  RadarArea,
  RadarAxis,
  RadarChart,
  RadarGrid,
  RadarLabels,
} from '@foldkit-visuals/charts/radar'
import type { RingChartProps } from '@foldkit-visuals/charts/ring'
import { Ring, RingCenter, RingChart, RingData } from '@foldkit-visuals/charts/ring'
import { Clock, DateTime, Effect, Layer } from 'effect'
import { Block } from 'foldkit'

export const pieData = [
  { label: 'Design', value: 40, color: '#A088BF' },
  { label: 'Product', value: 30, color: '#C6B3D8' },
  { label: 'Engineering', value: 20, color: '#DDD2E6' },
  { label: 'Other', value: 10, color: '#ECE7F1' },
]
export const ringData = pieData.map((row) => ({ ...row, maxValue: 50 }))
export const radarData = [
  { label: 'This month', values: { clarity: 85, craft: 90, speed: 65, reach: 75, quality: 95 } },
  { label: 'Last month', values: { clarity: 60, craft: 70, speed: 80, reach: 50, quality: 65 } },
]
export const funnelData = [
  { label: 'Visitors', value: 10000 },
  { label: 'Interested', value: 6500 },
  { label: 'Qualified', value: 3200 },
  { label: 'Customers', value: 1200 },
]
export const heatData = Array.from({ length: 22 }, (_, column) => ({
  bin: column,
  bins: Array.from({ length: 7 }, (_, row) => ({
    bin: row,
    count: (column * 7 + row * 3) % 23,
    date: DateTime.toDateUtc(
      DateTime.makeUnsafe(`2026-01-01T00:00:00Z`).pipe(DateTime.add({ days: column * 7 + row })),
    ),
  })),
}))
const liveSnapshotTime = 1794268839000
export const liveData = Array.from({ length: 40 }, (_, index) => ({
  time: liveSnapshotTime / 1000 - 39 + index,
  value: 45 + Math.sin(index / 4) * 15,
}))
export const pie = PieChart({ name: 'showcase-pie', Row: PieData })
export const ring = RingChart({ name: 'showcase-ring', Row: RingData })
export const radar = RadarChart({ name: 'showcase-radar' })
export const funnel = FunnelChart({ name: 'showcase-funnel' })
export const heat = HeatmapChart({ name: 'showcase-heatmap' })
export const live = LiveLineChart({ name: 'showcase-live' })
const pieKey = Symbol('ShowcasePie'),
  ringKey = Symbol('ShowcaseRing'),
  radarKey = Symbol('ShowcaseRadar'),
  funnelKey = Symbol('ShowcaseFunnel'),
  heatKey = Symbol('ShowcaseHeatmap'),
  liveKey = Symbol('ShowcaseLive')
export const PieBlock = Block.make(pie.namespace, { ...pie.contract, key: pieKey })
export const RingBlock = Block.make(ring.namespace, { ...ring.contract, key: ringKey })
export const RadarBlock = Block.make(radar.namespace, { ...radar.contract, key: radarKey })
export const FunnelBlock = Block.make(funnel.namespace, { ...funnel.contract, key: funnelKey })
export const HeatBlock = Block.make(heat.namespace, { ...heat.contract, key: heatKey })
export const LiveBlock = Block.make(live.namespace, { ...live.contract, key: liveKey })
export const pieProps = {
  data: pieData,
  size: 240,
  innerRadius: 68,
  children: pieData
    .map((_, index) => PieSlice({ index, hoverEffect: 'translate' }))
    .concat([PieCenter({ defaultLabel: 'Projects' })]),
} satisfies PieChartProps
export const ringProps = {
  data: ringData,
  size: 240,
  children: [
    ...ringData.map((_, index) => Ring({ index })),
    RingCenter({ defaultLabel: 'Progress' }),
  ],
} satisfies RingChartProps
export const radarProps = {
  data: radarData,
  size: 260,
  margin: 40,
  metrics: [
    { key: 'clarity', label: 'Clarity' },
    { key: 'craft', label: 'Craft' },
    { key: 'speed', label: 'Speed' },
    { key: 'reach', label: 'Reach' },
    { key: 'quality', label: 'Quality' },
  ],
  children: [
    RadarGrid(),
    RadarAxis(),
    RadarLabels(),
    RadarArea({ index: 0 }),
    RadarArea({ index: 1 }),
  ],
} satisfies RadarChartProps
export const funnelProps = {
  data: funnelData,
  orientation: 'horizontal',
  labelLayout: 'spread',
} satisfies FunnelChartProps
export const heatProps = {
  data: heatData,
  aspectRatio: '3 / 1',
  children: [HeatmapCells(), HeatmapXAxis(), HeatmapYAxis(), HeatmapTooltip()],
} satisfies HeatmapChartProps
export const liveProps = {
  data: liveData,
  value: liveData.at(-1)?.value ?? 0,
  style: { height: 210 },
  window: 40,
  paused: true,
  children: [LiveLine({ dataKey: 'value' }), LiveXAxis(), LiveTooltip()],
} satisfies LiveLineChartProps
export const pieInputs = pie.inputs('preview-pie', pieProps),
  ringInputs = ring.inputs('preview-ring', ringProps),
  radarInputs = radar.inputs('preview-radar', radarProps),
  funnelInputs = funnel.inputs('preview-funnel', funnelProps),
  heatInputs = heat.inputs('preview-heatmap', heatProps),
  liveInputs = live.inputs('preview-live', liveProps)

const liveSnapshotClock = Layer.effect(
  Clock.Clock,
  Clock.clockWith((clock) =>
    Effect.succeed({
      currentTimeMillisUnsafe: () => liveSnapshotTime,
      currentTimeMillis: Effect.succeed(liveSnapshotTime),
      currentTimeNanosUnsafe: () => BigInt(liveSnapshotTime) * 1_000_000n,
      currentTimeNanos: Effect.succeed(BigInt(liveSnapshotTime) * 1_000_000n),
      monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
      monotonicTimeNanos: clock.monotonicTimeNanos,
      sleep: clock.sleep.bind(clock),
    }),
  ),
)
const livePlans = live.plans(LiveBlock)
export const PieLayer = PieBlock.makeLayer(pie.plans(PieBlock)),
  RingLayer = RingBlock.makeLayer(ring.plans(RingBlock)),
  RadarLayer = RadarBlock.makeLayer(radar.plans(RadarBlock)),
  FunnelLayer = FunnelBlock.makeLayer(funnel.plans(FunnelBlock)),
  HeatLayer = HeatBlock.makeLayer(heat.plans(HeatBlock)),
  LiveLayer = LiveBlock.makeLayer({
    ...livePlans,
    EffectsLayer: livePlans.EffectsLayer.pipe(Layer.provide(liveSnapshotClock)),
  })
