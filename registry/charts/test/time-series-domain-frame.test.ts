import { DateTime } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { expect, it } from 'vitest'
import { Area, Line } from '../src/index'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import { TimeSeriesDomainFrame } from '../src/cartesian/time-series-domain-frame'
import { initialInteraction } from '../src/cartesian/state'

const rows = [120, 180, 150, 240, 210, 290, 180].map((value, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
  value,
}))

type Row = (typeof rows)[number]

it('reprojects data through live domain endpoints rather than tweening final SVG coordinates', () => {
  let now = 0
  const state = { ...initialInteraction(), revealReady: true }
  const props = { children: [Area({ dataKey: 'value' })] }

  const frame = new TimeSeriesDomainFrame<Row>(
    () => now,
    () => props,
    () => state,
    () => false,
  )

  const runtime = createChartRuntime<Row, Date, number>()

  const render = (data: ReadonlyArray<Row>) =>
    runtime.render(
      buildTimeSeriesDefinition(data, {
        id: 'domain-frame',
        x: (row) => row.date,
        children: props.children,
        domainFrame: frame,
      }),
      { width: 640, height: 320 },
    )

  try {
    render(rows)
    render(rows.slice(0, 3))
    now = 250
    const midway = render(rows.slice(0, 3))
    expect(midway.points.find((point) => point.datum === rows[0])?.y).toBeCloseTo(
      40 + 240 * (1 - 120 / 275),
      6,
    )
    expect(frame.active).toBe(true)
    now = 500
    const settled = render(rows.slice(0, 3))
    expect(settled.points.find((point) => point.datum === rows[0])?.y).toBeCloseTo(136, 6)
    expect(frame.active).toBe(false)
  } finally {
    runtime.destroy()
  }
})

it('retargets both signed domain endpoints from the current presentation and honors reduced motion', () => {
  let now = 0
  let reduced = false
  const state = { ...initialInteraction(), revealReady: true }

  const frame = new TimeSeriesDomainFrame<Row>(
    () => now,
    () => ({ children: [] }),
    () => state,
    () => reduced,
  )

  frame.resolve({ left: [-100, 100] })
  frame.resolve({ left: [0, 300] })
  now = 250
  expect(frame.resolve({ left: [0, 300] }).get('left')).toEqual([-50, 200])
  frame.resolve({ left: [-100, 100] })
  now = 500
  expect(frame.resolve({ left: [-100, 100] }).get('left')).toEqual([-75, 150])
  reduced = true
  expect(frame.resolve({ left: [0, 300] }).get('left')).toEqual([0, 300])
  expect(frame.active).toBe(false)
})

it('keeps out-of-window outliers out of the domain, markers and focus while retaining the full path', () => {
  const data = [10_000, 10, 20, 30, 10_000].map((value, index) => ({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
    value,
  }))

  const [, first, , last] = data

  if (first === undefined || last === undefined) {
    throw new Error('Window fixture requires its bounds')
  }

  const runtime = createChartRuntime<Row, Date, number>()
  let domain: readonly [number, number] | undefined

  try {
    const scene = runtime.render(
      buildTimeSeriesDefinition(data, {
        id: 'strict-window',
        x: (row) => row.date,
        xDomain: [first.date, last.date],
        children: [Line({ dataKey: 'value', showMarkers: true })],
        onBuilt: (snapshot) => {
          domain = snapshot.domains.y.left
        },
      }),
      { width: 640, height: 320 },
    )

    expect(domain).toEqual([0, 35])
    expect(scene.points.map((point) => point.datum)).toEqual(data.slice(1, 4))
  } finally {
    runtime.destroy()
  }
})
