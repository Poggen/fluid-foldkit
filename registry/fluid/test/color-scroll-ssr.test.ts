import { TooltipStoryLayer } from './tooltip-story-services.js'
import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Server } from 'foldkit/experimental'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  ColorScrollExample,
  ColorScrollExampleLayer,
  ColorScrollMotionLayer,
} from '../examples/color-scroll-private/example.js'
import { ColorScrollOptions, colorScrollOptions } from '../examples/color-scroll-private/options.js'
import type { ColorPickerEnvironment } from '../src/color-picker-environment.js'
import { createColorPickerLayer } from '../src/color-picker-environment.js'
import {
  ColorPickerBlock,
  layer as pickerLayer,
  createColorPickerNumberDisplay,
} from '../src/color-picker.js'
import type { ColorPickerConfig } from '../src/color-picker.js'
import { NumberDisplay } from '../src/color-number-locale.js'
import { createMotionScope } from '../src/motion.js'
import { createSliderMotionScope } from '../src/slider-motion.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'
import type { TooltipDom } from '../src/tooltip-native-public.js'

const assertAlphaAutofill = <Model, Message>(
  simulation: Story.StorySimulation<Model, Message, typeof ColorPickerBlock.OutMessage.Type>,
) => {
  expect(simulation.outMessage?._tag).toBe('Events')
  expect(simulation.outMessage?.events).toMatchObject([{ type: 'value', parsed: { a: 0.5 } }])
  return simulation
}

test.effect(
  'composed ColorPicker and ScrollArea render without browser resources or nested view-input callbacks',
  () =>
    Effect.gen(function* renderColorScrollSsr() {
      const rendered = yield* Server.renderToString(
        { block: ColorScrollExample, layer: ColorScrollExampleLayer },
        { Flags: ColorScrollOptions },
        { flags: colorScrollOptions(), isHydratable: true, buildId: 'color-scroll' },
      ).pipe(
        Effect.provide(
          Layer.mergeAll(ColorScrollMotionLayer, createColorPickerLayer(), TooltipStoryLayer),
        ),
      )

      expect(rendered.html).toContain('Saturation and brightness')
      expect(rendered.html).toContain('Hex value')
      expect(rendered.html).toContain('scroll-area-viewport')
      expect(rendered.html).toContain('Scroll item 12: native overflow content')
      expect(rendered.html).toContain('Remove color')
      expect(rendered.html.match(/class="[^"]*scroll-case[^"]*"/gu)).toHaveLength(1)
    }),
)

const NumberSsrModel = Schema.Struct({ picker: ColorPickerBlock.Model })

const NumberSsrMessage = defineMessageUnion({ Noop: {} })

const NumberSsrKey = Symbol('NumberSsr')

const effects = Block.makeEffectsContract<never, ColorPickerEnvironment | TooltipDom>()

const NumberSsrBlock = Block.make('NumberSsr', {
  key: NumberSsrKey,
  InitArgs: Schema.Tuple([NumberDisplay]),
  view: { kind: 'Document' },
  effects,
  Model: NumberSsrModel,
  Message: NumberSsrMessage,
})

const NumberPicker = NumberSsrBlock.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'picker',
  init: {
    contextToArgs: (numberDisplay: typeof NumberDisplay.Type) =>
      [
        {
          id: 'locale-picker',
          defaultFormat: 'oklch',
          defaultValue: 'oklch(50% 0.12 120)',
          numberDisplay,
        },
      ] satisfies [ColorPickerConfig],
  },
}).withOutMessagePolicy({
  fold: NumberSsrBlock.makeOutMessageFold(ColorPickerBlock, {
    Events: () => NumberSsrBlock.makeNoopStep(),
  }),
})

const NumberSsrComposition = NumberSsrBlock.makeComposition({ bindings: [NumberPicker] })

const numberInit = NumberSsrComposition.makeInit((numberDisplay: typeof NumberDisplay.Type) => ({
  model: {},
  childInitContext: numberDisplay,
}))

