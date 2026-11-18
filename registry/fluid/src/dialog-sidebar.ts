import { fontWeights } from './lib/font-weight.js'
import {
  settingsNavItems as items,
  settingsChoices as choices,
} from './dialog-sidebar-navigation-data.js'
import type { TooltipDom } from './tooltip-native-public.js'
import { HoverMode } from './hover.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { DialogResources } from './dialog-resources.js'
import type { DropdownResources } from './dropdown-resources.js'
import { DialogLayer as OwningDialogLayer, DialogBlock } from './dialog.js'
import { layer as SelectLayer, SelectBlock } from './select.js'
import { layer as ScrollLayer, ScrollAreaBlock } from './scroll-area.js'
import {
  SettingsPanelLayer as PanelLayer,
  SettingsPanelBlock as PanelBlock,
} from './sidebar-settings-panel.js'
import { Layer, Schema } from 'effect'
import { DialogControl } from './dialog-state.js'
import { Block, Update } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { SidebarBlock, sidebarLayer } from './sidebar.js'
import type { SidebarConfig } from './sidebar-state.js'
import { SidebarContent, SidebarHeader } from './sidebar-parts.js'
import { NavMenuBlock, navMenuLayer, hoverModeOf as navHoverModeOf } from './nav-menu.js'

import type { SettingsPanelViewInputs, SettingsPanelConfig } from './sidebar-settings-panel.js'
import { SettingsSection, settingsSections, settingsSection } from './sidebar-settings-data.js'
import { resolvePresentation } from './presentation.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'

export interface SettingsDialogConfig {
  readonly id: string
  readonly open?: boolean
  readonly defaultOpen?: boolean
  readonly defaultSection?: string
}

export interface SettingsDialogViewInputs extends SettingsPanelViewInputs {
  readonly highlight: HoverHighlightViewInputs['animate']
  readonly trigger?: (attributes: ReadonlyArray<ChildAttribute>) => Html
}

const SidebarChild = SidebarBlock

const NavChild = NavMenuBlock

const Model = Schema.Struct({
  id: Schema.String,
  section: Schema.String,
  dialog: DialogBlock.Model,
  sidebar: SidebarBlock.Model,
  nav: NavMenuBlock.Model,
  select: SelectBlock.Model,
  scroll: ScrollAreaBlock.Model,
  navigationScroll: ScrollAreaBlock.Model,
  panel: PanelBlock.Model,
})

const Dialog = DialogBlock

const Select = SelectBlock

const Panel = PanelBlock

const Message = defineMessageUnion({ PanelUnmounted: {} })

const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedOpen: {},
  RequestedClose: {},
  RequestedControlledOpen: { control: DialogControl },
})

const OutMessage = defineMessageUnion({
  OpenChanged: { open: Schema.Boolean },
  SectionChanged: { section: SettingsSection },
})

const Config = Schema.Struct({
  id: Schema.String,
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  defaultSection: Schema.optionalKey(Schema.String),
})

const effects = Block.makeEffectsContract<never, DialogResources | DropdownResources | TooltipDom>()

export const SettingsDialogKey = Symbol('SettingsDialog')

export const SettingsDialogBlock = Block.make('SettingsDialog', {
  key: SettingsDialogKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SettingsDialogViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage.OpenChanged },
    RequestedClose: { outMessage: OutMessage.OpenChanged },
  },
})

const DialogBinding = SettingsDialogBlock.makeRequiredFieldBinding(Dialog, {
  field: 'dialog',
  init: { contextToArgs: (config: SettingsDialogConfig) => [config] },
}).withOutMessagePolicy({
  fold: SettingsDialogBlock.makeOutMessageFold(Dialog, {
    CompletedClose: SettingsDialogBlock.makeNoopStep,
    OpenChanged: ({ open }) =>
      SettingsDialogBlock.makeOutMessageStep(() => OutMessage.OpenChanged({ open })),
  }),
})

const Sidebar = SettingsDialogBlock.makeRequiredFieldBinding(SidebarChild, {
  field: 'sidebar',
  init: {
    contextToArgs: (config: SettingsDialogConfig) =>
      [
        {
          id: `${config.id}-sidebar`,
          collapsible: 'none',
          persist: false,
          shortcut: null,
          width: '13rem',
          rail: false,
        },
      ] satisfies [SidebarConfig],
  },
}).withOutMessagePolicy({
  fold: SettingsDialogBlock.makeOutMessageFold(SidebarChild, {
    OpenChanged: SettingsDialogBlock.makeNoopStep,
    WidthChanged: SettingsDialogBlock.makeNoopStep,
  }),
})

const panelConfig = {
  field: 'panel',
  init: {
    contextToArgs: (config) => [
      {
        id: `${config.id}-panel`,
        parentDialogId: config.id,
        section: settingsSection(config.defaultSection ?? 'general'),
      },
    ],
  },
} satisfies {
  readonly field: 'panel'
  readonly init: { readonly contextToArgs: (config: SettingsDialogConfig) => [SettingsPanelConfig] }
}

