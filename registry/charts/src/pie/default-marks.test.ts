// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { it as effectTest } from '@effect/vitest'
import { Effect, Predicate } from 'effect'
import { constUndefined } from 'effect/Function'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { buildPieDefinition, pieGeometry } from './definition'
import { createPieEntranceRenderer } from './entrance-renderer'
import { PieSlice } from './options'
import type { PieChartProps } from './options'
import type { PieArcRow } from './arc'
import { buildRingDefinition } from '../ring/definition'
import { createRingLayer } from '../ring/layer'
import { ringGeometry } from '../ring/geometry'
import { Ring } from '../ring/options'
import type { RingChartProps } from '../ring/options'
import type { RingArcRow } from '../ring/arc'

const data = [
  { label: 'A', value: 3, maxValue: 6, color: 'red' },
  { label: 'B', value: 2, maxValue: 4, color: 'green' },
  { label: 'C', value: 1, maxValue: 2, color: 'blue' },
]

const areas = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) =>
    node.kind === 'group' ? areas(node.children) : node.kind === 'area' ? [node] : [],
  )

const cases = [
  { name: 'none', indices: [], colors: [], expected: ['red', 'green', 'blue'] },
  { name: 'partial', indices: [1], colors: ['purple'], expected: ['red', 'purple', 'blue'] },
  {
    name: 'complete reversed',
    indices: [2, 1, 0],
    colors: ['cyan', 'purple', 'orange'],
    expected: ['orange', 'purple', 'cyan'],
  },
  {
    name: 'duplicate',
    indices: [1, 1],
    colors: ['yellow', 'purple'],
    expected: ['red', 'purple', 'blue'],
  },
  {
    name: 'out of range',
    indices: [-1, 99, 0.5],
    colors: ['yellow', 'purple', 'cyan'],
    expected: ['red', 'green', 'blue'],
  },
]

it.each(cases)(
  'emits every Pie datum and keyboard target with $name carriers',
  ({ indices, colors, expected }) => {
    const props: PieChartProps = {
      data,
      children: indices.map((index, role) => PieSlice({ index, fill: colors[role] ?? '' })),
    }
    const runtime = createChartRuntime<PieArcRow, number, number>()
    try {
      const definition = buildPieDefinition(props, 320, 'default-marks')
      const scene = runtime.render(definition, { width: 320, height: 320 })
      expect(areas(scene.nodes)).toHaveLength(3)
      expect(scene.points.map((point) => point.datum.sliceIndex)).toEqual([0, 1, 2])
      expect(scene.points.map((point) => point.datum.fill)).toEqual(expected)
      if (!Predicate.isObject(definition.focus)) throw new Error('Missing Pie focus strategy')
      expect(
        definition.focus.navigation(scene.points).map((point) => point.datum.sliceIndex),
      ).toEqual([0, 1, 2])
    } finally {
      runtime.destroy()
    }
  },
)

it.each(cases)(
  'emits every Ring datum and keyboard target with $name carriers',
  ({ indices, colors, expected }) => {
    const props: RingChartProps = {
      data,
      children: indices.map((index, role) => Ring({ index, color: colors[role] ?? '' })),
    }
    const runtime = createChartRuntime<RingArcRow, number, number>()
    const layer = createRingLayer()
    try {
      const definition = buildRingDefinition(props, 320, {
        layer,
        clock: () => 0,
        renderStart: { current: 0 },
        claim: { current: null },
        hovered: () => null,
        scaleOf: (index) => layer.scale(index),
      })
      const scene = runtime.render(definition, { width: 320, height: 320 })
      expect(areas(scene.nodes)).toHaveLength(6)
      expect(
        scene.points
          .filter((point) => point.datum.kind === 'progress')
          .map((point) => point.datum.fill),
      ).toEqual(expected)
      if (!Predicate.isObject(definition.focus)) throw new Error('Missing Ring focus strategy')
      expect(
        definition.focus.navigation(scene.points).map((point) => point.datum.ringIndex),
      ).toEqual([0, 1, 2])
    } finally {
      layer.destroy()
      runtime.destroy()
    }
  },
)

