import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Item = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  icon: Schema.Literals(['home', 'folder', 'globe', 'palette', 'image', 'file']),
})
export type Item = typeof Item.Type
export const Configuration = Schema.TaggedStruct('breadcrumb', {
  appearance: Appearance,
  steps: Schema.Literals([2, 3, 4, 5, 6]),
  icons: Schema.Boolean,
  dropdownStep: Schema.Boolean,
  dropdownPosition: Schema.Literals(['last', 'first', 'middle']),
  collapse: Schema.Literals(['never', 'overflow', 'always']),
  reveal: Schema.Literals(['menu', 'expand']),
  separator: Schema.Literals(['chevron', 'slash']),
  longName: Schema.Boolean,
  openOnHover: Schema.Boolean,
  items: Schema.Array(Item),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'breadcrumb',
  appearance: {},
  steps: 6,
  icons: false,
  dropdownStep: true,
  dropdownPosition: 'last',
  collapse: 'overflow',
  reveal: 'menu',
  separator: 'chevron',
  longName: false,
  openOnHover: true,
  items: [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'website', label: 'Website', icon: 'globe' },
    { id: 'design', label: 'Design', icon: 'palette' },
    { id: 'assets', label: 'Drafts', icon: 'image' },
    { id: 'page', label: 'Roadmap.md', icon: 'file' },
  ],
})
export const controls = [
  {
    kind: 'choice',
    prop: 'steps',
    label: 'Steps',
    group: 'Trail',
    values: [2, 3, 4, 5, 6],
    initial: defaults.steps,
  },
  {
    kind: 'choice',
    prop: 'collapse',
    label: 'Collapse',
    group: 'Trail',
    values: ['never', 'overflow', 'always'],
    initial: defaults.collapse,
  },
  {
    kind: 'choice',
    prop: 'reveal',
    label: 'Show hidden steps',
    group: 'Trail',
    values: ['menu', 'expand'],
    initial: defaults.reveal,
  },
  {
    kind: 'choice',
    prop: 'separator',
    label: 'Separator',
    group: 'Trail',
    values: ['chevron', 'slash'],
    initial: defaults.separator,
  },
  { kind: 'toggle', prop: 'icons', label: 'Icons', group: 'Steps', initial: defaults.icons },
  {
    kind: 'toggle',
    prop: 'dropdownStep',
    label: 'Dropdown on a step',
    group: 'Steps',
    initial: defaults.dropdownStep,
  },
  {
    kind: 'choice',
    prop: 'dropdownPosition',
    label: 'Dropdown placement',
    group: 'Steps',
    values: ['last', 'first', 'middle'],
    initial: defaults.dropdownPosition,
  },
  {
    kind: 'toggle',
    prop: 'openOnHover',
    label: 'Open menus on hover',
    group: 'Steps',
    initial: defaults.openOnHover,
  },
  {
    kind: 'toggle',
    prop: 'longName',
    label: 'Long step name',
    group: 'Steps',
    initial: defaults.longName,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const visibleItems = (configuration: Configuration): ReadonlyArray<Item> => {
  const links = configuration.items.slice(0, configuration.steps - 1)
  const page = configuration.items.at(-1) ?? defaults.items[defaults.items.length - 1]
  return [
    ...links.map((item, index) =>
      configuration.longName && index === 1
        ? { ...item, label: 'Quarterly roadmap for the website redesign and launch, 2026' }
        : item,
    ),
    ...(page === undefined ? [] : [page]),
  ]
}
export const dropdownIndex = (configuration: Configuration) => {
  if (!configuration.dropdownStep || configuration.steps < 3) return -1
  const lastLink = visibleItems(configuration).length - 2
  return configuration.dropdownPosition === 'first'
    ? 0
    : configuration.dropdownPosition === 'middle'
      ? Math.floor(lastLink / 2)
      : lastLink
}

export const itemControls = (configuration: Configuration): ReadonlyArray<Control> =>
  configuration.items.flatMap((item, index) => [
    {
      kind: 'text',
      prop: `item.${item.id}.label`,
      label: `Step ${index + 1} label`,
      group: 'Item labels and icons',
      initial: item.label,
      enabled: visibleItems(configuration).some((visible) => visible.id === item.id),
      values: [item.label],
    },
    {
      kind: 'choice',
      prop: `item.${item.id}.icon`,
      label: `Step ${index + 1} icon`,
      group: 'Item labels and icons',
      initial: item.icon,
      enabled:
        configuration.icons &&
        visibleItems(configuration).some((visible) => visible.id === item.id),
      values: Item.fields.icon.literals,
    },
  ])

export const updateItem = (
  configuration: Configuration,
  property: string,
  value: string | number | boolean,
): Configuration => {
  const [prefix, id, field] = property.split('.')
  if (prefix !== 'item' || typeof value !== 'string' || (field !== 'label' && field !== 'icon'))
    return configuration
  const selected = configuration.items.find((item) => item.id === id)
  if (selected === undefined) return configuration
  const parsed = Schema.decodeUnknownOption(Item)({ ...selected, [field]: value })
  if (parsed._tag === 'None') return configuration
  return {
    ...configuration,
    items: configuration.items.map((item) => (item.id === id ? parsed.value : item)),
  }
}

export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> => [
  ...controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'dropdownPosition'
        ? configuration.dropdownStep && configuration.steps >= 3
        : control.prop === 'dropdownStep' || control.prop === 'longName'
          ? configuration.steps >= 3
          : control.prop === 'reveal'
            ? configuration.collapse !== 'never'
            : control.prop === 'openOnHover'
              ? configuration.dropdownStep ||
                (configuration.collapse !== 'never' && configuration.reveal === 'menu')
              : true,
  })),
  ...itemControls(configuration).map((control) => ({
    ...control,
    enabled: control.enabled ?? true,
  })),
]

export const breadcrumbChoices: ReadonlyArray<string> = ['Drafts', 'Published', 'Archive']
