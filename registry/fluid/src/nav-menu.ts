// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { Layer, Schema, Option, Data } from 'effect'
import { Block, Update } from 'foldkit'
import * as Nav from '@foldkit/ui/nav'
import type { Attribute } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as hoverLayer } from './hover.js'
import type { HoverConfig } from './hover.js'
import { HoverHighlightBlock, layer as highlightLayer } from './hover-highlight.js'
import { spring } from './lib/springs.js'
import { resolvePresentation } from './presentation.js'
import { EXIT_COMPLETE_EVENT } from './motion.js'
import { NavIndicator, synchronizeNavIndicators } from './nav-menu-indicators.js'
import { navMenuRows } from './nav-menu-content.js'
import type { NavMenuViewInputs } from './nav-menu-content.js'

import { NavItemConfig } from './nav-menu-state.js'
import type { NavMenuConfig } from './nav-menu-state.js'
import { observeNavMenu } from './nav-menu-observer.js'

export type { NavMenuViewInputs, NavMenuContent } from './nav-menu-content.js'

const Model = Schema.Struct({
  id: Schema.String,
  items: Schema.Array(NavItemConfig),
  activeSlug: Schema.OptionFromNullOr(Schema.String),
  ariaLabel: Schema.String,
  focused: Schema.OptionFromNullOr(Schema.Finite),
  keyboard: Schema.Boolean,
  indicators: Schema.Array(NavIndicator),
  indicatorGeneration: Schema.Natural,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

const Message = defineMessageUnion({
  Focused: { index: Schema.NullOr(Schema.Finite), keyboard: Schema.Boolean },
  Selected: { value: Schema.String, href: Schema.String },
  PopupChanged: { open: Schema.Boolean },
  CompletedIndicator: { key: Schema.String, generation: Schema.Natural },
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const OutMessage = defineMessageUnion({ Selected: { value: Schema.String, href: Schema.String } })

const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedConfigure: {
    items: Schema.Array(NavItemConfig),
    activeSlug: Schema.NullOr(Schema.String),
  },
})

const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  items: Schema.Array(NavItemConfig),
  activeSlug: Schema.optionalKey(Schema.NullOr(Schema.String)),
  ariaLabel: Schema.optionalKey(Schema.String),
})

const effects = Block.makeEffectsContract()

export const NavMenuKey = Symbol('FluidNavMenu')

export const NavMenuBlock = Block.make('NavMenu', {
  key: NavMenuKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<NavMenuViewInputs>() },
  effects,
})

const SynchronizeIndicators = NavMenuBlock.makeFieldsStep((model) => {
  const next = synchronizeNavIndicators({
    ...model,
    activeSlug: Option.getOrNull(model.activeSlug),
    focused: Option.getOrNull(model.focused),
  })

  return { indicators: () => next.indicators, indicatorGeneration: () => next.indicatorGeneration }
})

