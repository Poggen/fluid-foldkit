import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('sidebar', {
  appearance: Appearance,
  variant: Schema.Literals(['inset', 'floating', 'sidebar']),
  side: Schema.Literals(['left', 'right']),
  width: Schema.Finite.check(Schema.isBetween({ minimum: 180, maximum: 320 })),
  collapsedBehavior: Schema.Literals(['none', 'hover', 'click']),
  state: Schema.Literals(['opened', 'closed', 'loading']),
  headerPrimary: Schema.Literals(['dropdown', 'logo', 'none']),
  headerStack: Schema.Literals(['horizontal', 'vertical']),
  headerActions: Schema.Literals([0, 1, 2]),
  sectionsCollapsible: Schema.Boolean,
  sectionActions: Schema.Literals([0, 1, 2, 3]),
  l1Primary: Schema.Literals(['threads', 'menu']),
  l1Children: Schema.Boolean,
  l1Actions: Schema.Literals([0, 1, 2, 3]),
  l1Badges: Schema.Boolean,
  l2Icon: Schema.Boolean,
  l2Actions: Schema.Literals([0, 1, 2, 3]),
  l2Badges: Schema.Boolean,
  footerPrimary: Schema.Literals(['dropdown', 'none']),
  footerStack: Schema.Literals(['horizontal', 'vertical']),
  footerActions: Schema.Literals([0, 1, 2]),
  footerCallout: Schema.Literals(['none', 'inline', 'banner']),
  footerCalloutStacked: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'sidebar',
  appearance: {},
  variant: 'inset',
  side: 'left',
  width: 224,
  collapsedBehavior: 'none',
  state: 'opened',
  headerPrimary: 'dropdown',
  headerStack: 'vertical',
  headerActions: 1,
  sectionsCollapsible: true,
  sectionActions: 1,
  l1Primary: 'threads',
  l1Children: false,
  l1Actions: 1,
  l1Badges: false,
  l2Icon: true,
  l2Actions: 1,
  l2Badges: true,
  footerPrimary: 'dropdown',
  footerStack: 'horizontal',
  footerActions: 2,
  footerCallout: 'none',
  footerCalloutStacked: false,
})
export const controls = [
  {
    kind: 'choice',
    prop: 'variant',
    label: 'Design',
    group: 'Layout',
    initial: defaults.variant,
    values: Configuration.fields.variant.literals,
  },
  {
    kind: 'choice',
    prop: 'side',
    label: 'Side',
    group: 'Layout',
    initial: defaults.side,
    values: Configuration.fields.side.literals,
  },
  {
    kind: 'number',
    prop: 'width',
    label: 'Width',
    group: 'Layout',
    initial: defaults.width,
    min: 180,
    max: 320,
    step: 8,
  },
  {
    kind: 'choice',
    prop: 'collapsedBehavior',
    label: 'Collapsed behavior',
    group: 'Layout',
    initial: defaults.collapsedBehavior,
    values: Configuration.fields.collapsedBehavior.literals,
  },
  {
    kind: 'choice',
    prop: 'state',
    label: 'State',
    group: 'Layout',
    initial: defaults.state,
    values: Configuration.fields.state.literals,
  },
  {
    kind: 'choice',
    prop: 'headerPrimary',
    label: 'Primary element',
    group: 'Header',
    initial: defaults.headerPrimary,
    values: Configuration.fields.headerPrimary.literals,
  },
  {
    kind: 'choice',
    prop: 'headerStack',
    label: 'Stacking',
    group: 'Header',
    initial: defaults.headerStack,
    values: Configuration.fields.headerStack.literals,
  },
  {
    kind: 'choice',
    prop: 'headerActions',
    label: 'Header actions',
    group: 'Header',
    initial: defaults.headerActions,
    values: Configuration.fields.headerActions.literals,
  },
  {
    kind: 'toggle',
    prop: 'sectionsCollapsible',
    label: 'Collapsible',
    group: 'Sections',
    initial: defaults.sectionsCollapsible,
  },
  {
    kind: 'choice',
    prop: 'sectionActions',
    label: 'Section actions',
    group: 'Sections',
    initial: defaults.sectionActions,
    values: Configuration.fields.sectionActions.literals,
  },
  {
    kind: 'choice',
    prop: 'l1Primary',
    label: 'Primary element',
    group: 'Content level 1',
    initial: defaults.l1Primary,
    values: Configuration.fields.l1Primary.literals,
  },
  {
    kind: 'toggle',
    prop: 'l1Children',
    label: 'Has children',
    group: 'Content level 1',
    initial: defaults.l1Children,
  },
  {
    kind: 'choice',
    prop: 'l1Actions',
    label: 'Actions',
    group: 'Content level 1',
    initial: defaults.l1Actions,
    values: Configuration.fields.l1Actions.literals,
  },
  {
    kind: 'toggle',
    prop: 'l1Badges',
    label: 'Badges',
    group: 'Content level 1',
    initial: defaults.l1Badges,
  },
  {
    kind: 'toggle',
    prop: 'l2Icon',
    label: 'Leading icon',
    group: 'Content level 2',
    initial: defaults.l2Icon,
  },
  {
    kind: 'choice',
    prop: 'l2Actions',
    label: 'Actions',
    group: 'Content level 2',
    initial: defaults.l2Actions,
    values: Configuration.fields.l2Actions.literals,
  },
  {
    kind: 'toggle',
    prop: 'l2Badges',
    label: 'Badges',
    group: 'Content level 2',
    initial: defaults.l2Badges,
  },
  {
    kind: 'choice',
    prop: 'footerPrimary',
    label: 'Primary element',
    group: 'Footer',
    initial: defaults.footerPrimary,
    values: Configuration.fields.footerPrimary.literals,
  },
  {
    kind: 'choice',
    prop: 'footerStack',
    label: 'Stacking',
    group: 'Footer',
    initial: defaults.footerStack,
    values: Configuration.fields.footerStack.literals,
  },
  {
    kind: 'choice',
    prop: 'footerActions',
    label: 'Footer actions',
    group: 'Footer',
    initial: defaults.footerActions,
    values: Configuration.fields.footerActions.literals,
  },
  {
    kind: 'choice',
    prop: 'footerCallout',
    label: 'Callout',
    group: 'Footer',
    initial: defaults.footerCallout,
    values: Configuration.fields.footerCallout.literals,
  },
  {
    kind: 'toggle',
    prop: 'footerCalloutStacked',
    label: 'Stacked',
    group: 'Footer',
    initial: defaults.footerCalloutStacked,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'l1Actions'
        ? !(configuration.l1Primary === 'menu' && configuration.l1Children)
        : control.prop === 'l1Children'
          ? configuration.l1Primary === 'menu'
          : control.prop.startsWith('l2')
            ? configuration.l1Primary === 'menu' && configuration.l1Children
            : control.prop === 'footerCalloutStacked'
              ? configuration.footerCallout !== 'none'
              : true,
  }))

