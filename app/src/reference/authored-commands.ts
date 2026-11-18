import { hoverModeOf as commandTabsHoverModeOf } from '@foldkit-visuals/fluid/tabs'
import { hoverModeOf as commandmenudialogHoverModeOf } from '@foldkit-visuals/fluid/command-menu-dialog'
import { hoverModeOf as selectHoverModeOf } from '@foldkit-visuals/fluid/select'
import { hoverModeOf as commandmenuHoverModeOf } from '@foldkit-visuals/fluid/command-menu'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import { modifyFields } from 'foldkit/struct'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
// Authored from Fluid Functionalism cc276ca0 CommandMenu docs. MIT.
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  CommandMenuBlock,
  CommandMenuLayer,
  CommandMenuFooter,
  CommandMenuShortcut,
} from '@foldkit-visuals/fluid/command-menu'
import {
  CommandMenuDialogBlock,
  CommandMenuDialogLayer,
} from '@foldkit-visuals/fluid/command-menu/dialog'
import {
  CommandMenuTabsBlock,
  CommandMenuTabsLayer,
  CommandMenuFilters,
} from '@foldkit-visuals/fluid/command-menu/tabs'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { shapeMap, spring } from '@foldkit-visuals/fluid/tokens'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion } from '../motion'
import { ComponentPresentation, presentation } from '../settings'
import { items, suggestions, tabs, types, sorts, sections } from './command-scenes'
import { documentationRuntime } from '../documentation-runtime'
const key = Symbol('AuthoredCommands')
export const AuthoredCommandsBlock = Block.make('AuthoredCommands', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    menus: Schema.Record(Schema.String, CommandMenuBlock.Model),
    dialogs: Schema.Record(Schema.String, CommandMenuDialogBlock.Model),
    tabs: Schema.Record(Schema.String, CommandMenuTabsBlock.Model),
    selects: Schema.Record(Schema.String, SelectBlock.Model),
    filterType: Schema.String,
    sort: Schema.String,
    lastSelected: Schema.String,
    noticeRevision: Schema.Natural,
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: defineMessageUnion({
    CompletedWaitBeforeDismissNotice: { revision: Schema.Natural },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof CommandMenuDialogBlock>['programRequirements']
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredCommandsBlock
const WaitBeforeDismissNotice = Root.makeCommand('WaitBeforeDismissNotice', {
  args: { revision: Schema.Natural },
  messages: [Root.Message.CompletedWaitBeforeDismissNotice],
  *handler() {
    return ({ revision }) =>
      Effect.sleep('2 seconds').pipe(
        Effect.as(Root.Message.CompletedWaitBeforeDismissNotice({ revision })),
      )
  },
})
const selected = ({ item }: typeof CommandMenuBlock.OutMessage.Selected.Type) =>
  Root.makeStep((model) => {
    const revision = model.noticeRevision + 1
    return {
      model: modifyFields(model, {
        lastSelected: () => `Ran “${item.label}”`,
        noticeRevision: () => revision,
      }),
      commands: [WaitBeforeDismissNotice({ revision })],
    }
  })
const Menus = Root.makeRecordBinding(CommandMenuBlock, { field: 'menus' }).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CommandMenuBlock, {
    Selected: selected,
    QueryChanged: Root.makeNoopStep,
  }),
})
const Dialogs = Root.makeRecordBinding(CommandMenuDialogBlock, {
  field: 'dialogs',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CommandMenuDialogBlock, {
    Selected: selected,
    QueryChanged: Root.makeNoopStep,
    OpenChanged: Root.makeNoopStep,
  }),
})
const RawTabs = Root.makeRecordBinding(CommandMenuTabsBlock, { field: 'tabs' })
const Tabs = RawTabs.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(CommandMenuTabsBlock, {
      ValueChanged: ({ value }) =>
        Update.combineSteps([
          RawTabs.requestConfigureValue(key, { value }),
          Menus.requestConfigure(key, {
            items: value === 'all' ? items : items.filter((item) => item.group === value),
            query: Option.none(),
          }),
        ]),
    }),
})
const filteredItems = (type: string, sort: string) => {
  const rows = type === 'all' ? items : items.filter((item) => item.group === type)
  return sort === 'az' ? [...rows].sort((a, b) => a.label.localeCompare(b.label)) : rows
}
const RawSelects = Root.makeRecordBinding(SelectBlock, { field: 'selects' })
const Selects = RawSelects.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(SelectBlock, {
      OpenChanged: Root.makeNoopStep,
      Selected: ({ value }) =>
        Root.makeStep((model) =>
          Update.combineSteps([
            Root.makeFieldsStep(() =>
              key === 'type' ? { filterType: () => value } : { sort: () => value },
            ),
            RawSelects.requestConfigure(key, {
              items: key === 'type' ? types : sorts,
              value,
              disabled: false,
            }),
            Menus.requestConfigure('filters', {
              items: filteredItems(
                key === 'type' ? value : model.filterType,
                key === 'sort' ? value : model.sort,
              ),
              query: Option.none(),
            }),
          ]),
        ),
    }),
})
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const initDocTabs = sections
  .map(({ key }) => key)
  .map((key) =>
    Root.makeStep((model) =>
      initAndInsert(DocTabs, model, {
        key,
        args: [
          {
            id: previewCodeTabId('commands', key),
            idPrefix: previewCodeTabId('commands', key),
            selectedIndex: 0,
          },
        ],
      }),
    ),
  )