const PanelBinding = SettingsDialogBlock.makeRequiredFieldBinding(Panel, panelConfig)

const NavRaw = SettingsDialogBlock.makeRequiredFieldBinding(NavChild, {
  field: 'nav',
  init: {
    contextToArgs: (config: SettingsDialogConfig) => [
      {
        id: `${config.id}-navigation`,
        items,
        activeSlug: config.defaultSection ?? 'general',
        ariaLabel: 'Settings sections',
      },
    ],
  },
})

const SelectRaw = SettingsDialogBlock.makeRequiredFieldBinding(Select, {
  field: 'select',
  init: {
    contextToArgs: (config: SettingsDialogConfig) => [
      {
        id: `${config.id}-section`,
        rootId: config.id,
        parentId: config.id,
        items: choices,
        value: config.defaultSection ?? 'general',
      },
    ],
  },
})

const sectionSteps = (section: SettingsSection, reset: boolean) =>
  Update.combineSteps([
    SettingsDialogBlock.makeFieldsStep(() => ({ section: () => section })),
    NavRaw.requestConfigure({ items, activeSlug: section }),
    SelectRaw.requestConfigure({ items: choices, value: section }),

    ...(reset ? [PanelBinding.requestReset({ section })] : []),
  ])

const selectSection = ({ value }: { readonly value: string }) =>
  SettingsDialogBlock.makeStep(() => (model: Parameters<ReturnType<typeof sectionSteps>>[0]) => {
    if (!Schema.is(SettingsSection)(value) || model.section === value) {
      return SettingsDialogBlock.makeNoopStep()(model)
    }

    return Update.withOutMessage(
      sectionSteps(value, settingsSection(model.section) !== value)(model),
      OutMessage.SectionChanged({ section: value }),
    )
  })

const Nav = NavRaw.withOutMessagePolicy({
  fold: SettingsDialogBlock.makeOutMessageFold(NavChild, { Selected: selectSection }),
})

const SectionSelect = SelectRaw.withOutMessagePolicy({
  fold: SettingsDialogBlock.makeOutMessageFold(Select, {
    Selected: selectSection,
    OpenChanged: SettingsDialogBlock.makeNoopStep,
  }),
})

const Scroll = SettingsDialogBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: (config: SettingsDialogConfig) => [{ id: `${config.id}-scroll` }] },
}).withOutMessagePolicy({
  fold: SettingsDialogBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: SettingsDialogBlock.makeNoopStep,
  }),
})

const NavigationScroll = SettingsDialogBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'navigationScroll',
  init: {
    contextToArgs: (config: SettingsDialogConfig) => [{ id: `${config.id}-navigation-scroll` }],
  },
}).withOutMessagePolicy({
  fold: SettingsDialogBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: SettingsDialogBlock.makeNoopStep,
  }),
})

const SettingsDialogComposition = SettingsDialogBlock.makeComposition({
  bindings: [DialogBinding, Sidebar, PanelBinding, Nav, SectionSelect, Scroll, NavigationScroll],
})

const init = SettingsDialogComposition.makeInit((config: SettingsDialogConfig) => ({
  childInitContext: config,
  model: { id: config.id, section: config.defaultSection ?? 'general' },
}))

const update = SettingsDialogComposition.makeUpdate({
  PanelUnmounted: SettingsDialogBlock.makeStep(
    () => (model: Parameters<ReturnType<typeof PanelBinding.requestReset>>[0]) =>
      PanelBinding.requestReset({ section: settingsSection(model.section) })(model),
  ),
})

const inMessageUpdate = SettingsDialogComposition.makeInMessageUpdate({
  RequestedHoverMode: SettingsDialogBlock.makeStep.fromMessage(({ mode }) =>
    Update.combineSteps([NavRaw.requestHoverMode({ mode }), SelectRaw.requestHoverMode({ mode })]),
  ),
  RequestedOpen: DialogBinding.requestOpen(),
  RequestedClose: DialogBinding.requestClose(),
  RequestedControlledOpen: SettingsDialogBlock.makeStep.fromMessage(({ control }) =>
    DialogBinding.requestControlledOpen({ control }),
  ),
})

