import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import type { DropdownResources } from './dropdown-resources.js'
import { Schema, Option } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DropdownMenuBlock } from './dropdown.js'
import type { DropdownConfig } from './dropdown-state.js'
import type { DropdownDeclared } from './dropdown-composition.js'
import type { DropdownItemContext } from './dropdown-item.js'
import { HoverBlock, hoverItemAttributes } from './hover.js'
import type { HoverConfig } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { SIDEBAR_MENU_POPUP } from './lib/sidebar-menu-grid.js'
import { cn } from './lib/utils.js'
import { SidebarMenuItem } from './sidebar-parts.js'

export interface SidebarIdentityConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly name: string
  readonly checkedIndex?: number
}

export interface SidebarIdentityPinInputs {
  readonly attributes: ReadonlyArray<ChildAttribute>
  readonly className: string
  readonly compact: true
}

export interface SidebarIdentityViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly highlight: HoverHighlightViewInputs['animate']
  readonly menu?: (context: DropdownItemContext) => ReadonlyArray<Html>
  readonly mark?: () => Html
  readonly renderName?: (name: string) => Html
  readonly pin?: (inputs: SidebarIdentityPinInputs) => Html
  readonly peeking?: boolean
  readonly className?: string
}

const Model = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  menu: DropdownMenuBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

export const SidebarIdentityNamespace = Block.makeNamespace('SidebarIdentity')

const Message = Schema.Never

const OutMessage = defineMessageUnion({ Events: DropdownMenuBlock.OutMessage.Events.fields })

const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedConfigure: { name: Schema.String, checkedIndex: Schema.optionalKey(Schema.Finite) },
})

const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  name: Schema.String,
  checkedIndex: Schema.optionalKey(Schema.Finite),
})

const effects = Block.makeEffectsContract<never, DropdownResources>()

const contract = {
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SidebarIdentityViewInputs>() },
  effects,
} satisfies Omit<Block.ContractConfiguration, 'key'> & {
  readonly Model: typeof Model
  readonly Message: typeof Message
  readonly OutMessage: typeof OutMessage
}

export type SidebarIdentityDeclared<Key extends symbol> = ReturnType<
  typeof Block.make<'SidebarIdentity', Key, typeof contract>
>

