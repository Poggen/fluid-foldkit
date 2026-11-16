import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { expect } from 'vitest'
import { sliderMotion } from '../gallery/fluid/core-bindings'
import { motion, target } from '../motion'
import { componentPresentation, defaults } from '../settings'
import { AuthoredControlsBlock, layer as controlsLayer } from './authored-controls'

const sliderAccessibilityKey = Symbol('SliderAccessibility')
const Consumer = Block.make('SliderAccessibility', {
  key: sliderAccessibilityKey,
  Model: Schema.Struct({ controls: AuthoredControlsBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const Controls = Consumer.makeRequiredFieldBinding(AuthoredControlsBlock, {
  field: 'controls',
  init: { contextToArgs: () => [] },
})
const Composition = Consumer.makeComposition({ bindings: [Controls] })
const layer = Consumer.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) =>
    h.block(
      Controls.embedView({
        slotId: 'controls',
        model: model.controls,
        viewInputs: { slug: 'slider', settings: componentPresentation(defaults), ready: true },
      }),
    ),
  ),
}).pipe(Layer.provide(controlsLayer))

it.live('every rendered showcase slider has an accessible name, including disabled controls', () =>
  Effect.gen(function* () {
    const container = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const wrapper = document.createElement('div')
        const node = document.createElement('div')
        node.id = 'slider-accessibility'
        wrapper.append(node)
        document.body.append(wrapper)
        return wrapper
      }),
      (node) => Effect.sync(() => node.remove()),
    )
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        Runtime.embed(
          Program.makeElement({
            block: Consumer,
            layer,
            container: container.querySelector<HTMLElement>('#slider-accessibility'),
          }).provide(Layer.mergeAll(motion.layer, target.layer, sliderMotion.layer)),
        ),
      ),
      (runtime) => Effect.promise(runtime.dispose),
    )
    yield* Effect.try(() => {
      const sliders = [...container.querySelectorAll<HTMLInputElement>('input[role="slider"]')]
      expect(sliders.length).toBeGreaterThan(5)
      for (const slider of sliders) expect(slider.getAttribute('aria-label')?.trim()).toBeTruthy()
      expect(
        container.querySelector('input[role="slider"][disabled]')?.getAttribute('aria-label'),
      ).toBeTruthy()
    }).pipe(Effect.retry({ times: 80, schedule: Schedule.spaced('10 millis') }))
  }),
)
