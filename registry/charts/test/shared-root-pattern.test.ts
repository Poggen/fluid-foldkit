import { DateTime, Effect, Layer, Schema } from 'effect'
import { constVoid } from 'effect/Function'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { Window } from 'happy-dom'
import {
  BarChart,
  BarSquares,
  BarColumnTrack,
  PatternCircles,
  Scatter,
  ScatterChart,
} from '../src/index'
import type { BarChartProps, PatternPresetId } from '../src/index'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const data = [1, 2].map((value, index) =>
  Row.make({ value, date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)) }),
)

const chart = ScatterChart({ name: 'shared-pattern-scatter', Row })

export const PatternScatterKey = Symbol('PatternScatterKey')

const ScatterBlock = Block.make(chart.namespace, { key: PatternScatterKey, ...chart.contract })

const childLayer = ScatterBlock.makeLayer(chart.plans(ScatterBlock))

const subject = { block: ScatterBlock, layer: childLayer }

const scatterProps = {
  animationDuration: 0,
  children: [
    PatternCircles({ id: 'speckles', width: 8, height: 8, radius: 2, fill: 'red' }),
    Scatter({ dataKey: 'value', fill: 'url(#speckles)', strokeWidth: 0 }),
  ],
}

const inputs = chart.inputs('pattern-owner', scatterProps)

const flatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

const paintedFills = () =>
  Story.withBlock(subject, (owner) => {
    const initial = owner.init('pattern-owner', data, chart.configuration(scatterProps)).model

    const armed = owner.update(
      initial,
      owner.Message.ObservedPhaseTiming({
        generation: initial.generation,
        elapsed: null,
        at: 1000,
      }),
    ).model

    const compile = inputs.resourceDefinition

    if (compile === undefined) {
      throw new Error('Missing actual Scatter root resource compiler')
    }

    const runtime = createChartRuntime<typeof Row.Type, Date, number>()

    try {
      return flatten(
        runtime.render(
          compile(data, armed, constVoid, () => 1000),
          { width: 320, height: 180 },
        ).nodes,
      )
        .filter((node) => node.kind === 'dot')
        .map((node) => node.style?.fill)
    } finally {
      runtime.destroy()
    }
  })

const Model = Schema.Struct({ chart: ScatterBlock.Model })

export const SharedPatternRootServerKey = Symbol('SharedPatternRootServer')

const Parent = Block.make('SharedPatternRootServer', {
  key: SharedPatternRootServerKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = Parent.makeRequiredFieldBinding(ScatterBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['pattern-owner', data, chart.configuration(scatterProps)] },
})

const Composition = Parent.makeComposition({ bindings: [Binding] })

const parentLayer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Pattern root',
    body: h.div(
      [],
      [h.block(Binding.embedView({ slotId: 'chart', model: model.chart, viewInputs: inputs }))],
    ),
  })),
}).pipe(Layer.provide(childLayer))

it.effect('scopes actual Scatter compiler paints to the matching root-owned pattern resource', () =>
  Effect.gen(function* patternScopeContract() {
    const fills = yield* paintedFills()
    expect(fills.length).toBeGreaterThan(0)
    expect(fills.every((fill) => fill === 'url(#pattern-owner-speckles)')).toBe(true)

    const { html } = yield* renderToString(
      { block: Parent, layer: parentLayer },
      {},
      { isHydratable: false },
    )

    expect(html).toContain('id="pattern-owner-speckles"')
    expect(html).toContain('patternUnits="userSpaceOnUse"')
  }),
)

function squareDocument(html: string) {
  const browser = new Window()
  browser.document.body.innerHTML = html
  return browser.document
}

const SquareRow = Schema.Struct({ name: Schema.String, a: Schema.Finite, b: Schema.Finite })

const squareRows = [
  SquareRow.make({ name: 'A', a: 20, b: 20 }),
  SquareRow.make({ name: 'B', a: 40, b: 40 }),
]

const squareRoot = BarChart({ name: 'square-paint-contract', Row: SquareRow })

