import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Server } from 'foldkit/experimental'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  SliderBlock,
  layer as sliderLayer,
  createSliderMotionScope,
} from '@foldkit-visuals/fluid/slider'
import type { SliderConfig } from '@foldkit-visuals/fluid/slider'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import {
  SliderAskExampleBlock,
  SliderAskExampleLayer,
  SliderAskMotionLayer,
  sliderAskEnvironment,
} from '../examples/src/slider-ask-example.js'

const SliderServerMessage = defineMessageUnion({ Noop: {} })

const SliderServerKey = Symbol('SliderServer')

const effects = Block.makeEffectsContract()

const SliderServerBlock = Block.make('SliderServer', {
  key: SliderServerKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ radix: SliderBlock.Model, base: SliderBlock.Model }),
  Message: SliderServerMessage,
  view: { kind: 'Document' },
  effects,
})

const Radix = SliderServerBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'radix',
  init: {
    contextToArgs: () =>
      [{ id: 'server-radix', value: [20, 70], size: 'compact' }] satisfies [SliderConfig],
  },
}).withOutMessagePolicy({
  fold: SliderServerBlock.makeOutMessageFold(SliderBlock, {
    Changed: SliderServerBlock.makeNoopStep,
  }),
})

const Base = SliderServerBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'base',
  init: {
    contextToArgs: () =>
      [{ id: 'server-base', value: 0.5, min: 0, max: 1, size: 'compact' }] satisfies [SliderConfig],
  },
}).withOutMessagePolicy({
  fold: SliderServerBlock.makeOutMessageFold(SliderBlock, {
    Changed: SliderServerBlock.makeNoopStep,
  }),
})

const SliderServer = SliderServerBlock.makeComposition({ bindings: [Radix, Base] })

test.effect('standalone Radix and Base Sliders server-render without browser acquisition', () =>
  Effect.gen(function* rendersSliders() {
    const motion = createMotionScope('server-slider-surface')
    const values = createSliderMotionScope('server-slider-values')

    const layer = SliderServerBlock.makeLayer({
      init: SliderServer.makeInit(() => ({ model: {} })),
      update: SliderServer.makeUpdate({ Noop: (model) => ({ model }) }),
      view: SliderServer.makeView((model, h) => ({
        title: 'Server sliders',
        body: h.main(
          [],
          [
            h.block(
              Radix.embedView({
                slotId: model.radix.id,
                model: model.radix,
                viewInputs: { label: 'Volume', animate: motion.node, motionValues: values.node },
              }),
            ),
            h.block(
              Base.embedView({
                slotId: model.base.id,
                model: model.base,
                viewInputs: { label: 'Speed', animate: motion.node, motionValues: values.node },
              }),
            ),
          ],
        ),
      })),
    }).pipe(Layer.provide(sliderLayer))

    const rendered = yield* Server.renderToString(
      { block: SliderServerBlock, layer },
      {},
      { isHydratable: true, buildId: 'slider' },
    ).pipe(Effect.provide(Layer.merge(motion.layer, values.layer)))

    expect(rendered.html).toContain('role="slider"')
    expect(rendered.html).toContain('aria-label="Volume minimum"')
    expect(rendered.html).toContain('aria-valuetext="20 start range"')
    expect(rendered.html).toContain('aria-valuetext="70 end range"')
    expect(rendered.html).toContain('type="range"')
  }),
)

test.effect('combined choice Ask consumer server-renders its bound sliders and choices', () =>
  Effect.gen(function* rendersAskConsumer() {
    const rendered = yield* Server.renderToString(
      { block: SliderAskExampleBlock, layer: SliderAskExampleLayer },
      {},
      { isHydratable: true, buildId: 'slider-ask' },
    ).pipe(Effect.provide(Layer.merge(SliderAskMotionLayer, sliderAskEnvironment(undefined, ''))))

    expect(rendered.html).toContain('Which approach should we use?')
    expect(rendered.html).toContain('Native')
    expect(rendered.html).toContain('Portable')
    expect(rendered.html).toContain('Custom')
    expect(rendered.html).toContain('role="radio"')
    expect(rendered.html).toContain('role="slider"')
    expect(rendered.html).toContain('aria-valuetext="20 start range"')
    expect(rendered.html).toContain('aria-valuetext="70 end range"')
  }),
)

test.effect('a reusable checked parent projects inherited size into bound Slider decisions', () =>
  Story.story(
    { block: SliderAskExampleBlock, layer: SliderAskExampleLayer },
    Story.init(),
    Story.model((model) => {
      expect(model.pips.settings.compact).toBe(false)
      expect(model.scrubber.settings.compact).toBe(false)
    }),
    Story.message(SliderAskExampleBlock.Message.ClickedSize()),
    Story.model((model) => {
      expect(model.pips.settings.compact).toBe(true)
      expect(model.scrubber.settings.compact).toBe(true)
      expect(model.radix.settings.compact).toBe(true)
    }),
    Story.message(SliderAskExampleBlock.Message.ClickedSize()),
    Story.model((model) => {
      expect(model.pips.settings.compact).toBe(false)
      expect(model.scrubber.settings.compact).toBe(false)
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(sliderAskEnvironment(undefined, ''))),
)
