import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { BarChart } from '../src/bar/root'
import { Bar } from '../src/bar/carriers'
import type { BarDatum } from '../src/bar/model'
import type { BarSnapshot, BarValue } from '../src/bar/definition'
import { barViewport, projectBarViewContext } from '../src/bar/view-context'
import { tooltipSetter } from '../src/cartesian/chart-context'
import type { ChartContextCapabilities } from '../src/cartesian/chart-context'
import { ComposedChart } from '../src/composed/root'
import { SeriesBar } from '../src/composed/options'
import { Line, ReferenceArea } from '../src/cartesian/layers'

const BarRow = Schema.Struct({ name: Schema.String, a: Schema.Finite, b: Schema.Finite })

const firstBarRow = BarRow.make({ name: 'A', a: 2, b: -1 })

const barRows = [firstBarRow, BarRow.make({ name: 'B', a: 3, b: 4 })]

const barRoot = BarChart({ name: 'shared-bar-context', Row: BarRow })

export const SharedBarKey = Symbol('SharedBarKey')

const BarBlock = Block.make(barRoot.namespace, { key: SharedBarKey, ...barRoot.contract })

const barSubject = { block: BarBlock, layer: BarBlock.makeLayer(barRoot.plans(BarBlock)) }

const barProps = {
  stacked: true,
  animationDuration: 0,
  children: [
    Bar({ dataKey: 'a', fill: 'red' }),
    Bar({ dataKey: 'b', fill: 'blue', yAxisId: 'right' }),
    ReferenceArea({}),
  ],
}

it.effect(
  'bar context derives real measured bands, row identity, signed offsets and checked focus operations',
  () =>
    Story.withBlock(barSubject, (owner) =>
      Effect.gen(function* () {
        const initial = owner.init('bar-context', barRows, barRoot.configuration(barProps)).model

        const ready = owner.update(
          initial,
          owner.Message.CompletedReveal({ generation: initial.generation }),
        ).model

        let snapshot: BarSnapshot<typeof BarRow.Type> | undefined

        const definition = barRoot.inputs('bar-context', barProps).resourceDefinition?.(
          barRows,
          ready,
          (value) => {
            snapshot = value
          },
          () => 0,
        )

        if (definition === undefined) {
          throw new Error('Bar resource definition missing')
        }

        const runtime = createChartRuntime<BarDatum<typeof BarRow.Type>, BarValue, BarValue>()

        try {
          const scene = runtime.render(definition, { width: 320, height: 180 })
          expect(scene.scales.y?.domain).toEqual([0, 3.5])
          expect(scene.scales['y:right']?.domain).toEqual([0, 4.5])

          if (snapshot === undefined) {
            throw new Error('Native bar renderer did not publish its measurement')
          }

          const focusRow = (index: number | null) => BarBlock.InMessage.RequestedFocus({ index })

          type Action =
            | ReturnType<typeof BarBlock.InMessage.RequestedFocus>
            | ReturnType<typeof BarBlock.InMessage.RequestedSelection>

          const capabilities: ChartContextCapabilities<typeof BarRow.Type, Action> = {
            focusRow,
            setTooltipData: tooltipSetter<typeof BarRow.Type, ReturnType<typeof focusRow>>(
              focusRow,
            ),
            clearSelection: () =>
              BarBlock.InMessage.RequestedSelection({ selection: Option.none() }),
          }

          const project = projectBarViewContext<typeof BarRow.Type>(barProps, { current: null })
          const first = project(barRows, null, ready, barViewport(snapshot), capabilities)
          const hovered = project(barRows, 1, ready, barViewport(snapshot), capabilities)
          expect(hovered.stable).toBe(first.stable)
          expect(first.stable.data).toBe(barRows)
          expect(first.stable.orientation).toBe('vertical')
          expect(first.stable.yScales.left?.domain()).toEqual([0, 3.5])
          expect(first.stable.yScales.right?.domain()).toEqual([0, 4.5])
          expect(first.stable.lines.map((line) => line.yAxisId)).toEqual(['left', 'right'])
          expect(first.stable.bandWidth).toBeCloseTo(87.27272727272727, 10)
          const fixedProject = projectBarViewContext<typeof BarRow.Type>(
            { ...barProps, barWidth: 18 },
            { current: null },
          )
          const fixed = fixedProject(barRows, 1, ready, barViewport(snapshot), capabilities)
          expect(fixed.stable.bandWidth).toBe(18)
          expect(fixed.stable.barScale?.bandwidth()).toBe(first.stable.barScale?.bandwidth())
          expect(fixed.stable.barScale?.step()).toBe(first.stable.barScale?.step())
          expect(fixed.hover.tooltipData?.point).toBe(barRows[1])
          expect(fixed.hover.tooltipData?.x).toBeCloseTo(
            (fixed.stable.barScale?.('B') ?? 0) + 9,
            10,
          )
          expect(first.stable.columnWidth).toBe(120)
          expect(first.stable.stackOffsets?.get(0)?.get('b')).toBe(2)
          expect(first.stable.stackOffsets?.get(1)?.get('b')).toBe(3)
          expect(first.stable.dateLabels).toEqual(['A', 'B'])
          expect(hovered.hover.tooltipData?.point).toBe(barRows[1])
          expect(hovered.hover.tooltipData?.x).toBeCloseTo(174.54545454545453, 10)
          const requested = hovered.hover.setHoveredBarIndex?.(0)

          if (requested === undefined) {
            throw new Error('Bar context omitted its checked focus operation')
          }

          yield* Story.story(
            barSubject,
            Story.given(ready),
            Story.inMessage(requested),
            Story.model((model) => expect(Option.getOrNull(model.focusedIndex)).toBe(0)),
            Story.inMessage(hovered.hover.setTooltipData(null)),
            Story.model((model) => expect(Option.isNone(model.focusedIndex)).toBe(true)),
          )
          expect(first.stable.referenceAreas).toEqual([
            { yAxisId: 'left', y1: null, y2: null, axisLabelColor: null },
          ])
        } finally {
          runtime.destroy()
        }
      }),
    ),
)