const numberUpdate = NumberSsrComposition.makeUpdate({ Noop: NumberSsrBlock.makeNoopStep() })

const createNumberSsrLayer = (
  numberMotion: ReturnType<typeof createMotionScope>,
  numberSliderMotion: ReturnType<typeof createSliderMotionScope>,
) => {
  const numberView = NumberSsrComposition.makeView((model, h) => ({
    title: 'Number SSR',
    body: h.div(
      [],
      [
        h.block(
          NumberPicker.embedView({
            slotId: 'number-picker',
            model: model.picker,
            viewInputs: {
              animate: numberMotion.node,
              sliderMotion: numberSliderMotion.node,
              highlightMotion: hoverHighlightAnimation(numberMotion),
            },
          }),
        ),
      ],
    ),
  }))

  return NumberSsrBlock.makeLayer({
    init: numberInit,
    update: numberUpdate,
    view: numberView,
  }).pipe(Layer.provide(pickerLayer))
}

test.effect(
  'explicit captured locale renders initially and survives JSON replay with wrapped hidden bounds absent',
  () =>
    Effect.gen(function* renderNumberLocaleSsr() {
      for (const locale of ['fr-FR', 'ar-EG']) {
        const numberMotion = createMotionScope(`number-ssr-${locale}`)
        const numberSliderMotion = createSliderMotionScope(`number-ssr-slider-${locale}`)
        const NumberSsrLayer = createNumberSsrLayer(numberMotion, numberSliderMotion)
        const display = createColorPickerNumberDisplay(locale)

        const rendered = yield* Server.renderToString(
          { block: NumberSsrBlock, layer: NumberSsrLayer },
          { Flags: NumberDisplay },
          { flags: display, isHydratable: true, buildId: 'number-ssr' },
        ).pipe(
          Effect.provide(
            Layer.mergeAll(
              numberMotion.layer,
              numberSliderMotion.layer,
              createColorPickerLayer(),
              TooltipStoryLayer,
            ),
          ),
        )

        expect(rendered.html).toContain(locale === 'fr-FR' ? 'value="0,12"' : 'value="٠٫١٢"')

        const hidden = [...rendered.html.matchAll(/<input\b[^>]*type="number"[^>]*>/gu)].map(
          (match) => match[0],
        )

        expect(hidden).toHaveLength(4)
        expect(hidden[2]).not.toContain('min=')
        expect(hidden[2]).not.toContain('max=')
        yield* Effect.gen(function* preservesLocaleReplay() {
          const model = yield* Story.story(
            { block: NumberSsrBlock, layer: NumberSsrLayer },
            Story.init(display),
          )
          const codec = Schema.fromJsonString(Schema.toCodecJson(NumberSsrModel))
          const replayed = yield* Schema.encodeEffect(codec)(model).pipe(
            Effect.flatMap(Schema.decodeEffect(codec)),
          )
          expect(replayed.picker.color.numberDisplay).toEqual(display)
          yield* Story.story(
            { block: ColorPickerBlock, layer: pickerLayer },
            Story.given(replayed.picker),
            Story.message(
              ColorPickerBlock.Message.FieldAutofill({ channel: 'alphaPercent', value: '50' }),
            ),
            Story.model((model) =>
              expect(model.color.drafts.alphaPercent).toBe(
                new Intl.NumberFormat(locale, {
                  style: 'unit',
                  unit: 'percent',
                  useGrouping: false,
                  maximumFractionDigits: 0,
                }).format(50),
              ),
            ),
            assertAlphaAutofill,
          )
        }).pipe(Effect.provide(Layer.merge(createColorPickerLayer(), TooltipStoryLayer)))
      }

      expect(() =>
        NumberDisplay.make({ decimal: '.', digits: ['0'], percentPrefix: '', percentSuffix: '%' }),
      ).toThrow()
    }),
)
