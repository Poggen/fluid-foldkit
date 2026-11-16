import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { Layer, pipe, Schema } from 'effect'
import { Block, Program, Route, Runtime } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'
import { defineMessageUnion } from 'foldkit/message'
import { PresenceBlock, layer as PresenceLayer } from '@foldkit-visuals/fluid/presence'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { spring } from '@foldkit-visuals/fluid/tokens'
import { showcasePages } from './showcase-pages.js'
import { catalogueExampleFiles, showcaseCatalogue } from './showcase-catalogue.js'
import './style.css'

const Page = defineRouteUnion({ Component: { page: Schema.String } })

const componentRouter = pipe(Route.string('page'), Route.mapTo(Page.Component))

const motion = createMotionScope('fluid-verification')

const Model = Schema.Struct({
  presence: PresenceBlock.Model,
  isExpanded: Schema.Boolean,
  updates: Schema.Finite,
})

const Message = defineMessageUnion({
  ClickedShow: {},
  ClickedHide: {},
  ClickedResize: {},
  ClickedRenderAgain: {},
})

export const FluidExampleKey = Symbol('FluidExample')

const effects = Block.makeEffectsContract()

const FluidExampleBlock = Block.make('FluidExample', {
  key: FluidExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const Presence = FluidExampleBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'presence',
  init: { contextToArgs: () => [{ id: 'presence-panel' }] },
}).withOutMessagePolicy({
  fold: FluidExampleBlock.makeOutMessageFold(PresenceBlock, {
    Entered: FluidExampleBlock.makeNoopStep,
    StartedExit: FluidExampleBlock.makeNoopStep,
    Exited: FluidExampleBlock.makeNoopStep,
  }),
})

const FluidExampleComposition = FluidExampleBlock.makeComposition({ bindings: [Presence] })

const init = FluidExampleComposition.makeInit(() => ({ model: { isExpanded: false, updates: 0 } }))

const update = FluidExampleComposition.makeUpdate({
  ClickedShow: Presence.requestShow(),
  ClickedHide: Presence.requestHide(),
  ClickedResize: FluidExampleBlock.makeFieldsStep(() => ({ isExpanded: Boolean.not })),
  ClickedRenderAgain: FluidExampleBlock.makeFieldsStep(() => ({ updates: Number.increment })),
})

const view = FluidExampleComposition.makeView((model, h) => ({
  title: 'Fluid component showcase',
  body: h.main(
    [h.Class('p-8')],
    [
      h.h1([h.Class('text-[28px] leading-[34px] font-[550]')], ['Fluid component showcase']),
      h.p([], ['Explore the native components, interaction patterns and motion.']),
      ...showcaseCatalogue((file) => componentRouter({ page: file })),
      h.h2(
        [h.Class('text-[16px] font-[550] m-0')],
        ['Additional compositions and developer checks'],
      ),
      h.nav(
        [
          h.AriaLabel('Component showcase'),
          h.Class(
            'showcase-grid grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3 m-[28px_0_40px] max-w-300',
          ),
        ],
        showcasePages
          .filter((page) => !catalogueExampleFiles.has(page.file))
          .map((page) =>
            h.a(
              [
                h.Href(componentRouter({ page: page.file })),
                h.Class(
                  'showcase-card block p-4.5 text-inherit no-underline border border-example-border rounded-[12px] bg-white [&:hover]:border-example-border-hover focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-example-quiet focus-visible:outline-offset-[3px] [&_p]:text-example-muted [&_p]:m-[8px_0_0]',
                ),
              ],
              [
                h.h2([h.Class('text-[16px] font-[550] m-0')], [page.title]),
                h.p([], [page.description]),
              ],
            ),
          ),
      ),
      h.h2([h.Class('text-[16px] font-[550] m-0')], ['Presence & layout']),
      h.div(
        [h.Class('flex gap-2 mb-4')],
        [
          Button.view(
            {
              onClick: Message.ClickedShow(),
              toView: (attributes) =>
                h.button(
                  [
                    h.Class(
                      'h-9 p-[0_16px] border border-example-control-border bg-white rounded-[8px] cursor-pointer',
                    ),
                    ...attributes.button,
                  ],
                  ['Show'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedHide(),
              toView: (attributes) =>
                h.button(
                  [
                    h.Class(
                      'h-9 p-[0_16px] border border-example-control-border bg-white rounded-[8px] cursor-pointer',
                    ),
                    ...attributes.button,
                  ],
                  ['Hide'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedResize(),
              toView: (attributes) =>
                h.button(
                  [
                    h.Class(
                      'h-9 p-[0_16px] border border-example-control-border bg-white rounded-[8px] cursor-pointer',
                    ),
                    ...attributes.button,
                  ],
                  ['Resize'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedRenderAgain(),
              toView: (attributes) =>
                h.button(
                  [
                    h.Class(
                      'h-9 p-[0_16px] border border-example-control-border bg-white rounded-[8px] cursor-pointer',
                    ),
                    ...attributes.button,
                  ],
                  ['Render again'],
                ),
            },
            h,
          ),
        ],
      ),
      h.output([h.Id('phase')], [model.presence.phase]),
      h.div(
        [h.Class('relative min-h-75 mt-6')],
        [
          h.block(
            Presence.embedView({
              slotId: model.presence.id,
              model: model.presence,
              viewInputs: {
                className:
                  'panel absolute bg-white p-4 rounded-[12px] [box-shadow:0_0_0_1px_#0001,0_6px_6px_-3px_#0001]',
                animate: (node, present) =>
                  motion.node(node, {
                    initial: { opacity: 0, y: 8, scale: 0.96 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    exit: { opacity: 0, y: 8, scale: 0.96, transition: spring.slow.exit },
                    transition: spring.slow,
                    layout: true,
                    present,
                  }),
                content: () =>
                  h.div(
                    [
                      h.Class('w-(--fluid-width) h-(--fluid-height)'),
                      h.Style({
                        '--fluid-width': model.isExpanded ? '360px' : '180px',
                        '--fluid-height': model.isExpanded ? '180px' : '90px',
                      }),
                    ],
                    [
                      h.h2(
                        [h.Class('text-[16px] font-[550] m-0')],
                        ['Retained until exit completes'],
                      ),
                      h.p([], [`Render ${model.updates}`]),
                    ],
                  ),
              },
            }),
          ),
        ],
      ),
    ],
  ),
}))

const layer = FluidExampleBlock.makeLayer({ init, update, view }).pipe(Layer.provide(PresenceLayer))

Runtime.run(
  Program.make({
    block: FluidExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(motion.layer),
)
