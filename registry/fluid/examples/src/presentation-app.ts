import { Button as UiButton } from '@foldkit/ui'
import { Boolean } from 'effect'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import {
  PresentationProviderBlock,
  layer as ProviderLayer,
} from '@foldkit-visuals/fluid/presentation/provider'
import type { PresentationProviderConfig } from '@foldkit-visuals/fluid/presentation/provider'
import { Button } from '@foldkit-visuals/fluid/button'
import { Badge } from '@foldkit-visuals/fluid/badge'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { tablerIcons } from '@foldkit-visuals/fluid/icons/tabler'
import { phosphorIcons } from '@foldkit-visuals/fluid/icons/phosphor'
import { hugeiconsIcons } from '@foldkit-visuals/fluid/icons/hugeicons'
import {
  IconProvider,
  ShapeProvider,
  SizeProvider,
  SurfaceProvider,
  useIcons,
  useShapeContext,
  useSizeContext,
  useSurface,
} from '@foldkit-visuals/fluid/presentation/context'

const Model = Schema.Struct({
  provider: PresentationProviderBlock.Model,
  isMounted: Schema.Boolean,
  family: Schema.Natural,
})

const Message = defineMessageUnion({
  UpdatedShape: { shape: Schema.Literals(['rounded', 'pill', 'sharp']) },
  UpdatedSize: { size: Schema.Literals(['default', 'compact']) },
  ClickedPin: {},
  ClickedRelease: {},
  ClickedMount: {},
  ClickedFamily: {},
})

export const FluidPresentationExampleKey = Symbol('FluidPresentationExample')

const effects = Block.makeEffectsContract()

export const FluidPresentationExampleBlock = Block.make('FluidPresentationExample', {
  key: FluidPresentationExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const Provider = FluidPresentationExampleBlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'provider',
  init: {
    contextToArgs: () =>
      [
        {
          ...exampleHoverConfig,
          id: 'provider-demo',
          defaultShape: examplePresentation.shape ?? 'pill',
          defaultSize: 'compact',
        },
      ] satisfies [PresentationProviderConfig],
  },
})

const FluidPresentationExampleComposition = FluidPresentationExampleBlock.makeComposition({
  bindings: [Provider],
})

const init = FluidPresentationExampleComposition.makeInit(() => ({
  model: { isMounted: true, family: 0 },
}))

const update = FluidPresentationExampleComposition.makeUpdate({
  UpdatedShape: FluidPresentationExampleBlock.makeStep(
    (_model, { shape }: typeof Message.UpdatedShape.Type) => Provider.requestShape({ shape }),
  ),
  UpdatedSize: FluidPresentationExampleBlock.makeStep(
    (_model, { size }: typeof Message.UpdatedSize.Type) => Provider.requestSize({ size }),
  ),
  ClickedPin: Provider.requestControlledSize({ size: 'compact' }),
  ClickedRelease: Provider.requestControlledSize({ size: null }),
  ClickedMount: Update.combineSteps([
    Provider.requestReset(),
    FluidPresentationExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
  ]),
  ClickedFamily: FluidPresentationExampleBlock.makeFieldsStep(() => ({
    family: (value) => (value + 1) % 4,
  })),
})

const families = [defaultIcons, tablerIcons, phosphorIcons, hugeiconsIcons]

