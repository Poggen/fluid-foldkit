import { Button, Input } from '@foldkit/ui'
import { Button as FluidButton } from '@foldkit-visuals/fluid/button'
import { Boolean } from 'effect'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import type { CommandMenuDialogViewInputs } from '@foldkit-visuals/fluid/command-menu/dialog'
import type { CommandMenuTabsViewInputs } from '@foldkit-visuals/fluid/command-menu/tabs'
import { homeRouter } from './selection-family-routes.js'
import type { CommandMenuItem } from '@foldkit-visuals/fluid/command-menu'
import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  CommandMenuDialogBlock,
  CommandMenuDialogLayer,
} from '@foldkit-visuals/fluid/command-menu/dialog'
import {
  CommandMenuTabsBlock,
  CommandMenuTabsLayer,
} from '@foldkit-visuals/fluid/command-menu/tabs'
import { CommandMenuFilters } from '@foldkit-visuals/fluid/command-menu/tabs'
import { defineCommandMenuBlock, CommandMenuFooter } from '@foldkit-visuals/fluid/command-menu'
import type { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { sourceItems, sourceTabs, sourceSuggestions } from './command-menu-source-data.js'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import './command-menu-example.css'

const context = createPresentationContext({ reducedMotion: 'user', ...examplePresentation })

const sourcePreset = new URLSearchParams(window.location.search).get('preset') === 'source'

const items = sourcePreset
  ? sourceItems
  : [
      {
        value: 'document',
        label: 'New document',
        group: 'Create',
        keywords: ['write', 'page'],
        shortcut: 'mod+n',
      },
      {
        value: 'project',
        label: 'New project',
        group: 'Create',
        keywords: ['build'],
        shortcut: 'mod+shift+p',
      },
      {
        value: 'search',
        label: 'Search workspace',
        group: 'Navigate',
        description: 'Find your work',
      },
      {
        value: 'settings',
        label: 'Settings',
        group: 'Navigate',
        keywords: ['preferences'],
        shortcut: 'mod+,',
      },
      { value: 'archived', label: 'Archived workspace', group: 'Navigate', disabled: true },
    ]

const tabItems = sourcePreset
  ? sourceTabs
  : [
      { value: 'all', label: 'All' },
      { value: 'Create', label: 'Create' },
      { value: 'Navigate', label: 'Navigate' },
    ]

const exactMenuRecipe = defineCommandMenuBlock({
  filter: (item, query) => item.label.toLowerCase().startsWith(query.toLowerCase()),
})

const ExactMenuKey = Symbol('ExactCommandMenu')

const ExactMenu = Block.make(exactMenuRecipe.namespace, {
  key: ExactMenuKey,
  ...exactMenuRecipe.contract,
})

const ExactMenuLayer = ExactMenu.makeLayer(exactMenuRecipe.plans(ExactMenu)).pipe(
  Layer.provide(exactMenuRecipe.childLayers),
)

const Model = Schema.Struct({
  dialog: CommandMenuDialogBlock.Model,
  scoped: CommandMenuDialogBlock.Model,
  tabs: CommandMenuTabsBlock.Model,
  exact: ExactMenu.Model,
  selected: Schema.String,
  tab: Schema.String,
  isCompact: Schema.Boolean,
  shouldAcceptClose: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedCloseAccepted: {},
  ClickedToggleCompact: {},
  ClickedToggleAccept: {},
  UpdatedTab: { value: Schema.String },
})

const effects = Block.makeEffectsContract<never, DialogResources>()

const CommandMenuExampleKey = Symbol('CommandMenuExample')

const CommandMenuExampleBlock = Block.make('CommandMenuExample', {
  key: CommandMenuExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const RawDialog = CommandMenuExampleBlock.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'commands',
        items,
        suggestions: sourcePreset ? sourceSuggestions : ['project'],
        open: false,
      },
    ],
  },
})

const Dialog = RawDialog.withOutMessagePolicy({
  fold: CommandMenuExampleBlock.makeOutMessageFold(CommandMenuDialogBlock, {
    OpenChanged: ({ open }) =>
      CommandMenuExampleBlock.makeStep((model) =>
        open || model.shouldAcceptClose
          ? RawDialog.requestControlledOpen({ control: Option.some(open) })
          : CommandMenuExampleBlock.makeNoopStep(),
      ),
    Selected: ({ item }) =>
      CommandMenuExampleBlock.makeFieldsStep(() => ({ selected: () => item.label })),
    QueryChanged: CommandMenuExampleBlock.makeNoopStep,
  }),
})

