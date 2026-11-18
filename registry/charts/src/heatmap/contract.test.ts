import { expect, it } from 'vitest'
import { DateTime, Effect, Option, Schema } from 'effect'
import { findNearestPoint } from '@tanstack/charts/scene'
import { Block, Story } from 'foldkit'
import { it as effectIt } from '@effect/vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import {
  HeatmapChart,
  HeatmapCells,
  HeatmapXAxis,
  HeatmapYAxis,
  HeatmapSeparator,
  HeatmapChartLoading,
} from './index'
import { heatmapDefinition } from './build'
import { heatmapResources } from './resources'
import { localCalendarDate } from './calendar-date'
import type { CellDatum } from './definition'
import type { HeatmapColumn } from './columns'

const date = (day: number) =>
  DateTime.toDateUtc(DateTime.makeUnsafe(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`))

const data: Array<HeatmapColumn> = [0, 1].map((column) => ({
  bin: column,
  bins: Array.from({ length: 7 }, (_, row) => ({
    bin: row,
    count: row % 5,
    date: date(4 + column * 7 + row),
  })),
}))

const flat = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? flat(node.children) : [node]))

it('renders weekday cells, month labels and configured separator geometry using the real engine', () => {
  const runtime = createChartRuntime<Readonly<CellDatum>, number | string, string>()

  try {
    const definition = heatmapDefinition(
      {
        data,
        animate: false,
        binSize: 12,
        children: [
          HeatmapCells({ hideGhostCells: false, rowOpacity: [0.5, 1, 1, 1, 1, 1, 1] }),
          HeatmapXAxis(),
          HeatmapYAxis({ tickFilter: 'all' }),
          HeatmapSeparator({ every: 1, spacing: 8, stroke: 'red' }),
        ],
      },
      300,
      'contract',
      { at: null, origin: () => null, now: () => 0 },
      () => null,
      date(20),
    )

    const scene = runtime.render(definition, { width: 300, height: 112 })
    expect(scene.points.filter((point) => point.markId.startsWith('heatmap-cells-'))).toHaveLength(
      14,
    )
    expect(
      scene.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    ).toBe(true)
    const nodes = flat(scene.nodes)
    expect(nodes.filter((node) => node.kind === 'rule').length).toBeGreaterThan(0)
    expect(
      nodes
        .filter((node) => node.kind === 'label')
        .map((node) => (node.kind === 'label' ? node.text : '')),
    ).toContain('Oct')
  } finally {
    runtime.destroy()
  }
})

const chart = HeatmapChart({ name: 'heatmap-contract' })

export const HeatmapContractKey = Symbol('HeatmapContract')

const HeatmapBlock = Block.make(chart.namespace, { ...chart.contract, key: HeatmapContractKey })

const subject = {
  block: HeatmapBlock,
  layer: HeatmapBlock.makeLayer(chart.plans<typeof HeatmapContractKey>(HeatmapBlock)),
}

effectIt.effect(
  'keeps legend and cell focus exclusive through public checked messages and preserves loading dates',
  () =>
    Story.story(
      subject,
      Story.init('contract', data),
      Story.inMessage(HeatmapBlock.InMessage.RequestedFocus({ index: 3 })),
      Story.inMessage(HeatmapBlock.InMessage.RequestedLegendLevel({ level: 2 })),
      Story.model((model) => {
        expect(Option.getOrNull(model.focusedIndex)).toBeNull()
        expect(Option.getOrNull(model.hoveredLegendLevel)).toBe(2)
      }),
      Story.message(HeatmapBlock.Message.ObservedFocus({ index: 5 })),
      Story.model((model) => {
        expect(Option.getOrNull(model.hoveredLegendLevel)).toBeNull()
        expect(Option.getOrNull(model.focusedIndex)).toBe(5)
        const loading = HeatmapChartLoading({ data })
        expect(loading.data[0]?.bins[3]?.count).toBe(0)
        expect(loading.data[0]?.bins[3]?.date).toBe(data[0]?.bins[3]?.date)
      }),
    ),
)

it('backs patterned cell paints with scoped portable resources and caller-controlled fills', () => {
  const resources = heatmapResources(
    [
      { color: 'red', fillMode: 'pattern', pattern: 'cross' },
      { color: 'blue' },
      { color: 'green' },
      { color: 'orange' },
      { color: 'purple' },
    ],
    'one',
    40,
    28,
  )

  expect(resources.map((resource) => resource.attributes.id)).toEqual([
    'one-heatmap-level-0-base',
    'one-heatmap-level-0',
  ])
  expect(resources[1]?.attributes.href).toBe('#one-heatmap-level-0-base')
  expect(resources[1]?.attributes.patternTransform).toBe('translate(40 28)')
  expect(resources[0]?.children.filter((child) => child.tag === 'path')).toHaveLength(2)
})

it.each([undefined, false])(
  'unknown bins stay blank without shifting weekday geometry (hideGhostCells=%s)',
  (hideGhostCells) => {
    const runtime = createChartRuntime<Readonly<CellDatum>, number | string, string>()
    const unknown = [0, 1].map((column) => ({
      bin: column,
      bins: Array.from({ length: 7 }, (_, row) => ({
        bin: row,
        count: 0,
        date:
          column === 0
            ? localCalendarDate(2025, 10, 30 + row)
            : localCalendarDate(2026, 10, 15 + row),
        ...(column === 1 && row === 1 ? { observed: false } : row === 2 ? { observed: true } : {}),
      })),
    }))
    try {
      const definition = heatmapDefinition(
        {
          data: unknown,
          animate: false,
          binSize: 12,
          children: [HeatmapCells(hideGhostCells === undefined ? {} : { hideGhostCells })],
        },
        300,
        'unknown',
        { at: null, origin: () => null, now: () => 0 },
        () => null,
        localCalendarDate(2026, 10, 17),
      )
      const scene = runtime.render(definition, { width: 300, height: 113 })
      const cells = scene.points.filter((point) => point.markId.startsWith('heatmap-cells-'))
      expect(
        [0, 1].map((column) =>
          cells.filter((point) => point.datum.column === column).map((point) => point.datum.row),
        ),
      ).toEqual(
        hideGhostCells === false
          ? [
              [0, 1, 2, 3, 4, 5, 6],
              [0, 2, 3, 4, 5, 6],
            ]
          : [
              [1, 2, 3, 4, 5, 6],
              [0, 2],
            ],
      )
      expect(cells.every((point) => point.datum.count === 0)).toBe(true)
      const first = cells.find((point) => point.datum.column === 1 && point.datum.row === 0)
      const third = cells.find((point) => point.datum.column === 1 && point.datum.row === 2)
      if (first === undefined || third === undefined)
        throw new Error('Expected observed zero cells')
      expect(third.y - first.y).toBe(24)
      expect(findNearestPoint(scene, first.x, first.y, 0)).not.toBeNull()
      expect(findNearestPoint(scene, first.x, first.y + 12, 0)).toBeNull()
    } finally {
      runtime.destroy()
    }
  },
)

effectIt.effect(
  'preserves observed state through init, requested data, loading and JSON serialization',
  () => {
    const unknown = data.map((column) => ({
      ...column,
      bins: column.bins.map((bin, row) => ({ ...bin, count: 0, observed: row !== 1 })),
    }))
    const observed = unknown.map((column) => ({
      ...column,
      bins: column.bins.map((bin) => ({ ...bin, observed: true })),
    }))
    return Effect.gen(function* () {
      const model = yield* Story.story(
        subject,
        Story.init('observed-state', unknown),
        Story.model((model) => expect(model.data[0]?.bins[1]?.observed).toBe(false)),
        Story.inMessage(HeatmapBlock.InMessage.RequestedData({ data: observed })),
        Story.model((model) => expect(model.data[0]?.bins[1]?.observed).toBe(true)),
        Story.inMessage(HeatmapBlock.InMessage.RequestedData({ data: unknown })),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(HeatmapBlock.Model))
      const decoded = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(model))
      expect(decoded.data).toEqual(unknown)
      expect(HeatmapChartLoading({ data: unknown }).data[0]?.bins[1]?.observed).toBe(false)
    })
  },
)

it('thins crowded month labels while retaining all months on a wider grid', () => {
  const monthlyData = Array.from({ length: 26 }, (_, column) => ({
    bin: column,
    bins: Array.from({ length: 7 }, (_, row) => ({
      bin: row,
      count: 1,
      date: localCalendarDate(2026, 0, 4 + column * 7 + row),
    })),
  }))
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const labelsAt = (width: number) => {
    const runtime = createChartRuntime<Readonly<CellDatum>, number | string, string>()
    try {
      const definition = heatmapDefinition(
        { data: monthlyData, animate: false, children: [HeatmapCells(), HeatmapXAxis()] },
        width,
        'month-density',
        { at: null, origin: () => null, now: () => 0 },
        () => null,
        localCalendarDate(2026, 6, 4),
      )
      return flat(runtime.render(definition, { width, height: 160 }).nodes)
        .filter((node) => node.kind === 'label')
        .map((node) => (node.kind === 'label' ? node.text : ''))
        .filter((label) => months.includes(label))
    } finally {
      runtime.destroy()
    }
  }
  expect(labelsAt(720)).toEqual(months)
  const narrow = labelsAt(180)
  expect(narrow.length).toBeGreaterThan(1)
  expect(narrow.length).toBeLessThan(months.length)
})