const Composition = Root.makeComposition({ bindings: [DocTabs, Menus, Dialogs, Tabs, Selects] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: {
      menus: {},
      dialogs: {},
      tabs: {},
      selects: {},
      filterType: 'all',
      sort: 'default',
      lastSelected: '',
      noticeRevision: 0,
      docTabs: {},
    },
    steps: [
      ...initDocTabs,
      ...sections
        .filter(({ key }) => key !== 'dialog')
        .map(({ key }) =>
          Root.makeStep((model) =>
            initAndInsert(Menus, model, {
              key,
              args: [
                {
                  id: `docs-command-${key}`,
                  items:
                    key === 'basic'
                      ? items.map(
                          ({ description: _description, shortcut: _shortcut, ...item }) => item,
                        )
                      : items,
                  ...(key === 'suggestions' || key === 'footer'
                    ? {
                        suggestions,
                        suggestionsLabel: key === 'suggestions' ? 'Recent' : 'Suggestions',
                      }
                    : {}),
                },
              ],
            }),
          ),
        ),
      ...['tabs', 'footer'].map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Tabs, model, {
            key,
            args: [
              {
                id: `docs-command-tabs-${key}`,
                inputId: `docs-command-${key}-input`,
                tabs,
                value: 'all',
              },
            ],
          }),
        ),
      ),
      ...['keyed', 'no-key'].map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Dialogs, model, {
            key,
            args: [
              {
                id: `docs-command-dialog-${key}`,
                items,
                shortcut: key === 'keyed' ? 'mod+p' : null,
                ...(key === 'keyed' ? { suggestions } : {}),
              },
            ],
          }),
        ),
      ),
      ...['type', 'sort'].map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Selects, model, {
            key,
            args: [
              {
                id: `docs-command-filter-${key}`,
                items: key === 'type' ? types : sorts,
                defaultValue: key === 'type' ? 'all' : 'default',
              },
            ],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    CompletedWaitBeforeDismissNotice: (model, { revision }) => ({
      model:
        revision === model.noticeRevision ? modifyFields(model, { lastSelected: () => '' }) : model,
    }),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [DocTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.menus).flatMap(([key, child]) =>
          commandmenuHoverModeOf(child) === settings.hover
            ? []
            : [Menus.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.tabs).flatMap(([key, child]) =>
          commandTabsHoverModeOf(child.tabs) === settings.hover
            ? []
            : [Tabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.selects).flatMap(([key, child]) =>
          selectHoverModeOf(child) === settings.hover
            ? []
            : [Selects.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.dialogs).flatMap(([key, child]) =>
          commandmenudialogHoverModeOf(child) === settings.hover
            ? []
            : [Dialogs.requestHoverMode(key, { mode: settings.hover })],
        ),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    const documentationTabs = (key: string) => {
      const child = model.docTabs[key]
      return child === undefined
        ? h.empty
        : h.block(
            DocTabs.embedView({
              key,
              slotId: child.tabs.id,
              model: child,
              viewInputs: previewCodeTabsViewInputs(h, {
                context,
                animate: motion.node,
                ariaLabel: `${key} example`,
              }),
            }),
          )
    }
    const icon = (item: { readonly value: string }) => {
      const spec = items.find((row) => row.value === item.value)
      return spec === undefined ? undefined : defaultIcons[spec.icon]
    }
    const header = (key: string) => {
      const tab = model.tabs[key]
      if (tab !== undefined)
        return h.block(
          Tabs.embedView({
            key,
            slotId: `docs-command-tabs-${key}`,
            model: tab,
            viewInputs: { context, animate: motion.node },
          }),
        )
      if (key !== 'filters') return h.empty
      return CommandMenuFilters(
        {
          context,
          children: (filterContext) =>
            ['type', 'sort'].flatMap((key) => {
              const child = model.selects[key]
              return child === undefined
                ? []
                : [
                    h.block(
                      Selects.embedView({
                        key,
                        slotId: child.id,
                        model: child,
                        viewInputs: {
                          context: filterContext,
                          variant: 'borderless',
                          ariaLabel: key === 'type' ? 'Type' : 'Sort',
                          animate: motion.node,
                        },
                      }),
                    ),
                  ]
            }),
        },
        h,
      )
    }
    return h.div(
      [],
      [
        ...sections.map((scene) =>
          docSection(h, {
            title: scene.title,
            className: 'flex flex-wrap items-center gap-3',
            description: scene.description,
            source: documentationRuntime().sources['authored-commands'],
            presentation: { context },
            pane: model.docTabs[scene.key]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
            tabs: documentationTabs(scene.key),
            tabsId: previewCodeTabId('commands', scene.key),
            previewMinHeight: scene.key === 'dialog' ? 160 : 400,
            children:
              scene.key === 'dialog'
                ? ['keyed', 'no-key'].flatMap((key) => {
                    const child = model.dialogs[key]
                    return child === undefined
                      ? []
                      : [
                          h.block(
                            Dialogs.embedView({
                              key,
                              slotId: `docs-command-dialog-${key}`,
                              model: child,
                              viewInputs: {
                                context,
                                animate: motion.node,
                                placeholder: 'Type a command or search…',
                                emptyText: 'No results.',
                                itemIconFor: icon,
                                trigger: (attributes) =>
                                  Button(
                                    {
                                      context,
                                      variant: key === 'keyed' ? 'secondary' : 'ghost',
                                      attributes,
                                      children:
                                        key === 'keyed'
                                          ? [
                                              'Open',
                                              CommandMenuShortcut(
                                                { context, keys: 'mod+p', mac: child.menu.mac },
                                                h,
                                              ),
                                            ]
                                          : ['Open, no shortcut'],
                                    },
                                    h,
                                  ),
                              },
                            }),
                          ),
                        ]
                  })
                : [
                    Elevated(
                      {
                        context,
                        offset: 2,
                        shadowLevel: 3,
                        className:
                          'flex max-h-[360px] w-full max-w-[520px] flex-col overflow-hidden',
                        children: (panelContext) => {
                          const child = model.menus[scene.key]
                          return child === undefined
                            ? []
                            : [
                                h.block(
                                  Menus.embedView({
                                    key: scene.key,
                                    slotId: child.id,
                                    model: child,
                                    viewInputs: {
                                      context: panelContext,
                                      animate: motion.node,
                                      placeholder: 'Type a command or search…',
                                      emptyText: 'No results.',
                                      itemIconFor: icon,
                                      ...(scene.key === 'tabs' ||
                                      scene.key === 'footer' ||
                                      scene.key === 'filters'
                                        ? { header: () => header(scene.key) }
                                        : {}),
                                      ...(scene.key === 'footer'
                                        ? {
                                            footer: (
                                              activeItem:
                                                | (typeof CommandMenuBlock.OutMessage.Selected.Type)['item']
                                                | undefined,
                                              mac: boolean,
                                            ) =>
                                              CommandMenuFooter(
                                                {
                                                  context: panelContext,
                                                  mac,
                                                  hasTabs: true,
                                                  ...(activeItem === undefined
                                                    ? {}
                                                    : { activeItem }),
                                                },
                                                h,
                                              ),
                                          }
                                        : {}),
                                      ...(scene.key === 'custom'
                                        ? {
                                            renderItemLabel: (
                                              item: (typeof CommandMenuBlock.OutMessage.Selected.Type)['item'],
                                            ) => [
                                              h.span(
                                                [
                                                  h.Class(
                                                    'flex min-w-0 flex-1 items-baseline gap-2',
                                                  ),
                                                ],
                                                [
                                                  h.span(
                                                    [
                                                      h.Class(
                                                        'truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1',
                                                      ),
                                                    ],
                                                    [item.label],
                                                  ),
                                                  h.span(
                                                    [
                                                      h.Class(
                                                        'truncate text-muted-foreground [text-box:trim-both_cap_alphabetic] py-1 -my-1',
                                                      ),
                                                    ],
                                                    [item.group ?? ''],
                                                  ),
                                                ],
                                              ),
                                            ],
                                          }
                                        : {}),
                                    },
                                  }),
                                ),
                              ]
                        },
                      },
                      h,
                    ),
                  ],
          }),
        ),
        h.div(
          [h.Class('pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center')],
          [
            motion.node(
              h.div(
                [
                  h.Key(String(model.noticeRevision)),
                  h.Role('status'),
                  h.Style({ fontVariationSettings: "'wght' 400, 'opsz' 14" }),
                  h.Class(
                    `mx-auto flex h-9 w-max items-center gap-2 bg-foreground px-3 text-site-body text-background ${shapeMap[settings.shape].bg}`,
                  ),
                ],
                [
                  h.span(
                    [
                      h.AriaHidden(true),
                      h.Class(
                        `inline-flex h-[18px] w-[18px] items-center justify-center bg-background/15 text-background ${shapeMap[settings.shape].bg}`,
                      ),
                    ],
                    [defaultIcons.check({ size: 12, strokeWidth: 2.5 }, h)],
                  ),
                  h.span([h.Class('[text-box:trim-both_cap_alphabetic]')], [model.lastSelected]),
                ],
              ),
              {
                initial: { opacity: 0, y: 6 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 6, transition: spring.fast.exit },
                present: model.lastSelected !== '',
                transition: spring.fast,
              },
            ),
          ],
        ),
      ],
    )
  }),
  EffectsLayer: WaitBeforeDismissNotice.layer,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      CommandMenuLayer,
      CommandMenuDialogLayer,
      CommandMenuTabsLayer,
      SelectLayer,
      PreviewControlsLayer,
    ),
  ),
)