const Scoped = CommandMenuExampleBlock.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'scoped',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'scoped-commands',
        items: items.slice(0, 2),
        shortcutScopeId: 'scope',
      },
    ],
  },
}).withOutMessagePolicy({
  fold: CommandMenuExampleBlock.makeOutMessageFold(CommandMenuDialogBlock, {
    OpenChanged: CommandMenuExampleBlock.makeNoopStep,
    QueryChanged: CommandMenuExampleBlock.makeNoopStep,
    Selected: ({ item }) =>
      CommandMenuExampleBlock.makeFieldsStep(() => ({ selected: () => item.label })),
  }),
})

const RawTabs = CommandMenuExampleBlock.makeRequiredFieldBinding(CommandMenuTabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'command-tabs',
        inputId: 'commands-input',
        tabs: tabItems,
        value: 'all',
      },
    ],
  },
})

const Tabs = RawTabs.withOutMessagePolicy({
  fold: CommandMenuExampleBlock.makeOutMessageFold(CommandMenuTabsBlock, {
    ValueChanged: ({ value }) =>
      Update.combineSteps([
        CommandMenuExampleBlock.makeFieldsStep(() => ({ tab: () => value })),
        RawTabs.requestConfigureValue({ value }),
        RawDialog.requestConfigure({
          items: value === 'all' ? items : items.filter((item) => item.group === value),
          query: Option.none(),
        }),
      ]),
  }),
})

const Exact = CommandMenuExampleBlock.makeRequiredFieldBinding(ExactMenu, {
  field: 'exact',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'exact-commands', items }] },
}).withOutMessagePolicy({
  fold: CommandMenuExampleBlock.makeOutMessageFold(ExactMenu, {
    Selected: ({ item }) =>
      CommandMenuExampleBlock.makeFieldsStep(() => ({ selected: () => item.label })),
    QueryChanged: CommandMenuExampleBlock.makeNoopStep,
  }),
})

const CommandMenuExampleComposition = CommandMenuExampleBlock.makeComposition({
  bindings: [Dialog, Scoped, Tabs, Exact],
})

const motion = createMotionScope('command-menu-example')

const init = CommandMenuExampleComposition.makeInit(() => ({
  model: { selected: 'Nothing selected', tab: 'all', isCompact: false, shouldAcceptClose: true },
}))

const update = CommandMenuExampleComposition.makeUpdate({
  ClickedCloseAccepted: RawDialog.requestControlledOpen({ control: Option.some(false) }),
  ClickedToggleCompact: CommandMenuExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedToggleAccept: CommandMenuExampleBlock.makeFieldsStep(() => ({
    shouldAcceptClose: Boolean.not,
  })),
  UpdatedTab: CommandMenuExampleBlock.makeNoopStep(),
})

