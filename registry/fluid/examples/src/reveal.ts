import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Reveal, RevealSkeleton, type RevealPresetName } from '@foldkit-visuals/fluid/reveal'
import './reveal.css'

const Model = Schema.Struct({ isLoaded: Schema.Boolean, isMounted: Schema.Boolean })

const Message = defineMessageUnion({ ClickedSwap: {}, ClickedMount: {} })

const key = Symbol('FluidRevealExample')
const FluidRevealExampleBlock = Block.make('FluidRevealExample', {
  key,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const FluidRevealExampleComposition = FluidRevealExampleBlock.makeComposition()

const init = FluidRevealExampleComposition.makeInit(() => ({
  model: { isLoaded: false, isMounted: true },
}))

const update = FluidRevealExampleComposition.makeUpdate({
  ClickedSwap: FluidRevealExampleBlock.makeFieldsStep(() => ({ isLoaded: Boolean.not })),
  ClickedMount: FluidRevealExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
})

const presets: ReadonlyArray<RevealPresetName> = [
  'reveal-landing',
  'reveal-landing-subtle',
  'reveal-product',
  'reveal-product-subtle',
]

const view = FluidRevealExampleComposition.makeView((model, h) => {
  const panel = (label: string) =>
    h.article(
      [
        h.Class(
          'p-4 [background:var(--surface-3)] [border:1px_solid_var(--border)] rounded-[12px] min-h-20 [&_>_p]:m-[8px_0_0]',
        ),
      ],
      [h.h2([], [label]), h.p([], ['Reveal content'])],
    )

  const hero = () =>
    h.section(
      [],
      ['First', 'Second', 'Third', 'Fourth', 'Fifth'].map((label) => h.p([], [label])),
    )

  return {
    title: 'Fluid reveal parity',
    body: h.main(
      [h.Class('p-6 max-w-275')],
      [
        h.h1(
          [
            h.Class(
              "text-[28px] leading-[34px] m-[0_0_12px] [font-variation-settings:'wght'_550,'opsz'_18]",
            ),
          ],
          ['Fluid reveal parity'],
        ),
        h.div(
          [
            h.Class(
              'flex gap-2 m-[12px_0] [&_button]:p-[4px_8px] [&_button]:[border:1px_solid_var(--border)] [&_button]:rounded-[6px] [&_button]:text-[13px]',
            ),
          ],
          [
            Button.view(
              {
                onClick: Message.ClickedSwap(),
                toView: (attributes) => h.button([...attributes.button, h.Id('swap')], ['Swap']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedMount(),
                toView: (attributes) => h.button([...attributes.button, h.Id('mount')], ['Mount']),
              },
              h,
            ),
          ],
        ),
        ...(model.isMounted
          ? presets.map((preset) =>
              Reveal(
                {
                  preset,
                  className:
                    'reveal-demo m-[24px_0] [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:m-0 [&_>_section]:m-[20px_0]',
                  attributes: [h.Id(preset)],
                  children: preset.startsWith('reveal-landing')
                    ? [
                        hero(),
                        h.section([], [panel('Scroll section')]),
                        h.section(
                          [h.Class('grid grid-cols-4 gap-3')],
                          [1, 2, 3, 4].map((index) =>
                            Reveal(
                              {
                                scroll: true,
                                children: [
                                  panel(`Card ${index}`),
                                  Reveal(
                                    { scroll: true, children: [h.p([], ['Nested content'])] },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ),
                        ),
                      ]
                    : [
                        panel('First panel'),
                        Reveal(
                          {
                            items: true,
                            className: 'grid grid-cols-4 gap-3',
                            children: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) =>
                              panel(`Item ${index}`),
                            ),
                          },
                          h,
                        ),
                      ],
                },
                h,
              ),
            )
          : []),
        Reveal(
          {
            swap: true,
            attributes: [h.Id('swap-stage')],
            children: [
              h.div(
                [h.Id('skeleton')],
                [
                  RevealSkeleton(
                    {
                      className:
                        'skeleton-line h-4.5 w-[75%] m-[4px_0] [background:var(--hover)] rounded-[6px]',
                    },
                    h,
                  ),
                  RevealSkeleton(
                    {
                      className:
                        'skeleton-line h-4.5 w-[75%] m-[4px_0] [background:var(--hover)] rounded-[6px]',
                    },
                    h,
                  ),
                ],
              ),
              ...(model.isLoaded
                ? [
                    Reveal(
                      {
                        items: true,
                        className: 'grid grid-cols-4 gap-3',
                        attributes: [h.Id('loaded')],
                        children: [1, 2, 3].map((index) => panel(`Loaded ${index}`)),
                      },
                      h,
                    ),
                  ]
                : []),
            ],
          },
          h,
        ),
        h.div(
          [
            h.Class(
              'h-95 overflow-auto [border:1px_solid_var(--border)] m-[24px_0] p-4 [&_>_div_>_section]:h-45 [&_>_div_>_section]:m-[20px_0]',
            ),
            h.Id('scroll-stage'),
          ],
          [
            Reveal(
              {
                preset: 'reveal-landing',
                children: [
                  hero(),
                  h.div([h.Class('h-125')]),
                  h.section(
                    [
                      h.Id('entry-target'),
                      h.Class(
                        'p-4 [background:var(--surface-3)] [border:1px_solid_var(--border)] rounded-[12px] min-h-20 [&_>_p]:m-[8px_0_0]',
                      ),
                    ],
                    [h.h2([], ['Entry target'])],
                  ),
                  h.section(
                    [h.Class('grid grid-cols-4 gap-3')],
                    [
                      Reveal(
                        {
                          scroll: true,
                          attributes: [h.Id('nested-parent')],
                          children: [
                            panel('Parent'),
                            Reveal(
                              {
                                scroll: true,
                                attributes: [h.Id('nested-child')],
                                children: [h.p([], ['Nested'])],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  ),
                  h.div([h.Class('h-125')]),
                ],
              },
              h,
            ),
          ],
        ),
      ],
    ),
  }
})

const layer = FluidRevealExampleBlock.makeLayer({ init, update, view })

Runtime.run(
  Program.make({
    block: FluidRevealExampleBlock,
    layer,
    container: document.getElementById('root'),
  }),
)