export const MixedBarKey = Symbol('MixedBar')

it.effect(
  'bar rendering keeps Source numeric-only cells instead of coercing numeric strings',
  () => {
    const MixedRow = Schema.Struct({
      name: Schema.String,
      value: Schema.Union([Schema.String, Schema.Finite]),
    })

    const rows = [
      MixedRow.make({ name: 'text', value: '12' }),
      MixedRow.make({ name: 'number', value: 4 }),
    ]

    const root = BarChart({ name: 'shared-bar-numeric-cells', Row: MixedRow })
    const props = { animationDuration: 0, children: [Bar({ dataKey: 'value' })] }
    const MixedBlock = Block.make(root.namespace, { key: MixedBarKey, ...root.contract })

    return Story.withBlock(
      { block: MixedBlock, layer: MixedBlock.makeLayer(root.plans(MixedBlock)) },
      (owner) => {
        const initial = owner.init('bar-numeric-cells', rows, root.configuration(props)).model

        const ready = owner.update(
          initial,
          owner.Message.CompletedReveal({ generation: initial.generation }),
        ).model

        let snapshot: BarSnapshot<typeof MixedRow.Type> | undefined

        const definition = root.inputs('bar-numeric-cells', props).resourceDefinition?.(
          rows,
          ready,
          (value) => {
            snapshot = value
          },
          () => 0,
        )

        if (definition === undefined) {
          throw new Error('Bar resource definition missing')
        }

        const runtime = createChartRuntime<BarDatum<typeof MixedRow.Type>, BarValue, BarValue>()

        try {
          runtime.render(definition, { width: 320, height: 180 })
          expect(snapshot?.datums.map((datum) => datum.value)).toEqual([0, 4])
          expect(snapshot?.datums.map((datum) => datum.source)).toEqual(rows)
        } finally {
          runtime.destroy()
        }
      },
    )
  },
)

const BarParentModel = Schema.Struct({ chart: BarBlock.Model })

export const SharedBarParentKey = Symbol('SharedBarContextParent')

const BarParent = Block.make('SharedBarContextParent', {
  key: SharedBarParentKey,
  Model: BarParentModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const BarBinding = BarParent.makeRequiredFieldBinding(BarBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['bar-context-server', barRows, barRoot.configuration(barProps)] },
})

const BarComposition = BarParent.makeComposition({ bindings: [BarBinding] })

const barSeen: Array<{
  readonly width: number
  readonly category: string | undefined
  readonly offset: number | undefined
  readonly loaded: boolean
  readonly action: typeof BarBlock.Message.Type
}> = []

const renderBarContext = () => {
  const barInputs = barRoot.inputs('bar-context-server', {
    ...barProps,
    renderContext: (context, h) => {
      const message = context.hover.setHoveredBarIndex?.(1)

      if (!Schema.is(BarBlock.Message)(message)) {
        throw new Error('Bar context returned a foreign intent')
      }

      barSeen.push({
        width: context.stable.width,
        category: context.stable.barXAccessor?.(firstBarRow),
        offset: context.stable.stackOffsets?.get(0)?.get('b'),
        loaded: context.stable.isLoaded,
        action: message,
      })

      return h.output([], ['bar context'])
    },
  })

  const layer = BarParent.makeLayer({
    init: BarComposition.makeInit(() => ({ model: {} })),
    update: BarComposition.makeUpdate({}),
    view: BarComposition.makeView((model, h) => ({
      title: 'Bar context',
      body: h.div(
        [],
        [
          h.block(
            BarBinding.embedView({ slotId: 'chart', model: model.chart, viewInputs: barInputs }),
          ),
        ],
      ),
    })),
  }).pipe(Layer.provide(barSubject.layer))

  return renderToString({ block: BarParent, layer }, {}, { isHydratable: false })
}

