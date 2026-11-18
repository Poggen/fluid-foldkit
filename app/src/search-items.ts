/* @license Site-menu categories derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import type { CommandMenuItem } from '@foldkit-visuals/fluid/command-menu'
import type { IconName } from '@foldkit-visuals/fluid/icons'
import { Schema } from 'effect'
import { documentationPages, guidePages, pageAt, systemPages } from '../../lib/catalogue'
import { accentPresets } from './accents'
import { SettingSelection } from './settings'

export const SearchIntent = Schema.Union([
  Schema.TaggedStruct('Page', { href: Schema.String }),
  Schema.TaggedStruct('Setting', { selection: SettingSelection }),
  Schema.TaggedStruct('BrowseGoogleFonts', {}),
  Schema.TaggedStruct('CopyInstall', {}),
  Schema.TaggedStruct('Reset', {}),
  Schema.TaggedStruct('OriginalSource', {}),
])
export type SearchIntent = typeof SearchIntent.Type
export const SearchCategory = Schema.Literals(['all', 'page', 'setting', 'action'])
export type SearchCategory = typeof SearchCategory.Type
export const searchTabs = [
  { value: 'all', label: 'All' },
  { value: 'page', label: 'Pages' },
  { value: 'setting', label: 'Settings' },
  { value: 'action', label: 'Actions' },
]
interface SearchItem extends CommandMenuItem {
  readonly kind: Exclude<SearchCategory, 'all'>
  readonly intent: SearchIntent
  readonly icon?: IconName
}
const pages = documentationPages
const pageIcons = new Map<string, IconName>([
  ['/', 'home'],
  ['/introduction', 'square-library'],
  ['/installation', 'copy'],
  ['/blocks', 'square-library'],
])
const pageItems: ReadonlyArray<SearchItem> = pages.map((page) => {
  const icon = pageIcons.get(page.href)
  return {
    kind: 'page',
    value: page.href,
    label: page.name,
    action: `Open ${page.name}`,
    group: guidePages.some((guide) => guide.href === page.href)
      ? 'Pages'
      : systemPages.some((system) => system.href === page.href)
        ? 'System'
        : 'Components',
    keywords: [
      ...('description' in page ? [page.description] : []),
      ...('family' in page
        ? [page.family === 'charts' ? 'chart charts bklit tanstack' : 'fluid components']
        : []),
    ],
    intent: { _tag: 'Page', href: page.href },
    ...(icon === undefined ? {} : { icon }),
  }
})
const setting: (
  value: string,
  label: string,
  selection: SettingSelection,
  keywords: ReadonlyArray<string>,
) => SearchItem = (
  value: string,
  label: string,
  selection: SettingSelection,
  keywords: ReadonlyArray<string>,
) => ({
  kind: 'setting',
  value,
  label,
  action: `Set ${label.toLowerCase()}`,
  group: 'Settings',
  keywords,
  intent: { _tag: 'Setting', selection },
})
const settingItems: ReadonlyArray<SearchItem> = [
  ...(['system', 'light', 'dark'] as const).map((value) =>
    setting(
      `theme:${value}`,
      `Theme: ${value === 'system' ? 'Follow system' : value === 'light' ? 'Light' : 'Dark'}`,
      { _tag: 'Theme', value },
      ['theme', 'appearance', 'mode', value],
    ),
  ),
  ...accentPresets.map(({ value, label }) =>
    setting(`accent:${value}`, `Accent: ${label}`, { _tag: 'Accent', value }, [
      'accent',
      'color',
      'brand',
      value,
    ]),
  ),
  ...(['sans', 'serif'] as const).map((value) =>
    setting(
      `font:${value}`,
      `Font: ${value === 'sans' ? 'Sans' : 'Serif'}`,
      { _tag: 'Font', value },
      ['font', 'typeface', 'headings', value],
    ),
  ),
  {
    kind: 'setting',
    value: 'font:browse',
    label: 'Browse Google Fonts…',
    group: 'Settings',
    keywords: ['font', 'custom', 'typeface', 'headings'],
    intent: { _tag: 'BrowseGoogleFonts' },
  },
  ...(['sharp', 'rounded', 'pill'] as const).map((value) =>
    setting(
      `shape:${value}`,
      `Radius: ${value === 'sharp' ? 'Sharp' : value === 'rounded' ? 'Rounded' : 'Pill'}`,
      { _tag: 'Shape', value },
      ['radius', 'shape', 'corners', value],
    ),
  ),
  ...(['default', 'compact'] as const).map((value) =>
    setting(
      `size:${value}`,
      `Size: ${value === 'default' ? 'Default' : 'Compact'}`,
      { _tag: 'Size', value },
      ['size', 'density', value],
    ),
  ),
  ...(['fluid', 'standard'] as const).map((value) =>
    setting(
      `hover:${value}`,
      `Hover: ${value === 'fluid' ? 'Fluid' : 'Standard'}`,
      { _tag: 'Hover', value },
      ['hover', 'highlight', value],
    ),
  ),
]
const action: (
  value: string,
  label: string,
  intent: SearchIntent,
  icon: IconName,
  keywords?: ReadonlyArray<string>,
) => SearchItem = (
  value: string,
  label: string,
  intent: SearchIntent,
  icon: IconName,
  keywords: ReadonlyArray<string> = [],
) =>
  ({
    kind: 'action',
    value: `action:${value}`,
    label,
    group: 'Actions',
    intent,
    icon,
    keywords,
  }) satisfies SearchItem
export const searchItems: (path: string, category: SearchCategory) => ReadonlyArray<SearchItem> = (
  path: string,
  category: SearchCategory,
) => {
  const index = pages.findIndex((page) => page.href === path)
  const previous = index > 0 ? pages[index - 1] : undefined
  const next = index >= 0 ? pages[index + 1] : undefined
  const items = [
    ...pageItems,
    ...settingItems,
    ...(pageAt(path) === undefined
      ? []
      : [
          action('copy-install', 'Copy install prompt', { _tag: 'CopyInstall' }, 'copy', [
            'install',
            'registry',
            'add',
          ]),
        ]),
    ...(previous === undefined
      ? []
      : [action('previous', 'Previous page', { _tag: 'Page', href: previous.href }, 'arrow-left')]),
    ...(next === undefined
      ? []
      : [action('next', 'Next page', { _tag: 'Page', href: next.href }, 'arrow-right')]),
    action('reset', 'Reset settings', { _tag: 'Reset' }, 'settings', ['defaults', 'reset']),
    action('github', 'Open original source on GitHub', { _tag: 'OriginalSource' }, 'link', [
      'source',
      'repository',
      'github',
    ]),
  ]
  return category === 'all' ? items : items.filter((item) => item.kind === category)
}
