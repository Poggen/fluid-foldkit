import { DateTime, Match, Schema } from 'effect'
import { expect } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { LineChart, Line, Area, PatternArea, BarChart, Bar } from '../src/index'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  name: Schema.String,
  value: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
})

const MissingLineRecipe = LineChart({ name: 'missing-line', Row })

export const MissingLineKey = Symbol('MissingLine')

const MissingLineBlock = Block.make(MissingLineRecipe.namespace, {
  key: MissingLineKey,
  ...MissingLineRecipe.contract,
})

const lineSubject = {
  block: MissingLineBlock,
  layer: MissingLineBlock.makeLayer(MissingLineRecipe.plans(MissingLineBlock)),
}

const MissingGapRecipe = BarChart({ name: 'missing-bar', Row })

export const MissingGapKey = Symbol('MissingGap')

const MissingGapBlock = Block.make(MissingGapRecipe.namespace, {
  key: MissingGapKey,
  ...MissingGapRecipe.contract,
})

const gapSubject = {
  block: MissingGapBlock,
  layer: MissingGapBlock.makeLayer(MissingGapRecipe.plans(MissingGapBlock)),
}

const SourceBarRecipe = BarChart({ name: 'source-bar', Row })

export const SourceBarKey = Symbol('SourceBar')

const SourceBarBlock = Block.make(SourceBarRecipe.namespace, {
  key: SourceBarKey,
  ...SourceBarRecipe.contract,
})

const sourceSubject = {
  block: SourceBarBlock,
  layer: SourceBarBlock.makeLayer(SourceBarRecipe.plans(SourceBarBlock)),
}

const rows = [1, 2, null, 0, -1, undefined, 4, 5].map((value, index) => {
  const row = {
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
    name: String(index),
  }

  return Row.make(value === undefined ? row : { ...row, value })
})

const flatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

