import { Number } from 'effect'
import { examplePresentation } from './example-presentation.js'
import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { Badge } from '@foldkit-visuals/fluid/badge'
import type { BadgeColor } from '@foldkit-visuals/fluid/badge'
import './primitives.css'

const Model = Schema.Struct({ clicks: Schema.Finite })

const Message = defineMessageUnion({ Clicked: {}, UpdatedTheme: {} })

export const FluidPrimitiveParityKey = Symbol('FluidPrimitiveParity')

const effects = Block.makeEffectsContract()

const FluidPrimitiveParityBlock = Block.make('FluidPrimitiveParity', {
  key: FluidPrimitiveParityKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const FluidPrimitiveParityComposition = FluidPrimitiveParityBlock.makeComposition()

const init = FluidPrimitiveParityComposition.makeInit(() => ({ model: { clicks: 0 } }))

const update = FluidPrimitiveParityComposition.makeUpdate({
  Clicked: FluidPrimitiveParityBlock.makeFieldsStep(() => ({ clicks: Number.increment })),
  UpdatedTheme: FluidPrimitiveParityBlock.makeNoopStep(),
})

const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'] satisfies Array<
  'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive'
>

const shapes = ['sharp', 'rounded', 'pill'] satisfies Array<'sharp' | 'rounded' | 'pill'>

const sizes = ['default', 'compact'] satisfies Array<'default' | 'compact'>

const colors = [
  'gray',
  'accent',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] satisfies Array<BadgeColor>

const view = FluidPrimitiveParityComposition.makeView((model, h) => ({
  title: 'Fluid primitive parity',
  body: h.main(
    [
      h.Class(
        "p-6 max-w-275 [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h1]:mb-2 [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h2]:m-[16px_0_8px] [&_output]:text-[13px] [&_output]:leading-[20px]",
      ),
    ],
    [
      h.h1([], ['Fluid primitive parity']),
      h.output([h.Id('clicks')], [`Activations ${model.clicks}`]),
      ...shapes.flatMap((shape) =>
        sizes.map((size) =>
          h.section(
            [],
            [
              h.h2([], [`${shape} ${size}`]),
              h.div(
                [h.Class('flex items-center gap-2 mb-2')],
                variants.map((variant) =>
                  Button(
                    {
                      children: [variant],
                      variant,
                      shape,
                      size,
                      attributes: [h.OnClick(Message.Clicked())],
                      ...examplePresentation,
                    },
                    h,
                  ),
                ),
              ),
              h.div(
                [h.Class('flex items-center gap-2 mb-2')],
                variants.map((variant) =>
                  Button(
                    {
                      children: ['Continue'],
                      variant,
                      shape,
                      size,
                      active: true,
                      attributes: [h.OnClick(Message.Clicked())],
                      ...examplePresentation,
                    },
                    h,
                  ),
                ),
              ),
              h.div(
                [h.Class('flex items-center gap-2 mb-2')],
                variants.map((variant) =>
                  Button(
                    {
                      children: ['Continue'],
                      variant,
                      shape,
                      size,
                      disabled: true,
                      attributes: [h.OnClick(Message.Clicked())],
                      ...examplePresentation,
                    },
                    h,
                  ),
                ),
              ),
              h.div(
                [h.Class('flex items-center gap-2 mb-2 flex-wrap')],
                colors.map((color) =>
                  Badge({ children: [color], color, shape, size, ...examplePresentation }, h),
                ),
              ),
              h.div(
                [h.Class('flex items-center gap-2 mb-2 flex-wrap')],
                colors.map((color) =>
                  Badge(
                    {
                      children: [color],
                      color,
                      shape,
                      size,
                      variant: 'dot',
                      ...examplePresentation,
                    },
                    h,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  ),
}))

const layer = FluidPrimitiveParityBlock.makeLayer({ init, update, view })

Runtime.run(
  Program.make({
    block: FluidPrimitiveParityBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }),
)
