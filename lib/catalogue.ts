import { systemPages } from './system'
export { systemPages } from './system'
// Fluid descriptions derived from cc276ca0. MIT, copyright 2026 Micka Touillaud.
export interface ComponentPage {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly family: 'fluid' | 'charts'
  readonly isNew?: boolean
  readonly href: string
}
const fluidDefinitions: ReadonlyArray<ComponentPage> = [
  {
    slug: 'input-message',
    name: 'InputMessage',
    description:
      'Chat-style message composer with an auto-resizing textarea, flexible left/right action slots, and a built-in send button on a Surface-2 substrate.',
    family: 'fluid',
    href: '/components/input-message',
  },
  {
    slug: 'thinking-indicator',
    name: 'ThinkingIndicator',
    description: 'Animated status indicator with morphing SVG and cycling text.',
    family: 'fluid',
    href: '/components/thinking-indicator',
  },
  {
    slug: 'switch',
    name: 'Switch',
    description: 'Toggle switch with animated thumb and label.',
    family: 'fluid',
    href: '/components/switch',
  },
  {
    slug: 'color-picker',
    name: 'ColorPicker',
    description:
      'Color picker with HEX, RGB, HSL, and OKLCH formats, alpha channel, optional swatches, and an eyedropper. Available as an inline panel or popover.',
    family: 'fluid',
    href: '/components/color-picker',
  },
  {
    slug: 'accordion',
    name: 'Accordion',
    description:
      'Collapsible sections with animated expand/collapse and fluid hover in grouped mode.',
    family: 'fluid',
    href: '/components/accordion',
  },
  {
    slug: 'ask-user-questions',
    name: 'AskUserQuestions',
    description:
      "Stepped question flow with 2–5 options, single or multi-select, inline 'other' input, optional skip, and multi-question navigation.",
    family: 'fluid',
    href: '/components/ask-user-questions',
  },
  {
    slug: 'badge',
    name: 'Badge',
    description:
      'Compact label for status, category, or metadata. Supports solid and dot variants with Tailwind colors.',
    family: 'fluid',
    href: '/components/badge',
  },
  {
    slug: 'banner',
    name: 'Banner',
    description:
      'A status message: 1 colored icon, a title, an optional description and up to 3 actions.',
    family: 'fluid',
    href: '/components/banner',
  },
  {
    slug: 'breadcrumb',
    name: 'Breadcrumb',
    description:
      'A trail of links to the current page: one fluid hover across every crumb, icons, a Dropdown on a step, and a collapsed middle.',
    family: 'fluid',
    href: '/components/breadcrumb',
  },
  {
    slug: 'button',
    name: 'Button',
    description: 'Versatile button with variants, sizes, loading state, and icon support.',
    family: 'fluid',
    href: '/components/button',
  },
  {
    slug: 'calendar',
    name: 'Calendar',
    description:
      'Month grid for a day or a range: one fluid hover across both months, a range band that follows the pointer, booked and unavailable days, and week numbers.',
    family: 'fluid',
    href: '/components/calendar',
  },
  {
    slug: 'card',
    name: 'Card',
    description:
      "shadcn's compositional card, dressed in Fluid Functionalism. Stacked, inline, or grid — borderless by default with fluid hover that previews where a click will land.",
    family: 'fluid',
    href: '/components/card',
  },
  {
    slug: 'carousel-dots',
    name: 'CarouselDots',
    description: 'Dots for a carousel, static or on autoplay.',
    family: 'fluid',
    href: '/components/carousel-dots',
  },
  {
    slug: 'chat-message',
    name: 'ChatMessage',
    description:
      'A single chat transcript entry with baked-in entrance and layout motion. Right-aligned accent bubble for the user, left-aligned plain text for the assistant, with optional file attachments and a hover-revealed meta row.',
    family: 'fluid',
    href: '/components/chat-message',
  },
  {
    slug: 'checkbox',
    name: 'Checkbox',
    description:
      'A single checkbox: a hairline square that darkens on hover and a check that draws itself.',
    family: 'fluid',
    href: '/components/checkbox',
  },
  {
    slug: 'checkbox-group',
    name: 'CheckboxGroup',
    description: 'Checkbox group with merged backgrounds for contiguous selections.',
    family: 'fluid',
    href: '/components/checkbox-group',
  },
  {
    slug: 'combobox',
    name: 'Combobox',
    description: 'Type to filter a list. 1 pick, or chips.',
    family: 'fluid',
    href: '/components/combobox',
  },
  {
    slug: 'command-menu',
    name: 'CommandMenu',
    description: '1 field over every action. Type, arrow, Enter.',
    family: 'fluid',
    href: '/components/command-menu',
  },
  {
    slug: 'date-picker',
    name: 'DatePicker',
    description:
      'Outline or ghost trigger for a date, a range, or a date and a time: a calendar popover with presets, and time slot lists that show each duration.',
    family: 'fluid',
    href: '/components/date-picker',
  },
  {
    slug: 'dialog',
    name: 'Dialog',
    description: '3 widths, spring in and out.',
    family: 'fluid',
    href: '/components/dialog',
  },
  {
    slug: 'dropdown',
    name: 'Dropdown',
    description: '2 forms: an inline panel, or a popup on any trigger.',
    family: 'fluid',
    href: '/components/dropdown',
  },
  {
    slug: 'field',
    name: 'Field',
    description: 'Labels, controls, help text, and errors composed into accessible form fields.',
    family: 'fluid',
    href: '/components/field',
  },
  {
    slug: 'input',
    name: 'Input',
    description:
      "A single-line text field in the Select trigger's hairline, with a neutral focus border.",
    family: 'fluid',
    href: '/components/input',
  },
  {
    slug: 'input-copy',
    name: 'InputCopy',
    description: 'Read-only input with a copy-to-clipboard button and animated check feedback.',
    family: 'fluid',
    href: '/components/input-copy',
  },
  {
    slug: 'input-group',
    name: 'InputGroup',
    description: 'Input field group with fluid hover and validation.',
    family: 'fluid',
    href: '/components/input-group',
  },
  {
    slug: 'radio-group',
    name: 'RadioGroup',
    description: 'Radio button group with fluid hover and animated selection.',
    family: 'fluid',
    href: '/components/radio-group',
  },
  {
    slug: 'select',
    name: 'Select',
    description:
      'Animated select menu with fluid hover, bordered/borderless variants, optional leading icons, and spring-animated popover.',
    family: 'fluid',
    href: '/components/select',
  },
  {
    slug: 'sidebar',
    name: 'Sidebar',
    description:
      'A sidebar built from composable parts. Drag its edge to resize, collapse it away, and on mobile it becomes a drawer.',
    family: 'fluid',
    href: '/components/sidebar',
  },
  {
    slug: 'slider',
    name: 'Slider',
    description:
      "One slider, two ladder steps: the default step's pip/scrubber design, and the compact step's dense design with track fill, range mode, and value display.",
    family: 'fluid',
    href: '/components/slider',
  },
  {
    slug: 'table',
    name: 'Table',
    description: 'Data table with row hover effects and semantic markup.',
    family: 'fluid',
    href: '/components/table',
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    description: 'Tab navigation with smooth pill animations.',
    family: 'fluid',
    href: '/components/tabs',
  },
  {
    slug: 'textarea',
    name: 'Textarea',
    description: "A multi-line text field with the Input's hairline that grows with its content.",
    family: 'fluid',
    href: '/components/textarea',
  },
  {
    slug: 'thinking-steps',
    name: 'ThinkingSteps',
    description:
      'Chain-of-thought reasoning display with collapsible steps, sequential animation, source badges, and image support.',
    family: 'fluid',
    href: '/components/thinking-steps',
  },
  {
    slug: 'tooltip',
    name: 'Tooltip',
    description:
      'Floating tooltip with spring-based animations, configurable placement, and rich content support.',
    family: 'fluid',
    href: '/components/tooltip',
  },
]
// cc276ca0 lib/changelog/load.ts: pending ahead of the latest pinned release, 2026-10.
const pendingReleaseSlugs = new Set(['field', 'checkbox', 'input', 'textarea', 'breadcrumb'])

