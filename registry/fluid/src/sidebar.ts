/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Layer, Option } from 'effect'
import { Update } from 'foldkit'
import { DialogLayer, isDialogOpen } from './dialog.js'
import { layer as TooltipsLayer } from './tooltip-native-public.js'
import { reconcileRailTooltips } from './sidebar/rail.js'
import { layer as presenceLayer } from './presence.js'
import { sidebarOptions, SIDEBAR_WIDTH } from './sidebar-state.js'
import type { SidebarConfig } from './sidebar-state.js'
import { sidebarOpenMotion } from './sidebar-motion-state.js'
import type { Message, InMessage } from './sidebar/definition.js'
import { SidebarBlock, OutMessage } from './sidebar/definition.js'
import {
  SidebarComposition,
  Mobile,
  SynchronizePeek,
  Observe,
  RailTooltips,
} from './sidebar/composition.js'
import { sidebarView } from './sidebar/view.js'

export { SidebarBlock, SidebarKey } from './sidebar/definition.js'

export type {
  SidebarRenderInfo,
  SidebarDesktopRenderInfo,
  SidebarMobileRenderInfo,
  SidebarViewInputs,
} from './sidebar/definition.js'

const requestOpen = (open: boolean) =>
  SidebarBlock.makeStep((model) => {
    if (model.mobile) {
      return open ? Mobile.requestOpen() : Mobile.requestClose()
    }

    const motion = sidebarOpenMotion(model, model.controlled ? model.open : open, model.resizing)

    return SidebarBlock.makeStep(
      () => (registered: Parameters<typeof SynchronizePeek>[0]) =>
        Update.withOutMessage(
          SynchronizePeek(
            modifyFields(registered, {
              pinHold: () => motion.pinHold,
              pinGeneration: () => motion.pinGeneration,
              dragFlip: () => motion.dragFlip,
              dragGeneration: () => motion.dragGeneration,
              open: (currentOpen) => (model.controlled ? currentOpen : open),
              peeking: (peeking) => (model.controlled ? peeking : false),
              persisted: () => Option.some(open),
            }),
          ),
          OutMessage.OpenChanged({ open, mobile: false }),
        ),
    )
  })

const init = SidebarComposition.makeInit((config: SidebarConfig) => ({
  childInitContext: config,
  model: {
    options: sidebarOptions(config),
    railTooltipOpen: Option.fromUndefinedOr(config.railTooltipOpen),
    open: config.open ?? config.defaultOpen ?? true,
    controlled: config.open !== undefined,
    mobile: false,
    mounted: false,
    width: config.width ?? SIDEBAR_WIDTH,
    peeking: false,
    resizing: false,
    persisted: Option.none(),
    pinHold: false,
    pinGeneration: 0,
    dragFlip: 0,
    dragGeneration: 0,
  },
  steps: [
    RailTooltips.requestAdd({
      key: `${config.id}-rail`,
      options: {
        side: config.side === 'right' ? 'left' : 'right',
        sideOffset: 8,
        followCursor: 'y',
        forceOpen: config.railTooltipOpen,
      },
    }),
  ],
}))

