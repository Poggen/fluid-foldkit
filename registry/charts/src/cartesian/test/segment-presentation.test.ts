import { DateTime } from 'effect'
import type { SceneNode } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { expect, it } from 'vitest'
import { buildTimeSeriesDefinition } from '../definition'
import { Line, SegmentBackground, SegmentLineFrom, SegmentLineTo } from '../layers'

const descendants: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => [node, ...(node.kind === 'group' ? descendants(node.children) : [])])

it('compiles actual Segment carriers through the existing chart engine with first-role precedence', () => {
  const data = [0, 1000].map((time) => ({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(time)),
    value: 10,
  }))

  const runtime = createChartRuntime<(typeof data)[number], Date, number>()

  try {
    const scene = runtime.render(
      buildTimeSeriesDefinition(data, {
        id: 'segments',
        x: (row) => row.date,
        children: [
          Line({ dataKey: 'value' }),
          SegmentBackground({ fill: 'red' }),
          SegmentBackground({ fill: 'blue' }),
          SegmentLineFrom({ variant: 'solid', stroke: 'green' }),
          SegmentLineTo({ variant: 'gradient', stroke: 'purple', strokeWidth: 3 }),
        ],
      }),
      { width: 320, height: 180 },
    )

    const nodes = descendants(scene.nodes)
    const band = nodes.find((node) => node.key.includes('segment:band'))

    const from = nodes.find(
      (node) => node.kind === 'rule' && node.key.startsWith('segment-edge-0:'),
    )

    const to = nodes.find((node) => node.kind === 'rect' && node.key.startsWith('segment-edge-1:'))

    expect(band?.style?.fill).toBe('red')
    expect(from?.style?.stroke).toBe('green')
    expect(to?.style?.fill).toContain('segments-segment-line-1')
    expect(nodes.filter((node) => node.key.includes('segment:band'))).toHaveLength(1)
    expect(scene.points).toHaveLength(2)
    expect(scene.points.every((point) => point.datum === data[0] || point.datum === data[1])).toBe(
      true,
    )
  } finally {
    runtime.destroy()
  }
})