export const fluidPages: ReadonlyArray<ComponentPage> = [
  'input-message',
  'thinking-indicator',
  'color-picker',
  'switch',
  'combobox',
  'card',
  'select',
  'command-menu',
  'tooltip',
  'badge',
  'sidebar',
  'radio-group',
  'chat-message',
  'thinking-steps',
  'tabs',
  'checkbox-group',
  'ask-user-questions',
  'slider',
  'dropdown',
  'banner',
  'input-copy',
  'accordion',
  'input-group',
  'carousel-dots',
  'button',
  'breadcrumb',
  'table',
  'dialog',
  'calendar',
  'date-picker',
  'checkbox',
  'input',
  'textarea',
  'field',
]
  .flatMap((slug) => fluidDefinitions.filter((page) => page.slug === slug))
  .map((page) => ({ ...page, isNew: pendingReleaseSlugs.has(page.slug) }))
export const chartPages: ReadonlyArray<ComponentPage> = [
  {
    slug: 'gauge',
    name: 'Gauge',
    description: 'Native Bklit / TanStack Gauge composition.',
    family: 'charts',
    href: '/charts/gauge',
  },
  {
    slug: 'line',
    name: 'Line',
    description: 'Native Bklit / TanStack Line composition.',
    family: 'charts',
    href: '/charts/line',
  },
  {
    slug: 'area',
    name: 'Area',
    description: 'Native Bklit / TanStack Area composition.',
    family: 'charts',
    href: '/charts/area',
  },
  {
    slug: 'bar',
    name: 'Bar',
    description: 'Native Bklit / TanStack Bar composition.',
    family: 'charts',
    href: '/charts/bar',
  },
  {
    slug: 'composed',
    name: 'Composed',
    description: 'Native Bklit / TanStack Composed composition.',
    family: 'charts',
    href: '/charts/composed',
  },
  {
    slug: 'pie',
    name: 'Pie',
    description: 'Native Bklit / TanStack Pie composition.',
    family: 'charts',
    href: '/charts/pie',
  },
  {
    slug: 'ring',
    name: 'Ring',
    description: 'Native Bklit / TanStack Ring composition.',
    family: 'charts',
    href: '/charts/ring',
  },
  {
    slug: 'radar',
    name: 'Radar',
    description: 'Native Bklit / TanStack Radar composition.',
    family: 'charts',
    href: '/charts/radar',
  },
  {
    slug: 'funnel',
    name: 'Funnel',
    description: 'Native Bklit / TanStack Funnel composition.',
    family: 'charts',
    href: '/charts/funnel',
  },
  {
    slug: 'scatter',
    name: 'Scatter',
    description: 'Native Bklit / TanStack Scatter composition.',
    family: 'charts',
    href: '/charts/scatter',
  },
  {
    slug: 'candlestick',
    name: 'Candlestick',
    description: 'Native Bklit / TanStack Candlestick composition.',
    family: 'charts',
    href: '/charts/candlestick',
  },
  {
    slug: 'heatmap',
    name: 'Heatmap',
    description: 'Native Bklit / TanStack Heatmap composition.',
    family: 'charts',
    href: '/charts/heatmap',
  },
  {
    slug: 'live-line',
    name: 'LiveLine',
    description: 'Native Bklit / TanStack LiveLine composition.',
    family: 'charts',
    href: '/charts/live-line',
  },
  {
    slug: 'sunburst',
    name: 'Sunburst',
    description: 'Native Bklit / TanStack Sunburst composition.',
    family: 'charts',
    href: '/charts/sunburst',
  },
  {
    slug: 'sankey',
    name: 'Sankey',
    description: 'Native Bklit / TanStack Sankey composition.',
    family: 'charts',
    href: '/charts/sankey',
  },
  {
    slug: 'choropleth',
    name: 'Choropleth',
    description: 'Native Bklit / TanStack Choropleth composition.',
    family: 'charts',
    href: '/charts/choropleth',
  },
  {
    slug: 'brush',
    name: 'Brush',
    description: 'Native Bklit / TanStack Brush composition.',
    family: 'charts',
    href: '/charts/brush',
  },
  {
    slug: 'legend',
    name: 'Legend',
    description: 'Native Bklit / TanStack Legend composition.',
    family: 'charts',
    href: '/charts/legend',
  },
  {
    slug: 'tooltip-box',
    name: 'TooltipBox',
    description: 'Native Bklit / TanStack TooltipBox composition.',
    family: 'charts',
    href: '/charts/tooltip-box',
  },
  {
    slug: 'series-point-marker',
    name: 'SeriesPointMarker',
    description: 'Native Bklit / TanStack SeriesPointMarker composition.',
    family: 'charts',
    href: '/charts/series-point-marker',
  },
  {
    slug: 'stat-flow',
    name: 'StatFlow',
    description: 'Native Bklit / TanStack StatFlow composition.',
    family: 'charts',
    href: '/charts/stat-flow',
  },
  {
    slug: 'bar-skeleton',
    name: 'BarSkeleton',
    description: 'Native Bklit / TanStack BarSkeleton composition.',
    family: 'charts',
    href: '/charts/bar-skeleton',
  },
]
export const componentPages = [...fluidPages, ...chartPages]
export const guidePages = [
  { href: '/', name: 'Showcase' },
  { href: '/introduction', name: 'Introduction' },
  { href: '/installation', name: 'Installation' },
  { href: '/blocks', name: 'Blocks & Layers' },
]
export const documentationPages = [
  ...guidePages,
  ...systemPages,
  ...fluidPages.toSorted((a, b) => a.name.localeCompare(b.name)),
  ...chartPages,
]
export const pages = [...guidePages, ...systemPages]
export const pageAt = (path: string) => componentPages.find((page) => page.href === path)
export const knownPath = (path: string) =>
  pages.some((page) => page.href === path) || pageAt(path) !== undefined
