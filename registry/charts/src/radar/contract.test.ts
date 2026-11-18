import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import { createRadarAreaLayer } from './area-layer'
import { Option, Predicate } from 'effect'
import { constUndefined } from 'effect/Function'
import type { SceneNode } from '@tanstack/charts'
import { RadarChart, RadarArea, RadarAxis, RadarGrid, RadarLabels } from './index'
import { radarDefinition } from './build'
import { radarContext } from './context'
import { seriesRows } from './rows'
import type { RadarData } from './rows'

const metrics = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
]

const data: Array<RadarData> = [
  { label: 'First', values: { a: 120, b: -10, c: 50 } },
  { label: 'Second', color: 'blue', values: { a: 30, b: 60, c: 90 } },
]

const flat: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((n) => (n.kind === 'group' ? flat(n.children) : [n]))

it('draws only requested radar parts with raw Source data, per-area paint and navigable series', () => {
  expect(
    seriesRows({ label: 'Sparse', values: { a: 120, b: -10 } }, 0, metrics).map((r) => r.value),
  ).toEqual([120, -10, 0])

  const runtime = createChartRuntime<
    ReturnType<typeof seriesRows>[number],
    string | number,
    number
  >()

  try {
    const definition = radarDefinition({
      data,
      metrics,
      size: 320,
      animate: false,
      children: [
        RadarGrid({ showLabels: false }),
        RadarAxis(),
        RadarLabels(),
        RadarArea({ index: 1, color: 'red', showPoints: false }),
        RadarArea({ index: 99 }),
      ],
    })

    const scene = runtime.render(definition, { width: 320, height: 320 })
    const nodes = flat(scene.nodes)

    expect(nodes.filter((n) => n.kind === 'area')).toHaveLength(1)
    expect(nodes.filter((n) => n.kind === 'dot')).toHaveLength(0)
    expect(
      nodes.filter((n) => n.kind === 'label').map((n) => (n.kind === 'label' ? n.text : '')),
    ).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(nodes.find((n) => n.kind === 'area')?.style?.fill).toBe('red')

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing radar focus')
    }

    expect(definition.focus.navigation(scene.points).map((p) => p.datum.series)).toEqual([1])
  } finally {
    runtime.destroy()
  }
})

it.effect(
  'retains controlled hover across observations and exposes real source context geometry',
  () => {
    const radar = RadarChart({ name: 'radar-contract' })
    const Key = Symbol('RadarContract')
    const Declared = Block.make(radar.namespace, { ...radar.contract, key: Key })

    return Story.story(
      { block: Declared, layer: Declared.makeLayer(radar.plans<typeof Key>(Declared)) },
      Story.init('radar', data, { controlled: true, index: Option.some(1) }),
      Story.message(Declared.Message.ObservedFocus({ index: 0 })),
      Story.model((model) => expect(Option.getOrNull(model.focusedIndex)).toBe(1)),
      Story.inMessage(Declared.InMessage.RequestedData({ data: [] })),
      Story.model((model) => {
        expect(model.data).toEqual([])
        const context = radarContext(
          { data, metrics, size: 320, margin: 60, children: [] },
          1,
          () => {},
        )
        expect(context.radius).toBe(100)
        expect(context.getPointPosition(0, 50).y).toBe(-50)
        expect(context.getColor(1)).toBe('blue')
        expect(radarContext({ data, metrics, children: [] }, null, () => {}).radius).toBe(0)
      }),
      Story.message(Declared.Message.ObservedSize({ size: 320 })),
      Story.model((model) => {
        const measured = radar.context(
          model,
          { data, metrics, size: 0, margin: 60, children: [] },
          constUndefined,
        )
        expect(measured.size).toBe(320)
        expect(measured.radius).toBe(100)
        expect(measured.getPointPosition(0, 50).y).toBe(-50)
      }),
      Story.message(Declared.Message.ObservedSize({ size: 280 })),
      Story.model((model) => {
        const resized = radar.context(
          model,
          { data, metrics, size: 0, margin: 60, children: [] },
          constUndefined,
        )
        expect(resized.size).toBe(280)
        expect(resized.radius).toBe(80)
        expect(resized.getPointPosition(0, 50).y).toBe(-40)
        const fixed = radar.context(
          model,
          { data, metrics, size: 320, margin: 60, children: [] },
          constUndefined,
        )
        expect(fixed.size).toBe(320)
        expect(fixed.radius).toBe(100)
      }),
    )
  },
)

