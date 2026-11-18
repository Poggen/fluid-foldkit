import { fontWeights } from './lib/font-weight.js'
/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import type { Html, HtmlBuilder } from 'foldkit/html'

const ShortcutKbd: <Message, Requirements>(
  key: string,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function ShortcutKbd<Message, Requirements>(
  key: string,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.kbd(
    [
      h.Class(
        '-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)] text-background',
      ),
    ],
    [key],
  ) satisfies Html
}

export const SidebarToggleTooltipContent: <Message, Requirements>(
  open: boolean,
  shortcutKey: string,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function SidebarToggleTooltipContent<Message, Requirements>(
  open: boolean,
  shortcutKey: string,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.span(
    [h.Class('flex items-center gap-1.5')],
    [
      h.span(
        [h.Class('[text-box:trim-both_cap_alphabetic]')],
        [open ? 'Collapse sidebar' : 'Expand sidebar'],
      ),
      ShortcutKbd(shortcutKey, h),
    ],
  ) satisfies Html
}

export const SidebarRailTooltipContent: <Message, Requirements>(
  shortcutKey: string,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function SidebarRailTooltipContent<Message, Requirements>(
  shortcutKey: string,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.span(
    [h.Class('flex flex-col items-start gap-2')],
    [
      h.span(
        [h.Class('[text-box:trim-both_cap_alphabetic]')],
        [
          h.span([h.Style({ fontVariationSettings: fontWeights.semibold })], ['Drag']),
          ' to resize',
        ],
      ),
      h.span(
        [h.Class('flex items-center gap-1.5')],
        [
          h.span(
            [h.Class('[text-box:trim-both_cap_alphabetic]')],
            [
              h.span([h.Style({ fontVariationSettings: fontWeights.semibold })], ['Click']),
              ' to collapse',
            ],
          ),
          ShortcutKbd(shortcutKey, h),
        ],
      ),
    ],
  ) satisfies Html
}

export const sidebarShortcutKey: (shortcut: string | null, side: 'left' | 'right') => string =
  function sidebarShortcutKey(shortcut: string | null, side: 'left' | 'right') {
    return shortcut ?? (side === 'right' ? ']' : '[')
  }
