/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Html, HtmlBuilder } from 'foldkit/html'
import { resolvePresentation, type Presentation } from './presentation.js'
import { KeyCaps } from './key-cap.js'
import { formatShortcut } from './command-shortcuts.js'
import { typeClass } from './lib/type-scale.js'
import { cn } from './lib/utils.js'
import type { CommandMenuItem } from './command-menu.js'
export interface CommandMenuHint {
  readonly label: string
  readonly keys: string | ReadonlyArray<string>
}
export const CommandMenuShortcut: <Message>(
  props: Presentation & {
    readonly keys: string | ReadonlyArray<string>
    readonly mac?: boolean
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
) => Html = function CommandMenuShortcut<Message>(
  props: Presentation & {
    readonly keys: string | ReadonlyArray<string>
    readonly mac?: boolean
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
) {
  const caps = (typeof props.keys === 'string' ? [props.keys] : props.keys).flatMap((key) =>
    formatShortcut(key, props.mac ?? false),
  )
  return KeyCaps(
    {
      keys: caps,
      className: cn('ml-auto align-middle', props.className),
      attributes: [h.DataAttribute('slot', 'command-menu-shortcut')],
    },
    h,
  )
}
export const CommandMenuFooter: <Message>(
  props: Presentation & {
    readonly hints?: ReadonlyArray<CommandMenuHint>
    readonly activeItem?: CommandMenuItem
    readonly hasTabs?: boolean
    readonly inDialog?: boolean
    readonly mac?: boolean
    readonly children?: ReadonlyArray<Html>
  },
  h: HtmlBuilder<Message>,
) => Html = function CommandMenuFooter<Message>(
  props: Presentation & {
    readonly hints?: ReadonlyArray<CommandMenuHint>
    readonly activeItem?: CommandMenuItem
    readonly hasTabs?: boolean
    readonly inDialog?: boolean
    readonly mac?: boolean
    readonly children?: ReadonlyArray<Html>
  },
  h: HtmlBuilder<Message>,
) {
  const compact = resolvePresentation(props).size.variant === 'compact'
  const hints = props.hints ?? [
    { label: 'Select', keys: ['up', 'down'] },
    ...(props.hasTabs ? [{ label: 'Tabs', keys: ['left', 'right'] }] : []),
    ...(props.inDialog ? [{ label: 'Close', keys: 'esc' }] : []),
  ]
  return h.div(
    [
      h.DataAttribute('slot', 'command-menu-footer'),
      h.Class(
        cn(
          'flex shrink-0 items-center overflow-hidden text-muted-foreground',
          compact ? 'h-8 gap-3 px-3' : 'h-10 gap-4 px-4',
          typeClass('caption', compact ? 'compact' : 'default'),
        ),
      ),
    ],
    props.children
      ? [...props.children]
      : [
          ...hints.map((hint) =>
            h.span(
              [h.Class('flex shrink-0 items-center gap-1.5')],
              [
                h.span([], [hint.label]),
                CommandMenuShortcut({ ...props, keys: hint.keys, className: 'ml-0' }, h),
              ],
            ),
          ),
          ...(props.hints || !props.activeItem
            ? []
            : [
                h.span(
                  [
                    h.DataAttribute('slot', 'command-menu-footer-action'),
                    h.Class('ml-auto flex min-w-0 items-center gap-1.5 text-foreground'),
                  ],
                  [
                    h.span(
                      [h.Class('truncate')],
                      [props.activeItem.action ?? props.activeItem.label],
                    ),
                    CommandMenuShortcut({ ...props, keys: 'enter', className: 'ml-0' }, h),
                  ],
                ),
              ]),
        ],
  )
}
