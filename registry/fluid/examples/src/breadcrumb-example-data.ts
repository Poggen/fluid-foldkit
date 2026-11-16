import { Schema } from 'effect'

export const SECTIONS = ['Components', 'Systems', 'Blocks']

export const HIDDEN = ['Documentation', 'Building blocks', 'Navigation']

export const TRAIL = ['Home', ...HIDDEN, 'Components']

export const OVERFLOW_STEPS = ['Home', 'Projects', 'Website', 'Design', 'Drafts']

export const LINKS = [
  { label: 'Home', icon: 'home' },
  { label: 'Projects', icon: 'folder' },
  { label: 'Website', icon: 'globe' },
  { label: 'Design', icon: 'palette' },
  { label: 'Assets', icon: 'image' },
] satisfies ReadonlyArray<{
  readonly label: string
  readonly icon: 'home' | 'folder' | 'globe' | 'palette' | 'image'
}>

export const SIBLINGS = ['Drafts', 'Published', 'Archive']

export const PAGE = 'Roadmap.md'

export const LONG_STEP = 'Quarterly roadmap for the website redesign and launch, 2026'

export const LONG_REPORT = 'Quarterly revenue by region and product line, 2026'

export const MENU_CLASS =
  'w-max min-w-[max(8rem,var(--radix-dropdown-menu-trigger-width,var(--anchor-width,0px)))]'

export const BooleanSetting = Schema.Literals(['icons', 'dropdownStep', 'longName', 'openOnHover'])

export const Settings = Schema.Struct({
  steps: Schema.Natural,
  icons: Schema.Boolean,
  dropdownStep: Schema.Boolean,
  collapse: Schema.Literals(['never', 'overflow', 'always']),
  reveal: Schema.Literals(['menu', 'expand']),
  separator: Schema.Literals(['chevron', 'slash']),
  longName: Schema.Boolean,
  openOnHover: Schema.Boolean,
})

export const initialSettings = {
  steps: 6,
  icons: false,
  dropdownStep: true,
  collapse: 'overflow',
  reveal: 'menu',
  separator: 'chevron',
  longName: false,
  openOnHover: true,
} satisfies typeof Settings.Type

export const SelectSetting = Schema.Literals(['steps', 'collapse', 'reveal', 'separator'])

export const selectSettings = [
  {
    key: 'steps',
    label: 'Steps',
    items: [2, 3, 4, 5, 6].map((value) => ({ value: String(value), label: String(value) })),
  },
  {
    key: 'collapse',
    label: 'Collapse',
    items: [
      { value: 'never', label: 'Never' },
      { value: 'overflow', label: 'When it overflows' },
      { value: 'always', label: 'Always' },
    ],
  },
  {
    key: 'reveal',
    label: 'Show hidden steps',
    items: [
      { value: 'menu', label: 'In a menu' },
      { value: 'expand', label: 'Expand in place' },
    ],
  },
  {
    key: 'separator',
    label: 'Separator',
    items: [
      { value: 'chevron', label: 'Chevron' },
      { value: 'slash', label: 'Slash' },
    ],
  },
] satisfies ReadonlyArray<{
  readonly key: typeof SelectSetting.Type
  readonly label: string
  readonly items: ReadonlyArray<{ readonly value: string; readonly label: string }>
}>

export const selectDisabled = (key: typeof SelectSetting.Type, settings: typeof Settings.Type) =>
  (key === 'collapse' && settings.steps < 4) ||
  (key === 'reveal' && (settings.steps < 4 || settings.collapse === 'never'))

export const sections = [
  { id: 'playground', title: 'Playground' },
  { id: 'basic', title: 'Basic' },
  { id: 'icons', title: 'With icons' },
  { id: 'long', title: 'Long step name' },
  { id: 'dropdown', title: 'Dropdown on a step' },
  { id: 'click', title: 'Open on click' },
  { id: 'collapsed', title: 'Collapsed' },
  { id: 'overflow', title: 'Collapse on overflow' },
  { id: 'expand', title: 'Expand in place' },
  { id: 'separator', title: 'Custom separator' },
  { id: 'framework', title: 'Framework links' },
]

export const menuKeys = [
  'dropdown-step',
  'click-hidden',
  'click-step',
  'collapsed-hidden',
  'overflow-hidden',
  'playground-hidden',
  'playground-step',
]

export const hiddenLabel = (count: number) => `${count} hidden ${count === 1 ? 'step' : 'steps'}`

export type BooleanSetting = typeof BooleanSetting.Type
export type Settings = typeof Settings.Type