const view = FluidPresentationExampleComposition.makeView((model, h) => {
  const icons = families[model.family] ?? defaultIcons

  const toolbar = () =>
    h.div(
      [
        h.Class(
          'flex gap-2 m-[12px_0] flex-wrap [&_>_button:not(.group)]:p-[4px_8px] [&_>_button:not(.group)]:[border:1px_solid_var(--border)] [&_>_button:not(.group)]:rounded-[6px] [&_>_button:not(.group)]:text-[13px]',
        ),
      ],
      [
        UiButton.view(
          {
            onClick: Message.ClickedMount(),
            toView: (attributes) => h.button([...attributes.button, h.Id('mount')], ['Mount']),
          },
          h,
        ),
        UiButton.view(
          {
            onClick: Message.ClickedFamily(),
            toView: (attributes) => h.button([...attributes.button, h.Id('family')], ['Family']),
          },
          h,
        ),
      ],
    )

  return {
    title: 'Fluid presentation foundation',
    body: h.main(
      [h.Class('p-6 max-w-275')],
      [
        h.h1(
          [
            h.Class(
              "m-[0_0_12px] text-[28px] leading-[34px] [font-variation-settings:'wght'_550,'opsz'_18]",
            ),
          ],
          ['Fluid presentation foundation'],
        ),
        toolbar(),
        ...(model.isMounted
          ? [
              h.block(
                Provider.embedView({
                  slotId: model.provider.id,
                  model: model.provider,
                  viewInputs: {
                    attributes: childAttributes([h.Id('provider-demo')]),
                    getIcons: () => icons,
                    content: (context) => {
                      const shape = useShapeContext(context, (nextShape) =>
                        Message.UpdatedShape({ shape: nextShape }),
                      )

                      const size = useSizeContext(context, (nextSize) =>
                        Message.UpdatedSize({ size: nextSize }),
                      )

                      const sample = (id: string, next = context) =>
                        h.div(
                          [
                            h.Id(id),
                            h.Class(
                              'flex gap-2 m-[12px_0] flex-wrap [&_>_button:not(.group)]:p-[4px_8px] [&_>_button:not(.group)]:[border:1px_solid_var(--border)] [&_>_button:not(.group)]:rounded-[6px] [&_>_button:not(.group)]:text-[13px]',
                            ),
                          ],
                          [
                            Button(
                              {
                                context: next,
                                leadingIcon: useIcons(next).info,
                                children: ['Continue'],
                              },
                              h,
                            ),
                            Badge(
                              { context: next, variant: 'dot', color: 'blue', children: ['Ready'] },
                              h,
                            ),
                          ],
                        )

                      return [
                        h.output(
                          [h.Id('preference'), h.Hidden(true)],
                          [String(context().prefersReducedMotion)],
                        ),
                        h.div(
                          [
                            h.Class(
                              'flex gap-2 m-[12px_0] flex-wrap [&_>_button:not(.group)]:p-[4px_8px] [&_>_button:not(.group)]:[border:1px_solid_var(--border)] [&_>_button:not(.group)]:rounded-[6px] [&_>_button:not(.group)]:text-[13px]',
                            ),
                          ],
                          [
                            UiButton.view(
                              {
                                onClick: shape.setShape(
                                  shape.shape === 'pill' ? 'rounded' : 'pill',
                                ),
                                toView: (attributes) =>
                                  h.button([...attributes.button, h.Id('shape')], ['Shape']),
                              },
                              h,
                            ),
                            UiButton.view(
                              {
                                onClick: size.setSize(
                                  size.size === 'compact' ? 'default' : 'compact',
                                ),
                                toView: (attributes) =>
                                  h.button([...attributes.button, h.Id('size')], ['Size']),
                              },
                              h,
                            ),
                            UiButton.view(
                              {
                                onClick: Message.ClickedPin(),
                                toView: (attributes) =>
                                  h.button([...attributes.button, h.Id('pin')], ['Pin compact']),
                              },
                              h,
                            ),
                            UiButton.view(
                              {
                                onClick: Message.ClickedRelease(),
                                toView: (attributes) =>
                                  h.button(
                                    [...attributes.button, h.Id('release')],
                                    ['Release size'],
                                  ),
                              },
                              h,
                            ),
                          ],
                        ),
                        sample('inherited'),
                        ShapeProvider({
                          context,
                          children: (reset) => sample('shape-reset', reset),
                        }),
                        SizeProvider({ context, children: (reset) => sample('size-reset', reset) }),
                        IconProvider({
                          context,
                          icons: { info: defaultIcons.check },
                          children: (partial) => sample('partial-icons', partial),
                        }),
                        SurfaceProvider({
                          context,
                          value: 3.5,
                          children: (surface) =>
                            Elevated(
                              {
                                context: surface,
                                offset: 2,
                                shadowLevel: 3,
                                className: 'surface-panel p-4 m-[12px_0] rounded-[12px]',
                                attributes: [h.Id('elevated')],
                                children: (raised) => [
                                  h.p(
                                    [h.DataAttribute('level', String(useSurface(raised)))],
                                    ['Raised surface'],
                                  ),
                                  Elevated(
                                    {
                                      context: raised,
                                      offset: 4,
                                      className: 'surface-panel p-4 m-[12px_0] rounded-[12px]',
                                      attributes: [h.Id('nested-elevated')],
                                      children: (nested) => [
                                        h.p(
                                          [h.DataAttribute('level', String(useSurface(nested)))],
                                          ['Nested surface'],
                                        ),
                                      ],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                        }),
                        ...families.map((family, index) =>
                          h.section(
                            [h.DataAttribute('family', String(index))],
                            [
                              h.h2(
                                [
                                  h.Class(
                                    "m-[12px_0] text-[16px] leading-[22px] [font-variation-settings:'wght'_550,'opsz'_18]",
                                  ),
                                ],
                                [['Lucide', 'Tabler', 'Phosphor', 'Hugeicons'][index] ?? 'Icons'],
                              ),
                              h.div(
                                [h.Class('grid grid-cols-[repeat(12,1fr)] gap-2')],
                                Object.entries(family).map(([role, icon]) =>
                                  h.span(
                                    [
                                      h.Class('flex items-center justify-center min-h-7'),
                                      h.DataAttribute('role', role),
                                    ],
                                    [icon({ size: 19, strokeWidth: 1.5 }, h)],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ]
                    },
                  },
                }),
              ),
            ]
          : []),
      ],
    ),
  }
})

export const FluidPresentationExampleLayer = FluidPresentationExampleBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(ProviderLayer))
