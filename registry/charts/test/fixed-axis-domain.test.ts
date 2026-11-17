import { DateTime, Schema } from 'effect'
import { expect, it } from 'vitest'
import type { DomChartDefinition } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ComposedChart,
  SeriesBar,
  YAxis,
  BarXAxis,
  BarDepthBack,
  BarDepthFront,
  Bar,
  useBarDepthEntries,
} from '../src/index'
import { initialInteraction } from '../src/cartesian/state'
import { projectTimeSeriesViewContext } from '../src/cartesian/chart-view-context'
import { projectBarViewContext, barViewport } from '../src/bar/view-context'
import { TimeSeriesDomainFrame } from '../src/cartesian/time-series-domain-frame'
import { ComposedBarDatum } from '../src/composed/bars'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import { data, draw, props, subject, flatten } from './bar-geometry-subject'
import { Story } from 'foldkit'
import { it as effectIt } from '@effect/vitest'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  other: Schema.Finite,
})
const rows = [20, 40].map((value, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
  value,
  other: value * 100,
}))
const axes = [YAxis({ domain: [3, 97] }), YAxis({ yAxisId: 'right', domain: [1000, 9000] })]
const capabilities = {
  focusRow: (index: number | null) => index,
  setTooltipData: () => null,
  clearSelection: () => null,
}
const viewport = {
  width: 500,
  height: 300,
  margin: { top: 40, left: 40, right: 40, bottom: 40 },
  xDomain: [0, 1000] as const,
}

for (const family of ['line', 'area', 'composed'] as const) {
  it(`${family} applies exact independent domains to public drawing, focus and context`, () => {
    const children = [
      family === 'area' ? Area({ dataKey: 'value' }) : Line({ dataKey: 'value' }),
      Line({ dataKey: 'other', yAxisId: 'right' }),
      ...axes,
    ]
    const configuration = { animationDuration: 0, yDomain: [0, 200] as const, children }
    const render = <Datum>(definition: DomChartDefinition<Datum, Date, number>) => {
      const runtime = createChartRuntime<Datum, Date, number>()
      try {
        return runtime.render(definition, { width: 500, height: 300 })
      } finally {
        runtime.destroy()
      }
    }
    const scene =
      family === 'composed'
        ? render(
            ComposedChart({ name: family, Row }).inputs(family, configuration).definition(rows),
          )
        : render(
            (family === 'line'
              ? LineChart({ name: family, Row })
              : AreaChart({ name: family, Row })
            )
              .inputs(family, configuration)
              .definition(rows),
          )
    expect(scene.scales.y?.domain).toEqual([3, 97])
    expect(scene.scales['y:right']?.domain).toEqual([1000, 9000])
    expect(scene.points[0]?.y).toBeCloseTo(40 + 220 * (1 - 17 / 94), 8)
    const state = {
      ...initialInteraction(),
      domains: { left: [0, 200] as const, right: [0, 5000] as const },
    }
    const context = projectTimeSeriesViewContext(
      configuration,
      (row: typeof Row.Type) => row.date,
      { current: null },
      family === 'composed' ? { kind: 'composed', lines: [], extras: {} } : family,
    )(rows, 0, state, viewport, capabilities)
    expect(context.stable.yDomainTargetByAxis).toEqual({ left: [3, 97], right: [1000, 9000] })
    expect(context.hover.tooltipData?.yPositions.value).toBeCloseTo(220 * (1 - 17 / 94), 8)
  })
}

it('fixed axes bypass stale snap origins and domain tweens', () => {
  let now = 0
  const state = { ...initialInteraction(), revealReady: true }
  const configuration = {
    children: [Line({ dataKey: 'value' }), Line({ dataKey: 'other', yAxisId: 'right' }), ...axes],
  }
  const frame = new TimeSeriesDomainFrame<typeof Row.Type>(
    () => now,
    () => configuration,
    () => state,
    () => false,
  )
  frame.resolve({ left: [0, 45], right: [0, 4500] })
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()
  try {
    const render = () =>
      runtime.render(
        buildTimeSeriesDefinition(rows, {
          id: 'fixed-frame',
          x: (row) => row.date,
          children: configuration.children,
          yDomainFrom: { left: [0, 45], right: [0, 4500] },
          domainFrame: frame,
        }),
        { width: 500, height: 300 },
      )
    render()
    now = 250
    const scene = render()
    expect(scene.scales.y?.domain).toEqual([3, 97])
    expect(scene.scales['y:right']?.domain).toEqual([1000, 9000])
    expect(frame.active).toBe(false)
  } finally {
    runtime.destroy()
  }
})

