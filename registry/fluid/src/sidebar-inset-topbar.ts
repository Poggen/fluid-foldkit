/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Html, HtmlBuilder } from 'foldkit/html'
import { cn } from './lib/utils.js'

export const SidebarInsetTopbar: <Message, Requirements>(
  props: {
    readonly trigger: Html
    readonly children?: ReadonlyArray<Html>
    readonly className?: string
  },
  h: HtmlBuilder<Message, Requirements>,
) => Html = function SidebarInsetTopbar<Message, Requirements>(
  props: {
    readonly trigger: Html
    readonly children?: ReadonlyArray<Html>
    readonly className?: string
  },
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.header(
    [h.Class(cn('flex h-12 shrink-0 items-center gap-2 px-1.5', props.className))],
    [props.trigger, ...(props.children ?? [])],
  ) satisfies Html
}
