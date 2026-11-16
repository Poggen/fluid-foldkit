import { Button } from '@foldkit/ui'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { PresenceBlock, layer as PresenceLayer } from '@foldkit-visuals/fluid/presence'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import './primitives.css'

const motion = createMotionScope('svg-presence')

const Model = Schema.Struct({ presence: PresenceBlock.Model })

const Message = defineMessageUnion({ ClickedShow: {}, ClickedHide: {} })

export const FluidSvgPresenceKey = Symbol('FluidSvgPresence')

const effects = Block.makeEffectsContract()

const FluidSvgPresenceBlock = Block.make('FluidSvgPresence', {
  key: FluidSvgPresenceKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const Presence = FluidSvgPresenceBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'presence',
  init: { contextToArgs: () => [{ id: 'presence-panel' }] },
}).withOutMessagePolicy({
  fold: FluidSvgPresenceBlock.makeOutMessageFold(PresenceBlock, {
    Entered: FluidSvgPresenceBlock.makeNoopStep,
    StartedExit: FluidSvgPresenceBlock.makeNoopStep,
    Exited: FluidSvgPresenceBlock.makeNoopStep,
  }),
})

const FluidSvgPresenceComposition = FluidSvgPresenceBlock.makeComposition({
  bindings: [Presence],
})

const init = FluidSvgPresenceComposition.makeInit(() => ({ model: {} }))

const update = FluidSvgPresenceComposition.makeUpdate({
  ClickedShow: Presence.requestShow(),
  ClickedHide: Presence.requestHide(),
})

const view = FluidSvgPresenceComposition.makeView((model, h) => ({
  title: 'Fluid SVG presence',
  body: h.main(
    [
      h.Class(
        "p-6 max-w-275 [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h1]:mb-2 [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h2]:m-[16px_0_8px] [&_output]:text-[13px] [&_output]:leading-[20px]",
      ),
    ],
    [
      h.h1([], ['Fluid SVG presence']),
      h.div(
        [h.Class('flex items-center gap-2 mb-2')],
        [
          Button.view(
            {
              onClick: Message.ClickedShow(),
              toView: (attributes) => h.button([...attributes.button, h.Id('show')], ['Show']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedHide(),
              toView: (attributes) => h.button([...attributes.button, h.Id('hide')], ['Hide']),
            },
            h,
          ),
        ],
      ),
      h.block(
        Presence.embedView({
          slotId: model.presence.id,
          model: model.presence,
          viewInputs: {
            animate: (node, present) =>
              motion.node(node, {
                initial: { opacity: 1 },
                animate: { opacity: 1 },
                exit: { opacity: 1 },
                present,
              }),
            content: () =>
              h.svg(
                [
                  h.Width('48'),
                  h.Height('48'),
                  h.ViewBox('0 0 24 24'),
                  h.Fill('none'),
                  h.Stroke('currentColor'),
                  h.StrokeWidth('2'),
                ],
                [
                  motion.node(h.path([h.Id('check-path'), h.D('M6 12L10 16L18 8')]), {
                    initial: { pathLength: 0 },
                    animate: { pathLength: 1, transition: { duration: 0.08, ease: 'easeOut' } },
                    exit: { pathLength: 0, transition: { duration: 0.04, ease: 'easeIn' } },
                  }),
                ],
              ),
          },
        }),
      ),
    ],
  ),
}))

const layer = FluidSvgPresenceBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(PresenceLayer),
)

Runtime.run(
  Program.make({
    block: FluidSvgPresenceBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(motion.layer),
)
