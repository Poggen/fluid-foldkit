import { it } from '@effect/vitest'
import { Array, Tuple } from 'effect'
import { Story } from 'foldkit'
import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import { expect } from 'vitest'
import {
  FluidCardExampleBlock,
  layer as cardsLayer,
} from '../../../registry/fluid/examples/src/card-example-block'
import { componentPresentation, defaults } from '../settings'
import { AuthoredControlsBlock, layer as controlsLayer } from './authored-controls'

it.effect(
  'keeps range, steps and value-display sliders compact when global size returns to default',
  () =>
    Story.story(
      { block: AuthoredControlsBlock, layer: controlsLayer },
      Story.init(),
      Story.inMessage(
        AuthoredControlsBlock.InMessage.InformedOfPresentation({
          presentation: { ...componentPresentation(defaults), size: 'compact' },
        }),
      ),
      Story.inMessage(
        AuthoredControlsBlock.InMessage.InformedOfPresentation({
          presentation: componentPresentation(defaults),
        }),
      ),
      Story.model((model) => {
        for (const key of ['range', 'steps25', 'nonuniform', 'left', 'right', 'tooltip'])
          expect(model.sliders[key]?.settings.compact).toBe(true)
        expect(model.sliders.range?.settings.value).toEqual([25, 75])
        expect(model.sliders.nonuniform?.settings.steps).toEqual([0.1, 0.5, 0.7, 1.1, 1.3])
        expect(model.sliders.default?.settings.compact).toBe(false)
        expect(model.sliders.scrubber?.settings.variant).toBe('scrubber')
      }),
    ),
)

it.effect('restores authored card pointer hover after standard mode', () =>
  Story.story(
    { block: FluidCardExampleBlock, layer: cardsLayer },
    Story.init(),
    Story.inMessage(
      FluidCardExampleBlock.InMessage.InformedOfDocumentation({
        embedded: true,
        shape: 'sharp',
        size: 'default',
        hoverMode: 'standard',
      }),
    ),
    Story.model((model) => {
      expect(model.basic.hover.pointerHandlers).toBe(false)
    }),
    Story.inMessage(
      FluidCardExampleBlock.InMessage.InformedOfDocumentation({
        embedded: true,
        shape: 'pill',
        size: 'compact',
        hoverMode: 'fluid',
      }),
    ),
    Story.model((model) => {
      for (const child of [
        model.basic,
        model.grid,
        model.outlined,
        model.separated,
        model.selection,
      ])
        expect(child.hover.pointerHandlers).toBe(true)
    }),
    Story.Command.resolveAll(
      ...Array.makeBy(10, () =>
        Tuple.make(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
      ),
    ),
  ),
)