it('uses the original grid entrance override instead of its fallback spring', () => {
  const enterTransition = { type: 'tween', duration: 0.4, ease: 'linear' }
  const props = { data, metrics, size: 320, children: [RadarGrid()], enterTransition }
  const definition = radarDefinition(props)
  const mark = definition.marks[0]?.initialize({ markIndex: 0 })

  if (!Predicate.isFunction(mark?.motion)) {
    throw new TypeError('Missing public polar motion policy')
  }

  const entered = mark.motion({
    phase: 'enter',
    role: 'line',
    key: 'ring',
    markId: 'radar:ring-1-',
    seriesKey: '',
    seriesIndex: 0,
    datumIndex: 0,
    datumCount: metrics.length,
    datum: undefined,
    point: undefined,
  })

  expect(entered).toEqual({
    delay: 80,
    transition: { type: 'tween', duration: 400, easing: 'linear' },
  })
  expect(radarContext(props, null, () => {}).enterTransition).toBe(enterTransition)
})

it('keeps Original out-of-domain values in public scene coordinates and context projections', () => {
  const props = { data, metrics, size: 320, margin: 60, children: [RadarArea({ index: 0 })] }

  const runtime = createChartRuntime<
    ReturnType<typeof seriesRows>[number],
    string | number,
    number
  >()

  try {
    const scene = runtime.render(radarDefinition(props), { width: 320, height: 320 })
    const context = radarContext(props, null, () => {})

    for (const [index, metric] of metrics.entries()) {
      const point = scene.points.find((candidate) => candidate.datum.metric === metric.key)

      if (point === undefined) {
        throw new Error('Missing public series point')
      }

      const position = context.getPointPosition(index, data[0]?.values[metric.key] ?? 0)

      expect(point.x).toBeCloseTo(160 + position.x, 8)
      expect(point.y).toBeCloseTo(160 + position.y, 8)
    }
  } finally {
    runtime.destroy()
  }
})

it('composes polygons and circles through one stable public layer and keeps native focus points', () => {
  const areas = createRadarAreaLayer()

  const base = createSvgChartRenderer<
    ReturnType<typeof seriesRows>[number],
    string | number,
    number
  >()

  const first = areas.layer.compose(base)
  expect(areas.layer.compose(base)).toBe(first)

  const runtime = createChartRuntime<
    ReturnType<typeof seriesRows>[number],
    string | number,
    number
  >()

  try {
    const definition = radarDefinition(
      {
        data,
        metrics,
        size: 320,
        children: [RadarGrid(), RadarArea({ index: 0 }), RadarArea({ index: 1 })],
      },
      areas.layer,
    )

    const scene = runtime.render(definition, { width: 320, height: 320 })
    const custom: Array<SceneNode> = []

    const collect = (nodes: ReadonlyArray<SceneNode>) => {
      for (const node of nodes) {
        if (node.renderer === areas.layer) {
          custom.push(node)
        }

        if (node.kind === 'group') {
          collect(node.children)
        }
      }
    }

    collect(scene.nodes)
    expect(custom).toHaveLength(4)

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing public radar focus')
    }

    expect(definition.focus.navigation(scene.points).map((point) => point.datum.series)).toEqual([
      0, 1,
    ])
  } finally {
    runtime.destroy()
  }
})

it('resolves overlapping polygons in authored paint order instead of numeric data order', () => {
  const overlapping: Array<RadarData> = [
    { label: 'Under', values: { a: 80, b: 80, c: 80 } },
    { label: 'Over', values: { a: 80, b: 80, c: 80 } },
  ]

  const runtime = createChartRuntime<
    ReturnType<typeof seriesRows>[number],
    string | number,
    number
  >()

  try {
    const definition = radarDefinition({
      data: overlapping,
      metrics,
      size: 320,
      children: [RadarArea({ index: 1 }), RadarArea({ index: 0 })],
    })

    const scene = runtime.render(definition, { width: 320, height: 320 })

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing public radar focus')
    }

    const focus = definition.focus.resolve(scene.points, { x: 160, y: 160, maxDistance: 100 })
    expect(focus.length).toBeGreaterThan(0)
    expect(new Set(focus.map((point) => point.datum.series))).toEqual(new Set([0]))
  } finally {
    runtime.destroy()
  }
})