const update = SidebarComposition.makeUpdate.compose(
  SidebarComposition.makeUpdate({
    Toggled: SidebarBlock.makeStep((model) =>
      requestOpen(!(model.mobile ? isDialogOpen(model.dialog) : model.open)),
    ),
    ObservedMobile: (model, { mobile }) =>
      SynchronizePeek(
        modifyFields(model, { mobile: () => mobile, mounted: () => true, peeking: () => false }),
      ),
    ClosedForDesktop: Mobile.requestClose(),
    CompletedPin: (model, { generation }) => ({
      model:
        generation === model.pinGeneration ? modifyFields(model, { pinHold: () => false }) : model,
    }),
    CompletedDragFlip: (model, { generation }) => ({
      model: generation === model.dragFlip ? modifyFields(model, { dragFlip: () => 0 }) : model,
    }),
    ChangedPeek: (model, { open }) =>
      SynchronizePeek(
        modifyFields(model, {
          peeking: () => !model.open && !model.resizing && model.options.peek !== 'none' && open,
        }),
      ),
    Resized: SidebarBlock.makeStep.fromMessage(
      ({ width, open, resizing }: typeof Message.Resized.Type) =>
        SidebarBlock.makeStep((model) => {
          const nextOpen = model.controlled ? model.open : open
          const motion = sidebarOpenMotion(model, nextOpen, resizing)

          return SidebarBlock.makeStep(
            () => (registered: Parameters<typeof SynchronizePeek>[0]) =>
              Update.withOutMessage(
                SynchronizePeek(
                  modifyFields(registered, {
                    pinHold: () => motion.pinHold,
                    pinGeneration: () => motion.pinGeneration,
                    dragFlip: () => motion.dragFlip,
                    dragGeneration: () => motion.dragGeneration,
                    width: () => `${width}px`,
                    resizing: () => resizing,
                    peeking: (peeking) => (nextOpen ? false : peeking),
                    open: () => nextOpen,
                    persisted: (persisted) => (open === model.open ? persisted : Option.some(open)),
                  }),
                ),
                open === model.open
                  ? OutMessage.WidthChanged({ width: `${width}px` })
                  : OutMessage.OpenChanged({ open, mobile: false }),
              ),
          )
        }),
    ),
  }),
  SidebarComposition.makeUpdate.each((_model, _message, { before }) =>
    reconcileRailTooltips(before),
  ),
)

const inMessageUpdate = SidebarComposition.makeInMessageUpdate.compose(
  SidebarComposition.makeInMessageUpdate({
    RequestedRailTooltipOpen: SidebarBlock.makeFieldsStep.fromMessage(({ open }) => ({
      railTooltipOpen: () => Option.fromNullishOr(open),
    })),
    RequestedPresentation: (model, { side, variant }) => ({
      model: modifyFields(model, {
        options: (currentOptions) =>
          modifyFields(currentOptions, { side: () => side, variant: () => variant }),
      }),
    }),
    RequestedBehavior: (model, { peek, collapsible, rail }) =>
      SynchronizePeek(
        modifyFields(model, {
          options: (options) =>
            modifyFields(options, {
              peek: () => peek,
              collapsible: () => collapsible,
              rail: () => rail,
            }),
          peeking: (peeking) => (peek === 'none' || collapsible === 'none' ? false : peeking),
        }),
      ),
    RequestedToggle: SidebarBlock.makeStep((model) =>
      requestOpen(!(model.mobile ? isDialogOpen(model.dialog) : model.open)),
    ),
    RequestedOpen: SidebarBlock.makeStep.fromMessage(
      ({ open }: typeof InMessage.RequestedOpen.Type) => requestOpen(open),
    ),
    RequestedControlledOpen: (model, { open }) => {
      const motion = sidebarOpenMotion(model, open, model.resizing)
      return SynchronizePeek(
        modifyFields(model, {
          pinHold: () => motion.pinHold,
          pinGeneration: () => motion.pinGeneration,
          dragGeneration: () => motion.dragGeneration,
          dragFlip: () => motion.dragFlip,
          open: () => open,
          peeking: (peeking) => (open ? false : peeking),
        }),
      )
    },
    RequestedWidth: (model, { width }) => ({ model: modifyFields(model, { width: () => width }) }),
  }),
  SidebarComposition.makeInMessageUpdate.each((_model, _message, { before }) =>
    reconcileRailTooltips(before),
  ),
)

export const sidebarLayer = SidebarBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view: sidebarView,
  EffectsLayer: Observe.layer,
}).pipe(Layer.provide(Layer.mergeAll(DialogLayer, presenceLayer, TooltipsLayer)))

export {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_COLLAPSE_SLOP,
  SidebarOptions,
  SidebarConfigSchema,
  sidebarOptions,
} from './sidebar-state.js'

export type { SidebarConfig } from './sidebar-state.js'