const view = SettingsDialogComposition.makeView.withInputs<SettingsDialogViewInputs>(
  (model, inputs, h) => {
    const { icons, shape, size, surface } = resolvePresentation(inputs)
    const current = settingsSections.find(({ id }) => id === model.section) ?? settingsSections[0]

    return h.block(
      DialogBinding.embedView({
        slotId: 'dialog',
        model: model.dialog,
        viewInputs: {
          ...inputs,
          presentation: { shape: shape.variant, size: size.variant, surface },
          size: 'xl',
          contentClassName: 'flex h-[min(640px,calc(100dvh-4rem))] overflow-hidden p-0',
          content: ({ titleId, descriptionId, presentation }) => {
            const scoped = {
              animate: inputs.animate,
              switchAnimate: inputs.switchAnimate,
              highlight: inputs.highlight,
              ...presentation,
            }

            return [
              h.div(
                [
                  ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Message.PanelUnmounted())]),
                  h.Class('flex h-full min-h-0 w-full'),
                ],
                [
                  h.block(
                    Sidebar.embedView({
                      slotId: 'sidebar',
                      model: model.sidebar,
                      viewInputs: {
                        ...scoped,
                        className: 'h-full min-h-0',
                        insetClassName: 'bg-transparent',
                        sidebarClassName: 'hidden sm:flex',
                        panelClassName: 'bg-[rgb(var(--overlay)/0.03)]',
                        mobileContent: () => [],
                        content: (_info, context) => [
                          SidebarHeader(
                            {
                              className: 'px-4 pt-5 pb-2',
                              children: [
                                h.h2(
                                  [
                                    h.Class(
                                      'text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)] text-foreground',
                                    ),
                                    h.Id(titleId),
                                    h.Style({ fontVariationSettings: fontWeights.normal }),
                                  ],
                                  ['Settings'],
                                ),
                                h.p(
                                  [h.Id(descriptionId), h.Class('sr-only')],
                                  ['Workspace and account settings.'],
                                ),
                              ],
                            },
                            h,
                          ),
                          SidebarContent(
                            {
                              context,
                              occurrence: 'desktop',
                              scroll: (viewInputs) =>
                                h.block(
                                  NavigationScroll.embedView({
                                    slotId: 'navigation-scroll',
                                    model: model.navigationScroll,
                                    viewInputs,
                                  }),
                                ),
                              contentClassName: 'p-2',
                              content: () => [
                                h.div(
                                  [
                                    h.Class(
                                      'flex h-8 items-center px-2 text-xs text-muted-foreground',
                                    ),
                                  ],
                                  ['Workspace'],
                                ),
                                h.block(
                                  Nav.embedView({
                                    slotId: 'nav',
                                    model: model.nav,
                                    viewInputs: {
                                      ...scoped,
                                      context,
                                      sidebar: true,
                                      kind: 'button',
                                      focusRing: false,
                                      icon: (item, active) => {
                                        const section =
                                          settingsSections.find(({ id }) => id === item.value) ??
                                          settingsSections[0]

                                        return icons[section.icon](
                                          {
                                            size: size.icon,
                                            strokeWidth: active ? 2 : 1.5,
                                            className: active
                                              ? 'text-foreground'
                                              : 'text-muted-foreground',
                                          },
                                          h,
                                        )
                                      },
                                    },
                                  }),
                                ),
                              ],
                            },
                            h,
                          ),
                        ],
                        inset: () => [
                          h.div(
                            [h.Class('flex shrink-0 flex-col gap-1 px-6 pt-5 pb-4 pr-12')],
                            [
                              h.div(
                                [h.Class('sm:hidden')],
                                [
                                  h.h2(
                                    [
                                      h.Class(
                                        'mb-3 text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)] text-foreground',
                                      ),
                                      h.Style({ fontVariationSettings: fontWeights.normal }),
                                    ],
                                    ['Settings'],
                                  ),
                                  h.block(
                                    SectionSelect.embedView({
                                      slotId: 'select',
                                      model: model.select,
                                      viewInputs: {
                                        ...scoped,
                                        ariaLabel: 'Section',
                                        placeholder: 'Section',
                                        itemIconFor: (item) =>
                                          icons[
                                            (
                                              settingsSections.find(
                                                ({ id }) => id === item.value,
                                              ) ?? settingsSections[0]
                                            ).icon
                                          ],
                                      },
                                    }),
                                  ),
                                ],
                              ),
                              h.h3(
                                [
                                  h.Class(
                                    'hidden text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)] text-foreground sm:block',
                                  ),
                                  h.Style({ fontVariationSettings: fontWeights.normal }),
                                ],
                                [current.label],
                              ),
                              h.p(
                                [
                                  h.Class(
                                    'hidden text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-muted-foreground sm:block',
                                  ),
                                ],
                                [current.description],
                              ),
                            ],
                          ),
                          h.block(
                            Scroll.embedView({
                              slotId: 'scroll',
                              model: model.scroll,
                              viewInputs: {
                                ...scoped,
                                className: 'min-h-0 flex-1',
                                children: [],
                                content: () => [
                                  h.div(
                                    [h.Class('flex flex-col gap-6 px-6 pb-6')],
                                    [
                                      h.block(
                                        PanelBinding.embedView({
                                          slotId: 'panel',
                                          model: model.panel,
                                          viewInputs: scoped,
                                        }),
                                      ),
                                    ],
                                  ),
                                ],
                              },
                            }),
                          ),
                        ],
                      },
                    }),
                  ),
                ],
              ),
            ]
          },
        },
      }),
    )
  },
)

export const SettingsDialogLayer = SettingsDialogBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      OwningDialogLayer,
      sidebarLayer,
      navMenuLayer,
      SelectLayer,
      ScrollLayer,
      PanelLayer,
    ),
  ),
)

export const hoverModeOf = (model: typeof SettingsDialogBlock.Model.Type) =>
  navHoverModeOf(model.nav)
