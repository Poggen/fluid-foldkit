import { expect, it } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { Effect, Option, Predicate } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { PieChart, PieData, PieSlice } from './index'
import { buildPieDefinition, pieGeometry } from './definition'
import { RingChart, RingData, Ring } from '../ring/index'
import { buildRingDefinition } from '../ring/definition'
import { ringGeometry } from '../ring/geometry'

const data = [
  { label: 'A', value: 3 },
  { label: 'B', value: 1 },
]

const authorityPie = PieChart({ name: 'pie-authority-contract', Row: PieData })

const authorityRing = RingChart({ name: 'ring-authority-contract', Row: RingData })

export const PieAuthorityKey = Symbol('PieAuthority')

export const RingAuthorityKey = Symbol('RingAuthority')

const PieAuthorityBlock = Block.make(authorityPie.namespace, {
  ...authorityPie.contract,
  key: PieAuthorityKey,
})

const RingAuthorityBlock = Block.make(authorityRing.namespace, {
  ...authorityRing.contract,
  key: RingAuthorityKey,
})

const pieAuthority = {
  block: PieAuthorityBlock,
  layer: PieAuthorityBlock.makeLayer(authorityPie.plans<typeof PieAuthorityKey>(PieAuthorityBlock)),
}

const ringAuthority = {
  block: RingAuthorityBlock,
  layer: RingAuthorityBlock.makeLayer(
    authorityRing.plans<typeof RingAuthorityKey>(RingAuthorityBlock),
  ),
}

const flatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((n) => (n.kind === 'group' ? flatten(n.children) : [n]))

it('preserves ordered fractional pie sectors, no-op color override, fill precedence, and annular keyboard order in the real engine', () => {
  const props = {
    data,
    size: 200,
    innerRadius: 20,
    children: [
      PieSlice({
        index: 0,
        color: 'ignored',
        fill: 'url(#grain)',
        hoverEffect: 'grow',
        hoverOffset: 16,
      }),
      PieSlice({ index: 1, animate: false, hoverEffect: 'none' }),
    ],
  }

  const geometry = pieGeometry(props, 200, 'contract')
  expect(geometry.rows.map((r) => r.endAngle - r.startAngle)).toEqual([
    Math.PI * 1.5,
    Math.PI * 0.5,
  ])
  expect(geometry.rows.map((r) => r.fill)).toEqual(['url(#contract-grain)', 'var(--chart-2)'])
  expect(geometry.rows.map((r) => r.offset)).toEqual([16, 0])
  const runtime = createChartRuntime<(typeof geometry.rows)[number], number, number>()

  try {
    const definition = buildPieDefinition(props, 200, 'contract')
    const scene = runtime.render(definition, { width: 200, height: 200 })

    const paths = flatten(scene.nodes).filter((n) => n.kind === 'area')
    expect(paths).toHaveLength(2)
    expect(paths.every((n) => n.kind === 'area' && n.path?.includes('A90,90') === true)).toBe(true)
    expect(scene.points.map((p) => p.datum.sliceIndex)).toEqual([0, 1])

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing annular focus')
    }

    expect(definition.focus.navigation(scene.points).map((p) => p.datum.sliceIndex)).toEqual([0, 1])
  } finally {
    runtime.destroy()
  }
})

it('renders all rings, preserves raw overflow and fits against all context data', () => {
  const props = {
    data: [
      { label: 'overflow', value: 200, maxValue: 100 },
      { label: 'zero', value: 0, maxValue: 100 },
      { label: 'tiny', value: 0.05, maxValue: 100 },
    ],
    children: [Ring({ index: 0, lineCap: 'butt', color: 'red' })],
    strokeWidth: 20,
    ringGap: 10,
    baseInnerRadius: 50,
  }

  const geometry = ringGeometry(props, 200)
  expect(geometry.fit).toBeCloseTo(92 / 130, 12)
  expect(geometry.rows).toHaveLength(4)
  expect(
    geometry.rows
      .filter((r) => r.kind === 'progress')
      .map((r) => [r.ringIndex, r.cornerRadius, r.fill, r.endAngle - r.startAngle]),
  ).toEqual([[0, 0, 'red', Math.PI * 4]])
  const runtime = createChartRuntime<(typeof geometry.rows)[number], number, number>()

  try {
    const definition = buildRingDefinition(props, 200, {
      clock: () => 0,
      renderStart: { current: 0 },
      claim: { current: null },
      hovered: () => null,
      scaleOf: () => 1,
    })

    const scene = runtime.render(definition, { width: 200, height: 200 })
    expect(flatten(scene.nodes).filter((n) => n.kind === 'area')).toHaveLength(4)

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing annular focus')
    }

    expect(definition.focus.navigation(scene.points).map((p) => p.datum.ringIndex)).toEqual([
      0, 1, 2,
    ])
  } finally {
    runtime.destroy()
  }
})

it('uses the last ring carrier without emitting a duplicate mark', () => {
  const props = {
    data: [{ label: 'A', value: 1, maxValue: 2, color: 'green' }],
    children: [Ring({ index: 0, color: '' }), Ring({ index: 0, color: 'purple' })],
  }

  const runtime = createChartRuntime<
    ReturnType<typeof ringGeometry>['rows'][number],
    number,
    number
  >()

  try {
    const definition = buildRingDefinition(props, 200, {
      clock: () => 0,
      renderStart: { current: 0 },
      claim: { current: null },
      hovered: () => null,
      scaleOf: () => 1,
    })

    const scene = runtime.render(definition, { width: 200, height: 200 })

    const fills = flatten(scene.nodes).flatMap((node) =>
      node.kind === 'area' ? [node.style?.fill] : [],
    )

    expect(fills).toEqual(['var(--bkm-border)', 'purple'])
    expect(
      ringGeometry({ ...props, children: [Ring({ index: 0, color: '' })] }, 200).rows.at(-1)?.fill,
    ).toBe('green')
  } finally {
    runtime.destroy()
  }
})

