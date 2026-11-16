import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { inertHtml as h } from 'foldkit/html'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { LineChart, Line, ChartTooltip } from '../src/index'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  metadata: Schema.Struct({ label: Schema.String, tags: Schema.Array(Schema.String) }),
})

const root = LineChart({ name: 'model-boundary', Row })

const data: ReadonlyArray<typeof Row.Type> = [1, 2, 3].map((value) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(value * 1000)),
  value,
  metadata: { label: `row-${value}`, tags: ['full', 'datum'] },
}))

export const ModelBoundaryKey = Symbol('ModelBoundary')

const ChartBlock = Block.make(root.namespace, { key: ModelBoundaryKey, ...root.contract })

const childLayer = ChartBlock.makeLayer(root.plans(ChartBlock))

const subject = { block: ChartBlock, layer: childLayer }

const fresh = [...data]

const Model = Schema.Struct({ chart: ChartBlock.Model })

const Message = defineMessageUnion({ Fresh: {}, Original: {} })

export const RowIdentityParentKey = Symbol('RowIdentityParent')

const Parent = Block.make('RowIdentityParent', {
  key: RowIdentityParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const ChartBinding = Parent.makeRequiredFieldBinding(ChartBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['identity', data] },
})

const Composition = Parent.makeComposition({ bindings: [ChartBinding] })

const parentLayer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({
    Fresh: ChartBinding.requestData({ data: fresh }),
    Original: ChartBinding.requestData({ data }),
  }),
  view: Composition.makeView((_model, html) => html.empty),
}).pipe(Layer.provide(childLayer))

it.effect(
  'retains full original rows and array identity for render callbacks and checked data operations',
  () =>
    Effect.gen(function* () {
      const parentSubject = { block: Parent, layer: parentLayer }
      const parent = yield* Story.story(parentSubject, Story.init())
      const changedParent = yield* Story.story(
        parentSubject,
        Story.given(parent),
        Story.message(Message.Fresh()),
      )
      const restoredParent = yield* Story.story(
        parentSubject,
        Story.given(changedParent),
        Story.message(Message.Original()),
      )
      const original = parent.chart
      const changed = changedParent.chart
      const restored = restoredParent.chart
      let tooltipDatum: unknown
      expect(original.data).toBe(data)
      expect(changed.data).toBe(fresh)
      expect(restored.data).toBe(data)

      const inputs = root.inputs('identity', {
        children: [
          Line({ dataKey: 'value' }),
          ChartTooltip<typeof Row.Type>({
            content: ({ point }) => {
              tooltipDatum = point

              return h.span(
                [],
                [point.date.toISOString(), point.metadata.label, String(point.value)],
              )
            },
          }),
        ],
        x: (row) => {
          expect(data.includes(row)).toBe(true)
          expect(row.metadata.tags).toEqual(['full', 'datum'])

          return row.date
        },
      })

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()
      const scene = runtime.render(inputs.definition(restored.data), { width: 640, height: 320 })
      expect(scene.points.every((point) => data.includes(point.datum))).toBe(true)
      runtime.destroy()
      inputs.renderContent?.(restored.data, 1, restored)
      expect(tooltipDatum).toBe(data[1])

      if (!Schema.is(Row)(tooltipDatum)) {
        throw new Error('Tooltip must retain the complete caller row')
      }

      expect(tooltipDatum.metadata).toBe(data[1]?.metadata)
    }),
)

it.effect(
  'roundtrips active state and continues focus, reorder, empty and restoration with all caller fields',
  () =>
    Effect.gen(function* () {
      const active = yield* Story.story(
        subject,
        Story.init('restoration', data),
        Story.inMessage(ChartBlock.InMessage.RequestedFocus({ index: 2 })),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(ChartBlock.Model))
      const encoded = yield* Schema.encodeEffect(codec)(active)
      const decoded = yield* Schema.decodeEffect(codec)(encoded)
      expect(decoded).toEqual(active)
      expect(decoded.data[0]?.date).toBeInstanceOf(Date)
      expect(decoded.data[0]?.metadata).toEqual(data[0]?.metadata)
      expect(decoded.data).not.toBe(data)
      expect(Option.getOrNull(decoded.focusedIndex)).toBe(2)
      const reordered = decoded.data.toReversed()

      yield* Story.story(
        subject,
        Story.given(decoded),
        Story.inMessage(ChartBlock.InMessage.RequestedData({ data: reordered })),
        Story.model((model) => {
          expect(model.data).toBe(reordered)
          expect(model.data[0]?.metadata.label).toBe('row-3')
        }),
        Story.inMessage(ChartBlock.InMessage.RequestedData({ data: [] })),
        Story.model((model) => {
          expect(model.data).toEqual([])
          expect(Option.getOrNull(model.focusedIndex)).toBeNull()
        }),
        Story.inMessage(ChartBlock.InMessage.RequestedData({ data })),
        Story.model((model) => {
          expect(model.data).toBe(data)
          expect(model.data[2]?.metadata.tags).toEqual(['full', 'datum'])
        }),
      )
    }),
)

it.effect('refuses invalid caller rows during model and public message construction', () =>
  Story.withBlock(subject, (chart) => {
    const invalid = [{ date: 'not-a-Date', value: 'not-a-number', metadata: {} }]
    expect(Schema.is(ChartBlock.Model)({ ...chart.init('invalid', []).model, data: invalid })).toBe(
      false,
    )
    expect(() =>
      Schema.decodeSync(
        Schema.fromJsonString(Schema.toCodecJson(ChartBlock.InMessage.RequestedData)),
      )(
        '{"_tag":"RequestedData","data":[{"date":"not-a-Date","value":"not-a-number","metadata":{}}]}',
      ),
    ).toThrow()
  }),
)