const view = CommandMenuExampleComposition.makeView((model, h) => {
  const footerInputs: (
    activeItem: CommandMenuItem | undefined,
    mac: boolean,
  ) => Parameters<typeof CommandMenuFooter>[0] = (
    activeItem: CommandMenuItem | undefined,
    mac: boolean,
  ) => {
    const base: Parameters<typeof CommandMenuFooter>[0] = {
      inDialog: true,
      mac,
      hasTabs: true,
      size: model.isCompact ? 'compact' : 'default',
    }

    return activeItem === undefined ? base : { ...base, activeItem }
  }

  let tabsInputs: CommandMenuTabsViewInputs = {
    context,
    size: model.isCompact ? 'compact' : 'default',
    animate: motion.node,
  }

  if (!sourcePreset) {
    tabsInputs = {
      ...tabsInputs,
      filters: (tabsContext) =>
        CommandMenuFilters(
          {
            context: tabsContext,
            inTabsRow: true,
            children: (filterContext) => [
              FluidButton(
                {
                  context: filterContext,
                  variant: 'ghost',
                  attributes: [h.OnClick(Message.ClickedToggleCompact())],
                  children: [model.isCompact ? 'Default rows' : 'Compact rows'],
                },
                h,
              ),
            ],
          },
          h,
        ),
    }
  }

  let menuInputs: CommandMenuDialogViewInputs = {
    animate: motion.node,
    context,
    size: model.isCompact ? 'compact' : 'default',
    trigger: (attributes) =>
      h.button(
        [
          ...attributes,
          h.Id('open-commands'),
          h.Class('p-[8px_12px] [border:1px_solid_var(--border)] rounded-[8px] m-1 cursor-pointer'),
        ],
        ['Open command menu'],
      ),
    header: () =>
      h.block(
        Tabs.embedView({
          slotId: 'tabs',
          model: model.tabs,
          viewInputs: tabsInputs,
        }),
      ),
    footer: (activeItem, mac) =>
      h.div(
        [],
        [
          CommandMenuFooter(footerInputs(activeItem, mac), h),
          ...(model.shouldAcceptClose
            ? []
            : [
                Button.view(
                  {
                    onClick: Message.ClickedCloseAccepted(),
                    toView: (attributes) =>
                      h.button(
                        [...attributes.button, h.Id('parent-close-command')],
                        ['Parent close'],
                      ),
                  },
                  h,
                ),
              ]),
        ],
      ),
  }

  if (sourcePreset) {
    menuInputs = {
      ...menuInputs,
      itemIconFor: (item: CommandMenuItem) => {
        const original = sourceItems.find((entry) => entry.value === item.value)

        return original === undefined ? undefined : defaultIcons[original.icon]
      },
    }
  }

  return h.main(
    [h.Class(sourcePreset ? 'flex justify-center pt-125' : 'max-w-190 m-[64px_auto] p-6')],
    [
      ...(sourcePreset
        ? []
        : [
            h.a([h.Href(homeRouter())], ['← Fluid examples']),
            h.h1([], ['Everything, a few keys away.']),
            h.p(
              [],
              [
                'Press Control/Command + K. Use left/right to switch tabs, up/down to move, Enter to run.',
              ],
            ),
            h.p([h.Id('command-result'), h.Role('status')], [model.selected]),
            Button.view(
              {
                onClick: Message.ClickedToggleAccept(),
                toView: (attributes) =>
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'p-[8px_12px] [border:1px_solid_var(--border)] rounded-[8px] m-1 cursor-pointer',
                      ),
                    ],
                    [model.shouldAcceptClose ? 'Accept closes' : 'Ignore closes'],
                  ),
              },
              h,
            ),
          ]),
      h.block(
        Dialog.embedView({
          slotId: 'dialog',
          model: model.dialog,
          viewInputs: menuInputs,
        }),
      ),
      ...(sourcePreset
        ? []
        : [
            h.section(
              [h.Id('scope'), h.Class('my-[24px] [border:1px_solid_var(--border)] rounded-[12px]')],
              [
                h.h2([], ['Scoped palette']),
                h.label([h.For('scope-input')], ['Scoped command target']),
                Input.view(
                  {
                    id: 'scope-input',
                    placeholder: 'Focus here; then Ctrl/⌘ K',
                    toView: (attributes) => h.input([...attributes.input]),
                  },
                  h,
                ),
                h.block(
                  Scoped.embedView({
                    slotId: 'scoped',
                    model: model.scoped,
                    viewInputs: {
                      animate: motion.node,
                      title: 'Scoped commands',
                      trigger: (attributes) =>
                        h.button(
                          [
                            ...attributes,
                            h.Class(
                              'p-[8px_12px] [border:1px_solid_var(--border)] rounded-[8px] m-1 cursor-pointer',
                            ),
                          ],
                          ['Open scoped menu'],
                        ),
                      ...examplePresentation,
                    },
                  }),
                ),
              ],
            ),
            h.h2([], ['Custom prefix filter']),
            h.p([], ['This menu matches label prefixes instead of the default word filter.']),
            h.block(
              Exact.embedView({
                slotId: 'exact',
                model: model.exact,
                viewInputs: {
                  animate: motion.node,
                  className: 'my-[24px] [border:1px_solid_var(--border)] rounded-[12px]',
                  ...examplePresentation,
                },
              }),
            ),
          ]),
    ],
  )
})

const ExampleLayer = CommandMenuExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(
    Layer.mergeAll(CommandMenuDialogLayer, CommandMenuTabsLayer, ExactMenuLayer, motion.layer),
  ),
)

const container = document.querySelector<HTMLElement>('#root')

if (container !== null) {
  container.id = `command-menu-${sourcePreset ? 'source' : 'custom'}`
}

Runtime.run(
  Program.makeElement({
    block: CommandMenuExampleBlock,
    layer: ExampleLayer,
    container,
  }).provide(DialogResourcesLayer(document)),
)
