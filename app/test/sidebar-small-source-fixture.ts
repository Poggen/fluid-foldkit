import { DocumentTooltipBlock, layer as TooltipsLayer } from '@foldkit-visuals/fluid/tooltip'
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import type { Html } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import {
  SidebarWorkspaceHeaderBlock,
  SidebarWorkspaceHeaderLayer,
} from '@foldkit-visuals/fluid/sidebar/workspace-header'
import {
  SidebarTrigger,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarMenuAction,
  SidebarMenuActions,
} from '@foldkit-visuals/fluid/sidebar/parts'

const Options = Schema.Struct({ menu: Schema.Boolean, peeking: Schema.Boolean })
type Options = typeof Options.Type
const Model = Schema.Struct({
  workspace: SidebarWorkspaceHeaderBlock.Model,
  tooltips: DocumentTooltipBlock.Model,
  options: Options,
})
type Model = typeof Model.Type
const FixtureKey = Symbol('SidebarSmallSourceFixture')
const Fixture = Block.make('SidebarSmallSourceFixture', {
  key: FixtureKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Options]),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SidebarWorkspaceHeaderBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  view: { kind: 'Document' },
})
const WorkspaceBinding = Fixture.makeRequiredFieldBinding(SidebarWorkspaceHeaderBlock, {
  field: 'workspace',
  init: { contextToArgs: () => [{ id: 'source-workspace', name: 'Workspace' }] },
}).withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(SidebarWorkspaceHeaderBlock, {
    Events: Fixture.makeNoopStep,
  }),
})
const Tooltips = Fixture.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: Fixture.makeNoopStep,
  }),
})
const Composition = Fixture.makeComposition({ bindings: [WorkspaceBinding, Tooltips] })
const preserveNode = (node: Html) => node
const FixtureLayer = Fixture.makeLayer({
  init: Composition.makeInit((options: Options) => ({
    model: { options },
    steps: [Tooltips.requestAdd({ key: 'workspace-pin', options: { side: 'bottom' } })],
  })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Sidebar source contracts',
    body: h.main(
      [],
      [
        h.button([h.Id('before'), h.Type('button')], ['Before workspace']),
        h.block(
          WorkspaceBinding.embedView({
            slotId: 'workspace',
            model: model.workspace,
            viewInputs: {
              animate: preserveNode,
              highlight: preserveNode,
              peeking: model.options.peeking,
              pin: (slot) =>
                h.block(
                  Tooltips.embedView({
                    slotId: 'pin-trigger',
                    model: model.tooltips,
                    viewInputs: {
                      part: 'triggers',
                      renderTrigger: (_key, { button }) =>
                        SidebarTrigger(
                          {
                            button,
                            side: 'left',
                            compact: slot.compact,
                            className: slot.className,
                            attributes: [
                              ...slot.attributes,
                              ...childAttributes([
                                h.Id('workspace-pin'),
                                h.AriaLabel('Pin workspace'),
                              ]),
                            ],
                          },
                          h,
                        ),
                      render: ({ tooltip }) => tooltip('workspace-pin'),
                    },
                  }),
                ),
              ...(model.options.menu ? { menu: () => [] } : {}),
            },
          }),
        ),
        h.button([h.Id('after'), h.Type('button')], ['After workspace']),
        h.div(
          [h.Style({ position: 'relative', width: '224px', height: '64px' })],
          [SidebarGroupAction({ label: 'Standalone group', children: [] }, h)],
        ),
        h.div(
          [h.Style({ position: 'relative', width: '224px', height: '64px' })],
          [
            SidebarGroupActions(
              {
                actions: (actionContext) => ({
                  entries: [
                    SidebarGroupAction({ label: 'Cluster group', children: [], actionContext }, h),
                    SidebarGroupAction(
                      {
                        label: 'Overridden group',
                        children: [],
                        actionContext,
                        className: 'z-20 shrink-0 transition-opacity',
                      },
                      h,
                    ),
                  ],
                }),
              },
              h,
            ),
          ],
        ),
        h.div(
          [h.Style({ position: 'relative', width: '224px', height: '64px' })],
          [
            SidebarMenuAction({ label: 'Standalone menu', children: [] }, h),
            SidebarMenuActions(
              {
                actionContext: {
                  kind: 'menu',
                  placement: 'standalone',
                  subRow: false,
                  active: false,
                  hasBadge: false,
                  shape: 'rounded',
                  size: 'default',
                },
                actions: (actionContext) => ({
                  entries: [
                    SidebarMenuAction({ label: 'Cluster menu', children: [], actionContext }, h),
                  ],
                }),
              },
              h,
            ),
          ],
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(Layer.mergeAll(SidebarWorkspaceHeaderLayer, TooltipsLayer)))

export const renderSidebarSmallSource = (options: Options) =>
  Server.renderToString(
    { block: Fixture, layer: FixtureLayer },
    { Flags: Options },
    { flags: options, isHydratable: false },
  )
