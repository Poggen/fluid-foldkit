import { Button as UiButton } from '@foldkit/ui'
import { Number } from 'effect'
import { examplePresentation } from './example-presentation.js'
import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit-visuals/fluid/button'
import type { ButtonProps, ButtonSize } from '@foldkit-visuals/fluid/button'
import type { Icon } from '@foldkit-visuals/fluid/presentation'
import './button-options.css'

const Icon: Icon = ({ size, strokeWidth, className }, h) =>
  h.svg(
    [
      h.Class(className === undefined ? '' : className),
      h.Width(String(size)),
      h.Height(String(size)),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth(String(strokeWidth)),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
    ],
    [h.path([h.D('M12 5v14M5 12h14')])],
  )

const sizes: ReadonlyArray<ButtonSize> = [
  'default',
  'compact',
  'icon',
  'icon-compact',
  'sm',
  'md',
  'lg',
  'icon-sm',
  'icon-lg',
]

const modes = ['plain', 'leading', 'trailing', 'both', 'loading']

const Model = Schema.Struct({
  clicks: Schema.Finite,
  submissions: Schema.Finite,
  shape: Schema.Literals(['sharp', 'rounded', 'pill']),
})

const Message = defineMessageUnion({
  Clicked: {},
  Submitted: {},
  UpdatedShape: { value: Model.fields.shape },
})

export const FluidButtonOptionsKey = Symbol('FluidButtonOptions')

const effects = Block.makeEffectsContract()

const FluidButtonOptionsBlock = Block.make('FluidButtonOptions', {
  key: FluidButtonOptionsKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const FluidButtonOptionsComposition = FluidButtonOptionsBlock.makeComposition()

const init = FluidButtonOptionsComposition.makeInit(() => ({
  model: { clicks: 0, submissions: 0, shape: examplePresentation.shape ?? 'rounded' },
}))

const update = FluidButtonOptionsComposition.makeUpdate({
  UpdatedShape: FluidButtonOptionsBlock.makeFieldsStep((_model, message) => ({
    shape: () => message.value,
  })),
  Clicked: FluidButtonOptionsBlock.makeFieldsStep(() => ({ clicks: Number.increment })),
  Submitted: FluidButtonOptionsBlock.makeFieldsStep(() => ({
    submissions: Number.increment,
  })),
})

const view = FluidButtonOptionsComposition.makeView((model, h) => ({
  title: 'Fluid Button options',
  body: h.main(
    [
      h.Class(
        "p-6 max-w-275 [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h1]:mb-2 [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h2]:m-[16px_0_8px] [&_output]:text-[13px] [&_output]:leading-[20px]",
      ),
    ],
    [
      h.h1([], ['Fluid Button options']),
      h.div(
        [h.Class('flex items-center gap-2 mb-2')],
        Model.fields.shape.literals.map((shape) =>
          UiButton.view(
            {
              onClick: Message.UpdatedShape({
                value: shape,
              }),
              toView: (attributes) => h.button([...attributes.button], [shape]),
            },
            h,
          ),
        ),
      ),
      h.output([h.Id('result')], [JSON.stringify(model)]),
      ...[true].map(() => {
        const render = Button
        const family = 'button'

        return h.section(
          [],
          [
            h.h2([], [family]),
            h.div(
              [
                h.Class(
                  'grid grid-cols-9 gap-2 items-center mb-2.5 [&_>_button]:[justify-self:start] [&_>_span]:text-[11px]',
                ),
              ],
              sizes.map((size) => h.span([], [size])),
            ),
            ...modes.map((mode) =>
              h.div(
                [
                  h.Class(
                    'grid grid-cols-9 gap-2 items-center mb-2.5 [&_>_button]:[justify-self:start] [&_>_span]:text-[11px]',
                  ),
                ],
                sizes.map((buttonSize) => {
                  const props = {
                    shape: model.shape,
                    children: buttonSize.startsWith('icon')
                      ? [Icon({ size: 16, strokeWidth: 1.5 }, h)]
                      : ['Save'],
                    buttonSize,
                    variant: 'secondary',
                    loading: mode === 'loading',
                    attributes: [
                      h.Id(`${family}-${mode}-${buttonSize}`),
                      h.AriaLabel(`${family} ${mode} ${buttonSize}`),
                      h.OnClick(Message.Clicked()),
                    ],
                  } satisfies ButtonProps<typeof Message.Type>

                  const leading =
                    mode === 'leading' || mode === 'both' || mode === 'loading'
                      ? { ...props, leadingIcon: Icon }
                      : props

                  const decorated =
                    mode === 'trailing' || mode === 'both' || mode === 'loading'
                      ? { ...leading, trailingIcon: Icon }
                      : leading

                  return render(decorated, h)
                }),
              ),
            ),
            h.form(
              [h.OnSubmit(Message.Submitted()), h.Class('flex items-center gap-2 mb-2 mt-4')],
              [
                render(
                  {
                    children: ['Default'],
                    attributes: [h.Id(`${family}-default`), h.OnClick(Message.Clicked())],
                  },
                  h,
                ),
                render(
                  {
                    children: ['Submit'],
                    attributes: [
                      h.Id(`${family}-submit`),
                      h.Type('submit'),
                      h.OnClick(Message.Clicked()),
                    ],
                  },
                  h,
                ),
                render(
                  {
                    children: ['Disabled'],
                    disabled: true,
                    attributes: [h.Id(`${family}-disabled`), h.OnClick(Message.Clicked())],
                  },
                  h,
                ),
                render(
                  {
                    children: ['Link'],
                    disabled: true,
                    loading: false,
                    attributes: [h.OnClick(Message.Clicked())],
                    render: (attributes, children) =>
                      h.a([...attributes, h.Id(`${family}-link`), h.Href('#target')], children),
                  },
                  h,
                ),
              ],
            ),
          ],
        )
      }),
    ],
  ),
}))

const layer = FluidButtonOptionsBlock.makeLayer({ init, update, view })

Runtime.run(
  Program.make({
    block: FluidButtonOptionsBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }),
)
