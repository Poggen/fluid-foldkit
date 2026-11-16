import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { DateTime, Schema } from 'effect'
import { expect } from 'vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import {
  buildProjectionPath,
  LineChart,
  Line,
  Area,
  ProjectionLine,
  ProjectionLineEndMarker,
  LineSeriesTerminalMarker,
  ChartMarkers,
  MarkerGroup,
} from '../src/index'
import type { CartesianLayer } from '../src/cartesian/layers'
import type { CartesianSnapshot } from '../src/cartesian/definition'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const at = (time: number) => DateTime.toDateUtc(DateTime.makeUnsafe(time))

const rows = [Row.make({ date: at(0), value: 10 }), Row.make({ date: at(1000), value: 20 })]

const root = LineChart({ name: 'source-overlay-paint-contract', Row })

export const OverlayPaintKey = Symbol('OverlayPaintKey')

const Chart = Block.make(root.namespace, { key: OverlayPaintKey, ...root.contract })

const subject = { block: Chart, layer: Chart.makeLayer(root.plans(Chart)) }

const projection = buildProjectionPath({
  sourceData: rows,
  seriesKey: 'value',
  mode: 'target',
  horizonPoints: 1,
  endValue: 40,
})

const allNodes = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? [node, ...allNodes(node.children)] : [node]))

const draw = (chart: Story.TestBlock<typeof subject>, children: ReadonlyArray<CartesianLayer>) => {
  const props = { children: [Line({ dataKey: 'value' }), ...children], animationDuration: 0 }
  const initial = chart.init('overlay-owner', rows, root.configuration(props)).model

  const ready = chart.update(
    initial,
    chart.Message.CompletedReveal({ generation: initial.generation }),
  ).model

  const compile = root.inputs('overlay-owner', props).resourceDefinition
  let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

  if (compile === undefined) {
    throw new Error('Actual LineChart resource compiler missing')
  }

  const runtime = createChartRuntime<typeof Row.Type, Date, number>()

  try {
    const scene = runtime.render(
      compile(
        rows,
        ready,
        (value) => {
          snapshot = value
        },
        () => 0,
      ),
      { width: 320, height: 180 },
    )

    if (snapshot === undefined) {
      throw new Error('Actual compiler did not publish measurement')
    }

    return { nodes: allNodes(scene.nodes), gradients: scene.gradients, snapshot }
  } finally {
    runtime.destroy()
  }
}

