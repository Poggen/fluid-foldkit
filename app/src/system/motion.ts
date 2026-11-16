// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { PresenceBlock, layer as PresenceLayer } from '@foldkit-visuals/fluid/presence'
import { Button } from '@foldkit-visuals/fluid/button'
import { spring, shapeMap } from '@foldkit-visuals/fluid/tokens'
import { ComponentPresentation, presentation } from '../settings'
import { target, motion } from '../motion'
import { copy, example, page, section, snippet, type PageInputs } from './view'

const Speed = Schema.Literals(['fast', 'moderate', 'slow'])
const key = Symbol('MotionSystemPage')
const MotionSystemPageBlock = Block.make('MotionSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({
    atEnd: Schema.Boolean,
    same: PresenceBlock.Model,
    faster: PresenceBlock.Model,
  }),
  Message: defineMessageUnion({
    Played: {},
    Toggled: { side: Schema.Literals(['same', 'faster']) },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { MotionSystemPageBlock as MotionPageBlock }
const Same = MotionSystemPageBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'same',
  init: { contextToArgs: () => [{ id: 'system-motion-same' }] },
}).withOutMessagePolicy({
  fold: MotionSystemPageBlock.makeOutMessageFold(PresenceBlock, {
    Entered: MotionSystemPageBlock.makeNoopStep,
    StartedExit: MotionSystemPageBlock.makeNoopStep,
    Exited: MotionSystemPageBlock.makeNoopStep,
  }),
})
const Faster = MotionSystemPageBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'faster',
  init: { contextToArgs: () => [{ id: 'system-motion-faster' }] },
}).withOutMessagePolicy({
  fold: MotionSystemPageBlock.makeOutMessageFold(PresenceBlock, {
    Entered: MotionSystemPageBlock.makeNoopStep,
    StartedExit: MotionSystemPageBlock.makeNoopStep,
    Exited: MotionSystemPageBlock.makeNoopStep,
  }),
})
const MotionSystemPageComposition = MotionSystemPageBlock.makeComposition({
  bindings: [Same, Faster],
})
export const layer = MotionSystemPageBlock.makeLayer({
  init: MotionSystemPageComposition.makeInit(() => ({ model: { atEnd: false } })),
  update: MotionSystemPageComposition.makeUpdate({
    Played: MotionSystemPageBlock.makeFieldsStep(() => ({ atEnd: (value) => !value })),
    Toggled: MotionSystemPageBlock.makeStep((model, { side }) =>
      side === 'same'
        ? model.same.phase === 'Present'
          ? Same.requestHide()
          : Same.requestShow()
        : model.faster.phase === 'Present'
          ? Faster.requestHide()
          : Faster.requestShow(),
    ),
  }),
  inMessageUpdate: MotionSystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: MotionSystemPageBlock.makeNoopStep(),
  }),
  view: MotionSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = presentation(settings)
    const shape = shapeMap[settings.shape]
    const play = (speed: typeof Speed.Type) =>
      Button(
        {
          context,
          variant: 'secondary',
          children: [`Replay ${speed}`],
          attributes: [h.OnClick(MotionSystemPageBlock.Message.Played())],
        },
        h,
      )
    const track = (speed: typeof Speed.Type) =>
      h.div(
        [h.Class('flex flex-col gap-4 py-6')],
        [
          h.div(
            [],
            [
              h.strong([], [speed]),
              h.p(
                [],
                [`${spring[speed].duration}s entrance · ${spring[speed].exit.duration}s exit`],
              ),
            ],
          ),
          h.button(
            [
              h.Class(
                [
                  'flex h-7 cursor-pointer items-center bg-muted px-0.5 outline-none',
                  settings.shape === 'sharp' ? 'rounded-none' : 'rounded-full',
                  'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                  speed === 'fast' ? 'w-1/3' : speed === 'moderate' ? 'w-2/3' : 'w-full',
                  model.atEnd ? 'justify-end' : 'justify-start',
                ].join(' '),
              ),
              h.AriaLabel(`Play ${speed} spring`),
              h.OnClick(MotionSystemPageBlock.Message.Played()),
            ],
            [
              motion.node(
                h.span([
                  h.Class(
                    `h-6 w-6 bg-foreground ${settings.shape === 'sharp' ? 'rounded-none' : 'rounded-full'}`,
                  ),
                ]),
                {
                  initial: false,
                  layout: true,
                  animate: {},
                  transition: model.atEnd ? spring[speed] : spring[speed].exit,
                  reducedMotion: 'user',
                },
              ),
            ],
          ),
          play(speed),
        ],
      )
    const modal = (side: 'same' | 'faster') => {
      const binding = side === 'same' ? Same : Faster
      return h.div(
        [],
        [
          Button(
            {
              context,
              children: ['Toggle modal'],
              attributes: [h.OnClick(MotionSystemPageBlock.Message.Toggled({ side }))],
            },
            h,
          ),
          h.div(
            [
              h.Class(
                'relative flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background',
              ),
            ],
            [
              h.block(
                binding.embedView({
                  slotId: `system-modal-${side}`,
                  model: model[side],
                  viewInputs: {
                    animate: (node, present) =>
                      target.node(node, {
                        initial: { opacity: 0, scale: 0.96, y: 12 },
                        animate: { opacity: 1, scale: 1, y: 0 },
                        exit: {
                          opacity: 0,
                          scale: 0.96,
                          y: 12,
                          transition: side === 'same' ? spring.slow : spring.slow.exit,
                        },
                        transition: spring.slow,
                        reducedMotion: 'user',
                        present,
                      }),
                    content: () =>
                      h.div(
                        [
                          h.Class(
                            'relative z-10 flex w-4/5 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xl',
                          ),
                        ],
                        [
                          h.h3(
                            [h.Class('text-site-title text-foreground leading-none')],
                            ['A moment of focus'],
                          ),
                          h.p([], ['Same entrance. A different exit.']),
                        ],
                      ),
                  },
                }),
              ),
            ],
          ),
          h.p([], [side === 'same' ? 'Same exit time' : 'One tier faster on exit']),
        ],
      )
    }
    return page(
      h,
      'motion',
      settings,
      [
        section(h, 'Three speeds', [
          ...copy(h, 'motion', 'Three speeds'),
          example(h, 'Spring speeds', [track('fast'), track('moderate'), track('slow')], settings),
        ]),
        section(h, 'Slow in, faster out', [
          ...copy(h, 'motion', 'Slow in, faster out'),
          example(
            h,
            'Compare modal exits',
            [
              h.div(
                [h.Class('grid w-full gap-5 sm:grid-cols-2 ')],
                [modal('same'), modal('faster')],
              ),
            ],
            settings,
          ),
        ]),
        section(h, 'All tokens', [
          ...copy(h, 'motion', 'All tokens'),
          snippet(
            h,
            settings,
            "target.node(node, { animate: { x: 160 }, transition: spring.moderate, reducedMotion: 'user' })",
          ),
          h.table(
            [
              h.Class(
                'w-full border-collapse text-site-body tabular-nums [&_th:first-child]:pl-0 [&_td:first-child]:pl-0',
              ),
            ],
            [
              h.thead(
                [],
                [
                  h.tr(
                    [],
                    ['Speed', 'Entrance', 'Exit', 'Bounce'].map((s) =>
                      h.th([h.Class('px-3 py-2 text-left text-foreground')], [s]),
                    ),
                  ),
                ],
              ),
              h.tbody(
                [],
                (['fast', 'moderate', 'slow'] as const).map((speed) =>
                  h.tr(
                    [],
                    [
                      speed,
                      String(spring[speed].duration),
                      String(spring[speed].exit.duration),
                      String(spring[speed].bounce),
                    ].map((s) => h.td([h.Class('px-3 py-2 text-muted-foreground')], [s])),
                  ),
                ),
              ),
            ],
          ),
        ]),
        section(h, 'Reduced motion', [
          h.p(
            [],
            [
              'The native target and presence animations respect the operating system preference. Reduced motion removes travel and scale while preserving opacity feedback.',
            ],
          ),
        ]),
      ],

      {
        '--system-track-radius': shape.variant === 'sharp' ? '0px' : '999px',
      },
    )
  }),
}).pipe(Layer.provide(PresenceLayer))
