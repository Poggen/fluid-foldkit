import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defaultIcons, resolveIcons } from '@foldkit-visuals/fluid/icons'
import type { IconOptions } from '@foldkit-visuals/fluid/presentation'
import './icons.css'

const configurations: ReadonlyArray<IconOptions> = [
  {},
  { size: 16, strokeWidth: 1.5 },
  { size: 32, strokeWidth: 2, className: 'icon-accent text-example-icon-accent' },
]

const Model = Schema.Struct({})

export const FluidIconsExampleKey = Symbol('FluidIconsExample')

const effects = Block.makeEffectsContract()

const FluidIconsExampleBlock = Block.make('FluidIconsExample', {
  key: FluidIconsExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message: Schema.Never,
  isMessageFree: true,
  view: { kind: 'Document' },
  effects,
})

const FluidIconsExampleComposition = FluidIconsExampleBlock.makeComposition()

const init = FluidIconsExampleComposition.makeInit(() => ({ model: {} }))

const update = FluidIconsExampleComposition.makeUpdate({})

const view = FluidIconsExampleComposition.makeView((_model, h) => ({
  title: 'Fluid icon parity',
  body: h.main(
    [h.Class('p-6 [&_h1]:mb-4')],
    [
      h.h1([], ['Fluid icon parity']),
      h.div(
        [h.Class('grid grid-cols-[repeat(12,96px)] gap-1')],
        [
          ...Object.entries(defaultIcons).flatMap(([name, icon]) =>
            configurations.map((options, index) =>
              h.div(
                [
                  h.Class(
                    'h-16 flex flex-col items-center justify-center gap-1 [&_span]:text-[8px] [&_span]:leading-[10px]',
                  ),
                  h.DataAttribute('case', `${name}-${index}`),
                ],
                [icon(options, h), h.span([], [`${name} ${index}`])],
              ),
            ),
          ),
          h.div(
            [
              h.Class(
                'h-16 flex flex-col items-center justify-center gap-1 [&_span]:text-[8px] [&_span]:leading-[10px]',
              ),
              h.DataAttribute('case', 'override-copy'),
            ],
            [resolveIcons({ copy: defaultIcons.check }).copy({}, h), h.span([], ['override-copy'])],
          ),
          h.div(
            [
              h.Class(
                'h-16 flex flex-col items-center justify-center gap-1 [&_span]:text-[8px] [&_span]:leading-[10px]',
              ),
              h.DataAttribute('case', 'override-default'),
            ],
            [
              resolveIcons({ copy: defaultIcons.check }).search({}, h),
              h.span([], ['override-default']),
            ],
          ),
        ],
      ),
    ],
  ),
}))

const layer = FluidIconsExampleBlock.makeLayer({ init, update, view })

Runtime.run(
  Program.make({
    block: FluidIconsExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }),
)
