import { expect, it } from 'vitest'
import { arc as d3Arc } from 'd3-shape'
import {
  geometryFor,
  lerpGeometry,
  transitionGeometry,
  arcPath,
  centroidAngle,
  geomCentroidAngle,
  geomCentroidRadius,
  localProgress,
  buildSunburstEnterTiming,
  buildRevealSchedule,
  segmentRevealFromRingSweep,
  buildRevealDelays,
} from '../src/index'
import type {
  ArcDatum,
  ArcGeometry,
  Focus,
  SunburstEnterTiming,
  SunburstRevealSchedule,
  SunburstSegmentEnterDelays,
} from '../src/index'
import paths from './fixtures/sunburst-public-paths.json'

const datum: (id: string, depth: number, a0: number, a1: number) => ArcDatum = (
  id: string,
  depth: number,
  a0: number,
  a1: number,
) => ({
  id,
  name: id,
  depth,
  a0,
  a1,
  value: 1,
  categoryIndex: 0,
  hasChildren: false,
  trail: [id],
  parentId: 'Root',
  arcIndex: 0,
})

const root: Focus = {
  id: 'Root',
  name: 'Root',
  depth: 0,
  parentId: null,
  categoryIndex: 0,
  a0: -Math.PI / 2,
  a1: Math.PI * 1.5,
}

const branch: Focus = {
  ...root,
  id: 'Root / A',
  name: 'A',
  depth: 1,
  parentId: 'Root',
  a1: Math.PI / 2,
}

it.each(paths.cases)(
  'preserves exact Source path, precision and null behavior for $id',
  (fixture) => {
    const geometry: ArcGeometry = fixture.geometry
    const actual = arcPath(geometry, 1)

    const input = {
      startAngle: geometry.a0,
      endAngle: geometry.a1,
      innerRadius: geometry.innerR,
      outerRadius: geometry.outerR,
    }

    expect(actual).toBe(fixture.source)
    expect(d3Arc()(input)).toBe(fixture.roundedD3)
    expect(actual).not.toBe(fixture.roundedD3)
    expect(actual).not.toBe(fixture.unroundedD3)
  },
)

it('projects only descendants, retaining Source drill hub/rings and collapsed focus-span behavior', () => {
  const child = datum('Root / A / Child', 2, -Math.PI / 2, 0)

  expect(geometryFor(child, branch, 2, 220)).toEqual({
    a0: -Math.PI / 2,
    a1: Math.PI / 2,
    innerR: 71.5,
    outerR: 220,
  })
  expect(geometryFor(datum('Root / AB', 2, 0, 1), branch, 2, 220)).toBeNull()
  expect(geometryFor(datum('Root / A', 1, 0, 1), branch, 2, 220)).toBeNull()
  expect(geometryFor(child, { ...branch, a0: 1, a1: 1 + 1e-10 }, 2, 220)).toEqual({
    a0: -Math.PI / 2,
    a1: -Math.PI / 2,
    innerR: 71.5,
    outerR: 220,
  })
})

it('interpolates clamped radii and takes the short angular direction across the wrap', () => {
  const degrees = Math.PI / 180
  const from: ArcGeometry = { a0: 160 * degrees, a1: 180 * degrees, innerR: 10, outerR: 20 }
  const to: ArcGeometry = { a0: -180 * degrees, a1: -160 * degrees, innerR: 20, outerR: 40 }
  const middle = lerpGeometry(from, to, 0.5)

  expect(geomCentroidAngle(middle)).toBeCloseTo(Math.PI, 14)
  expect(middle.innerR).toBe(15)
  expect(middle.outerR).toBe(30)
  expect(lerpGeometry(from, to, -2).innerR).toBe(10)
  expect(lerpGeometry(from, to, 2).outerR).toBe(40)
  expect(geomCentroidRadius(middle)).toBe(22.5)
  expect(centroidAngle(datum('Root / A', 1, 0, Math.PI))).toBe(Math.PI / 2)
})

it('collapses entering and exiting sectors to Source point pins without changing unrelated arcs', () => {
  const child = datum('Root / A / Child', 2, -Math.PI / 2, Math.PI / 2)
  const other = { ...branch, id: 'Root / B' }

  expect(transitionGeometry(child, root, other, 2, 220, 1)).toEqual({
    a0: 0,
    a1: 0,
    innerR: 19.799999999999997,
    outerR: 19.80000000000001,
  })
  expect(transitionGeometry(child, other, root, 2, 220, 0)).toEqual({
    a0: 0,
    a1: 0,
    innerR: 19.8,
    outerR: 19.8,
  })
  expect(transitionGeometry(child, other, root, 2, 220, 1)).toEqual({
    a0: -Math.PI / 2,
    a1: Math.PI / 2,
    innerR: 110,
    outerR: 220,
  })
  expect(transitionGeometry(child, other, { ...other, id: 'Root / C' }, 2, 220, 0.5)).toBeNull()
})