effectIt.effect(
  'public ProjectionLine widens the actual domains and draws a scoped gradient with Source tail clearance',
  () =>
    Story.withBlock(subject, (chart) => {
      const invalid = at(0)

      invalid.setTime(Number.NaN)

      const manual = buildProjectionPath({
        sourceData: [],
        seriesKey: 'value',
        mode: 'manual',
        points: [
          { date: invalid, value: 1 },
          { date: at(1), value: 2 },
        ],
      })

      expect(Number.isNaN(manual.at(0)?.date.getTime())).toBe(true)
      expect(manual.at(0)?.date).not.toBe(invalid)
      expect(
        buildProjectionPath({
          sourceData: [{ date: 'invalid-date', value: 2 }],
          seriesKey: 'value',
          mode: 'target',
          endValue: 4,
        }),
      ).toEqual([])
      const local = '2025-01-02T03:04:05'

      const parsed = buildProjectionPath({
        sourceData: [{ date: local, value: 2 }],
        seriesKey: 'value',
        mode: 'target',
        endValue: 4,
      })

      expect(parsed.at(0)?.date.getTime()).toBe(Date.parse(local))

      const getterTrace: Array<string> = []
      const observedDate = at(0)
      const originalGetTime = observedDate.getTime.bind(observedDate)
      let dateMethodReads = 0

      observedDate.getTime = () => {
        dateMethodReads += 1

        return originalGetTime()
      }

      class GetterRow {
        readonly #trace: Array<string>
        readonly #date: Date

        constructor(trace: Array<string>, date: Date) {
          this.#trace = trace
          this.#date = date
        }

        get date() {
          this.#trace.push('date')

          return this.#date
        }

        get value() {
          this.#trace.push('value')

          return 2
        }

        get unrelated() {
          this.#trace.push('unrelated')

          throw new Error('Unrelated Source field read')
        }
      }

      const inherited = buildProjectionPath({
        sourceData: [new GetterRow(getterTrace, observedDate)],
        seriesKey: 'value',
        mode: 'target',
        endValue: 4,
      })

      expect(getterTrace).toEqual(['date', 'value'])
      expect(dateMethodReads).toBe(2)
      expect(inherited.map((point) => point.value)).toEqual([2, 4])
      let invalidDateReads = 0

      invalid.getTime = () => {
        invalidDateReads += 1

        return Number.NaN
      }

      expect(
        buildProjectionPath({
          sourceData: [{ date: invalid, value: 2 }],
          seriesKey: 'value',
          mode: 'target',
          endValue: 4,
        }),
      ).toEqual([])
      expect(invalidDateReads).toBe(1)

      const proxyTrace: Array<string> = []

      const virtual = new Proxy(
        {},
        {
          has() {
            throw new Error('Source does not inspect has traps')
          },
          get(_target, key) {
            proxyTrace.push(String(key))

            if (key === 'date') {
              return at(0)
            }

            if (key === 'value') {
              return 2
            }

            throw new Error('Unexpected public projection field')
          },
        },
      )

      const projected = buildProjectionPath({
        sourceData: [virtual],
        seriesKey: 'value',
        mode: 'target',
        endValue: 4,
      })

      expect(proxyTrace).toEqual(['date', 'value'])
      expect(projected.map((point) => point.value)).toEqual([2, 4])

      const { nodes, gradients, snapshot } = draw(chart, [
        ProjectionLine({
          data: projection,
          strokeStyle: 'gradient',
          gradientStart: 'red',
          gradientEnd: 'blue',
        }),
        ProjectionLineEndMarker({ data: projection }),
        LineSeriesTerminalMarker({ dataKey: 'value', fill: 'gold', ringGap: 2 }),
      ])

      expect(snapshot.domains.x.map((value) => value.getTime())).toEqual([0, 2000])
      expect(snapshot.targetY.left).toEqual([0, 44])

      const forecast = nodes.find(
        (node) => node.kind === 'polyline' && node.key.startsWith('projection:0'),
      )

      if (forecast?.kind !== 'polyline') {
        throw new Error('Projection path missing from actual scene')
      }

      expect(forecast.style?.stroke).toBe('url(#overlay-owner-proj-0)')
      expect(forecast.style?.strokeDasharray).toBe('6 4')
      expect(forecast.points.at(0)?.[0]).toBeCloseTo(160, 8)
      expect(forecast.points.at(-1)?.[0]).toBeCloseTo(272.92, 8)
      const paint = gradients.find((gradient) => gradient.id === 'overlay-owner-proj-0')
      expect(paint?.stops).toEqual([
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' },
      ])

      const ring = nodes.find(
        (node) => node.kind === 'dot' && node.key.startsWith('terminal:0:ring'),
      )

      const core = nodes.find(
        (node) => node.kind === 'dot' && node.key.startsWith('terminal:0:core'),
      )

      if (ring?.kind !== 'dot' || core?.kind !== 'dot') {
        throw new Error('Terminal marker ring/core missing')
      }

      expect(ring.radius).toBe(7.75)
      expect(core.radius).toBe(5)
      expect(core.style?.fill).toBe('gold')
      expect(ring.x).toBeCloseTo(160, 8)
      expect(nodes.some((node) => node.key.startsWith('projectionEndMarker'))).toBe(false)
    }),
)

