/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import { HoverMode } from './hover.js'
import type { Html } from 'foldkit/html'
import type { Presentation, Icon } from './presentation.js'
import type { MotionOptions } from './motion.js'

export const CommandMenuItem = Schema.Struct({
  value: Schema.String,
  label: Schema.String,
  description: Schema.optional(Schema.String),
  action: Schema.optional(Schema.String),
  keywords: Schema.optional(Schema.Array(Schema.String)),
  group: Schema.optional(Schema.String),
  disabled: Schema.optional(Schema.Boolean),
  shortcut: Schema.optional(Schema.String),
})

export type CommandMenuItem = typeof CommandMenuItem.Type

export const defaultCommandMenuFilter: (item: CommandMenuItem, query: string) => boolean = (
  item: CommandMenuItem,
  query: string,
) => {
  const haystack = [item.label, item.description ?? '', ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase()

  return query
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

export const commandMenuRows: (
  items: ReadonlyArray<CommandMenuItem>,
  query: string,
  suggestions: ReadonlyArray<string>,
  label: string,
  filter?: (item: CommandMenuItem, query: string) => boolean,
) => ReadonlyArray<CommandMenuItem> = (
  items: ReadonlyArray<CommandMenuItem>,
  query: string,
  suggestions: ReadonlyArray<string>,
  label: string,
  filter = defaultCommandMenuFilter,
) => {
  const visible = query === '' ? items : items.filter((item) => filter(item, query))

  const suggested =
    query === ''
      ? suggestions.flatMap((value) => {
          const item = visible.find((entry) => entry.value === value)

          return item === undefined ? [] : [{ ...item, group: label }]
        })
      : []

  const groups = new Map<string, Array<CommandMenuItem>>()

  for (const item of [
    ...suggested,
    ...visible.filter((candidate) => !suggested.some((entry) => entry.value === candidate.value)),
  ]) {
    const key = item.group ?? ''
    const group = groups.get(key)

    if (group === undefined) {
      groups.set(key, [item])
    } else {
      group.push(item)
    }
  }

  return [...groups.values()].flat() satisfies ReadonlyArray<CommandMenuItem>
}

export const CommandMenuConfig = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  /** Window long result lists with Foldkit VirtualList; keyboard navigation spans all results. */
  virtualized: Schema.optionalKey(Schema.Boolean),
  id: Schema.String,
  items: Schema.Array(CommandMenuItem),
  query: Schema.optionalKey(Schema.String),
  defaultQuery: Schema.optionalKey(Schema.String),
  suggestions: Schema.optionalKey(Schema.Array(Schema.String)),
  suggestionsLabel: Schema.optionalKey(Schema.String),
  platform: Schema.optionalKey(Schema.Literals(['mac', 'other'])),
})

export type CommandMenuConfig = typeof CommandMenuConfig.Type

export interface CommandMenuViewInputs extends Presentation {
  readonly placeholder?: string
  readonly emptyText?: string
  readonly header?: () => Html
  readonly inputIcon?: Icon | null
  readonly renderItem?: (item: CommandMenuItem, index: number, defaultView: Html) => Html
  /** Replaces row content while retaining native option semantics and handlers. */
  readonly renderItemContent?: (item: CommandMenuItem) => ReadonlyArray<Html>
  /** Replaces default label/description children; retains the item icon and shortcut. */
  readonly renderItemLabel?: (item: CommandMenuItem) => ReadonlyArray<Html>
  readonly footer?: Html | ((activeItem: CommandMenuItem | undefined, mac: boolean) => Html)
  /** Typed item icons; raw renderIcon overrides these. */
  readonly itemIconFor?: (item: CommandMenuItem) => Icon | undefined
  readonly renderIcon?: (item: CommandMenuItem) => Html
  readonly className?: string
  readonly mac?: boolean
  readonly inDialog?: boolean
  readonly animate: (node: Html, options: MotionOptions) => Html
}

export interface CommandMenuOptions {
  readonly filter?: (item: CommandMenuItem, query: string) => boolean
}
