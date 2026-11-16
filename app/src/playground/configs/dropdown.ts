// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('dropdown', {
  appearance: Appearance,
  label: Schema.String,
  mode: Schema.Literals(['menu', 'inline']),
  selection: Schema.Literals(['none', 'single', 'multiple']),
  search: Schema.Boolean,
  creatable: Schema.Boolean,
  icons: Schema.Boolean,
  groups: Schema.Boolean,
  disabledRow: Schema.Boolean,
  submenu: Schema.Boolean,
  disabled: Schema.Boolean,
  openOnHover: Schema.Boolean,
  side: Schema.Literals(['top', 'bottom', 'left', 'right']),
  align: Schema.Literals(['start', 'center', 'end']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'dropdown',
  appearance: {},
  label: 'Open menu',
  mode: 'menu',
  selection: 'single',
  search: false,
  creatable: false,
  icons: true,
  groups: false,
  disabledRow: false,
  submenu: true,
  disabled: false,
  openOnHover: false,
  side: 'bottom',
  align: 'start',
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    label: 'Trigger',
    group: 'Menu',
    initial: 'Open menu',
    values: ['Open menu', 'Make it yours', 'Studio notes'],
  },
  {
    kind: 'choice',
    prop: 'mode',
    label: 'Mode',
    group: 'Menu',
    initial: 'menu',
    values: ['menu', 'inline'],
  },
  {
    kind: 'choice',
    prop: 'selection',
    label: 'Selection',
    group: 'Menu',
    initial: 'single',
    values: ['none', 'single', 'multiple'],
  },
  { kind: 'toggle', prop: 'search', label: 'Search', group: 'Rows', initial: false },
  { kind: 'toggle', prop: 'creatable', label: 'Create from query', group: 'Rows', initial: false },
  { kind: 'toggle', prop: 'icons', label: 'Icons', group: 'Rows', initial: true },
  { kind: 'toggle', prop: 'groups', label: 'Groups', group: 'Rows', initial: false },
  { kind: 'toggle', prop: 'disabledRow', label: 'Disabled row', group: 'Rows', initial: false },
  { kind: 'toggle', prop: 'submenu', label: 'Submenu', group: 'Rows', initial: true },
  { kind: 'toggle', prop: 'disabled', label: 'Disabled', group: 'Menu', initial: false },
  { kind: 'toggle', prop: 'openOnHover', label: 'Open on hover', group: 'Menu', initial: false },
  {
    kind: 'choice',
    prop: 'side',
    label: 'Side',
    group: 'Menu',
    initial: 'bottom',
    values: ['top', 'bottom', 'left', 'right'],
  },
  {
    kind: 'choice',
    prop: 'align',
    label: 'Align',
    group: 'Menu',
    initial: 'start',
    values: ['start', 'center', 'end'],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor = (config: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'groups'
        ? !(config.search && config.mode === 'menu')
        : control.prop === 'creatable'
          ? config.search && config.mode === 'menu'
          : control.prop === 'search' ||
              control.prop === 'submenu' ||
              control.prop === 'openOnHover' ||
              control.prop === 'side' ||
              control.prop === 'align'
            ? config.mode === 'menu'
            : true,
  }))
export const items = [
  { value: 'Email', label: 'Email', icon: 'mail', group: 'Account' },
  { value: 'Notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
  { value: 'Privacy', label: 'Privacy', icon: 'shield', group: 'Account' },
  { value: 'General', label: 'General', icon: 'settings', group: 'Appearance' },
  { value: 'Theme', label: 'Theme', icon: 'palette', group: 'Appearance' },
  { value: 'Display', label: 'Display', icon: 'monitor', group: 'Appearance' },
] as const
export const themes = ['Light', 'Dark', 'System']
export const visibleRows = (
  config: Configuration,
  created: ReadonlyArray<{ readonly value: string; readonly label: string }>,
  query: string,
) => {
  const rows = [
    ...items,
    ...created.map((item) => ({ ...item, icon: 'plus' as const, group: 'Created' })),
  ]
  return config.mode === 'menu' && config.search
    ? rows.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : rows
}
export const canCreate = (
  config: Configuration,
  created: ReadonlyArray<{ readonly value: string; readonly label: string }>,
  query: string,
) =>
  config.mode === 'menu' &&
  config.search &&
  config.creatable &&
  query.trim() !== '' &&
  ![...items, ...created].some((item) => item.label.toLowerCase() === query.trim().toLowerCase())