effectIt.effect('keeps hover authority and row replacement in checked public Blocks', () =>
  Effect.gen(function* preservesPolarAuthority() {
    yield* Story.story(
      pieAuthority,
      Story.init('pie', data, authorityPie.configuration({ hoveredIndex: 1 })),
      Story.message(PieAuthorityBlock.Message.ObservedFocus({ index: 0 })),
      Story.model((model) => expect(Option.getOrNull(model.focusedIndex)).toBe(1)),
      Story.inMessage(PieAuthorityBlock.InMessage.RequestedControl(authorityPie.configuration({}))),
      Story.message(PieAuthorityBlock.Message.ObservedFocus({ index: 0 })),
      Story.model((model) => expect(Option.getOrNull(model.focusedIndex)).toBe(0)),
      Story.inMessage(PieAuthorityBlock.InMessage.RequestedData({ data: [] })),
      Story.model((model) => {
        expect(model.data).toEqual([])
        expect(Option.getOrNull(model.focusedIndex)).toBe(0)
      }),
    )
    yield* Story.story(
      ringAuthority,
      Story.init('ring', [{ label: 'A', value: 2, maxValue: 3 }]),
      Story.models(
        Story.steps(Story.inMessage(RingAuthorityBlock.InMessage.RequestedFocus({ index: 0 }))),
        (initial, next) => {
          expect(Option.getOrNull(next.focusedIndex)).toBe(0)
          expect(initial.focusedIndex).toEqual(Option.none())
        },
      ),
    )
  }),
)

const inspectSelection = (_index: number | null) => {}

effectIt.effect(
  'context readiness follows checked mount and measurement observations rather than a guessed width',
  () =>
    Story.story(
      pieAuthority,
      Story.init('pie', data),
      Story.model((model) =>
        expect(authorityPie.context(model, { data, children: [] }, inspectSelection).isLoaded).toBe(
          false,
        ),
      ),
      Story.message(PieAuthorityBlock.Message.ObservedSize({ size: 320 })),
      Story.model((model) =>
        expect(authorityPie.context(model, { data, children: [] }, inspectSelection).isLoaded).toBe(
          false,
        ),
      ),
      Story.message(PieAuthorityBlock.Message.CompletedPrepare()),
      Story.model((model) => {
        const context = authorityPie.context(model, { data, children: [] }, inspectSelection)
        expect(context.isLoaded).toBe(true)
        expect(context.size).toBe(320)
        expect(context.totalValue).toBe(4)
      }),
    ),
)

it('draws data-ordered slices with the last override per index and stable mark identity', () => {
  const props = {
    data,
    size: 200,
    children: [
      PieSlice({ index: 1, fill: 'green' }),
      PieSlice({ index: 0, fill: 'blue' }),
      PieSlice({ index: 1, fill: 'purple' }),
    ],
  }

  const geometry = pieGeometry(props, 200, 'roles')
  expect(geometry.arcs).toHaveLength(2)
  expect(geometry.totalValue).toBe(4)
  expect(geometry.rows.map((row) => [row.sliceIndex, row.roleIndex, row.fill])).toEqual([
    [0, 0, 'blue'],
    [1, 1, 'purple'],
  ])
  const runtime = createChartRuntime<(typeof geometry.rows)[number], number, number>()

  try {
    const definition = buildPieDefinition(props, 200, 'roles')
    const scene = runtime.render(definition, { width: 200, height: 200 })
    expect(flatten(scene.nodes).filter((node) => node.kind === 'area')).toHaveLength(2)

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing annular focus')
    }

    expect(
      definition.focus.navigation(scene.points).map((point) => point.datum.sliceIndex),
    ).toEqual([0, 1])
    const defaults = runtime.render(buildPieDefinition({ ...props, children: [] }, 200, 'roles'), {
      width: 200,
      height: 200,
    })
    expect(defaults.points.map((point) => point.markId)).toEqual(
      scene.points.map((point) => point.markId),
    )
    expect(defaults.points.map((point) => point.datum.fill)).toEqual([
      'var(--chart-1)',
      'var(--chart-2)',
    ])
  } finally {
    runtime.destroy()
  }
})

it('geometry scrubbing paints every data slice immediately instead of authored animated roles', () => {
  const geometry = pieGeometry(
    { data, geometryScrubbing: true, children: [PieSlice({ index: 1 })] },
    200,
    'scrub',
  )

  expect(geometry.rows.map((row) => [row.sliceIndex, row.animate, row.effect])).toEqual([
    [0, false, 'none'],
    [1, false, 'none'],
  ])
})

it('draws rings in data order with last overrides while preserving the native angular cutoff', () => {
  const props = {
    data: [
      { label: 'small', value: 0.1, maxValue: 100 },
      { label: 'visible', value: 0.2, maxValue: 100 },
    ],
    children: [
      Ring({ index: 1, color: 'red' }),
      Ring({ index: 0 }),
      Ring({ index: 1, color: 'blue' }),
    ],
  }

  const { rows } = ringGeometry(props, 300)
  expect(rows.map((row) => [row.ringIndex, row.kind])).toEqual([
    [0, 'track'],
    [1, 'track'],
    [1, 'progress'],
  ])
  expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length)
  expect(rows.at(-1)?.fill).toBe('blue')
  expect(ringGeometry({ ...props, children: [] }, 300).rows.map((row) => row.key)).toEqual(
    rows.map((row) => row.key),
  )
  expect(ringGeometry({ ...props, children: [], geometryScrubbing: true }, 300).rows).toHaveLength(
    3,
  )
})