const Highlight = NavMenuBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: NavMenuConfig) => [
      {
        id: `${config.id}-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const HoverRequests = NavMenuBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: NavMenuConfig): [HoverConfig] => [
      {
        id: `${config.id}-hover`,
        axis: 'y',
        gapClick: false,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Hover = HoverRequests.withOutMessagePolicy({
  fold: NavMenuBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      NavMenuBlock.makeStep((model) => {
        const unavailable =
          snapshot.activeIndex !== null &&
          snapshot.rowLayout !== undefined &&
          !snapshot.rowLayout.some(
            (row) => row.index === snapshot.activeIndex && row.visible && !row.disabled,
          )

        const targetKey = snapshot.rowLayout?.find(
          (row) => row.index === snapshot.activeIndex,
        )?.rowKey

        const source = {
          snapshot: { ...snapshot, activeIndex: unavailable ? null : snapshot.activeIndex },
          hidden: false,
          mode: model.hover.mode,
        }

        return Update.combineSteps([
          unavailable ? HoverRequests.requestClear() : NavMenuBlock.makeNoopStep(),
          Highlight.informOfSource(targetKey === undefined ? source : { ...source, targetKey }),
          SynchronizeIndicators,
        ])
      }),
  }),
})

const Observe = NavMenuBlock.makeMountStream('NavKeyboard', {
  messages: [Message.Focused, Message.PopupChanged],
  *handler() {
    return ({ element, viewStateChanges }) =>
      observeNavMenu<typeof Message.Focused.Type | typeof Message.PopupChanged.Type>(
        element,
        viewStateChanges,
        (index, keyboard) => Message.Focused({ index, keyboard }),
        (open) => Message.PopupChanged({ open }),
      )
  },
})

const NavMenuComposition = NavMenuBlock.makeComposition({
  bindings: [Hover, Highlight],
  mounts: [Observe],
})

const init = NavMenuComposition.makeInit((config: NavMenuConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    items: config.items,
    activeSlug: Option.fromNullishOr(config.activeSlug),
    ariaLabel: config.ariaLabel ?? 'Navigation',
    focused: Option.none(),
    keyboard: false,
    indicators: [],
    indicatorGeneration: 0,
  },
}))

const update = NavMenuComposition.makeUpdate({
  PopupChanged: NavMenuBlock.makeStep.fromMessage(({ open }: typeof Message.PopupChanged.Type) =>
    Hover.requestPointerHandlers({ enabled: !open }),
  ),
  Focused: NavMenuBlock.makeStep.fromMessage(({ index, keyboard }: typeof Message.Focused.Type) =>
    Update.combineSteps([
      NavMenuBlock.makeFieldsStep(() => ({
        focused: () => Option.fromNullOr(index),
        keyboard: () => keyboard,
      })),
      SynchronizeIndicators,
    ]),
  ),
  CompletedIndicator: (model, { key, generation }) => ({
    model: modifyFields(model, {
      indicators: (currentIndicators) =>
        currentIndicators.filter(
          (slot) => slot.key !== key || slot.generation !== generation || slot.phase !== 'Exiting',
        ),
    }),
  }),
  Selected: (model, { value, href }) =>
    Update.withOutMessage({ model }, OutMessage.Selected({ value, href })),
})

const inMessageUpdate = NavMenuComposition.makeInMessageUpdate({
  RequestedHoverMode: NavMenuBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: false, maxDistance: Infinity },
      }),
  ),
  RequestedConfigure: NavMenuBlock.makeStep.fromMessage(
    ({ items, activeSlug }: typeof InMessage.RequestedConfigure.Type) =>
      Update.combineSteps([
        NavMenuBlock.makeFieldsStep(() => ({
          items: () => items,
          activeSlug: () => Option.fromNullOr(activeSlug),
        })),
        Hover.requestRemeasure(),
        SynchronizeIndicators,
      ]),
  ),
})

const view = NavMenuComposition.makeView.withInputs<NavMenuViewInputs>((model, inputs, h) => {
  const { shape, reducedMotion } = resolvePresentation(inputs)
  const activeSlug = Option.getOrNull(model.activeSlug)

  return h.div(
    [
      h.OnMount(Observe()),
      h.DataAttribute('nav-root', ''),
      ...(inputs.sidebar === true ? [h.DataAttribute('sidebar-menu', '')] : []),
      h.Class(inputs.className ?? ''),
    ],
    [
      h.block(
        Hover.embedView({
          slotId: 'hover',
          model: model.hover,
          viewInputs: {
            className: 'relative flex flex-col w-full select-none',
            content: (snapshot) => [
              Nav.view({
                items: model.items.map((item) => item.value),
                ariaLabel: model.ariaLabel,
                toHref: (_value, index) => model.items[index]?.href ?? '#',
                isItemCurrent: (_value, index) =>
                  model.items[index]?.href === activeSlug ||
                  model.items[index]?.status === 'active',
                toView: ({ nav, items }) => {
                  const indicator = (slot: typeof NavIndicator.Type) => {
                    const focus = slot.kind === 'focus'

                    const rect = focus
                      ? {
                          left: slot.rect.left - 2,
                          top: slot.rect.top - 2,
                          width: slot.rect.width + 4,
                          height: slot.rect.height + 4,
                        }
                      : slot.rect

                    const completion = Events.OnCustomEvent({
                      name: EXIT_COMPLETE_EVENT,
                      f: () =>
                        Option.some(
                          Message.CompletedIndicator({
                            key: slot.key,
                            generation: slot.generation,
                          }),
                        ),
                    })

                    return inputs.animate(
                      h.keyed('div')(slot.key, [
                        h.AriaHidden(true),
                        completion,
                        h.Class(
                          focus
                            ? `absolute ${shape.focusRing} pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]`
                            : `absolute ${shape.bg} bg-active pointer-events-none`,
                        ),
                      ]),
                      {
                        initial: false,
                        animate: { ...rect, opacity: 1 },
                        transition: slot.rowChanged
                          ? {
                              ...(focus ? spring.fast : spring.moderate),
                              opacity: { duration: 0.08 },
                            }
                          : { duration: 0 },
                        exit: {
                          opacity: 0,
                          transition: focus ? spring.fast.exit : spring.moderate.exit,
                        },
                        present: slot.phase === 'Present',
                        reducedMotion,
                      },
                    )
                  }

                  return h.nav(nav, [
                    ...model.indicators.filter((slot) => slot.kind === 'route').map(indicator),
                    h.block(
                      Highlight.embedView({
                        slotId: 'highlight',
                        model: model.highlight,
                        viewInputs: {
                          animate: inputs.highlight,
                          className: shape.bg,
                          mode: model.hover.mode,
                        },
                      }),
                    ),
                    ...(inputs.focusRing === false
                      ? []
                      : model.indicators.filter((slot) => slot.kind === 'focus').map(indicator)),
                    ...navMenuRows(
                      {
                        items: model.items,
                        nativeItems: items,
                        inputs,
                        snapshot,
                        layout: model.hover.rowLayout,
                        selected: (item) =>
                          Message.Selected({ value: item.value, href: item.href }),
                      },
                      h,
                    ),
                  ])
                },
              }),
            ],
          },
        }),
      ),
    ],
  )
})

export const navMenuLayer = NavMenuBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Observe.layer,
}).pipe(Layer.provide(Layer.mergeAll(hoverLayer, highlightLayer)))

export { NavItem } from './nav-item.js'

export { NavItemConfig } from './nav-menu-state.js'

export type { NavMenuConfig } from './nav-menu-state.js'

export { hoverHighlightAnimation } from './hover-highlight.js'

export const test = { Hover }

export const hoverModeOf = (model: typeof NavMenuBlock.Model.Type) => model.hover.mode

export type {
  SidebarActionRun,
  SidebarMenuActionRun,
  SidebarMenuActionContext,
} from './sidebar-actions.js'
