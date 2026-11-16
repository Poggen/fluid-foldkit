import { DateTime } from 'effect'
import { expect, it } from 'vitest'
import type { SceneNode } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { buildTimeSeriesDefinition, Line } from '../src/index'
import { rowSets } from '../src/cartesian/decimate'

const data = Array.from({ length: 128 }, (_, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
  value: 10,
  index,
}))

const flatten = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

it('keeps the source LTTB buckets and row identity at the minimum 64 point budget', () => {
  const sets = rowSets({ data, x: (row) => row.date, innerWidth: 1, valueKeys: ['value'] })
  expect(sets.rows).toBe(data)
  expect(sets.drawRows).toHaveLength(64)
  expect(sets.drawRows.slice(0, 5).map((row) => row.index)).toEqual([0, 3, 5, 7, 9])
  expect(sets.drawRows.at(-1)).toBe(data.at(-1))
  expect(sets.drawRows.every((row) => data[row.index] === row)).toBe(true)
  const unmeasured = rowSets({ data, x: (row) => row.date, innerWidth: 0, valueKeys: ['value'] })
  expect(unmeasured.pathRows).toBe(data)
})

it('decimates the path while retaining every caller point marker and focus candidate', () => {
  const runtime = createChartRuntime<(typeof data)[number], Date, number>()

  const definition = buildTimeSeriesDefinition(data, {
    id: 'decimated-line',
    x: (row) => row.date,
    children: [
      Line({
        dataKey: 'value',
        fadeEdges: false,
        showHighlight: false,
        showMarkers: true,
        markers: { strokeWidth: 0, radius: 7 },
      }),
    ],
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })

  try {
    const scene = runtime.render(definition, { width: 1, height: 200 })

    const rendered = flatten(scene.nodes).find((node) => node.key.startsWith('line:value:string:'))

    if (rendered?.kind !== 'polyline') {
      throw new Error('Missing visible line geometry')
    }

    expect(rendered.points).toHaveLength(64)
    const markers = flatten(scene.nodes).filter((node) => node.kind === 'dot' && node.radius === 7)
    expect(markers).toHaveLength(128)
    expect(markers.map((node) => (node.kind === 'dot' ? node.x : null))).toEqual(
      data.map((row) => row.index / 127),
    )
    const focused = scene.points.filter((point) => point.markId === 'line:value:focus')
    expect(focused.map((point) => point.datum)).toEqual(data)
    expect(focused[1]?.x).toBeCloseTo(1 / 127, 10)
    expect(focused.at(-1)?.x).toBe(1)
  } finally {
    runtime.destroy()
  }
})
