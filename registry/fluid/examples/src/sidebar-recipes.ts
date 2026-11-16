import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import {
  sidebarNestedContent,
  nestedNavItems,
  nestedDisclosure,
  nestedRowKind,
  nestedSidebarRows,
} from './sidebar-nested-content.js'
import { homeRouter } from './selection-family-routes.js'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SidebarAppBlock, SidebarAppLayer as AppLayer } from '@foldkit-visuals/fluid/sidebar/app'
import {
  SettingsDialogBlock,
  SettingsDialogLayer as SettingsLayer,
} from '@foldkit-visuals/fluid/sidebar/settings-dialog'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { createSelectLayer } from '@foldkit-visuals/fluid/select'
import {
  NavMenuBlock,
  navMenuLayer,
  hoverHighlightAnimation,
} from '@foldkit-visuals/fluid/nav-menu'
import { Button } from '@foldkit-visuals/fluid/button'
import './sidebar-recipes.css'
const App = SidebarAppBlock
const Dialog = SettingsDialogBlock
const motion = createMotionScope('sidebar-recipes')
const switches = createSwitchMotionScope('sidebar-recipes-switch')
const services = Layer.mergeAll(createSelectLayer(document), makeTooltipDomLayer(document, window))
const effects = Block.makeEffectsContract<never, Layer.Success<typeof services>>()
const Model = Schema.Struct({
  app: App.Model,
  settings: Dialog.Model,
  nestedNav: NavMenuBlock.Model,
  density: Schema.Literals(['default', 'compact']),
  isNestedGroupOpen: Schema.Boolean,
  isNestedBranchOpen: Schema.Boolean,
  isNestedDetailsOpen: Schema.Boolean,
  isNestedReportsOpen: Schema.Boolean,
})
const Message = defineMessageUnion({
  ClickedDensityToggled: {},
  ToggledNestedGroup: { open: Schema.Boolean },
})
export const SidebarRecipesKey = Symbol('SidebarRecipesShowcase')
const SidebarRecipesShowcaseBlock = Block.make('SidebarRecipesShowcase', {
  key: SidebarRecipesKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
})
const AppBinding = SidebarRecipesShowcaseBlock.makeRequiredFieldBinding(App, {
  field: 'app',
  init: { contextToArgs: () => [{ id: 'recipe-app' }] },
}).withOutMessagePolicy({
  fold: SidebarRecipesShowcaseBlock.makeOutMessageFold(App, {
    Selected: SidebarRecipesShowcaseBlock.makeNoopStep,
    OpenChanged: SidebarRecipesShowcaseBlock.makeNoopStep,
    WidthChanged: SidebarRecipesShowcaseBlock.makeNoopStep,
  }),
})
const Settings = SidebarRecipesShowcaseBlock.makeRequiredFieldBinding(Dialog, {
  field: 'settings',
  init: { contextToArgs: () => [{ id: 'recipe-settings' }] },
}).withOutMessagePolicy({
  fold: SidebarRecipesShowcaseBlock.makeOutMessageFold(Dialog, {
    OpenChanged: SidebarRecipesShowcaseBlock.makeNoopStep,
    SectionChanged: SidebarRecipesShowcaseBlock.makeNoopStep,
  }),
})
const NestedNavRequests = SidebarRecipesShowcaseBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'nestedNav',
  init: {
    contextToArgs: () => [{ id: 'nested-nav', items: nestedNavItems, activeSlug: '#tokens' }],
  },
})
const NestedNav = NestedNavRequests.withOutMessagePolicy({
  fold: SidebarRecipesShowcaseBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: ({ value, href }) =>
      SidebarRecipesShowcaseBlock.makeStep((model) => {
        if (value === 'projects') {
          return {
            model: modifyFields(model, {
              isNestedBranchOpen: Boolean.not,
            }),
          }
        }
        if (value === 'design') {
          return {
            model: modifyFields(model, {
              isNestedDetailsOpen: Boolean.not,
            }),
          }
        }
        if (value === 'reports') {
          return {
            model: modifyFields(model, {
              isNestedReportsOpen: Boolean.not,
            }),
          }
        }
        return NestedNavRequests.requestConfigure({ items: nestedNavItems, activeSlug: href })
      }),
  }),
})
const SidebarRecipesShowcaseComposition = SidebarRecipesShowcaseBlock.makeComposition({
  bindings: [AppBinding, Settings, NestedNav],
})
const init = SidebarRecipesShowcaseComposition.makeInit(() => ({
  model: {
    density: 'default',
    isNestedGroupOpen: true,
    isNestedBranchOpen: true,
    isNestedDetailsOpen: true,
    isNestedReportsOpen: true,
  },
}))
const update = SidebarRecipesShowcaseComposition.makeUpdate({
  ToggledNestedGroup: (model, { open }) => ({
    model: modifyFields(model, { isNestedGroupOpen: () => open }),
  }),
  ClickedDensityToggled: (model) => ({
    model: modifyFields(model, {
      density: (density) => (density === 'default' ? 'compact' : 'default'),
    }),
  }),
})
const view = SidebarRecipesShowcaseComposition.makeView((model, h) => ({
  title: 'Sidebar recipes · Fluid',
  body: h.div(
    [],
    [
      h.block(
        AppBinding.embedView({
          slotId: 'app',
          model: model.app,
          viewInputs: {
            size: model.density,
            animate: motion.node,
            highlight: hoverHighlightAnimation(motion),
            topbar: () => [
              h.span(
                [
                  h.Class(
                    'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-muted-foreground',
                  ),
                ],
                ['Workspace'],
              ),
            ],
            content: (active, _sidebar, context) => [
              h.div(
                [h.Class('flex flex-1 flex-col gap-4 p-4')],
                [
                  ...(new URLSearchParams(location.search).get('case') === 'nested'
                    ? [
                        sidebarNestedContent(
                          {
                            groupOpen: model.isNestedGroupOpen,
                            branchOpen: model.isNestedBranchOpen,
                            detailsOpen: model.isNestedDetailsOpen,
                            reportsOpen: model.isNestedReportsOpen,
                            compact: model.density === 'compact',
                            animate: motion.node,
                            onGroupToggle: (open) => Message.ToggledNestedGroup({ open }),
                            nav: h.block(
                              NestedNav.embedView({
                                slotId: 'nested-nav',
                                model: model.nestedNav,
                                viewInputs: {
                                  context,
                                  size: model.density,
                                  sidebar: true,
                                  animate: motion.node,
                                  highlight: hoverHighlightAnimation(motion),
                                  kind: nestedRowKind,
                                  rowDisclosure: nestedDisclosure({
                                    groupOpen: model.isNestedGroupOpen,
                                    branchOpen: model.isNestedBranchOpen,
                                    detailsOpen: model.isNestedDetailsOpen,
                                    reportsOpen: model.isNestedReportsOpen,
                                    compact: model.density === 'compact',
                                  }),
                                  content: (context) =>
                                    nestedSidebarRows(
                                      {
                                        groupOpen: model.isNestedGroupOpen,
                                        branchOpen: model.isNestedBranchOpen,
                                        detailsOpen: model.isNestedDetailsOpen,
                                        reportsOpen: model.isNestedReportsOpen,
                                        compact: model.density === 'compact',
                                        animate: motion.node,
                                      },
                                      context,
                                      h,
                                    ),
                                },
                              }),
                            ),
                          },
                          h,
                        ),
                      ]
                    : []),
                  h.h1(
                    [h.Class('text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)]')],
                    [active],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-[length:var(--fs-subtitle,14px)] leading-[var(--lh-subtitle,20px)] text-muted-foreground',
                      ),
                    ],
                    [
                      'Workspace header, search, collapsible sections, identity menu, and a responsive settings dialog.',
                    ],
                  ),
                  h.a(
                    [
                      h.Href(homeRouter()),
                      h.Class(
                        'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] underline',
                      ),
                    ],
                    ['All examples'],
                  ),
                  Button(
                    {
                      variant: 'secondary',
                      attributes: [h.OnClick(Message.ClickedDensityToggled())],
                      children: [model.density === 'default' ? 'Compact rows' : 'Default rows'],
                    },
                    h,
                  ),
                ],
              ),
            ],
          },
        }),
      ),
      h.block(
        Settings.embedView({
          slotId: 'settings',
          model: model.settings,
          viewInputs: {
            size: model.density,
            animate: motion.node,
            switchAnimate: switches.node,
            highlight: hoverHighlightAnimation(motion),
            trigger: (attributes) =>
              Button(
                {
                  attributes,
                  variant: 'secondary',
                  className: 'fixed right-6 top-4 z-10',
                  children: ['Settings'],
                },
                h,
              ),
          },
        }),
      ),
    ],
  ),
}))
const layer = SidebarRecipesShowcaseBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(AppLayer, SettingsLayer, navMenuLayer)),
)
Runtime.run(
  Program.make({
    block: SidebarRecipesShowcaseBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({
    services,
    runtime: Layer.mergeAll(motion.layer, switches.layer),
  }),
)
