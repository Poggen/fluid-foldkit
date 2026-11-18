/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { NavItemConfig } from './nav-menu-state.js'
const navItems: (group: 'platform' | 'workspace') => ReadonlyArray<NavItemConfig> = (
  group: 'platform' | 'workspace',
) =>
  (group === 'platform'
    ? ['Home', 'Inbox', 'Calendar']
    : ['Notifications', 'Members', 'Settings']
  ).map((label) => ({
    value: label,
    label,
    href: label,
    disabled: false,
    status: null,
    level: 0,
    badge: label === 'Inbox' ? '12' : label === 'Notifications' ? '3' : null,
  }))
export const platformItems = navItems('platform')
export const workspaceItems = navItems('workspace')

export const headerActions: ReadonlyArray<NavItemConfig> = [
  {
    value: 'new',
    label: 'New',
    href: '#new',
    disabled: false,
    status: null,
    badge: null,
    level: 0,
  },
]