export function sidebarIdentityRecipe(kind: 'workspace' | 'user') {
  const plans = <const Key extends symbol, const MenuKey extends symbol>(
    Owner: SidebarIdentityDeclared<Key>,
    Dropdown: DropdownDeclared<MenuKey>,
  ) => {
    const Menu = Owner.makeRequiredFieldBinding(Dropdown, {
      field: 'menu',
      init: {
        contextToArgs: (config: SidebarIdentityConfig): [DropdownConfig] => [
          config.checkedIndex === undefined
            ? {
                id: `${config.id}-menu`,
                ...(config.hoverMode === undefined ? {} : { hoverMode: config.hoverMode }),
              }
            : {
                id: `${config.id}-menu`,
                checkedIndex: config.checkedIndex,
                ...(config.hoverMode === undefined ? {} : { hoverMode: config.hoverMode }),
              },
        ],
      },
    }).withOutMessagePolicy({
      fold: Owner.makeOutMessageFold(Dropdown, {
        Events: ({ events }) => Owner.makeOutMessageStep(() => OutMessage.Events({ events })),
      }),
    })

    const Highlight = Owner.makeRequiredFieldBinding(HoverHighlightBlock, {
      field: 'highlight',
      init: {
        contextToArgs: (config: SidebarIdentityConfig) => [
          {
            id: `${config.id}-highlight`,
            ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
          },
        ],
      },
    })

    const Hover = Owner.makeRequiredFieldBinding(HoverBlock, {
      field: 'hover',
      init: {
        contextToArgs: (config: SidebarIdentityConfig): [HoverConfig] => [
          {
            id: `${config.id}-hover`,
            axis: 'y',
            gapClick: false,
            ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
          },
        ],
      },
    }).withOutMessagePolicy({
      fold: Owner.makeOutMessageFold(HoverBlock, {
        Changed: (snapshot) =>
          Owner.makeStep((model) =>
            Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
          ),
      }),
    })

    const Composition = Owner.makeComposition({ bindings: [Menu, Hover, Highlight] })

    const init = Composition.makeInit((config: SidebarIdentityConfig) => ({
      childInitContext: config,
      model: { id: config.id, name: config.name },
    }))

    const inMessageUpdate = Composition.makeInMessageUpdate({
      RequestedHoverMode: Owner.makeStep.fromMessage(
        ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
          Update.combineSteps([
            Hover.requestConfigure({
              options: { mode, axis: 'y', nearest: false, gapClick: false, maxDistance: Infinity },
            }),
            Menu.requestHoverMode({ mode }),
          ]),
      ),
      RequestedConfigure: (model, { name, checkedIndex }) =>
        Menu.requestSelection({
          selection: {
            checkedIndex: Option.fromUndefinedOr(checkedIndex),
            checkedIndices: Option.none(),
          },
        })(modifyFields(model, { name: () => name })),
    })

    const view = Composition.makeView.withInputs<SidebarIdentityViewInputs>((model, inputs, h) => {
      const { shape, size, icons } = resolvePresentation(inputs)
      const workspace = kind === 'workspace'
      const name = () => (inputs.renderName ? inputs.renderName(model.name) : model.name)

      const mark = () =>
        inputs.mark
          ? inputs.mark()
          : h.span(
              [
                h.Class(
                  cn(
                    'flex size-5 shrink-0 items-center justify-center text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)] text-background',
                    workspace ? 'bg-foreground' : 'rounded-full bg-muted-foreground',
                    workspace &&
                      (shape.variant === 'sharp'
                        ? 'rounded-[1px]'
                        : shape.variant === 'pill'
                          ? 'rounded-full'
                          : 'rounded-md'),
                  ),
                ),
                ...(workspace ? [h.Style({ fontVariationSettings: fontWeights.semibold })] : []),
              ],
              [model.name.slice(0, 1)],
            )

      const tile = () =>
        h.span(
          [
            h.AriaHidden(true),
            h.Class(
              cn(
                'pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 transition-opacity duration-80',
                inputs.peeking === true ? 'opacity-0' : 'opacity-100',
              ),
            ),
          ],
          [mark()],
        )

      const pin = () =>
        inputs.pin
          ? [
              inputs.pin({
                attributes: childAttributes([
                  h.AriaHidden(inputs.peeking !== true),
                  h.Tabindex(inputs.peeking === true ? 0 : -1),
                ]),
                compact: true,
                className: cn(
                  'absolute left-1 top-1/2 -translate-y-1/2 [&>span:first-child]:hidden [&_svg]:size-4 transition-opacity duration-80',
                  inputs.menu !== undefined && 'z-20',
                  inputs.peeking === true ? 'opacity-100' : 'pointer-events-none opacity-0',
                ),
              }),
            ]
          : []

      const nameSpan = () =>
        h.span(
          [
            h.Class(
              'min-w-0 truncate text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-foreground',
            ),
            ...(workspace ? [h.Style({ fontVariationSettings: fontWeights.semibold })] : []),
          ],
          [name()],
        )

      if (workspace && !inputs.menu) {
        return h.div(
          [h.Class('relative flex h-8 items-center pl-8 pr-2')],
          [...pin(), tile(), nameSpan()],
        )
      }

      return h.block(
        Hover.embedView({
          slotId: 'hover',
          model: model.hover,
          viewInputs: {
            tag: 'ul',
            attributes: childAttributes([
              h.DataAttribute('sidebar', 'menu'),
              h.AriaLabel(workspace ? 'Workspace' : 'User'),
            ]),
            className: cn(
              '@container relative flex w-full min-w-0 flex-col select-none',
              inputs.className,
            ),
            content: () => [
              SidebarMenuItem(
                {
                  size: size.variant,
                  attributes: childAttributes(hoverItemAttributes(0)),
                  children: [
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
                    ...(workspace ? pin() : []),
                    h.block(
                      Menu.embedView({
                        slotId: 'menu',
                        model: model.menu,
                        viewInputs: {
                          ...inputs,
                          animate: inputs.animate,
                          contentClassName: SIDEBAR_MENU_POPUP,
                          side: workspace ? 'bottom' : 'top',
                          align: 'start',
                          sideOffset: workspace ? 4 : 6,
                          trigger: (attributes) =>
                            h.button(
                              [
                                ...attributes,
                                h.AriaLabel(workspace ? 'Switch workspace' : 'Open user menu'),
                                h.DataAttribute('sidebar', 'menu-button'),
                                h.Class(
                                  cn(
                                    'relative z-10 flex w-full cursor-pointer select-none items-center gap-2 text-left outline-none',
                                    size.variant === 'compact' ? 'h-7' : 'h-8',
                                    workspace ? 'pl-8 pr-2' : 'px-2',
                                    shape.item,
                                  ),
                                ),
                              ],
                              [
                                ...(workspace
                                  ? [tile()]
                                  : [
                                      h.span(
                                        [
                                          h.Class(
                                            '-ml-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center',
                                          ),
                                        ],
                                        [mark()],
                                      ),
                                    ]),
                                nameSpan(),
                                h.span(
                                  [
                                    h.Class(
                                      workspace
                                        ? 'ml-auto inline-flex @max-[7rem]:hidden'
                                        : 'ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center',
                                    ),
                                  ],
                                  [
                                    icons[workspace ? 'chevron-down' : 'chevrons-up-down'](
                                      {
                                        size: size.icon,
                                        strokeWidth: 1.5,
                                        className: 'text-muted-foreground',
                                      },
                                      h,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          content: (context) => inputs.menu?.(context) ?? [],
                        },
                      }),
                    ),
                  ],
                },
                h,
              ),
            ],
          },
        }),
      )
    })

    const update = Composition.makeUpdate({})

    return { init, update, inMessageUpdate, view }
  }

  return { namespace: SidebarIdentityNamespace, contract, plans }
}
