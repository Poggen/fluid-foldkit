/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { DialogResources } from './dialog-resources.js'
import type { DropdownResources } from './dropdown-resources.js'
import type { TooltipDom } from './tooltip-native-public.js'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SidebarBlock, sidebarLayer } from './sidebar.js'
import type { SidebarRenderInfo } from './sidebar.js'
import { SidebarConfigSchema } from './sidebar-state.js'
import type { SidebarConfig } from './sidebar-state.js'
import { SidebarInsetTopbar } from './sidebar-inset-topbar.js'
import type { PresentationContext } from './presentation.js'
import { resolvePresentation } from './presentation.js'
import { SidebarTrigger, SidebarToggleTooltipContent } from './sidebar-parts.js'
import { DocumentTooltipBlock, layer as TooltipsLayer } from './tooltip-native-public.js'
import type { Presentation } from './presentation.js'
import type { MotionOptions } from './motion.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { SidebarAppPanelBlock, SidebarAppPanelLayer } from './sidebar-app-panel.js'

export interface SidebarAppConfig extends SidebarConfig {
  readonly active?: string
}

export interface SidebarAppViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly highlight: HoverHighlightViewInputs['animate']
  readonly content?: (
    active: string,
    sidebar: SidebarRenderInfo,
    context: PresentationContext,
  ) => ReadonlyArray<Html>
  readonly topbar?: (active: string, context: PresentationContext) => ReadonlyArray<Html>
}

const Model = Schema.Struct({
  sidebar: SidebarBlock.Model,
  tooltips: DocumentTooltipBlock.Model,
  desktop: SidebarAppPanelBlock.Model,
  mobile: SidebarAppPanelBlock.Model,
  active: Schema.String,
})

const Message = Schema.Never

const InMessage = defineInMessageUnion({
  RequestedToggle: {},
  RequestedOpen: { open: Schema.Boolean },
  RequestedControlledOpen: { open: Schema.Boolean },
  RequestedWidth: { width: Schema.String },
  RequestedRailTooltipOpen: { open: Schema.NullOr(Schema.Boolean) },
})

const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
  OpenChanged: { open: Schema.Boolean, mobile: Schema.Boolean },
  WidthChanged: { width: Schema.String },
})

const SidebarOutputs = Schema.Union([OutMessage.OpenChanged, OutMessage.WidthChanged])

const Config = Schema.Struct({
  ...SidebarConfigSchema.fields,
  active: Schema.optionalKey(Schema.String),
})

const effects = Block.makeEffectsContract<never, DialogResources | DropdownResources | TooltipDom>()

export const SidebarAppKey = Symbol('SidebarApp')

export const SidebarAppBlock = Block.make('SidebarApp', {
  key: SidebarAppKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SidebarAppViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedToggle: { outMessage: SidebarOutputs },
    RequestedOpen: { outMessage: SidebarOutputs },
  },
})

const Sidebar = SidebarAppBlock.makeRequiredFieldBinding(SidebarBlock, {
  field: 'sidebar',
  init: {
    contextToArgs: (config: SidebarAppConfig) =>
      [{ ...config, variant: config.variant ?? 'inset', peek: config.peek ?? 'hover' }] satisfies [
        SidebarConfig,
      ],
  },
}).withOutMessagePolicy({
  fold: SidebarAppBlock.makeOutMessageFold(SidebarBlock, {
    OpenChanged: ({ open, mobile }) =>
      SidebarAppBlock.makeOutMessageStep(() => OutMessage.OpenChanged({ open, mobile })),
    WidthChanged: ({ width }) =>
      SidebarAppBlock.makeOutMessageStep(() => OutMessage.WidthChanged({ width })),
  }),
})

const DesktopRaw = SidebarAppBlock.makeRequiredFieldBinding(SidebarAppPanelBlock, {
  field: 'desktop',
  init: {
    contextToArgs: (config: SidebarAppConfig) => [
      {
        id: `${config.id}-desktop`,
        occurrence: 'desktop' as const,
        active: config.active ?? 'Home',
      },
    ],
  },
})

const MobileRaw = SidebarAppBlock.makeRequiredFieldBinding(SidebarAppPanelBlock, {
  field: 'mobile',
  init: {
    contextToArgs: (config: SidebarAppConfig) => [
      {
        id: `${config.id}-mobile-panel`,
        occurrence: 'mobile' as const,
        active: config.active ?? 'Home',
      },
    ],
  },
})