it('retains independent angular/radial reveal and the Source subpixel cutoff', () => {
  const ring: ArcGeometry = { a0: 0, a1: Math.PI / 2, innerR: 10, outerR: 20 }

  expect(arcPath(ring, 0, 0)).toBeNull()
  expect(arcPath(ring, 1, 0)).toBeNull()
  expect(arcPath({ ...ring, outerR: 10.5 }, 1)).not.toBeNull()
  expect(arcPath({ ...ring, a1: 0.001 }, 1)).not.toBeNull()
  expect(arcPath(ring, 2, 2)).toBe(arcPath(ring, 1, 1))
  expect(arcPath(ring, 0.5, 0.5)).toContain('A 15 15')
  expect(arcPath({ ...ring, innerR: 0.5 }, 0.5, 0.5)).toContain('M 0 0 L')
})

const a = datum('Root / A', 1, -Math.PI / 2, 0)

const b = datum('Root / B', 1, 0, Math.PI / 2)

const c = datum('Root / C', 1, Math.PI / 2, Math.PI)

const childA = datum('Root / A / Child', 2, -Math.PI / 2, 0)

const childB = datum('Root / B / Child', 2, Math.PI / 2, Math.PI)

const unordered = [c, childB, a, childA, b]

it('keeps clockwise per-depth insertion order, scale floor and original arc identities in timing', () => {
  const timing: SunburstEnterTiming = buildSunburstEnterTiming(unordered)
  const first: SunburstSegmentEnterDelays | undefined = timing.segmentDelays.get('Root / A')

  expect(first).toEqual({ delay: 0 })
  expect([...timing.segmentDelays]).toEqual([
    ['Root / A', { delay: 0 }],
    ['Root / B', { delay: 0.08 }],
    ['Root / C', { delay: 0.16 }],
    ['Root / A / Child', { delay: 0.12 }],
    ['Root / B / Child', { delay: 0.2 }],
  ])
  expect(timing.maxDelay).toBe(0.2)
  expect(buildSunburstEnterTiming(unordered, 0).maxDelay).toBe(0.05)
  expect(buildSunburstEnterTiming(unordered, 2).maxDelay).toBe(0.4)
  expect(unordered).toEqual([c, childB, a, childA, b])
  expect(unordered[0]).toBe(c)
})

it('keeps legacy schedule last-arc-per-depth values and original-order delay Map', () => {
  const schedule: SunburstRevealSchedule = buildRevealSchedule(unordered)

  expect([...schedule.ringStarts]).toEqual([
    [1, 0.08],
    [2, 0.12],
  ])
  expect(schedule).toMatchObject({
    ringDuration: 0.6,
    segmentsCompleteAt: 0.2,
    labelsStart: 0.32,
    labelDuration: 0.2,
  })
  expect([...buildRevealDelays(unordered)]).toEqual([
    ['Root / C', 0.16],
    ['Root / B / Child', 0.2],
    ['Root / A', 0],
    ['Root / A / Child', 0.12],
    ['Root / B', 0.08],
  ])
  expect(buildSunburstEnterTiming([])).toEqual({ segmentDelays: new Map(), maxDelay: 0 })
  expect(buildRevealDelays([]).size).toBe(0)
})

it('preserves stagger boundary ordering, instantaneous duration and clamped ring sweep', () => {
  expect(localProgress(0.2, 0.2, 0)).toBe(0)
  expect(localProgress(0.3, 0.2, 0)).toBe(1)
  expect(localProgress(0.4, 0.2, 0.4)).toBe(0.5)
  expect(localProgress(2, 0.2, 0.4)).toBe(1)
  expect(segmentRevealFromRingSweep(0.25, -Math.PI / 2, Math.PI / 2)).toEqual({
    angular: 0.5,
    radial: 0.25,
  })
  expect(segmentRevealFromRingSweep(-1, -Math.PI / 2, Math.PI / 2)).toEqual({
    angular: 0,
    radial: 0,
  })
  expect(segmentRevealFromRingSweep(2, -Math.PI / 2, Math.PI / 2)).toEqual({
    angular: 1,
    radial: 1,
  })
})
