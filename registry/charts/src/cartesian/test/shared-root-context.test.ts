import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect, test } from 'vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { Line, LineChart } from '../../index'
import { projectTimeSeriesViewContext } from '../chart-view-context'
import { chartViewport } from '../viewport'
import { buildTimeSeriesDefinition } from '../definition'
import { initialInteraction } from '../state'
import { tooltipSetter } from '../chart-context'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  note: Schema.String,
})

const rows = [1, 2, 3].map((value, index) =>
  Row.make({
    value,
    note: `full-${value}`,
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
  }),
)

const [, secondRow] = rows

if (secondRow === undefined) {
  throw new Error('Root context fixture requires its second row')
}

const props = { animationDuration: 0, children: [Line({ dataKey: 'value' })] }

const focusRow = (index: number | null) => ({ index })

test('measured context preserves row identity and stable geometry while focus changes', () => {
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()
  const measured: Array<ReturnType<typeof chartViewport<typeof Row.Type>>> = []

  try {
    runtime.render(
      buildTimeSeriesDefinition(rows, {
        id: 'context-measurement',
        x: (row) => row.date,
        children: props.children,
        onBuilt: (snapshot) => {
          measured.push(chartViewport(snapshot))
        },
      }),
      { width: 320, height: 180 },
    )
    const [viewport] = measured

    if (viewport === undefined) {
      throw new Error('Actual chart runtime did not publish its viewport')
    }

    const state = {
      ...initialInteraction(),
      domains: { left: [0, 4] satisfies readonly [number, number] },
      revealReady: true,
    }

    const capabilities = {
      focusRow,
      setTooltipData: tooltipSetter<typeof Row.Type, ReturnType<typeof focusRow>>(focusRow),
      clearSelection: () => ({ index: null }),
    }

    const project = projectTimeSeriesViewContext(
      props,
      (row: typeof Row.Type) => row.date,
      { current: null },
      'line',
    )

    const first = project(rows, null, state, viewport, capabilities)
    const hovered = project(rows, 1, state, viewport, capabilities)
    expect(hovered.stable).toBe(first.stable)
    expect(first.stable.data).toBe(rows)
    expect(first.stable.width).toBe(320)
    expect(first.stable.innerWidth).toBe(240)
    expect(first.stable.columnWidth).toBe(120)
    expect(first.stable.chartPhase).toBe('ready')
    expect(first.stable.chartStatus).toBe('ready')
    expect(first.stable.yDomainTargetByAxis).toEqual({ left: [0, 4] })
    expect(hovered.hover.tooltipData?.point).toBe(rows[1])
    expect(hovered.hover.setTooltipData(null)).toEqual({ index: null })
    const resized = project(rows, 1, state, { ...viewport, width: 420 }, capabilities)
    expect(resized.stable).not.toBe(first.stable)
    expect(resized.stable.innerWidth).toBe(340)
    expect(resized.stable.dateLabels).toBe(first.stable.dateLabels)
  } finally {
    runtime.destroy()
  }
})

const chart = LineChart({ name: 'shared-root-context', Row })

export const SharedRootContextKey = Symbol('SharedRootContext')

const ChartBlock = Block.make(chart.namespace, { key: SharedRootContextKey, ...chart.contract })

const childLayer = ChartBlock.makeLayer(chart.plans(ChartBlock))

const subject = { block: ChartBlock, layer: childLayer }

