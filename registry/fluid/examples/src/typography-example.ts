import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { ScrollAreaBlock, layer as scrollLayer } from '@foldkit-visuals/fluid/scroll-area'
import type { ScrollAreaConfig } from '@foldkit-visuals/fluid/scroll-area'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { fontWeights, typeClass, typeStyles } from '@foldkit-visuals/fluid/tokens'
import type { TypeScaleRole, TypeScaleVariant } from '@foldkit-visuals/fluid/tokens'
import './typography-example.css'

const weightLabels = {
  normal: { weight: '400', optical: 'opsz 14' },
  semibold: { weight: '550', optical: 'opsz 18' },
  bold: { weight: '700', optical: 'opsz 25' },
}

const rows: ReadonlyArray<{
  role: TypeScaleRole
  name: string
  sample: string
  weight: keyof typeof fontWeights
  muted: boolean
}> = [
  { role: 'display', name: 'Display', sample: 'Page titles', weight: 'bold', muted: false },
  { role: 'title', name: 'Title', sample: 'Section titles', weight: 'semibold', muted: false },
  {
    role: 'subtitle',
    name: 'Subtitle',
    sample: 'Sub-headings and card titles',
    weight: 'semibold',
    muted: false,
  },
  {
    role: 'body',
    name: 'Body',
    sample: 'Labels, menu items, and paragraphs',
    weight: 'normal',
    muted: true,
  },
  {
    role: 'caption',
    name: 'Caption',
    sample: 'Descriptions and meta rows',
    weight: 'normal',
    muted: true,
  },
]

export const TypographyExampleKey = Symbol('TypographyExample')

const effects = Block.makeEffectsContract()

const TypographyExampleBlock = Block.make('TypographyExample', {
  key: TypographyExampleKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ standard: ScrollAreaBlock.Model, compact: ScrollAreaBlock.Model }),
  Message: Schema.Never,
  effects,
  view: { kind: 'Element' },
})

const Standard = TypographyExampleBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'standard',
  init: {
    contextToArgs: () => [
      { id: 'typography-default', orientation: 'horizontal' } satisfies ScrollAreaConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: TypographyExampleBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: () => TypographyExampleBlock.makeNoopStep(),
  }),
})

const Compact = TypographyExampleBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'compact',
  init: {
    contextToArgs: () => [
      { id: 'typography-compact', orientation: 'horizontal' } satisfies ScrollAreaConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: TypographyExampleBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: () => TypographyExampleBlock.makeNoopStep(),
  }),
})

const TypographyExampleComposition = TypographyExampleBlock.makeComposition({
  bindings: [Standard, Compact],
})

const init = TypographyExampleComposition.makeInit(() => ({ model: {} }))

const update = TypographyExampleComposition.makeUpdate({})

