// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { cn } from './lib/utils.js'

export interface KeyCapProps<Message> {
  readonly children: string | Html
  readonly tone?: 'default' | 'inverted'
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}
export interface KeyCapsProps<Message> extends Omit<KeyCapProps<Message>, 'children'> {
  readonly keys: string | ReadonlyArray<string>
}

/** Split shortcut notation. Use an array for multiword key names such as Page Up. */
export const splitKeys = (combo: string): string[] => combo.match(/[⌘⇧⌥⌃]|[^⌘⇧⌥⌃+\s]+|\+$/g) ?? []

export function KeyCap<Message>(props: KeyCapProps<Message>, h: HtmlBuilder<Message>): Html {
  return h.kbd(
    [
      h.Class(
        cn(
          'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[2px] px-1 font-mono text-[length:var(--fs-micro,11px)] leading-none',
          props.tone === 'inverted'
            ? 'bg-background/15 text-background'
            : 'bg-foreground/[0.08] text-muted-foreground',
          typeof props.children === 'string' && !/[a-z0-9]/i.test(props.children) && 'font-sans',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [props.children],
  )
}

export function KeyCaps<Message>(props: KeyCapsProps<Message>, h: HtmlBuilder<Message>): Html {
  const keys = typeof props.keys === 'string' ? splitKeys(props.keys) : props.keys
  return h.span(
    [
      h.Class(cn('inline-flex shrink-0 items-center gap-0.5', props.className)),
      ...(props.attributes ?? []),
    ],
    keys.map((children) =>
      KeyCap({ children, ...(props.tone === undefined ? {} : { tone: props.tone }) }, h),
    ),
  )
}
