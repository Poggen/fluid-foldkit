import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { ColorPickerBlock as Picker, layer, createColorPickerLayer } from '../src/color-picker.js'
import { Hue } from '../src/color-picker-block.js'
import { SliderBlock } from '../src/slider.js'
import { sliderTargets } from '../src/slider-state.js'
import { TooltipStoryLayer } from './tooltip-story-services.js'

const subject = { block: Picker, layer }
const resources = Layer.merge(createColorPickerLayer(), TooltipStoryLayer)
const init = { id: 'rail-sync', value: '#00ff00' }
const sample = Picker.Message.SquarePointer({
  phase: 'down',
  pointer: 1,
  x: 50,
  y: 50,
  left: 0,
  top: 0,
  width: 100,
  height: 100,
})
const pointer = {
  clientX: 190,
  left: 0,
  visualWidth: 220,
  width: 220,
  clientWidth: 220,
  x0: 200 / 3,
  x1: 0,
  fill: 1 / 3,
  zero: 0,
  handle: false,
  primary: true,
}

it.effect('SV changes update alpha appearance without restarting fixed rail targets', () =>
  Story.story(
    subject,
    Story.init(init),
    Story.models(Story.steps(Story.message(sample)), (before, after) => {
      expect(after.color.hsv.s).toBe(0.5)
      expect(after.color.hsv.v).toBe(0.5)
      expect(after.hue).toBe(before.hue)
      expect(after.alpha.settings.appearance.thumbColor).not.toBe(
        before.alpha.settings.appearance.thumbColor,
      )
      expect(after.alpha.settings.appearance.trackStyle).not.toEqual(
        before.alpha.settings.appearance.trackStyle,
      )
      expect(after.alpha.revision).toBe(before.alpha.revision)
    }),
  ).pipe(Effect.provide(resources)),
)

it.effect('repeated SV samples preserve both aligned rails', () =>
  Story.story(
    subject,
    Story.init(init),
    Story.message(sample),
    Story.models(Story.steps(Story.message(sample)), (before, after) => {
      expect(after.hue).toBe(before.hue)
      expect(after.alpha).toBe(before.alpha)
    }),
  ).pipe(Effect.provide(resources)),
)

it.effect('SV samples preserve active hue drag ownership even when its targets differ', () =>
  Story.story(
    subject,
    Story.init(init),
    Story.messageIn(Hue, SliderBlock.Message.CapturedMount({ width: 220 })),
    Story.messageIn(Hue, SliderBlock.Message.CapturedPointer({ ...pointer, phase: 'down' })),
    Story.models(Story.steps(Story.message(sample)), (before, after) => {
      expect(before.hue.drag).not.toBe('idle')
      expect(after.hue).toBe(before.hue)
      expect(after.color.hsv.h).toBe(before.color.hsv.h)
    }),
  ).pipe(Effect.provide(resources)),
)

it.effect('SV samples reconcile equal hue settings after drag release leaves dirty targets', () =>
  Story.story(
    subject,
    Story.init(init),
    Story.messageIn(Hue, SliderBlock.Message.CapturedMount({ width: 220 })),
    Story.messageIn(Hue, SliderBlock.Message.CapturedPointer({ ...pointer, phase: 'down' })),
    Story.messageIn(Hue, SliderBlock.Message.CapturedPointer({ ...pointer, phase: 'up' })),
    Story.models(Story.steps(Story.message(sample)), (before, after) => {
      expect(before.hue.drag).toBe('idle')
      expect(sliderTargets(before.hue)).not.toBe(before.hue)
      expect(after.hue.settings).toEqual(before.hue.settings)
      expect(after.hue.revision).toBe(before.hue.revision + 1)
      expect(after.hue.immediate).toBe(false)
      expect(sliderTargets(after.hue)).toBe(after.hue)
    }),
  ).pipe(Effect.provide(resources)),
)