it.effect(
  'measured Line context publishes the checked loading phases without stale stable-slice caching',
  () =>
    Effect.gen(function* () {
      const configured = { ...props, animationDuration: 1100 }
      const ready = yield* Story.story(
        subject,
        Story.init('context-cycle', rows, chart.configuration(configured)),
        Story.messageWith((model) =>
          ChartBlock.Message.CompletedReveal({ generation: model.generation }),
        ),
      )
      const project = projectTimeSeriesViewContext(
        configured,
        (row: typeof Row.Type) => row.date,
        { current: null },
        'line',
      )
      const viewport = {
        width: 320,
        height: 180,
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
        xDomain: [0, 172_800_000] satisfies readonly [number, number],
      }
      const capabilities = {
        focusRow,
        setTooltipData: tooltipSetter<typeof Row.Type, ReturnType<typeof focusRow>>(focusRow),
        clearSelection: () => ({ index: null }),
      }
      const context = (state: typeof ready) => project(rows, null, state, viewport, capabilities)
      const settled = context(ready)

      yield* Story.story(
        subject,
        Story.given(ready),
        Story.inMessage(
          ChartBlock.InMessage.RequestedConfigure({
            configuration: { ...ready.configuration, status: 'loading' },
          }),
        ),
        Story.model((model) => {
          const concealing = context(model)
          expect(concealing.stable.chartStatus).toBe('loading')
          expect(concealing.stable.chartPhase).toBe('exitingReady')
          expect(concealing.stable).not.toBe(settled.stable)
        }),
        Story.messageWith((model) =>
          ChartBlock.Message.ObservedPhaseDeadline({ generation: model.generation }),
        ),
        Story.model((model) => expect(context(model).stable.chartPhase).toBe('gridTweenLoading')),
        Story.messageWith((model) =>
          ChartBlock.Message.ObservedPhaseDeadline({ generation: model.generation }),
        ),
        Story.model((model) => {
          expect(context(model).stable.chartPhase).toBe('loading')
          expect(context(model).stable.chartStatus).toBe('loading')
          expect(project(rows, null, model, undefined, capabilities).stable.chartPhase).toBe(
            'revealing',
          )
        }),
      )
    }),
)

const seen: Array<unknown> = []

const inputs = chart.inputs('context-owner', {
  ...props,
  renderContext: (context, h) => {
    seen.push({
      data: context.stable.data,
      width: context.stable.width,
      loaded: context.stable.isLoaded,
      phase: context.stable.chartPhase,
      focus: context.hover.setTooltipData({ point: secondRow, index: 1, x: 0, yPositions: {} }),
      clear: context.hover.clearSelection?.(),
    })

    return h.div([], ['root context'])
  },
})

const Model = Schema.Struct({ chart: ChartBlock.Model })

export const SharedRootServerKey = Symbol('SharedRootContextServer')

const Parent = Block.make('SharedRootContextServer', {
  key: SharedRootServerKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = Parent.makeRequiredFieldBinding(ChartBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['context-owner', rows, chart.configuration(props)] },
})

const Composition = Parent.makeComposition({ bindings: [Binding] })

const renderRestoredContext = (owner: Story.TestBlock<typeof subject>) => {
  const layer = Parent.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => {
      const restored = owner.update(
        model.chart,
        owner.Message.ObservedDomains({
          current: { left: [0, 4] },
          target: { left: [0, 4] },
          viewport: {
            width: 320,
            height: 180,
            margin: { top: 40, right: 40, bottom: 40, left: 40 },
            xDomain: [0, 172_800_000],
          },
        }),
      ).model

      return {
        title: 'Root context',
        body: h.div(
          [],
          [h.block(Binding.embedView({ slotId: 'chart', model: restored, viewInputs: inputs }))],
        ),
      }
    }),
  }).pipe(Layer.provide(childLayer))

  return renderToString({ block: Parent, layer }, {}, { isHydratable: false })
}

it.effect(
  'checked root keeps Source server defaults with a restored measured model and exposes parent public operations',
  () =>
    Story.withBlock(subject, (owner) =>
      Effect.gen(function* restoredRootContextContract() {
        seen.length = 0
        const { html } = yield* renderRestoredContext(owner)
        expect(html).toContain('root context')
        expect(seen).toEqual([
          {
            data: rows,
            width: 0,
            loaded: false,
            phase: 'revealing',
            focus: ChartBlock.Message.ChangedFocus({ index: 1 }),
            clear: ChartBlock.Message.ChangedSelection({ selection: Option.none() }),
          },
        ])
      }),
    ),
)
