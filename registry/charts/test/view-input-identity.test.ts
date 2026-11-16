import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect, test } from 'vitest'
import { AreaChart, LineChart, Area, Line } from '../src/cartesian/index'
import type { ChartContextRenderer } from '../src/cartesian/chart-context'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const rows = [Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(0)), value: 10 })]

const line = LineChart({ name: 'identity-public-line', Row })

const area = AreaChart({ name: 'identity-public-area', Row })

const lineProps = { children: [Line({ dataKey: 'value' })] }

const areaProps = { children: [Area({ dataKey: 'value' })] }

const lineInputs = line.inputs('identity-line', lineProps)

const areaInputs = area.inputs('identity-area', areaProps)

export const IdentityLineKey = Symbol('IdentityLine')

export const IdentityAreaKey = Symbol('IdentityArea')

const LineBlock = Block.make(line.namespace, { key: IdentityLineKey, ...line.contract })

const AreaBlock = Block.make(area.namespace, { key: IdentityAreaKey, ...area.contract })

const chartLayers = Layer.mergeAll(
  LineBlock.makeLayer(line.plans(LineBlock)),
  AreaBlock.makeLayer(area.plans(AreaBlock)),
)

interface RenderInputs {
  readonly line: ChartContextRenderer<typeof Row.Type>
  readonly area: ChartContextRenderer<typeof Row.Type>
}

export const IdentityMiddleKey = Symbol('IdentityMiddle')

const Middle = Block.make('IdentityMiddle', {
  key: IdentityMiddleKey,
  Model: Schema.Struct({ line: LineBlock.Model, area: AreaBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<RenderInputs>() },
})

const LineBinding = Middle.makeRequiredFieldBinding(LineBlock, {
  field: 'line',
  init: { contextToArgs: () => ['identity-line', rows, line.configuration(lineProps)] },
})

const AreaBinding = Middle.makeRequiredFieldBinding(AreaBlock, {
  field: 'area',
  init: { contextToArgs: () => ['identity-area', rows, area.configuration(areaProps)] },
})

const MiddleComposition = Middle.makeComposition({ bindings: [LineBinding, AreaBinding] })

const revisions: Array<symbol> = []

const middleLayer = Middle.makeLayer({
  init: MiddleComposition.makeInit(() => ({ model: {} })),
  update: MiddleComposition.makeUpdate({}),
  view: MiddleComposition.makeView.withInputs((model, inputs, h) => {
    const currentLine = lineInputs.withRenderContext(inputs.line)
    const currentArea = areaInputs.withRenderContext(inputs.area)
    revisions.push(currentLine.definitionRevision, currentArea.definitionRevision)

    return h.div(
      [],
      [
        h.block(
          LineBinding.embedView({ slotId: 'line', model: model.line, viewInputs: currentLine }),
        ),
        h.block(
          AreaBinding.embedView({ slotId: 'area', model: model.area, viewInputs: currentArea }),
        ),
      ],
    )
  }),
}).pipe(Layer.provide(chartLayers))

export const IdentityParentKey = Symbol('IdentityParent')

const Parent = Block.make('IdentityParent', {
  key: IdentityParentKey,
  Model: Schema.Struct({ child: Middle.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const ChildBinding = Parent.makeRequiredFieldBinding(Middle, {
  field: 'child',
  init: { contextToArgs: () => [] },
})

const ParentComposition = Parent.makeComposition({ bindings: [ChildBinding] })

const renderNested = (inputs: RenderInputs) => {
  const layer = Parent.makeLayer({
    init: ParentComposition.makeInit(() => ({ model: {} })),
    update: ParentComposition.makeUpdate({}),
    view: ParentComposition.makeView((model, h) => ({
      title: 'Input identity',
      body: h.block(
        ChildBinding.embedView({ slotId: 'child', model: model.child, viewInputs: inputs }),
      ),
    })),
  }).pipe(Layer.provide(middleLayer))

  return renderToString({ block: Parent, layer }, {}, { isHydratable: false })
}

const renderer: ChartContextRenderer<typeof Row.Type> = (_context, h) => h.empty

test('render-slot changes retain compilation while owning independent renderer resources', () => {
  const changed = lineInputs.withRenderContext(renderer)
  expect(changed.definitionRevision).toBe(lineInputs.definitionRevision)
  expect(changed.definition).toBe(lineInputs.definition)
  expect(changed.resourceDefinition).toBe(lineInputs.resourceDefinition)
  expect(changed.createResource).not.toBe(lineInputs.createResource)
  expect(changed.configureResource).not.toBe(lineInputs.configureResource)
  expect(changed.observeContainer).not.toBe(lineInputs.observeContainer)
  expect(line.inputs('identity-line', lineProps).definitionRevision).not.toBe(
    lineInputs.definitionRevision,
  )
  expect(areaInputs.definitionRevision).not.toBe(lineInputs.definitionRevision)
})

it.effect(
  'real nested Blocks deliver changed render callbacks without replacing Line or Area construction',
  () =>
    Effect.gen(function* nestedRenderContract() {
      const seen: Array<string> = []
      revisions.length = 0

      const first: RenderInputs = {
        line: (_context, h) => {
          seen.push('line:1')

          return h.output([], ['line:1'])
        },
        area: (_context, h) => {
          seen.push('area:1')

          return h.output([], ['area:1'])
        },
      }

      const initial = yield* renderNested(first)
      const repeated = yield* renderNested(first)

      const changed = yield* renderNested({
        line: (_context, h) => {
          seen.push('line:2')

          return h.output([], ['line:2'])
        },
        area: (_context, h) => {
          seen.push('area:2')

          return h.output([], ['area:2'])
        },
      })

      expect(seen).toEqual(['line:1', 'area:1', 'line:1', 'area:1', 'line:2', 'area:2'])
      expect(initial.html).toContain('line:1')
      expect(repeated.html).toContain('area:1')
      expect(changed.html).toContain('line:2')
      expect(changed.html).toContain('area:2')
      expect(revisions).toEqual([
        lineInputs.definitionRevision,
        areaInputs.definitionRevision,
        lineInputs.definitionRevision,
        areaInputs.definitionRevision,
        lineInputs.definitionRevision,
        areaInputs.definitionRevision,
      ])
    }),
)
