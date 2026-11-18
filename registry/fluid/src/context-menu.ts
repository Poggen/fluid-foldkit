/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DropdownMenuBlock, DropdownEvent, menuLayer } from './dropdown.js'
import { Config } from './dropdown-composition.js'
import type { DropdownConfig } from './dropdown-state.js'
import type { DropdownProps } from './dropdown-props.js'
import type { DropdownResources } from './dropdown-resources.js'
import { HoverMode } from './hover.js'
import { observeContextMenu } from './context-menu-observation.js'

export interface ContextMenuProps extends Omit<
  DropdownProps,
  'side' | 'align' | 'openOnHover' | 'triggerPressEvent'
> {
  /** Only matching targets open the menu. Editable controls always retain their native menu. */
  readonly filter?: string
  /** Also open beneath matching buttons on click or keyboard activation. */
  readonly clickTarget?: string
}
export type ContextMenuConfig = DropdownConfig

const Point = Schema.Struct({ x: Schema.Finite, y: Schema.Finite })
const Message = defineMessageUnion({ OpenedAt: Point.fields })
const OutMessage = defineMessageUnion({ Events: { events: Schema.Array(DropdownEvent) } })
const InMessage = defineInMessageUnion({
  RequestedVisibility: { open: Schema.Boolean },
  RequestedDisabled: { disabled: Schema.Boolean },
  RequestedHoverMode: { mode: HoverMode },
})
const ContextMenuNamespace = Block.makeNamespace('ContextMenu')
const Observe = ContextMenuNamespace.makeMountStream('Observe', {
  args: { id: Schema.String },
  messages: [Message.OpenedAt],
  *handler() {
    return (input) => observeContextMenu(input)
  },
})
export const ContextMenuKey = Symbol('ContextMenu')
export const ContextMenuBlock = Block.make(ContextMenuNamespace, {
  key: ContextMenuKey,
  Model: Schema.Struct({ id: Schema.String, point: Point, menu: DropdownMenuBlock.Model }),
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  effects: Block.makeEffectsContract<never, DropdownResources>(),
  inMessageOutputs: { RequestedVisibility: { outMessage: OutMessage.Events } },
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ContextMenuProps>(),
    mounts: [Observe],
  },
})
const RawMenu = ContextMenuBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'menu',
  init: { contextToArgs: (config: DropdownConfig) => [{ ...config, id: `${config.id}-menu` }] },
})
const Menu = RawMenu.withOutMessagePolicy({
  fold: ContextMenuBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      ContextMenuBlock.makeStep((model) =>
        Update.withOutMessage({ model }, OutMessage.Events({ events })),
      ),
  }),
})
const Composition = ContextMenuBlock.makeComposition({ bindings: [Menu], mounts: [Observe] })
const init = Composition.makeInit((config) => ({
  model: { id: config.id, point: { x: 0, y: 0 } },
  childInitContext: config,
}))
const update = Composition.makeUpdate({
  OpenedAt: ContextMenuBlock.makeStep((model, point: typeof Message.OpenedAt.Type) => {
    const open = Menu.requestVisibility({ open: true })
    return (registered: Parameters<typeof open>[0]) =>
      model.menu.controller.disabled
        ? { model: registered }
        : open(modifyFields(registered, { point: () => ({ x: point.x, y: point.y }) }))
  }),
})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedVisibility: ContextMenuBlock.makeStep((_model, { open }: { readonly open: boolean }) =>
    Menu.requestVisibility({ open }),
  ),
  RequestedDisabled: ContextMenuBlock.makeStep(
    (_model, { disabled }: { readonly disabled: boolean }) => Menu.requestDisabled({ disabled }),
  ),
  RequestedHoverMode: ContextMenuBlock.makeStep((_model, { mode }: { readonly mode: HoverMode }) =>
    Menu.requestHoverMode({ mode }),
  ),
})
const view = Composition.makeView.withInputs<ContextMenuProps>((model, inputs, h) => {
  const disabled = model.menu.controller.disabled
  const open = model.menu.controller.phase === 'open'
  return h.div(
    [
      h.Id(model.id),
      h.Class(inputs.className ?? ''),
      h.DataAttribute('context-menu-disabled', String(disabled)),
      h.DataAttribute('context-menu-filter', inputs.filter ?? ''),
      h.DataAttribute('context-menu-click-target', inputs.clickTarget ?? ''),
      h.OnMount(Observe({ id: model.id })),
      ...(inputs.attributes ?? []),
    ],
    [
      inputs.trigger?.(
        childAttributes([
          h.Id(`${model.id}-area`),
          h.DataAttribute('slot', 'context-menu-trigger'),
          ...(open ? [h.DataAttribute('open', '')] : []),
          ...(disabled
            ? []
            : [
                h.AriaHasPopup('menu'),
                h.AriaExpanded(open),
                h.AriaControls(`${model.menu.controller.id}-panel`),
                h.Tabindex(0),
              ]),
        ]).concat(inputs.triggerAttributes ?? []),
        inputs,
      ) ?? h.empty,
      h.block(
        Menu.embedView({
          slotId: model.menu.controller.id,
          model: model.menu,
          viewInputs: {
            ...inputs,
            className: '',
            attributes: [],
            triggerAttributes: [],
            side: 'bottom',
            align: 'start',
            sideOffset: inputs.sideOffset ?? 2,
            trigger: (attributes) =>
              h.button([
                ...attributes,
                h.Tabindex(-1),
                h.AriaHidden(true),
                h.DataAttribute('context-menu-anchor', ''),
                h.Style({
                  position: 'fixed',
                  left: `${model.point.x}px`,
                  top: `${model.point.y}px`,
                  width: '0px',
                  height: '0px',
                  opacity: '0',
                  pointerEvents: 'none',
                }),
              ]),
            contentAttributes: [
              ...(inputs.contentAttributes ?? []),
              ...childAttributes([h.AriaLabelledBy(`${model.id}-area`)]),
            ],
          },
        }),
      ),
    ],
  )
})
export const layer = ContextMenuBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Observe.layer,
}).pipe(Layer.provide(menuLayer))
export const hoverModeOf = (model: typeof ContextMenuBlock.Model.Type) => model.menu.hover.mode