export const sidebarSectionIds = ['primary', 'secondary'] as const
const sidebarRowIndices = [0, 1, 2, 3, 4] as const
const sidebarChildIndices = [0, 1, 2] as const
export const sidebarMenuIds = sidebarSectionIds.flatMap((section) => [
  `${section}-section`,
  ...sidebarRowIndices.flatMap((row) => [
    `${section}-${row}`,
    ...sidebarChildIndices.map((child) => `${section}-${row}-child-${child}`),
  ]),
])
export const sidebarMenuCapabilities = (configuration: Configuration) => ({
  section: configuration.sectionActions >= 3,
  parent:
    configuration.l1Actions >= 1 &&
    !(configuration.l1Primary === 'menu' && configuration.l1Children),
  child:
    configuration.l1Primary === 'menu' && configuration.l1Children && configuration.l2Actions >= 1,
})
export const eligibleSidebarMenuIds = (configuration: Configuration) => {
  const capabilities = sidebarMenuCapabilities(configuration)
  return sidebarSectionIds.flatMap((section) => [
    ...(capabilities.section ? [`${section}-section`] : []),
    ...sidebarRowIndices.flatMap((row) => [
      ...(capabilities.parent ? [`${section}-${row}`] : []),
      ...(capabilities.child
        ? sidebarChildIndices.map((child) => `${section}-${row}-child-${child}`)
        : []),
    ]),
  ])
}
export const menuRows = [
  { label: 'Home', icon: 'home', badge: '3' },
  { label: 'Inbox', icon: 'inbox', badge: '12' },
  { label: 'Calendar', icon: 'calendar', badge: '5' },
  { label: 'Notifications', icon: 'bell', badge: '8' },
  { label: 'Favorites', icon: 'star', badge: '2' },
] as const
export const threadRows = [
  { label: 'Sidebar component height in demo', status: 'active', badge: '2' },
  { label: 'Sidebar component creation', status: 'idle', badge: '5' },
  { label: 'Dark mode token audit', status: 'unread', badge: '3' },
  { label: 'Scrollbar fade regression', status: 'idle', badge: '1' },
  { label: 'Registry deploy pipeline', status: 'unread', badge: '7' },
] as const
export const childRows = [
  { label: 'Design system', badge: '4' },
  { label: 'Marketing site', badge: '2' },
  { label: 'Travel app', badge: null },
] as const
export const callouts = [
  {
    id: 'sidebar',
    icon: 'panel-left',
    title: 'Sidebar is here',
    description: 'New in Fluid Functionalism',
  },
  { id: 'stars', icon: 'star', title: '500 stars', description: 'Find the hidden mosaic' },
  {
    id: 'motion',
    icon: 'play',
    title: 'Motion guidelines',
    description: 'Three spring tiers, one page',
  },
] as const
export const sidebarRows = (configuration: Configuration) =>
  sidebarSectionIds.flatMap((section) =>
    (configuration.l1Primary === 'threads' ? threadRows : menuRows).flatMap((row, index) => {
      if (section === 'primary' ? index >= 3 : index < 3) return []
      const value = `${section}-${index}`
      return [
        {
          value,
          href: '#',
          label: row.label,
          disabled: false,
          status:
            configuration.l1Primary === 'threads' ? (threadRows[index]?.status ?? null) : null,
          badge: configuration.l1Badges ? row.badge : null,
          level: 0,
        },
        ...(configuration.l1Primary === 'menu' && configuration.l1Children
          ? childRows.map((child, childIndex) => ({
              value: `${value}-child-${childIndex}`,
              href: '#',
              label: child.label,
              disabled: false,
              status: null,
              badge: configuration.l2Badges ? child.badge : null,
              level: 1,
            }))
          : []),
      ]
    }),
  )
