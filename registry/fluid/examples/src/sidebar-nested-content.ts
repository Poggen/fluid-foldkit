import type { Html, HtmlBuilder } from 'foldkit/html'
import { SidebarGroup, SidebarMenuSub } from '@foldkit-visuals/fluid/sidebar/parts'
import { NavItemConfig } from '@foldkit-visuals/fluid/nav-menu'
import type { NavMenuContent, NavMenuViewInputs } from '@foldkit-visuals/fluid/nav-menu'
import type { SidebarMenuSubProps } from '@foldkit-visuals/fluid/sidebar/parts'

const rows: ReadonlyArray<readonly [string, string, number]> = [
  ['projects', 'Projects', 0],
  ['design', 'Design system', 1],
  ['tokens', 'Tokens', 2],
  ['components', 'Components', 2],
  ['roadmap', 'Roadmap', 1],
  ['changelog', 'Changelog', 1],
  ['reports', 'Reports', 0],
  ['activity', 'Activity', 1],
  ['archive', 'Archive', 0],
]

export const nestedNavItems = rows.map(([value, label, level]) =>
  NavItemConfig.make({
    value,
    label,
    level,
    href: `#${value}`,
    disabled: false,
    status: null,
    badge: null,
  }),
)

export interface NestedSidebarState {
  readonly groupOpen: boolean
  readonly branchOpen: boolean
  readonly detailsOpen: boolean
  readonly reportsOpen: boolean
  readonly compact: boolean
}

export const nestedDisclosure: (
  state: NestedSidebarState,
) => NonNullable<NavMenuViewInputs['rowDisclosure']> = (state) => (item) => {
  const disclosures = new Map([
    ['projects', { expanded: state.branchOpen, controls: 'nested-projects' }],
    ['design', { expanded: state.detailsOpen, controls: 'nested-details' }],
    ['reports', { expanded: state.reportsOpen, controls: 'nested-reports' }],
  ])

  return disclosures.get(item.value)
}

export const nestedRowKind: NonNullable<NavMenuViewInputs['kind']> = (item) =>
  ['projects', 'design', 'reports'].includes(item.value) ? 'action' : 'link'

export const nestedSidebarRows: <Message>(
  props: NestedSidebarState & {
    readonly animate: SidebarMenuSubProps['animate']
  },
  context: NavMenuContent,
  h: HtmlBuilder<Message>,
) => ReadonlyArray<Html> = <Message>(
  props: NestedSidebarState & {
    readonly animate: SidebarMenuSubProps['animate']
  },
  context: NavMenuContent,
  h: HtmlBuilder<Message>,
) =>
  [
    context.row('projects', {
      children: [
        SidebarMenuSub(
          {
            open: props.branchOpen,
            attributes: [h.Id('nested-projects')],
            animate: props.animate,
            children: [
              context.row('design', {
                children: [
                  SidebarMenuSub(
                    {
                      open: props.detailsOpen,
                      attributes: [h.Id('nested-details')],
                      animate: props.animate,
                      children: [context.row('tokens'), context.row('components')],
                    },
                    h,
                  ),
                ],
              }),
              context.row('roadmap'),
              context.row('changelog'),
            ],
          },
          h,
        ),
      ],
    }),
    context.row('reports', {
      children: [
        SidebarMenuSub(
          {
            open: props.reportsOpen,
            attributes: [h.Id('nested-reports')],
            animate: props.animate,
            children: [context.row('activity')],
          },
          h,
        ),
      ],
    }),
    context.row('archive'),
  ] satisfies ReadonlyArray<Html>

export const sidebarNestedContent: <Message>(
  props: NestedSidebarState & {
    readonly animate: SidebarMenuSubProps['animate']
    readonly onGroupToggle: (open: boolean) => Message
    readonly nav: Html
  },
  h: HtmlBuilder<Message>,
) => Html = <Message>(
  props: NestedSidebarState & {
    readonly animate: SidebarMenuSubProps['animate']
    readonly onGroupToggle: (open: boolean) => Message
    readonly nav: Html
  },
  h: HtmlBuilder<Message>,
) =>
  h.div(
    [h.Class('w-64'), h.DataAttribute('parity-nested-sidebar', '')],
    [
      SidebarGroup(
        {
          id: 'nested-workspace',
          label: 'Nested workspace',
          open: props.groupOpen,
          animate: props.animate,
          onToggle: props.onGroupToggle,
          size: props.compact ? 'compact' : 'default',
          children: [props.nav],
        },
        h,
      ),
    ],
  ) satisfies Html