effectIt.effect(
  'Bar uses fixed bounds in native rectangles, context and horizontal numeric ticks',
  () =>
    Story.withBlock(subject, (owner) => {
      const configuration = {
        ...props,
        yDomain: [0, 200] as const,
        children: [...props.children, ...axes],
      }
      const { scene, snapshot } = draw(owner, configuration)
      expect(scene.scales.y?.domain).toEqual([3, 97])
      expect(scene.scales['y:right']?.domain).toEqual([1000, 9000])
      expect(scene.points[0]?.y).toBeCloseTo(400 * (1 - 17 / 94), 8)
      const context = projectBarViewContext(configuration, { current: null })(
        data,
        0,
        initialInteraction(),
        barViewport(snapshot),
        capabilities,
      )
      expect(context.stable.yDomainTargetByAxis).toEqual({ left: [3, 97], right: [1000, 9000] })
      expect(context.hover.tooltipData?.yPositions.a).toBeCloseTo(400 * (1 - 17 / 94), 8)
      const horizontal = draw(owner, {
        ...props,
        orientation: 'horizontal',
        yDomain: [0, 100] as const,
        children: [
          BarXAxis({ type: 'number', formatValue: (value) => `${value}%` }),
          ...props.children.slice(0, 1),
        ],
      })
      expect(horizontal.scene.scales.x?.domain).toEqual([0, 100])
      expect(horizontal.scene.points[0]?.x).toBe(80)
      const labels = flatten(horizontal.scene.nodes).filter(
        (node) => node.kind === 'label' && node.text.endsWith('%'),
      )
      expect(labels.map((node) => (node.kind === 'label' ? node.text : ''))).toContain('100%')
    }),
)

it('Composed primary shorthand includes bars without changing secondary inference', () => {
  const recipe = ComposedChart({ name: 'composed-primary', Row })
  const runtime = createChartRuntime<
    typeof Row.Type | ComposedBarDatum<typeof Row.Type>,
    Date,
    number
  >()
  try {
    const scene = runtime.render(
      recipe
        .inputs('composed-primary', {
          yDomain: [3, 97],
          children: [SeriesBar({ dataKey: 'value' }), Line({ dataKey: 'other', yAxisId: 'right' })],
        })
        .definition(rows),
      { width: 500, height: 300 },
    )
    expect(scene.scales.y?.domain).toEqual([3, 97])
    expect(scene.scales['y:right']?.domain).toEqual([0, 4500])
  } finally {
    runtime.destroy()
  }
})

for (const domain of [
  [0, Infinity],
  [4, 4],
  [100, 0],
  [Number.NaN, 1],
] as const) {
  it(`rejects invalid per-axis bounds ${String(domain)}`, () => {
    const recipe = LineChart({ name: 'invalid-axis', Row })
    expect(() =>
      recipe
        .inputs('invalid-axis', {
          children: [Line({ dataKey: 'value' }), YAxis({ yAxisId: 'right', domain })],
        })
        .definition(rows),
    ).toThrow(RangeError)
  })
}

effectIt.effect('secondary depth faces and public depth entries share their front scale', () =>
  Story.withBlock(subject, (owner) => {
    const configuration = {
      ...props,
      barGap: 0.2,
      children: [
        Bar({ dataKey: 'b', yAxisId: 'right', perspective: true }),
        BarDepthBack({ dataKey: 'b' }),
        BarDepthFront({ dataKey: 'b' }),
        YAxis({ domain: [0, 100] }),
        YAxis({ yAxisId: 'right', domain: [0, 10000] }),
      ],
    }
    const { scene, snapshot } = draw(owner, configuration)
    const front = flatten(scene.nodes).find((node) => node.key === 'bars:0:b')
    const target = snapshot.depthTargets.find(
      (entry) => entry.kind === 'back' && entry.entry.index === 0,
    )?.entry
    if (front?.kind !== 'rect' || target === undefined)
      throw new Error('Expected painted depth bar')
    expect(target.naturalHeight).toBeCloseTo(80, 8)
    expect(target.topY).toBeCloseTo(front.y, 8)
    const context = projectBarViewContext(configuration, { current: null })(
      data,
      0,
      initialInteraction(),
      barViewport(snapshot),
      capabilities,
    )
    const entry = useBarDepthEntries(context, 'b')[0]
    expect(entry?.naturalHeight).toBeCloseTo(80, 8)
    expect(entry?.topY).toBeCloseTo(front.y, 8)
  }),
)

effectIt.effect('custom depth entries retain primary projection for inferred named axes', () =>
  Story.withBlock(subject, (owner) => {
    const configuration = {
      ...props,
      barGap: 0.2,
      children: [Bar({ dataKey: 'a' }), Bar({ dataKey: 'b', yAxisId: 'right' })],
    }
    const { snapshot } = draw(owner, configuration)
    const context = projectBarViewContext(configuration, { current: null })(
      data,
      0,
      initialInteraction(),
      barViewport(snapshot),
      capabilities,
    )
    expect(useBarDepthEntries(context, 'b')[0]?.naturalHeight).toBeCloseTo((400 * 2000) / 45, 8)
  }),
)