effectTest.effect(
  'retains actual default Pie paths when carriers are added, reordered, duplicated, and removed',
  () =>
    Effect.gen(function* () {
      const host = document.createElement('div')
      document.body.append(host)
      const entrance = createPieEntranceRenderer()
      const runtime = createChartRuntime<PieArcRow, number, number>()
      const surface = entrance.renderer.mount(host, constUndefined)
      const base: PieChartProps = {
        data,
        children: [],
        enterTransition: { duration: 0 },
        enterStaggerScale: 0,
      }
      const render = (props: PieChartProps) => {
        entrance.configure(pieGeometry(props, 320, 'physical-pie'), props, 1)
        surface.render(
          runtime.render(buildPieDefinition(props, 320, 'physical-pie'), {
            width: 320,
            height: 320,
          }),
          { ariaLabel: 'Default Pie' },
        )
      }
      const paths = () => Array.from(host.querySelectorAll<SVGPathElement>('g.bkm-pie-arc path'))
      try {
        render(base)
        yield* Effect.promise(() =>
          vi.waitFor(() => {
            expect(paths()).toHaveLength(3)
            expect(paths().every((path) => Boolean(path.getAttribute('d')))).toBe(true)
          }),
        )
        const retained = paths()
        for (const children of [
          [PieSlice({ index: 1, fill: 'purple' })],
          [
            PieSlice({ index: 2 }),
            PieSlice({ index: 1, fill: 'yellow' }),
            PieSlice({ index: 1, fill: 'purple' }),
            PieSlice({ index: 0 }),
          ],
          [],
        ]) {
          render({ ...base, children })
          expect(paths()).toHaveLength(3)
          paths().forEach((path, index) => expect(path).toBe(retained[index]))
          expect(paths()[1]?.getAttribute('fill') ?? paths()[1]?.style.fill).toBe(
            children.length === 0 ? 'green' : 'purple',
          )
        }
        render({ ...base, data: data.slice(0, 2) })
        expect(paths()).toHaveLength(2)
        expect(retained[2]?.isConnected).toBe(false)
      } finally {
        surface.destroy()
        runtime.destroy()
        host.remove()
      }
    }),
)

effectTest.effect(
  'retains default Ring visual owners and their focused scale when carriers change',
  () =>
    Effect.gen(function* () {
      const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
      if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
        throw new Error('Ring lifecycle test requires scoped WAAPI capability removal')
      }
      // HappyDOM cancellation rejects; exercise the supported JS fallback in this test only.
      try {
        const host = document.createElement('div')
        document.body.append(host)
        const layer = createRingLayer()
        const runtime = createChartRuntime<RingArcRow, number, number>()
        const base: RingChartProps = {
          data,
          children: [],
          enterTransition: { duration: 0 },
          enterStaggerScale: 0,
        }
        layer.configure(base, 320)
        const surface = layer.renderer.mount(host, constUndefined)
        const render = (props: RingChartProps) => {
          const definition = buildRingDefinition(props, 320, {
            layer,
            clock: () => 0,
            renderStart: { current: 0 },
            claim: { current: null },
            hovered: () => 1,
            scaleOf: (index) => layer.scale(index),
          })
          surface.render(runtime.render(definition, { width: 320, height: 320 }), {
            ariaLabel: 'Default Ring',
          })
        }
        const groups = () => Array.from(host.querySelectorAll<SVGGElement>('svg > g > g'))
        try {
          render(base)
          yield* Effect.promise(() =>
            vi.waitFor(() => {
              expect(groups()).toHaveLength(3)
              expect(
                groups().every(
                  (group) => group.querySelectorAll('path[d]:not([d=""])').length === 2,
                ),
              ).toBe(true)
            }),
          )
          const retained = groups()
          layer.hover(1)
          yield* Effect.promise(() =>
            vi.waitFor(() => expect(layer.scale(1)).toBeGreaterThan(1.01)),
          )
          for (const children of [
            [Ring({ index: 1, color: 'purple' })],
            [
              Ring({ index: 2 }),
              Ring({ index: 1, color: 'yellow' }),
              Ring({ index: 1, color: 'purple' }),
              Ring({ index: 0 }),
            ],
            [],
          ]) {
            render({ ...base, children })
            expect(groups()).toHaveLength(3)
            groups().forEach((group, index) => expect(group).toBe(retained[index]))
            expect(groups()[1]?.lastElementChild?.getAttribute('fill')).toBe(
              children.length === 0 ? 'green' : 'purple',
            )
            expect(layer.scale(1)).toBeGreaterThan(1.01)
          }
          render({ ...base, data: data.slice(0, 2) })
          expect(groups()).toHaveLength(2)
          expect(retained[2]?.isConnected).toBe(false)
        } finally {
          surface.destroy()
          layer.destroy()
          runtime.destroy()
          host.remove()
        }
      } finally {
        Object.defineProperty(Element.prototype, 'animate', descriptor)
      }
    }),
)

it('keeps Ring raw-ratio and angular-cutoff behavior outside the admission repair', () => {
  const rows = ringGeometry(
    {
      data: [
        { label: 'overflow', value: 2, maxValue: 1 },
        { label: 'nonfinite', value: 1, maxValue: 0 },
      ],
      children: [],
    },
    320,
  ).rows
  const progress = rows.filter((row) => row.kind === 'progress')
  expect(progress[0]?.endAngle).toBe(-Math.PI / 2 + Math.PI * 4)
  expect(progress[1]?.endAngle).toBe(Infinity)
})