it.effect(
  'the checked bar parent publishes custom context and routes its intent to the owner',
  () =>
    Effect.gen(function* barContextContract() {
      barSeen.length = 0
      const { html } = yield* renderBarContext()
      expect(html).toContain('bar context')
      const focused = yield* Effect.forEach(barSeen, (observation) =>
        Story.story(
          barSubject,
          Story.init('bar-context-server', barRows, barRoot.configuration(barProps)),
          Story.message(observation.action),
        ),
      )
      expect(focused.map((model) => Option.getOrNull(model.focusedIndex))).toEqual([1])
      expect(barSeen.map(({ action: _action, ...facts }) => facts)).toEqual([
        { width: 0, category: 'A', offset: 2, loaded: false },
      ])
    }),
)

const ComposedRow = Schema.Struct({
  date: Schema.DateFromString,
  a: Schema.Finite,
  b: Schema.Finite,
})

const composedRows = [
  ComposedRow.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(0)), a: 2, b: 3 }),
]

const composed = ComposedChart({ name: 'shared-composed-context', Row: ComposedRow })

export const SharedComposedKey = Symbol('SharedComposedKey')

const ComposedBlock = Block.make(composed.namespace, {
  key: SharedComposedKey,
  ...composed.contract,
})

const composedSubject = {
  block: ComposedBlock,
  layer: ComposedBlock.makeLayer(composed.plans(ComposedBlock)),
}

const ComposedModel = Schema.Struct({ chart: ComposedBlock.Model })

export const SharedComposedParentKey = Symbol('SharedComposedContextParent')

const Parent = Block.make('SharedComposedContextParent', {
  key: SharedComposedParentKey,
  Model: ComposedModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const composedProps = {
  barGap: 6,
  stackGap: 2,
  stacked: true,
  children: [
    Line({ dataKey: 'a', stroke: 'red' }),
    SeriesBar({ dataKey: 'b', fill: 'blue' }),
    ReferenceArea({ y1: -1, y2: 4 }),
  ],
}

const Binding = Parent.makeRequiredFieldBinding(ComposedBlock, {
  field: 'chart',
  init: {
    contextToArgs: () => ['composed-context', composedRows, composed.configuration(composedProps)],
  },
})

const Composition = Parent.makeComposition({ bindings: [Binding] })

const seen: Array<{
  readonly width: number
  readonly keys: ReadonlyArray<string> | undefined
  readonly strokes: ReadonlyArray<string>
  readonly action: typeof ComposedBlock.Message.Type
  readonly references: ReadonlyArray<number | null>
}> = []

const renderComposedContext = () => {
  const composedInputs = composed.inputs('composed-context', {
    ...composedProps,
    renderContext: (context, h) => {
      const action = context.hover.setHoveredBarIndex?.(0)

      if (action === undefined) {
        throw new Error('Composed bars omitted their checked focus capability')
      }

      if (!Schema.is(ComposedBlock.Message)(action)) {
        throw new Error('Composed context returned a foreign message')
      }

      seen.push({
        width: context.stable.width,
        keys: context.stable.composedBarDataKeys,
        strokes: context.stable.lines.map((line) => line.stroke),
        action,
        references: context.stable.referenceAreas.map((reference) => reference.y1),
      })

      return h.output(
        [],
        [
          `${context.stable.composedBarGap}/${context.stable.composedStackGap}/${context.stable.composedStacked}`,
        ],
      )
    },
  })

  const layer = Parent.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => ({
      title: 'Composed context',
      body: h.div(
        [],
        [
          h.block(
            Binding.embedView({ slotId: 'chart', model: model.chart, viewInputs: composedInputs }),
          ),
        ],
      ),
    })),
  }).pipe(Layer.provide(composedSubject.layer))

  return renderToString({ block: Parent, layer }, {}, { isHydratable: false })
}

it.effect(
  'the checked composed parent publishes Source bar metadata, reference context and owner-bound focus',
  () =>
    Effect.gen(function* composedContextContract() {
      seen.length = 0
      const { html } = yield* renderComposedContext()
      expect(html).toContain('6/2/true')
      const focused = yield* Effect.forEach(seen, (observation) =>
        Story.story(
          composedSubject,
          Story.init('composed-context', composedRows, composed.configuration(composedProps)),
          Story.message(observation.action),
        ),
      )
      expect(focused.map((model) => Option.getOrNull(model.focusedIndex))).toEqual([0])
      expect(seen.map(({ action: _action, ...facts }) => facts)).toEqual([
        { width: 0, keys: ['b'], strokes: ['red', 'blue'], references: [-1] },
      ])
    }),
)
