// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import { constUndefined } from 'effect/Function'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { SankeyChart, SankeyNode, SankeyLink, SankeyTooltip } from '@foldkit-visuals/charts/sankey'
import type { SankeyChartProps } from '@foldkit-visuals/charts/sankey'

const Mode = Schema.Literals(['none', 'node', 'link', 'all', 'duplicate', 'patterns'])
type Mode = typeof Mode.Type
const Selection = Schema.Literals(['none', 'node', 'link', 'invalid'])
type Selection = typeof Selection.Type
const Flags = Schema.Struct({ mode: Mode, selection: Selection })
type Flags = typeof Flags.Type
const recipe = SankeyChart({ name: 'default-config-contract' })
export const SankeyDefaultConfigKey = Symbol('SankeyDefaultConfig')
const Chart = Block.make(recipe.namespace, { ...recipe.contract, key: SankeyDefaultConfigKey })
const chartLayer = Chart.makeLayer(recipe.plans(Chart))

const data: SankeyChartProps['data'] = {
  nodes: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }],
  links: [
    { source: 0, target: 1, value: 12 },
    { source: 1, target: 2, value: 6 },
  ],
}
const node = SankeyNode({ fill: '#778899' })
const link = SankeyLink({ stroke: '#aabbcc' })
const children: Readonly<Record<Mode, NonNullable<SankeyChartProps['children']>>> = {
  none: [],
  node: [node],
  link: [link],
  all: [node, link, SankeyTooltip()],
  duplicate: [
    SankeyNode({ fill: '#112233' }),
    SankeyLink({ stroke: '#445566' }),
    SankeyTooltip({ formatValue: () => 'Discarded formatter' }),
    SankeyNode({ fill: '#778899', formatValue: (value) => `Vehicles ${value}` }),
    link,
    SankeyTooltip({ formatValue: (value) => `Units ${value}` }),
  ],
  patterns: [
    SankeyLink({
      patterns: [{ tag: 'pattern', attributes: { id: 'discarded' } }],
      getLinkPattern: () => 'discarded',
    }),
    SankeyLink({
      patterns: [{ tag: 'pattern', attributes: { id: 'kept' } }],
      getLinkPattern: () => 'kept',
    }),
  ],
}
const Model = Schema.Struct({ mode: Mode, chart: Chart.Model })
type Model = typeof Model.Type
const DocumentKey = Symbol('SankeyDefaultConfigDocument')
const Document = Block.make('SankeyDefaultConfigDocument', {
  key: DocumentKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Flags]),
  view: { kind: 'Document' },
})
const ChartBinding = Document.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['default-config'] },
}).withOutMessagePolicy({
  fold: Document.makeOutMessageFold(Chart, {
    NodeHoverChanged: Document.makeNoopStep,
    NodeHoverRequested: Document.makeNoopStep,
  }),
})
const Composition = Document.makeComposition({ bindings: [ChartBinding] })
const layer = Document.makeLayer({
  init: Composition.makeInit(({ mode, selection }: Flags) => ({
    model: { mode },
    steps:
      selection === 'none'
        ? []
        : [
            ChartBinding.requestTooltip({
              kind: selection === 'link' ? 'link' : 'node',
              index: selection === 'invalid' ? 99 : 0,
            }),
          ],
  })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Sankey default configuration',
    body: h.block(
      ChartBinding.embedView({
        slotId: 'chart',
        model: model.chart,
        viewInputs: recipe.inputs(
          'default-config',
          {
            data,
            animationDuration: 0,
            children: children[model.mode],
          },
          { focusNode: constUndefined, focusLink: constUndefined },
        ),
      }),
    ),
  })),
}).pipe(Layer.provide(chartLayer))

const render = (mode: Mode, selection: Selection = 'none') =>
  Server.renderToString(
    { block: Document, layer },
    { Flags },
    {
      flags: { mode, selection },
      isHydratable: false,
    },
  ).pipe(
    Effect.map(({ html }) => {
      const container = document.createElement('div')
      container.innerHTML = html
      return container
    }),
  )

