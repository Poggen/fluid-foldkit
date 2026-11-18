/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import type { Html, HtmlBuilder } from 'foldkit/html'
import { cn } from './lib/utils.js'

/** One inverted source keycap per key; arrays preserve names such as "Page Up". */
export const TooltipShortcut: <Message, Requirements>(
  props: TooltipShortcutProps,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function TooltipShortcut<Message, Requirements>(
  props: TooltipShortcutProps,
  h: HtmlBuilder<Message, Requirements>,
) {
  const keys =
    typeof props.children === 'string'
      ? (props.children.match(/[⌘⇧⌥⌃]|[^⌘⇧⌥⌃+\s]+|\+$/g) ?? [])
      : props.children
  return h.span(
    [h.Class(cn('inline-flex shrink-0 items-center gap-0.5', '-my-[5px]', props.className))],
    keys.map((key) =>
      h.kbd(
        [
          h.Class(
            cn(
              'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[2px] px-1 font-mono text-[length:var(--fs-micro,11px)] leading-none',
              'bg-background/15 text-background',
              !/[a-z0-9]/i.test(key) && 'font-sans',
            ),
          ),
        ],
        [key],
      ),
    ),
  ) satisfies Html
}

export interface TooltipShortcutProps {
  readonly children: string | ReadonlyArray<string>
  readonly className?: string
}
