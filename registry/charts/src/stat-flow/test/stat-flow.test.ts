import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Window } from 'happy-dom'
import { ChartStatFlowBlock, ChartStatFlowLayer, ChartStatFlowProps } from '../index.js'

export const StatFlowTestKey = Symbol('StatFlowTest')

const Flags = Schema.Struct({ configuration: ChartStatFlowProps, icon: Schema.Boolean })
const Model = Schema.Struct({ stat: ChartStatFlowBlock.Model, icon: Schema.Boolean })
const Message = defineMessageUnion({ Configured: { configuration: ChartStatFlowProps } })
const StatFlowTestDefinition = Block.make('StatFlowTest', {
  key: StatFlowTestKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Flags]),
  ChildInitContext: ChartStatFlowProps,
  view: { kind: 'Document' },
})

const Stat = StatFlowTestDefinition.makeRequiredFieldBinding(ChartStatFlowBlock, {
  field: 'stat',
  init: { contextToArgs: (configuration) => [configuration] },
})

const StatFlowTestComposition = StatFlowTestDefinition.makeComposition({ bindings: [Stat] })

const layer = StatFlowTestDefinition.makeLayer({
  init: StatFlowTestComposition.makeInit(({ configuration, icon }) => ({
    model: { icon },
    childInitContext: configuration,
  })),
  update: StatFlowTestComposition.makeUpdate({
    Configured: StatFlowTestDefinition.makeStep(
      (_model, { configuration }: typeof Message.Configured.Type) =>
        Stat.requestConfigure({ configuration }),
    ),
  }),
  view: StatFlowTestComposition.makeView((model, h) => ({
    title: 'Stat flow contract',
    body: h.block(
      Stat.embedView({
        slotId: 'stat',
        model: model.stat,
        viewInputs: model.icon
          ? { icon: [h.span([h.DataAttribute('test-icon', '')], ['Icon'])] }
          : {},
      }),
    ),
  })),
}).pipe(Layer.provide(ChartStatFlowLayer))

const Parent = { block: StatFlowTestDefinition, layer }
const parent = (configuration: ChartStatFlowProps, icon = false) => ({
  Parent,
  Message,
  render: () =>
    renderToString(Parent, { Flags }, { flags: { configuration, icon }, isHydratable: false }),
})

const pinnedReactSsrCases: ReadonlyArray<{
  name: string
  configuration: ChartStatFlowProps
  value: string
}> = [
  { name: 'default', configuration: { value: 1234.56, label: 'Requests' }, value: '1,235' },
  {
    name: 'compact',
    configuration: {
      value: 1_200_000,
      label: 'Compact',
      formatOptions: { notation: 'compact', maximumFractionDigits: 1 },
    },
    value: '1.2M',
  },
  {
    name: 'currency',
    configuration: {
      value: 1234.56,
      label: 'Currency',
      formatOptions: { style: 'currency', currency: 'USD' },
    },
    value: '$1,234.56',
  },
  {
    name: 'percent',
    configuration: {
      value: 0.125,
      label: 'Percent',
      formatOptions: { style: 'percent', maximumFractionDigits: 1 },
    },
    value: '12.5%',
  },
  { name: 'negative-zero', configuration: { value: -0, label: 'Negative zero' }, value: '-0' },
  { name: 'nan', configuration: { value: Number.NaN, label: 'NaN' }, value: 'NaN' },
  { name: 'infinity', configuration: { value: Infinity, label: 'Infinity' }, value: '∞' },
  {
    name: 'negative-infinity',
    configuration: { value: -Infinity, label: 'Negative infinity' },
    value: '-∞',
  },
]

it.effect('constructs the physical stat handlers without acquiring a browser resource', () =>
  Story.withBlock({ block: ChartStatFlowBlock, layer: ChartStatFlowLayer }, (stat) =>
    Effect.scoped(Layer.build(stat.EffectsLayer)),
  ),
)

for (const { name, configuration, value } of pinnedReactSsrCases) {
  it.effect(`renders the pinned source ${name} value and label without a browser`, () =>
    Effect.gen(function* verifyStatFlow() {
      expect('document' in globalThis).toBe(false)
      const { render } = parent(configuration)
      const { html } = yield* render()
      const document = new Window().document
      document.body.innerHTML = html
      expect(document.querySelector('.bk-stat-value')).not.toBeNull()
      expect(document.querySelector('.bk-stat-label')).not.toBeNull()
      expect(html).toContain(`>${value}</fk-bklit-stat-value>`)
      expect(html).toContain(`>${configuration.label}</span>`)
      expect(html).not.toContain('bk-stat-icon')
      expect(html).not.toContain('<template')
    }),
  )
}

it.effect(
  'keeps explicit format options, empty class replacements, affixes and native icon children',
  () =>
    Effect.gen(function* verifyStatFlow() {
      const { render } = parent(
        {
          value: 12.345,
          label: '<Total>',
          formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
          prefix: '<',
          suffix: '>',
          valueClassName: '',
          labelClassName: 'custom-label',
        },
        true,
      )

      const { html } = yield* render()
      const document = new Window().document
      document.body.innerHTML = html
      expect(document.querySelector('.bk-stat-icon')).not.toBeNull()
      expect(html).toContain('data-test-icon')
      const value = document.querySelector('.bk-stat-value')
      const label = document.querySelector('.bk-stat-label')
      expect(value).not.toBeNull()
      expect(value?.classList.contains('bk-text-2xl')).toBe(false)
      expect(value?.classList.contains('bk-font-bold')).toBe(false)
      expect(label?.classList.contains('custom-label')).toBe(true)
      expect(label?.classList.contains('bk-text-xs')).toBe(false)
      expect(html).toContain('&lt;12.35&gt;</fk-bklit-stat-value>')
      expect(html).toContain('&lt;Total&gt;</span>')
    }),
)

it.effect(
  'registered parent operations update the stat and preserve every JS number through JSON replay',
  () =>
    Effect.gen(function* verifyStatFlow() {
      const { Parent, Message } = parent({ value: 0, label: 'Initial' })
      const codec = Schema.fromJsonString(Parent.block.Model)
      const initial = yield* Story.story(
        Parent,
        Story.init({ configuration: { value: 0, label: 'Initial' }, icon: false }),
      )
      yield* Effect.reduce(
        [12.5, -0, Number.NaN, Infinity, -Infinity],
        () => initial,
        (model, value) =>
          Effect.gen(function* () {
            const updated = yield* Story.story(
              Parent,
              Story.given(model),
              Story.message(Message.Configured({ configuration: { value, label: 'Updated' } })),
            )
            const encoded = yield* Schema.encodeEffect(codec)(updated)
            const restored = yield* Schema.decodeEffect(codec)(encoded)
            expect(Object.is(restored.stat.configuration.value, value)).toBe(true)
            expect(restored.stat.configuration.label).toBe('Updated')
            return restored
          }),
      )
    }),
)
