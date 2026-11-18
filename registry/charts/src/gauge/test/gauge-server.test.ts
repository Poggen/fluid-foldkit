import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { GaugeBlock, GaugeLayer, GaugeConfiguration } from '..'
import type { GaugeViewInputs } from '..'

export const GaugeServerContractKey = Symbol('GaugeServerContract')

const Model = Schema.Struct({ gauge: GaugeBlock.Model })

const Definition = Block.make('GaugeServerContract', {
  key: GaugeServerContractKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([GaugeConfiguration]),
  ChildInitContext: GaugeConfiguration,
  view: { kind: 'Document' },
})

const Binding = Definition.makeRequiredFieldBinding(GaugeBlock, {
  field: 'gauge',
  init: { contextToArgs: (configuration) => [configuration, 'server-contract'] },
})

const Composition = Definition.makeComposition({ bindings: [Binding] })

const serverGauge = (configuration: GaugeConfiguration, viewInputs: GaugeViewInputs = {}) => {
  const layer = Definition.makeLayer({
    init: Composition.makeInit((initialConfiguration) => ({
      model: {},
      childInitContext: initialConfiguration,
    })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => ({
      title: 'Gauge server contract',
      body: h.div(
        [],
        [h.block(Binding.embedView({ slotId: 'gauge', model: model.gauge, viewInputs }))],
      ),
    })),
  }).pipe(Layer.provide(GaugeLayer))

  return renderToString(
    { block: Definition, layer },
    { Flags: GaugeConfiguration },
    { flags: configuration, isHydratable: false },
  )
}

it.effect(
  'server-renders the source fluid arc geometry, accessible reading and initial center label',
  () =>
    Effect.gen(function* serverArc() {
      expect(Schema.is(Schema.Undefined)(globalThis.window)).toBe(true)
      expect(Schema.is(Schema.Undefined)(globalThis.document)).toBe(true)
      yield* Story.withBlock({ block: GaugeBlock, layer: GaugeLayer }, (gauge) =>
        Effect.scoped(Layer.build(gauge.EffectsLayer)),
      )

      const { html } = yield* serverGauge(
        GaugeConfiguration.make({ value: 65, centerValue: 845, width: 200 }),
      )

      expect(html.match(/<svg\b/gu)).toHaveLength(1)
      expect(html.match(/<path\b/gu)).toHaveLength(66)
      expect(html).toContain('viewBox="0 0 640 487.62"')
      expect(html).toContain('aria-label="Gauge: 65%"')
      expect(html).toContain('tabindex="-1"')
      expect(html).toContain('>Total</span>')
      expect(html).toContain('>0</span>')
    }),
)

it.effect(
  'server-renders the fixed linear track without a browser or a responsive-size guess',
  () =>
    Effect.gen(function* serverLinear() {
      expect(Schema.is(Schema.Undefined)(globalThis.window)).toBe(true)
      expect(Schema.is(Schema.Undefined)(globalThis.document)).toBe(true)

      const { html } = yield* serverGauge(
        GaugeConfiguration.make({
          orientation: 'linear',
          value: 50,
          totalNotches: 4,
          width: 240,
          height: 24,
        }),
      )

      expect(html.match(/<path\b/gu)).toHaveLength(6)
      expect(html).toContain('viewBox="0 0 240 24"')
      expect(html).toContain('aria-label="Gauge: 50%"')
    }),
)

it.effect(
  'restores logical configuration and keeps source-ignored callable easing outside the Model',
  () =>
    Effect.gen(function* configurationRoundtrip() {
      const subject = { block: GaugeBlock, layer: GaugeLayer }
      const initial = yield* Story.story(
        subject,
        Story.init({ value: 10, enterTransition: { type: 'tween', duration: 0.4 } }, 'codec-gauge'),
      )
      const active = yield* Story.story(
        subject,
        Story.given(initial),
        Story.inMessage(
          GaugeBlock.InMessage.RequestedConfigure({
            configuration: { ...initial.configuration, value: 74, centerValue: 983, prefix: '$' },
          }),
        ),
      )

      const codec = Schema.toCodecJson(GaugeBlock.Model)
      const encoded = yield* Schema.encodeEffect(codec)(active)
      const restored = yield* Schema.decodeUnknownEffect(codec)(structuredClone(encoded))
      expect(restored).toEqual(active)
      let samples = 0
      let logicalDuration: number | undefined

      const { html } = yield* serverGauge(restored.configuration, {
        enterTransition: (configuration) => {
          logicalDuration = configuration?.duration

          return {
            ...configuration,
            ease: (progress) => {
              samples += 1

              return progress * progress
            },
          }
        },
        children: () => ({ external: () => 'source-ignored-child' }),
      })

      expect(logicalDuration).toBe(0.4)
      expect(samples).toBe(0)
      expect(html).toContain('aria-label="Gauge: 74%"')
      expect(html).toContain('cubic-bezier(0,0,0.58,1)')
      expect(
        Schema.is(GaugeBlock.Model)({
          ...active,
          configuration: {
            ...active.configuration,
            enterTransition: { ease: (value: number) => value },
          },
        }),
      ).toBe(false)
    }),
)

it.effect('renders linear geometry scrubbing immediately without a hidden entrance reserve', () =>
  Effect.gen(function* serverScrubbing() {
    const { html } = yield* serverGauge(
      GaugeConfiguration.make({
        orientation: 'linear',
        value: 50,
        totalNotches: 4,
        width: 240,
        height: 24,
        geometryScrubbing: true,
      }),
    )

    expect(html.match(/<path\b/gu)).toHaveLength(6)
    expect(html).toContain('aria-label="Gauge: 50%"')
    expect(html).not.toContain('@keyframes')
    expect(html).not.toContain('data-bkm-gn=')
  }),
)