effectIt.effect(
  'Line base geometry gaps omitted optional values; null retains upstream zero coercion',
  () =>
    Story.withBlock(lineSubject, (chart) => {
      const root = MissingLineRecipe

      const props = {
        animationDuration: 0,
        children: [Line({ dataKey: 'value', fadeEdges: false, showHighlight: false })],
      }

      const model = chart.init('missing-line', rows, root.configuration(props)).model
      const inputs = root.inputs('missing-line', props)

      const definition = inputs.resourceDefinition?.(
        rows,
        model,
        () => {},
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Missing Line scene')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const scene = runtime.render(definition, { width: 640, height: 320 })
        expect(scene.points.map((point) => point.datum.value)).toEqual([1, 2, null, 0, -1, 4, 5])

        const paths = flatten(scene.nodes).filter(
          (node) => node.kind === 'polyline' && node.key.startsWith('line:value:'),
        )

        expect(paths).toHaveLength(2)
        expect(paths.map((node) => (node.kind === 'polyline' ? node.points.length : 0))).toEqual([
          5, 2,
        ])
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect.each([
  { orientation: 'vertical', stacked: false },
  { orientation: 'horizontal', stacked: false },
  { orientation: 'vertical', stacked: true },
  { orientation: 'horizontal', stacked: true },
] as const)(
  'Bar gap option omits missing observations and retains zero: $orientation stacked=$stacked',
  ({ orientation, stacked }) =>
    Story.withBlock(gapSubject, (chart) => {
      const root = MissingGapRecipe

      const props = {
        orientation,
        stacked,
        missingValues: 'gap' as const,
        animationDuration: 0,
        children: [Bar({ dataKey: 'value' })],
      }

      const model = chart.init('missing-bar', rows, root.configuration(props)).model
      const inputs = root.inputs('missing-bar', props)

      const definition = inputs.resourceDefinition?.(
        rows,
        model,
        () => {},
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Missing Bar scene')
      }

      const runtime = createChartRuntime<
        Parameters<typeof inputs.sourceOf>[0],
        string | number,
        string | number
      >()

      try {
        const scene = runtime.render(definition, { width: 640, height: 320 })
        expect(scene.points.map((point) => point.datum.source.value)).toEqual([1, 2, 0, -1, 4, 5])
        expect(
          scene.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
        ).toBe(true)
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect('Bar default preserves upstream null/absent zero coercion', () =>
  Story.withBlock(sourceSubject, (chart) => {
    const root = SourceBarRecipe
    const props = { animationDuration: 0, children: [Bar({ dataKey: 'value' })] }
    const model = chart.init('source-bar', rows, root.configuration(props)).model
    const inputs = root.inputs('source-bar', props)

    const definition = inputs.resourceDefinition?.(
      rows,
      model,
      () => {},
      () => 0,
    )

    if (definition === undefined) {
      throw new Error('Missing Bar scene')
    }

    const runtime = createChartRuntime<
      Parameters<typeof inputs.sourceOf>[0],
      string | number,
      string | number
    >()

    try {
      const scene = runtime.render(definition, { width: 640, height: 320 })
      expect(scene.points.map((point) => point.datum.value)).toEqual([1, 2, 0, 0, -1, 0, 4, 5])
    } finally {
      runtime.destroy()
    }
  }),
)

effectIt.effect.each(['Area', 'PatternArea'] as const)(
  '%s gaps null and absent observations without changing a Line sharing its data key',
  (kind) =>
    Story.withBlock(lineSubject, (chart) => {
      const root = MissingLineRecipe

      const props = {
        animationDuration: 0,
        children: [
          kind === 'Area'
            ? Area({ dataKey: 'value', fadeEdges: false, showHighlight: false })
            : PatternArea({ dataKey: 'value', fill: 'red' }),
          Line({ dataKey: 'value', fadeEdges: false, showHighlight: false }),
        ],
      }

      const model = chart.init('missing-area', rows, root.configuration(props)).model
      const inputs = root.inputs('missing-area', props)

      const definition = inputs.resourceDefinition?.(
        rows,
        model,
        () => {},
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Missing Area scene')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const scene = runtime.render(definition, { width: 640, height: 320 })
        const nodes = flatten(scene.nodes)
        expect(
          scene.points
            .filter((point) => point.markId === 'area:value')
            .map((point) => point.datum.value),
        ).toEqual(kind === 'Area' ? [1, 2, 0, -1, 4, 5] : [])
        expect(
          scene.points
            .filter((point) => point.markId === 'line:value')
            .map((point) => point.datum.value),
        ).toEqual([1, 2, null, 0, -1, 4, 5])
        expect(nodes.filter((node) => node.kind === 'area')).toHaveLength(3)
        expect(
          nodes
            .filter((node) => node.kind === 'polyline' && node.key.startsWith('area:value:'))
            .map((node) => (node.kind === 'polyline' ? node.points.length : 0)),
        ).toEqual(kind === 'Area' ? [2, 2, 2] : [])
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect('Missing Area values do not expand a negative-only domain to zero', () =>
  Story.withBlock(lineSubject, (chart) => {
    const data = rows.map((row) =>
      row.value === null || row.value === undefined ? row : { ...row, value: -4 },
    )

    const props = {
      animationDuration: 0,
      children: [Area({ dataKey: 'value', fadeEdges: false, showHighlight: false })],
    }

    const model = chart.init('negative-area', data, MissingLineRecipe.configuration(props)).model
    const inputs = MissingLineRecipe.inputs('negative-area', props)
    let domain: ReadonlyArray<number> | undefined

    const definition = inputs.resourceDefinition?.(
      data,
      model,
      (snapshot) => {
        domain = snapshot.targetY.left
      },
      () => 0,
    )

    if (definition === undefined) {
      throw new Error('Missing Area scene')
    }

    const runtime = createChartRuntime<typeof Row.Type, Date, number>()

    try {
      runtime.render(definition, { width: 640, height: 320 })
      expect(domain).toEqual([-5, -3])
    } finally {
      runtime.destroy()
    }
  }),
)

const denseRows = Array.from({ length: 1000 }, (_, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
    name: String(index),
    value: Match.value(index).pipe(
      Match.when(10, () => null),
      Match.when(9, () => 0),
      Match.orElse(() => 10),
    ),
  }),
)

effectIt.effect(
  'Sampled Area retains missing-run edges and adjacent measured zero within a bounded path',
  () =>
    Story.withBlock(lineSubject, (chart) => {
      const props = {
        animationDuration: 0,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        children: [Area({ dataKey: 'value', fadeEdges: false, showHighlight: false })],
      }

      const model = chart.init(
        'dense-area',
        denseRows,
        MissingLineRecipe.configuration(props),
      ).model
      const inputs = MissingLineRecipe.inputs('dense-area', props)

      const definition = inputs.resourceDefinition?.(
        denseRows,
        model,
        () => {},
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Missing Area scene')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const scene = runtime.render(definition, { width: 1, height: 200 })
        const nodes = flatten(scene.nodes)

        const paths = nodes.filter(
          (node) => node.kind === 'polyline' && !node.key.includes(':focus'),
        )

        expect(nodes.filter((node) => node.kind === 'area')).toHaveLength(2)
        expect(paths).toHaveLength(2)
        const vertices = paths.flatMap((node) => (node.kind === 'polyline' ? node.points : []))
        expect(vertices.length).toBeLessThanOrEqual(68)
        expect(vertices.find(([x]) => Math.abs(x - 9 / 999) < 1e-10)?.[1]).toBe(200)
        expect(
          paths.every(
            (node) =>
              node.kind === 'polyline' &&
              (node.points.every(([x]) => x <= 9 / 999 + 1e-10) ||
                node.points.every(([x]) => x >= 11 / 999 - 1e-10)),
          ),
        ).toBe(true)
      } finally {
        runtime.destroy()
      }
    }),
)