export const SquarePaintKey = Symbol('SquarePaint')

const SquareBlock = Block.make(squareRoot.namespace, {
  key: SquarePaintKey,
  ...squareRoot.contract,
})

const squareSubject = {
  block: SquareBlock,
  layer: SquareBlock.makeLayer(squareRoot.plans(SquareBlock)),
}

export const SquarePaintParentKey = Symbol('SquarePaintParent')

const SquareParent = Block.make('SquarePaintParent', {
  key: SquarePaintParentKey,
  Model: Schema.Struct({ left: SquareBlock.Model, right: SquareBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const leftBinding = SquareParent.makeRequiredFieldBinding(SquareBlock, {
  field: 'left',
  init: {
    contextToArgs: () => ['square-left', squareRows, squareRoot.configuration({ children: [] })],
  },
})

const rightBinding = SquareParent.makeRequiredFieldBinding(SquareBlock, {
  field: 'right',
  init: {
    contextToArgs: () => ['square-right', squareRows, squareRoot.configuration({ children: [] })],
  },
})

const SquareComposition = SquareParent.makeComposition({ bindings: [leftBinding, rightBinding] })

const paintProps: (
  preset?: PatternPresetId,
  gradient?: boolean,
  stops?: { offset: number; color: string }[],
) => BarChartProps<typeof SquareRow.Type> = (
  preset?: PatternPresetId,
  gradient = true,
  stops = [
    { offset: 0, color: 'red' },
    { offset: 100, color: 'blue' },
  ],
) =>
  ({
    width: 400,
    height: 400,
    animationDuration: 0,
    barGap: 0,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    children: [
      PatternCircles({ id: 'original', width: 8, height: 8, fill: 'green' }),
      BarSquares({
        dataKey: 'a',
        fill: 'url(#original)',
        useGradient: gradient,
        gradientStops: stops,
        patternPreset: preset ?? 'none',
        animate: false,
        groupGap: 0,
        squareGap: 0,
      }),
      BarSquares({ dataKey: 'b', fill: 'green', animate: false, groupGap: 0, squareGap: 0 }),
    ],
  }) satisfies BarChartProps<typeof SquareRow.Type>

const renderSquarePaints = (props: BarChartProps<typeof SquareRow.Type>, width = 400) =>
  Story.withBlock(squareSubject, (owner) => {
    const layer = SquareParent.makeLayer({
      init: SquareComposition.makeInit(() => ({ model: {} })),
      update: SquareComposition.makeUpdate({}),
      view: SquareComposition.makeView((model, h) => {
        const measured = owner.update(
          model.left,
          owner.Message.ObservedDomains({
            current: { left: [0, 45] },
            target: { left: [0, 45] },
            viewport: {
              width,
              height: 400,
              margin: { top: 0, right: 0, bottom: 0, left: 0, ...props.margin },
              xDomain: [0, 1],
            },
          }),
        ).model

        return {
          title: 'Square paint graph',
          body: h.div(
            [],
            [
              h.block(
                leftBinding.embedView({
                  slotId: 'left',
                  model: measured,
                  viewInputs: squareRoot.inputs('square-left', props),
                }),
              ),
              h.block(
                rightBinding.embedView({
                  slotId: 'right',
                  model: model.right,
                  viewInputs: squareRoot.inputs('square-right', props),
                }),
              ),
            ],
          ),
        }
      }),
    }).pipe(Layer.provide(squareSubject.layer))

    return renderToString({ block: SquareParent, layer }, {}, { isHydratable: false })
  })

for (const preset of ['dots', 'cross', 'accent', 'none'] satisfies ReadonlyArray<PatternPresetId>) {
  it.effect(
    `square ${preset} resources retain the Source gradient graph and isolate checked roots`,
    () =>
      Effect.gen(function* squarePaintGraph() {
        const { html } = yield* renderSquarePaints(paintProps(preset))
        const document = squareDocument(html)
        const roots = [...document.querySelectorAll('[data-bkm-native-chart]')]
        expect(roots).toHaveLength(2)
        const ids = [...document.querySelectorAll('[id]')].map((element) => element.id)
        expect(new Set(ids).size).toBe(ids.length)

        for (const rootElement of roots) {
          const squares = [...rootElement.querySelectorAll('rect')].filter(
            (rect) => rect.getAttribute('fill')?.startsWith('url(') === true,
          )

          expect(squares.length).toBeGreaterThan(0)
          const fill = squares[0]?.getAttribute('fill') ?? ''
          const id = /^url\(#(?<id>[^)]+)\)$/u.exec(fill)?.groups?.id
          const paint = id === undefined ? null : document.querySelector(`[id="${id}"]`)

          if (paint === null) {
            throw new Error('Each square fill must resolve to its owned paint definition')
          }

          expect(rootElement.contains(paint)).toBe(true)

          const gradient =
            preset === 'none'
              ? paint
              : rootElement.querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')

          if (gradient === null) {
            throw new Error('Each generated square paint must own its user-space gradient')
          }

          expect(gradient.tagName.toLowerCase()).toBe('lineargradient')
          expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse')
          expect(gradient.getAttribute('y1')).toBe('400')
          expect(gradient.getAttribute('y2')).toBe('200')
          expect(
            [...gradient.querySelectorAll('stop')].map((stop) => [
              stop.getAttribute('offset'),
              stop.getAttribute('stop-color'),
            ]),
          ).toEqual([
            ['0%', 'red'],
            ['100%', 'blue'],
          ])

          if (preset !== 'none') {
            expect(paint.tagName.toLowerCase()).toBe('pattern')
            expect(paint.getAttribute('patternUnits')).toBe('userSpaceOnUse')
            const glyph = paint.querySelector('circle, path')
            expect(glyph?.getAttribute(preset === 'dots' ? 'fill' : 'stroke')).toBe(
              preset === 'accent' ? '#e879f9' : `url(#${gradient.id})`,
            )
          }
        }
      }),
  )
}

it.effect('measured square paints resize with stable root identities', () =>
  Effect.gen(function* resizedSquarePaint() {
    const first = yield* renderSquarePaints(paintProps('dots'), 400)
    const resized = yield* renderSquarePaints(paintProps('dots'), 200)

    const documents = [first.html, resized.html].map(squareDocument)

    const before = documents[0]?.querySelector(
      '[data-bkm-native-chart="square-left"] linearGradient[gradientUnits="userSpaceOnUse"]',
    )

    const after = documents[1]?.querySelector(
      '[data-bkm-native-chart="square-left"] linearGradient[gradientUnits="userSpaceOnUse"]',
    )

    expect(before?.getAttribute('y2')).toBe('200')
    expect(after?.getAttribute('y2')).toBe('200')
    expect(before?.id).toBe(after?.id)

    const ids = documents.map((document) =>
      [
        ...document.querySelectorAll('[data-bkm-native-chart="square-left"] rect[fill^="url("]'),
      ].map((rect) => rect.getAttribute('fill')),
    )

    expect(ids[0]?.[0]).toBe(ids[1]?.[0])
    expect(ids[1]?.length).toBeGreaterThan(ids[0]?.length ?? 0)
  }),
)

it.effect('disabled gradients keep the authored pattern instead of applying a preset', () =>
  Effect.gen(function* plainSquarePattern() {
    const { html } = yield* renderSquarePaints(paintProps('dots', false))
    const document = squareDocument(html)
    expect(document.querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')).toBeNull()
    expect(
      document.querySelector(
        '[data-bkm-native-chart="square-left"] rect[fill="url(#square-left-original)"]',
      ),
    ).not.toBeNull()
  }),
)

for (const mode of ['horizontal', 'stacked']) {
  const unsupported: Pick<
    BarChartProps<typeof SquareRow.Type>,
    'orientation' | 'stacked'
  > = mode === 'horizontal' ? { orientation: 'horizontal' } : { stacked: true }

  it.effect(`square columns and tracks stay absent in Source-unsupported ${mode} charts`, () =>
    Effect.gen(function* unsupportedSquarePaint() {
      const props = paintProps('dots')

      const { html } = yield* renderSquarePaints({
        ...props,
        ...unsupported,
        children: [...props.children, BarColumnTrack()],
      })

      const document = squareDocument(html)
      expect(
        document.querySelector('rect[class*="bkm-bsquares"], rect[class*="bkm-btrack"]'),
      ).toBeNull()
      expect(document.querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')).toBeNull()
    }),
  )
}

it.effect('short gradient stop lists use Source fill-color fallback stops', () =>
  Effect.gen(function* squareGradientFallback() {
    const props = paintProps(undefined, true, [{ offset: 50, color: 'orange' }])

    const { html } = yield* renderSquarePaints({
      ...props,
      children: [
        BarSquares({
          dataKey: 'a',
          fill: 'teal',
          useGradient: true,
          gradientStops: [{ offset: 50, color: 'orange' }],
          animate: false,
        }),
      ],
    })

    const document = squareDocument(html)

    const stops = document
      .querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')
      ?.querySelectorAll('stop')

    expect(
      [...(stops ?? [])].map((stop) => [
        stop.getAttribute('offset'),
        stop.getAttribute('stop-color'),
      ]),
    ).toEqual([
      ['0%', 'teal'],
      ['100%', 'teal'],
    ])
  }),
)

it.effect('paint resources keep current context and column coordinates', () =>
  Effect.gen(function* squarePaintChartCoordinates() {
    const contexts = [
      {
        '--arbitrary-paint': 'purple',
        color: 'teal',
        colorInterpolation: 'linearRGB',
        width: 999,
        position: 'fixed',
        transform: 'scale(3)',
      },
      { 'color-interpolation': 'sRGB' },
      {},
    ] satisfies ReadonlyArray<NonNullable<BarChartProps<typeof SquareRow.Type>['style']>>
    for (const style of contexts) {
      const { html } = yield* renderSquarePaints({
        ...paintProps('none', true, [
          { offset: 0, color: 'var(--arbitrary-paint)' },
          { offset: 100, color: 'currentColor' },
        ]),
        margin: { top: 40, right: 0, bottom: 40, left: 0 },
        style,
      })
      const document = squareDocument(html)
      const chartElement = document.querySelector('[data-bkm-native-chart="square-left"]')
      const cells = [...(chartElement?.querySelectorAll('rect[data-ts-key^="squares:a:0:"]') ?? [])]
      const first = cells[0]
      if (first === undefined) {
        throw new Error('The checked public chart must paint the first square column')
      }
      const id = /^url\(#(?<id>[^)]+)\)$/u.exec(first.getAttribute('fill') ?? '')?.groups?.id
      const gradient = document.querySelector(`[id="${id}"]`)
      if (gradient === null) {
        throw new Error('The rendered column must reference its gradient definition')
      }
      const top = Math.min(...cells.map((cell) => Number(cell.getAttribute('y'))))
      const bottom = Math.max(
        ...cells.map(
          (cell) => Number(cell.getAttribute('y')) + Number(cell.getAttribute('height')),
        ),
      )
      expect(bottom).toBe(360)
      expect(Number(gradient.getAttribute('y1'))).toBe(bottom)
      expect(Number(gradient.getAttribute('y2'))).toBe(top)
      const hosts = [...(chartElement?.querySelectorAll('svg') ?? [])].filter(
        (host) => host.getAttribute('aria-hidden') === 'true',
      )
      expect(hosts).toHaveLength(2)
      for (const host of hosts) {
        expect(host.style.getPropertyValue('--arbitrary-paint')).toBe(
          style['--arbitrary-paint'] ?? '',
        )
        expect(host.style.color).toBe(style.color ?? '')
        expect(host.style.getPropertyValue('color-interpolation')).toBe(
          style.colorInterpolation ?? style['color-interpolation'] ?? '',
        )
        expect(host.getAttribute('width')).toBe('0')
        expect(host.getAttribute('height')).toBe('0')
        expect(host.style.transform).toBe('')
      }
    }
  }),
)
