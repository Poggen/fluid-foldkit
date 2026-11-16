import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { examplePresentation } from './example-presentation.js'
import { homeRouter } from './selection-family-routes.js'
import { DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog'
import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { MobileDrawerBlock, mobileDrawerLayer } from '@foldkit-visuals/fluid/mobile-drawer'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import './mobile-drawer.css'

const services = DialogResourcesLayer(document)

const effects = Block.makeEffectsContract<never, Layer.Success<typeof services>>()

const Model = Schema.Struct({
  drawer: MobileDrawerBlock.Model,
  nested: MobileDrawerBlock.Model,
  shouldAcceptClose: Schema.Boolean,
  closes: Schema.Natural,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedOpen: {},
  ClickedAccept: {},
  ClickedForceClose: {},
  ClickedNested: {},
  ClickedToggleMounted: {},
})

export const MobileDrawerExampleKey = Symbol('MobileDrawerExample')

const MobileDrawerExampleBlock = Block.make('MobileDrawerExample', {
  key: MobileDrawerExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Element' },
})

const RawDrawer = MobileDrawerExampleBlock.makeRequiredFieldBinding(MobileDrawerBlock, {
  field: 'drawer',
  init: {
    contextToArgs: () => [
      { id: 'navigation-drawer', open: false, returnFocusSelector: '#open-drawer' },
    ],
  },
})

const Drawer = RawDrawer.withOutMessagePolicy({
  fold: MobileDrawerExampleBlock.makeOutMessageFold(MobileDrawerBlock, {
    CloseRequested: () =>
      MobileDrawerExampleBlock.makeStep((model) =>
        Update.combineSteps([
          MobileDrawerExampleBlock.makeFieldsStep(() => ({ closes: Number.increment })),
          model.shouldAcceptClose
            ? RawDrawer.requestControlledOpen({ control: Option.some(false) })
            : MobileDrawerExampleBlock.makeNoopStep(),
        ]),
      ),
    OpenChanged: ({ open }) => RawDrawer.requestControlledOpen({ control: Option.some(open) }),
  }),
})

const Nested = MobileDrawerExampleBlock.makeRequiredFieldBinding(MobileDrawerBlock, {
  field: 'nested',
  init: { contextToArgs: () => [{ id: 'nested-navigation', returnFocusSelector: '#open-nested' }] },
}).withOutMessagePolicy({
  fold: MobileDrawerExampleBlock.makeOutMessageFold(MobileDrawerBlock, {
    CloseRequested: MobileDrawerExampleBlock.makeNoopStep,
    OpenChanged: MobileDrawerExampleBlock.makeNoopStep,
  }),
})

const MobileDrawerExampleComposition = MobileDrawerExampleBlock.makeComposition({
  bindings: [Drawer, Nested],
})

const motion = createMotionScope('mobile-drawer-example')

const init = MobileDrawerExampleComposition.makeInit(() => ({
  model: { shouldAcceptClose: true, closes: 0, isMounted: true },
}))

const update = MobileDrawerExampleComposition.makeUpdate({
  ClickedToggleMounted: MobileDrawerExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
  ClickedOpen: Drawer.requestControlledOpen({ control: Option.some(true) }),
  ClickedForceClose: Drawer.requestControlledOpen({ control: Option.some(false) }),
  ClickedAccept: MobileDrawerExampleBlock.makeFieldsStep(() => ({
    shouldAcceptClose: Boolean.not,
  })),
  ClickedNested: Nested.requestOpen(),
})

const actualView = MobileDrawerExampleComposition.makeView((model, h) =>
  h.main(
    [h.Class('max-w-180 m-[64px_auto] p-6 min-h-[160vh]')],
    [
      h.a([h.Href(homeRouter())], ['← Fluid examples']),
      h.h1([], ['Navigation that makes room.']),
      h.p(
        [],
        [
          'A native modal navigation drawer. Escape, outside click, focus return and nested isolation follow DialogBlock.',
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedAccept(),
          toView: (attributes) =>
            h.button(
              [
                ...attributes.button,
                h.Id('accept-close'),
                h.Class(
                  'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                ),
              ],
              [model.shouldAcceptClose ? 'Accept close requests' : 'Ignore close requests'],
            ),
        },
        h,
      ),
      h.p([h.Id('close-count')], [`Close requests: ${model.closes}`]),
      model.isMounted
        ? h.block(
            Drawer.embedView({
              slotId: 'drawer',
              model: model.drawer,
              viewInputs: {
                animate: motion.node,
                trigger: (attributes) =>
                  h.button(
                    [
                      ...attributes,
                      h.Id('open-drawer'),
                      h.Class(
                        'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                      ),
                    ],
                    ['Open navigation'],
                  ),
                content: ({ close }) => [
                  h.h2([], ['Workspace']),
                  Button.view(
                    {
                      onClick: Message.ClickedToggleMounted(),
                      toView: (attributes) =>
                        h.button(
                          [
                            ...attributes.button,
                            h.Id('unmount-from-drawer'),
                            h.Class(
                              'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                            ),
                          ],
                          ['Unmount drawer'],
                        ),
                    },
                    h,
                  ),
                  h.button(
                    [
                      ...close,
                      h.Id('close-drawer'),
                      h.Class(
                        'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                      ),
                    ],
                    ['Close navigation'],
                  ),
                  h.nav(
                    [
                      h.Class(
                        'grid gap-2 my-[24px] [&_a]:p-3 [&_a]:rounded-[8px] [&_a:hover]:[background:var(--hover)]',
                      ),
                    ],
                    ['Overview', 'Projects', 'Activity', 'Settings'].map((label) =>
                      h.a([h.Href(`#${label.toLowerCase()}`)], [label]),
                    ),
                  ),
                  Button.view(
                    {
                      onClick: Message.ClickedNested(),
                      toView: (attributes) =>
                        h.button(
                          [
                            ...attributes.button,
                            h.Id('open-nested'),
                            h.Class(
                              'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                            ),
                          ],
                          ['Open nested navigation'],
                        ),
                    },
                    h,
                  ),
                  Button.view(
                    {
                      onClick: Message.ClickedForceClose(),
                      toView: (attributes) =>
                        h.button(
                          [
                            ...attributes.button,
                            h.Id('force-close'),
                            h.Class(
                              'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                            ),
                          ],
                          ['Parent closes drawer'],
                        ),
                    },
                    h,
                  ),
                  h.block(
                    Nested.embedView({
                      slotId: 'nested',
                      model: model.nested,
                      viewInputs: {
                        animate: motion.node,
                        surface: 3,
                        label: 'Project navigation',
                        content: ({ close: nestedClose }) => [
                          h.h2([], ['Project navigation']),
                          h.button(
                            [
                              ...nestedClose,
                              h.Id('close-nested'),
                              h.Class(
                                'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                              ),
                            ],
                            ['Back to workspace'],
                          ),
                          h.a([h.Href('#project')], ['Current project']),
                        ],
                        ...examplePresentation,
                      },
                    }),
                  ),
                ],
                ...examplePresentation,
              },
            }),
          )
        : h.empty,
      Button.view(
        {
          onClick: Message.ClickedToggleMounted(),
          toView: (attributes) =>
            h.button(
              [
                ...attributes.button,
                h.Id('toggle-mounted'),
                h.Class(
                  'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                ),
              ],
              [model.isMounted ? 'Unmount drawer' : 'Remount drawer'],
            ),
        },
        h,
      ),
      Button.view(
        {
          toView: (attributes) =>
            h.button(
              [
                ...attributes.button,
                h.Id('after-drawer'),
                h.Class(
                  'p-[10px_14px] [border:1px_solid_var(--border)] rounded-[8px] cursor-pointer m-1.5',
                ),
              ],
              ['After drawer'],
            ),
        },
        h,
      ),
    ],
  ),
)

const layer = MobileDrawerExampleBlock.makeLayer({ init, update, view: actualView }).pipe(
  Layer.provide(mobileDrawerLayer),
)

Runtime.run(
  Program.makeElement({
    block: MobileDrawerExampleBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({ services, runtime: motion.layer }),
)