const view = TypographyExampleComposition.makeView((model, h) => {
  const specimen = (step: TypeScaleVariant) => {
    const context = createPresentationContext({ size: step, shape: 'rounded', surface: 1 })

    const children = [
      h.div(
        [h.Class('min-w-140')],
        [
          h.div(
            [
              h.Class(
                'grid grid-cols-[80px_minmax(0,1fr)_64px_72px_56px] items-center gap-x-4 p-[16px_20px] [border-bottom:1px_solid_color-mix(in_srgb,var(--border)_40%,transparent)] last:[border-bottom:0] py-[10px] text-[12px] leading-[16px] [color:var(--muted-foreground)] border-[color-mix(in_srgb,var(--border)_60%,transparent)]',
              ),
            ],
            ['Style', 'Sample', 'Font size', 'Line height', 'Weight'].map((label) =>
              h.span([h.Key(label)], [label]),
            ),
          ),
          ...rows.map(({ role, name, sample, weight, muted }) =>
            h.div(
              [
                h.Key(role),
                h.Class(
                  'grid grid-cols-[80px_minmax(0,1fr)_64px_72px_56px] items-center gap-x-4 p-[16px_20px] [border-bottom:1px_solid_color-mix(in_srgb,var(--border)_40%,transparent)] last:[border-bottom:0]',
                ),
                h.DataAttribute('role', role),
              ],
              [
                h.span(
                  [
                    h.Class(
                      "text-[13px] leading-[20px] [font-variation-settings:'wght'_550,'opsz'_18]",
                    ),
                  ],
                  [name],
                ),
                h.span(
                  [
                    h.Class(
                      [
                        `typography-sample min-w-0 overflow-hidden [text-overflow:ellipsis] whitespace-nowrap ${typeClass(role, step)}${muted ? ' [color:var(--muted-foreground)]' : ''}`,
                        '[font-variation-settings:var(--fluid-font-variation-settings)]',
                      ].join(' '),
                    ),
                    h.Style({ '--fluid-font-variation-settings': fontWeights[weight] }),
                  ],
                  [sample],
                ),
                h.span(
                  [
                    h.Class(
                      'font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] leading-[16px] [font-variant-numeric:tabular-nums]',
                    ),
                  ],
                  [`${typeStyles[role][step].size}px`],
                ),
                h.span(
                  [
                    h.Class(
                      'font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] leading-[16px] [font-variant-numeric:tabular-nums]',
                    ),
                  ],
                  [`${typeStyles[role][step].leading}px`],
                ),
                h.span(
                  [
                    h.Class(
                      'font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] leading-[16px] [font-variant-numeric:tabular-nums]',
                    ),
                  ],
                  [
                    weightLabels[weight].weight,
                    h.br([]),
                    h.span(
                      [h.Class('[color:var(--muted-foreground)]')],
                      [weightLabels[weight].optical],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ]

    const inputs = {
      context,
      className:
        'typography-frame w-full [border:1px_solid_color-mix(in_srgb,var(--border)_60%,transparent)] rounded-[12px]',
      viewportClassName: 'scroll-fade-x',
      children,
    }

    return h.section(
      [
        h.Class(
          "mt-8 [&_>_h2]:text-[16px] [&_>_h2]:leading-[22px] [&_>_h2]:m-[0_0_12px] [&_>_h2]:[font-variation-settings:'wght'_550,'opsz'_18]",
        ),
        h.DataAttribute('density', step),
      ],
      [
        h.h2([], [step === 'default' ? 'Default' : 'Compact']),
        step === 'default'
          ? h.block(
              Standard.embedView({
                slotId: 'typography-default',
                model: model.standard,
                viewInputs: inputs,
              }),
            )
          : h.block(
              Compact.embedView({
                slotId: 'typography-compact',
                model: model.compact,
                viewInputs: inputs,
              }),
            ),
        h.p(
          [h.Class(`mt-3 [color:var(--muted-foreground)] ${typeClass('micro', step)}`)],
          ['Micro · Keyboard caps, counters, tiny badges'],
        ),
        h.article(
          [
            h.Class(
              `mt-6 p-6 [border:1px_solid_var(--border)] rounded-[12px] typeset${step === 'compact' ? ' typeset-compact' : ''}`,
            ),
          ],
          [
            h.h1([], ['A clear hierarchy']),
            h.p(
              [],
              [
                'Typography gives every part of an interface a job. Keep labels concise and descriptions useful.',
              ],
            ),
            h.h2([], ['Section titles']),
            h.p(
              [],
              [
                'Use paragraphs for explanations, with ',
                h.strong([], ['emphasis']),
                ' only where it helps.',
              ],
            ),
            h.h3([], ['Sub-headings']),
            h.ul(
              [],
              [h.li([], ['Labels and menu items']), h.li([], ['Descriptions and meta rows'])],
            ),
            h.blockquote([], [h.p([], ['Make the next action easy to understand.'])]),
            h.hr([]),
            h.p(
              [],
              [
                'Tabular numbers: ',
                h.span([h.Class('tabular-nums')], ['12:34 · 56:78 · 1,234.56']),
              ],
            ),
          ],
        ),
      ],
    )
  }

  return h.main(
    [
      h.Class(
        "max-w-220 m-[0_auto] p-[48px_24px_96px] font-[Inter,sans-serif] [font-variation-settings:'wght'_400,'opsz'_14] [&_>_h1]:text-[28px] [&_>_h1]:leading-[34px] [&_>_h1]:m-[0_0_8px] [&_>_h1]:[font-variation-settings:'wght'_700,'opsz'_25] [&_>_p]:text-[13px] [&_>_p]:leading-[20px] [&_>_p]:m-[0_0_32px] [&_>_p]:[color:var(--muted-foreground)]",
      ),
      h.DataAttribute('presentation', 'light-lucide-rounded'),
    ],
    [
      h.h1([], ['Typography']),
      h.p([], ['Five authored roles, three weights, two densities. Inter Variable.']),
      specimen('default'),
      specimen('compact'),
    ],
  )
})

const layer = TypographyExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(scrollLayer),
)

const container = document.querySelector<HTMLDivElement>('#root')

if (container === null) {
  throw new Error('Missing typography root')
}

Runtime.embed(Program.makeElement({ block: TypographyExampleBlock, layer, container }))
