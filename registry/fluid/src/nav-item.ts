import { sourceStyleAttributes } from './lib/source-style-attributes.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { NavItemConfig } from './nav-menu-state.js'
import { fontWeights } from './lib/font-weight.js'
import { resolvePresentation, type Presentation } from './presentation.js'
import { cn } from './lib/utils.js'

export const NavItem: <Message>(props: NavItemProps<Message>, h: HtmlBuilder<Message>) => Html =
  function NavItem<Message>(props: NavItemProps<Message>, h: HtmlBuilder<Message>) {
    const { item, current, hovered } = props
    const { shape, size } = resolvePresentation(props)
    const lit = current || hovered
    const dot = item.status === 'active' || item.status === 'unread' || item.status === 'idle'
    const isButton = props.kind === 'button' || props.kind === 'action'
    const element = isButton ? h.button : h.a
    return element(
      sourceStyleAttributes(
        {
          paddingInlineStart: `${props.sidebar ? 8 : 12 + item.level * 16}px`,
          ...(props.sidebarGutter !== undefined
            ? {
                '--row-gutter': `${props.sidebarGutter.rest}px`,
                '--row-gutter-hover': `${props.sidebarGutter.hover}px`,
              }
            : props.actionCount
              ? { paddingInlineEnd: `${8 + props.actionCount * 28}px` }
              : {}),
        },
        [
          h.Class(
            cn(
              'relative z-10 flex w-full cursor-pointer select-none items-center gap-2 text-left outline-none',
              props.sidebar && item.level > 0
                ? size.variant === 'compact'
                  ? 'h-6'
                  : 'h-7'
                : size.variant === 'compact'
                  ? 'h-7'
                  : 'h-8',
              shape.item,
              props.sidebar ? 'peer/menu-button pl-2' : 'px-3',
              props.sidebar && props.sidebarGutter === undefined && 'pr-2',
              props.sidebarGutter !== undefined &&
                'transition-[padding] duration-80 pr-[var(--row-gutter)]',
              props.sidebarGutter !== undefined &&
                (item.level > 0
                  ? 'group-hover/menu-sub-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-sub-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-sub-item:pr-[var(--row-gutter-hover)]'
                  : 'group-hover/menu-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-item:pr-[var(--row-gutter-hover)]'),
              props.variant === 'outline' && 'border border-border bg-background',
              item.disabled && 'opacity-50',
              item.disabled ? 'pointer-events-none' : '',
            ),
          ),
          ...props.attributes,
          ...(isButton ? [h.Type('button')] : []),
          ...(props.kind === 'button' ? [h.AriaPressed(String(current))] : []),
          h.DataAttribute('nav-index', String(props.index)),
          h.DataAttribute(
            'sidebar',
            props.sidebar ? (item.level > 0 ? 'menu-sub-button' : 'menu-button') : 'nav-item',
          ),
          h.DataAttribute('active', String(current)),
          ...(item.status ? [h.DataAttribute('status', item.status)] : []),
          h.Tabindex(item.disabled ? -1 : props.tabbable ? 0 : -1),
          ...(item.disabled ? [h.AriaDisabled(true)] : []),
        ],
      ),
      [
        ...(props.icon
          ? [props.icon]
          : dot
            ? props.sidebar
              ? [
                  h.span(
                    [
                      h.Class('flex shrink-0 items-center justify-center'),
                      h.AriaHidden(true),
                      h.Style({
                        width: `${size.icon}px`,
                        height: `${size.icon}px`,
                      }),
                    ],
                    [
                      h.span([
                        h.Class(
                          cn(
                            'size-2 rounded-full transition-colors duration-80',
                            item.status === 'idle'
                              ? lit
                                ? 'border border-foreground/60'
                                : 'border border-muted-foreground/50'
                              : lit
                                ? 'bg-foreground/60'
                                : 'bg-muted-foreground/50',
                          ),
                        ),
                      ]),
                    ],
                  ),
                ]
              : [
                  h.span([
                    h.AriaHidden(true),
                    h.Class(
                      cn(
                        'mx-1 size-1.5 shrink-0 rounded-full',
                        item.status === 'idle'
                          ? 'border border-muted-foreground'
                          : 'bg-fluid-accent',
                      ),
                    ),
                  ]),
                ]
            : []),
        h.span(
          [
            h.Class(
              cn(props.sidebar ? 'inline-grid min-w-0 text-left' : 'inline-grid flex-1', size.text),
            ),
          ],
          [
            h.span(
              [
                h.Class(
                  cn(
                    props.sidebar
                      ? 'col-start-1 row-start-1 invisible truncate pt-[0.25em] -mt-[0.25em] pb-[0.25em] -mb-[0.25em] [text-box:trim-both_cap_alphabetic]'
                      : 'col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]',
                  ),
                ),
                h.AriaHidden(true),
                h.Style({ fontVariationSettings: fontWeights.semibold }),
              ],
              [item.label],
            ),
            h.span(
              [
                h.Class(
                  cn(
                    props.sidebar
                      ? 'col-start-1 row-start-1 truncate pt-[0.25em] -mt-[0.25em] pb-[0.25em] -mb-[0.25em] transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]'
                      : 'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
                    lit ? 'text-foreground' : 'text-muted-foreground',
                  ),
                ),
                h.Style({
                  fontVariationSettings: current ? fontWeights.semibold : fontWeights.normal,
                }),
              ],
              [
                item.label,
                ...(!props.sidebar && (item.status === 'new' || item.status === 'updated')
                  ? [
                      h.span([
                        h.AriaHidden(true),
                        h.Class(
                          item.status === 'updated'
                            ? // oxlint-disable-next-line shadcn/no-raw-colors -- Original registry/default/nav-item.tsx:112 at cc276ca0 uses this exact status color.
                              'inline-block ml-2 size-1.5 rounded-full bg-blue-500 align-middle'
                            : cn(
                                'inline-block ml-2 size-1.5 rounded-full align-middle',
                                // oxlint-disable-next-line shadcn/no-raw-colors -- Original registry/default/nav-item.tsx:117 at cc276ca0 uses this exact fallback.
                                'bg-blue-500',
                              ),
                        ),
                      ]),
                    ]
                  : []),
              ],
            ),
          ],
        ),
        ...(props.trailing ?? []),
        ...(item.status === 'unread' ? [h.span([h.Class('sr-only')], [', unread'])] : []),
        ...(item.badge === null || props.sidebarGutter !== undefined
          ? []
          : [
              h.span(
                [h.Class('pointer-events-none text-xs tabular-nums text-muted-foreground')],
                [item.badge],
              ),
            ]),
        ...(props.sidebar && (item.status === 'new' || item.status === 'updated')
          ? [
              h.span([
                h.AriaHidden(true),
                h.Class('size-1.5 shrink-0 rounded-full bg-fluid-accent'),
              ]),
            ]
          : []),
      ],
    ) satisfies Html
  }

export interface NavItemProps<Message> extends Presentation {
  readonly item: NavItemConfig
  readonly index: number
  readonly current: boolean
  readonly hovered: boolean
  readonly tabbable: boolean
  readonly kind?: 'link' | 'button' | 'action'
  readonly sidebar?: boolean | undefined
  readonly variant?: 'default' | 'outline'
  readonly attributes: ReadonlyArray<Attribute<Message> | ChildAttribute>
  readonly icon?: Html | undefined
  readonly trailing?: ReadonlyArray<Html> | undefined
  readonly actionCount?: number
  readonly sidebarGutter?: { readonly rest: number; readonly hover: number }
}
