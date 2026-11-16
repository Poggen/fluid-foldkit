import type { NavItemConfig } from '@foldkit-visuals/fluid/nav-menu'
import type { IconName } from '@foldkit-visuals/fluid/icons'

export const sidebarActionItems: Readonly<
  Record<
    'header' | 'footer',
    ReadonlyArray<{
      readonly label: string
      readonly icon: IconName
      readonly shortcut: string
    }>
  >
> = {
  header: [
    { label: 'New', icon: 'plus', shortcut: '⇧⌘O' },
    { label: 'Invite', icon: 'users', shortcut: '⇧⌘I' },
  ],
  footer: [
    { label: 'Settings', icon: 'settings', shortcut: '' },
    { label: 'Theme', icon: 'moon', shortcut: '' },
  ],
}

export const sidebarActionRows = (
  position: 'header' | 'footer',
  count: number,
): ReadonlyArray<NavItemConfig> =>
  sidebarActionItems[position].slice(0, count).map(({ label }) => ({
    value: label,
    label,
    href: '#',
    disabled: false,
    status: null,
    badge: null,
    level: 0,
  }))