effectIt.effect(
  'public projection bezier retains horizontal 0.45 tangents and no-marker edge clearance',
  () =>
    Story.withBlock(subject, (chart) => {
      const legacyProps = { data: projection, curveKind: 'bezier' as const, showEndpoints: false }
      const { nodes } = draw(chart, [ProjectionLine(legacyProps)])

      const forecast = nodes.find(
        (node) => node.kind === 'polyline' && node.key.startsWith('projection:0'),
      )

      if (forecast?.kind !== 'polyline') {
        throw new Error('Bezier projection missing')
      }

      const controls = /C(?<first>[\d.]+),[\d.]+,(?<second>[\d.]+),/u.exec(forecast.path ?? '')

      expect(Number(controls?.groups?.first)).toBeCloseTo(213.082, 3)
      expect(Number(controls?.groups?.second)).toBeCloseTo(224.878, 3)
      expect(forecast.points.at(-1)?.[0]).toBeCloseTo(277.96, 8)
      expect(
        nodes.filter((node) => node.kind === 'dot' && node.key.startsWith('terminal:')),
      ).toHaveLength(0)
    }),
)

effectIt.effect(
  'event markers group same-date items in first-seen order and retain capped fan and full count',
  () =>
    Story.withBlock(subject, (chart) => {
      const items = [
        { date: at(1000), title: 'First', icon: 'A' },
        { date: at(0), title: 'Earlier date seen second', icon: 'B' },
        { date: at(1000), title: 'Second same-date event', icon: 'C' },
      ]

      const { nodes } = draw(chart, [
        ChartMarkers({ items, maxFanned: 1 }),
        MarkerGroup({
          markers: [{ date: at(0), title: 'Standalone group', icon: 'D' }],
          showLine: false,
        }),
      ])

      const first = nodes.find((node) => node.key === 'evtmarker:0:g0')
      const second = nodes.find((node) => node.key === 'evtmarker:0:g1')

      if (first?.kind !== 'group' || second?.kind !== 'group') {
        throw new Error('Event groups missing')
      }

      expect(first.translateX).toBe(280)
      expect(first.translateY).toBe(32)
      expect(second.translateX).toBe(40)
      expect(
        nodes.filter((node) => node.kind === 'group' && /^evtmarker:0:g0:item\d+$/u.test(node.key)),
      ).toHaveLength(1)
      expect(nodes.find((node) => node.key === 'evtmarker:0:g0:badge-count')).toMatchObject({
        kind: 'label',
        text: '2',
      })
      expect(nodes.find((node) => node.key === 'evtmarker:0:g0:icon')).toMatchObject({
        kind: 'label',
        text: 'A',
      })
      expect(nodes.some((node) => node.key === 'evtmarker:1:g0:rule')).toBe(false)
    }),
)

effectIt.effect('Area gradientSpan compresses the actual fill gradient with Source bounds', () =>
  Story.withBlock(subject, (chart) => {
    const cases = [
      { props: {}, offsets: [0, 1] },
      { props: { gradientSpan: 0.25 }, offsets: [0, 0.25, 1] },
      { props: { gradientSpan: 0 }, offsets: [0, 0.01, 1] },
      { props: { gradientSpan: 2 }, offsets: [0, 1] },
    ]

    for (const { props, offsets } of cases) {
      const { gradients } = draw(chart, [
        Area({
          dataKey: 'value',
          fill: 'rebeccapurple',
          fillOpacity: 0.6,
          gradientToOpacity: 0.2,
          ...props,
        }),
      ])

      const paint = gradients.find((gradient) => gradient.id === 'overlay-owner-area-0')

      expect(paint?.stops.map((stop) => stop.offset)).toEqual(offsets)
      expect(paint?.stops.map((stop) => stop.color)).toEqual(offsets.map(() => 'rebeccapurple'))
      expect(paint?.stops.map((stop) => stop.opacity)).toEqual([
        0.6,
        ...offsets.slice(1).map(() => 0.2),
      ])
    }

    const { gradients } = draw(chart, [
      Area({ dataKey: 'value', fill: 'url(#external-paint)', gradientSpan: 0.25 }),
    ])

    expect(gradients.some((gradient) => gradient.id === 'overlay-owner-area-0')).toBe(false)
  }),
)