const selected = ({ value }: { readonly value: string }) => {
  const steps = Update.combineSteps([
    SidebarAppBlock.makeFieldsStep(() => ({ active: () => value })),
    DesktopRaw.requestActive({ value }),
    MobileRaw.requestActive({ value }),
  ])

  return SidebarAppBlock.makeStep(
    () => (model: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(steps(model), OutMessage.Selected({ value })),
  )
}

const Desktop = DesktopRaw.withOutMessagePolicy({
  fold: SidebarAppBlock.makeOutMessageFold(SidebarAppPanelBlock, { Selected: selected }),
})

const Mobile = MobileRaw.withOutMessagePolicy({
  fold: SidebarAppBlock.makeOutMessageFold(SidebarAppPanelBlock, { Selected: selected }),
})

const Tooltips = SidebarAppBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: SidebarAppBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: SidebarAppBlock.makeNoopStep,
  }),
})

const SidebarAppComposition = SidebarAppBlock.makeComposition({
  bindings: [Sidebar, Desktop, Mobile, Tooltips],
})

const init = SidebarAppComposition.makeInit((config: SidebarAppConfig) => ({
  childInitContext: config,
  model: { active: config.active ?? 'Home' },
  steps: [Tooltips.requestAdd({ key: `${config.id}-inset-trigger`, options: { side: 'bottom' } })],
}))

const update = SidebarAppComposition.makeUpdate({})

const inMessageUpdate = SidebarAppComposition.makeInMessageUpdate({
  RequestedToggle: Sidebar.requestToggle(),
  RequestedRailTooltipOpen: SidebarAppBlock.makeStep.fromMessage(({ open }) =>
    Sidebar.requestRailTooltipOpen({ open }),
  ),
  RequestedOpen: SidebarAppBlock.makeStep.fromMessage(({ open }) => Sidebar.requestOpen({ open })),
  RequestedControlledOpen: SidebarAppBlock.makeStep.fromMessage(({ open }) =>
    Sidebar.requestControlledOpen({ open }),
  ),
  RequestedWidth: SidebarAppBlock.makeStep.fromMessage(({ width }) =>
    Sidebar.requestWidth({ width }),
  ),
})

const panelInputs = (
  inputs: SidebarAppViewInputs,
  sidebar: SidebarRenderInfo,
  context: PresentationContext,
) => ({
  context,
  animate: inputs.animate,
  highlight: inputs.highlight,
  sidebar,
})

const view = SidebarAppComposition.makeView.withInputs<SidebarAppViewInputs>((model, inputs, h) =>
  h.block(
    Sidebar.embedView({
      slotId: 'sidebar',
      model: model.sidebar,
      viewInputs: {
        ...inputs,
        title: 'Sidebar',
        content: (info, context) => [
          h.block(
            Desktop.embedView({
              slotId: 'desktop',
              model: model.desktop,
              viewInputs: panelInputs(inputs, info, context),
            }),
          ),
        ],
        mobileContent: (info, context) => [
          h.block(
            Mobile.embedView({
              slotId: 'mobile',
              model: model.mobile,
              viewInputs: panelInputs(inputs, info, context),
            }),
          ),
        ],
        inset: (info, context) => [
          h.block(
            Tooltips.embedView({
              slotId: 'inset-tooltip',
              model: model.tooltips,
              viewInputs: {
                renderTrigger: (_key, { button }) =>
                  SidebarTrigger(
                    {
                      context,
                      button,
                      attributes: info.trigger,
                      side: info.side,
                      className: `transition-opacity delay-200 duration-160 ${info.peeking ? 'opacity-0' : 'opacity-100'}`,
                    },
                    h,
                  ),
                render: ({ tooltip }) =>
                  tooltip(`${info.ownerId}-inset-trigger`, {
                    animate: inputs.animate,
                    shapeClass: resolvePresentation({ context }).shape.item,
                    reducedMotion: resolvePresentation({ context }).reducedMotion,
                  }),
                renderContent: () => SidebarToggleTooltipContent(info.open, info.shortcutKey, h),
                renderDocument: (content, popups) =>
                  SidebarInsetTopbar(
                    {
                      trigger: content,
                      children: [...(inputs.topbar?.(model.active, context) ?? []), ...popups],
                    },
                    h,
                  ),
              },
            }),
          ),
          ...(inputs.content?.(model.active, info, context) ?? [
            h.div([h.Class('flex flex-1 flex-col gap-4 p-4')]),
          ]),
        ],
      },
    }),
  ),
)

export const SidebarAppLayer = SidebarAppBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(sidebarLayer, SidebarAppPanelLayer, TooltipsLayer)))
