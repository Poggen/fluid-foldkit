import { expect, it } from 'vitest'
import { DateTime, Option } from 'effect'
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