const nodesOf = (container: HTMLElement) => [
  ...container.querySelectorAll<SVGRectElement>('g[data-ts-key^="sankey:sankey-node-"] > rect'),
]
const linksOf = (container: HTMLElement) => [
  ...container.querySelectorAll<SVGPathElement>('g[data-ts-key^="sankey:flow"] > path'),
]
const nodeBounds = (container: HTMLElement) =>
  nodesOf(container).map((node) =>
    ['x', 'y', 'width', 'height'].map((attribute) => node.getAttribute(attribute)),
  )

it.effect(
  'Sankey carriers configure one complete graph, with the last config of each type winning',
  () =>
    Effect.gen(function* () {
      const complete = yield* render('all')
      const paths = linksOf(complete).map((path) => path.getAttribute('d'))
      const bounds = nodeBounds(complete)
      expect(paths).toHaveLength(2)
      expect(paths.every(Boolean)).toBe(true)
      expect(bounds).toHaveLength(3)

      for (const mode of Mode.literals) {
        const container = yield* render(mode)
        expect(nodesOf(container), mode).toHaveLength(3)
        expect(linksOf(container), mode).toHaveLength(2)
        expect(nodeBounds(container), mode).toEqual(bounds)
        expect(
          linksOf(container).map((path) => path.getAttribute('d')),
          mode,
        ).toEqual(paths)
        expect(nodesOf(container)[0]?.getAttribute('fill'), mode).toBe(
          mode === 'node' || mode === 'all' || mode === 'duplicate' ? '#778899' : 'var(--chart-1)',
        )
        if (mode === 'link' || mode === 'all' || mode === 'duplicate') {
          expect(
            linksOf(container).map((path) => path.getAttribute('stroke')),
            mode,
          ).toEqual(['#aabbcc', '#aabbcc'])
        }
        if (mode === 'node') {
          const stops = [...container.querySelectorAll('linearGradient stop')]
          expect(stops).toHaveLength(4)
          expect(stops.map((stop) => stop.getAttribute('stop-color'))).toEqual([
            '#778899',
            '#778899',
            '#778899',
            '#778899',
          ])
        }
        expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Sankey chart')
      }

      const patterned = yield* render('patterns')
      expect(patterned.querySelector('pattern[id$="-discarded"]')).toBeNull()
      expect(patterned.querySelectorAll('pattern[id$="-kept"]')).toHaveLength(1)
      expect(
        linksOf(patterned).every((path) => path.getAttribute('stroke')?.includes('-kept)')),
      ).toBe(true)
    }),
)

it.effect('Sankey public tooltip requests render defaults without a Tooltip carrier', () =>
  Effect.gen(function* () {
    const node = yield* render('none', 'node')
    const nodeTooltip = node.querySelector<HTMLElement>('#default-config-tooltip')
    expect(nodeTooltip?.hidden).toBe(false)
    expect(nodeTooltip?.textContent).toContain('Alpha')
    expect(nodeTooltip?.textContent).toContain('Sessions')
    expect(nodeTooltip?.textContent).toContain('12')

    const link = yield* render('none', 'link')
    expect(link.querySelector('#default-config-tooltip')?.textContent).toContain('Alpha → Beta')
    expect(link.querySelector('#default-config-tooltip')?.textContent).toContain('Flow')

    const duplicate = yield* render('duplicate', 'node')
    expect(duplicate.querySelector('#default-config-tooltip')?.textContent).toContain('Units 12')
    expect(duplicate.querySelector('svg')?.textContent).toContain('Vehicles 12')
    expect(duplicate.querySelector('svg')?.textContent).not.toContain('Units 12')
    expect(node.querySelector('svg')?.textContent).toContain('12 sessions')
    expect(duplicate.textContent).not.toContain('Discarded formatter')

    const invalid = yield* render('none', 'invalid')
    expect(
      invalid.querySelector('#default-config-tooltip .ts-chart-tooltip__body')?.textContent,
    ).toBe('')
  }),
)
