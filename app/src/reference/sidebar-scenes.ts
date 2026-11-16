// Fluid Functionalism cc276ca0 Sidebar examples. MIT.
export const sidebarScenes = [
  {
    key: 'sidebar',
    section: 'Layouts',
    caption: 'Sidebar',
    kind: 'layout',
    variant: 'sidebar',
    height: 640,
  },
  {
    key: 'floating',
    section: '',
    caption: 'Floating',
    kind: 'layout',
    variant: 'floating',
    height: 640,
  },
  { key: 'inset', section: '', caption: 'Inset', kind: 'layout', variant: 'inset', height: 640 },
  {
    key: 'nesting',
    section: 'Nesting',
    caption: '',
    kind: 'nesting',
    variant: 'sidebar',
    height: 640,
  },
  {
    key: 'actions',
    section: 'Actions & badges',
    caption: '',
    kind: 'actions',
    variant: 'sidebar',
    height: 640,
  },
  {
    key: 'vertical',
    section: 'Header & footer',
    caption: 'Vertical stacking',
    kind: 'vertical',
    variant: 'sidebar',
    height: 632,
  },
  {
    key: 'horizontal',
    section: '',
    caption: 'Horizontal stacking',
    kind: 'horizontal',
    variant: 'sidebar',
    height: 632,
  },
  {
    key: 'inline-callouts',
    section: 'Callouts',
    caption: 'Stacked inlines',
    kind: 'callouts',
    variant: 'sidebar',
    height: 632,
  },
  {
    key: 'banner-callouts',
    section: '',
    caption: 'Stacked banners',
    kind: 'callouts',
    variant: 'sidebar',
    height: 632,
  },
  {
    key: 'hover',
    section: 'Resize, collapse & peek',
    caption: 'On hover',
    kind: 'collapse',
    variant: 'inset',
    height: 632,
  },
  {
    key: 'click',
    section: '',
    caption: 'On click',
    kind: 'collapse',
    variant: 'inset',
    height: 632,
  },
  {
    key: 'alignment',
    section: 'Functional and perfectly aligned',
    caption: '',
    kind: 'alignment',
    variant: 'sidebar',
    height: 640,
  },
] as const
export type SidebarScene = (typeof sidebarScenes)[number]
export const descriptions: Readonly<Record<string, string>> = {
  Layouts:
    '3 layout options: sidebar default, floating to elevate the sidebar in a higher surface, inset to make your content stand out.',
  Nesting: '2 levels of nesting, one section level and one parent level.',
  'Actions & badges':
    'Add badge indicator and up to 3 actions. Actions show on hover so the label keeps maximum readability.',
  'Header & footer': 'Stack the header and footer content vertically or horizontally.',
  Callouts: 'Elevate & promote news using the callout with stackable Banners or Inlines.',
  'Resize, collapse & peek':
    'Drag to resize, click to collapse, or press [ key. Open sidebar on click or hover.',
  'Functional and perfectly aligned':
    'One rhythm everywhere: 24px icon buttons with 16px icons from header to footer.',
}
