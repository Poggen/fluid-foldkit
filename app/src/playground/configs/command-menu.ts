// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { commandItems } from '../../gallery/fluid/command-data'
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('command-menu', {
  appearance: Appearance,
  placeholder: Schema.String,
  shortcut: Schema.Literals(['mod+k', 'mod+j', 'mod+shift+p']),
  descriptions: Schema.Boolean,
  shortcuts: Schema.Boolean,
  suggestions: Schema.Boolean,
  tabs: Schema.Boolean,
  filters: Schema.Boolean,
  footer: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'command-menu',
  appearance: {},
  placeholder: 'Type a command or search\u2026',
  shortcut: 'mod+k',
  descriptions: true,
  shortcuts: true,
  suggestions: true,
  tabs: true,
  filters: false,
  footer: true,
})
export const controls = [
  {
    kind: 'text',
    prop: 'placeholder',
    label: 'Placeholder',
    group: 'Menu',
    initial: 'Type a command or search\u2026',
    values: ['Type a command or search\u2026', 'Make it yours', 'Studio notes'],
  },
  {
    kind: 'choice',
    prop: 'shortcut',
    label: 'Trigger shortcut',
    group: 'Menu',
    initial: 'mod+k',
    values: ['mod+k', 'mod+j', 'mod+shift+p'],
  },
  { kind: 'toggle', prop: 'descriptions', label: 'Descriptions', group: 'Rows', initial: true },
  { kind: 'toggle', prop: 'shortcuts', label: 'Shortcut caps', group: 'Rows', initial: true },
  { kind: 'toggle', prop: 'suggestions', label: 'Suggestions first', group: 'Rows', initial: true },
  { kind: 'toggle', prop: 'tabs', label: 'Tabs', group: 'Header', initial: true },
  { kind: 'toggle', prop: 'filters', label: 'Filters', group: 'Header', initial: false },
  { kind: 'toggle', prop: 'footer', label: 'Footer hints', group: 'Menu', initial: true },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor = (_config: Configuration): ReadonlyArray<Control> => controls

export const commandRows = (
  config: Configuration,
  tab: string,
  filter: string,
  sort: string,
  query: string,
) => {
  const group = config.tabs && tab !== 'all' ? tab : 'All'
  const filtered = commandItems.filter(
    (item) =>
      (group === 'All' || item.group === group) &&
      (!config.filters || filter === 'all' || item.group === filter),
  )
  const rows = filtered.map(({ description, shortcut, ...item }) => ({
    ...item,
    ...(config.descriptions && description !== undefined ? { description } : {}),
    ...(config.shortcuts && shortcut !== undefined ? { shortcut } : {}),
  }))
  if (config.filters && sort === 'az') rows.sort((a, b) => a.label.localeCompare(b.label))
  if (!config.suggestions || query !== '') return rows
  const suggested = ['new-file', 'search', 'settings']
  return [
    ...rows
      .filter((item) => suggested.includes(item.value))
      .map((item) => ({ ...item, group: 'Suggestions' })),
    ...rows.filter((item) => !suggested.includes(item.value)),
  ]
}
