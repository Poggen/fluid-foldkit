import { Schema } from 'effect'
import type { ComponentPage } from '../../../lib/catalogue'
import { PreviewOptions } from './options'

export type PropName = keyof PreviewOptions
export type Control =
  | {
      readonly kind: 'choice'
      readonly prop: PropName
      readonly values: ReadonlyArray<string | number>
      readonly initial: string | number
    }
  | { readonly kind: 'toggle'; readonly prop: PropName; readonly initial: boolean }
  | {
      readonly kind: 'text'
      readonly prop: PropName
      readonly initial: string
      readonly values: ReadonlyArray<string>
    }
  | {
      readonly kind: 'number'
      readonly prop: PropName
      readonly initial: number
      readonly min: number
      readonly max: number
      readonly step: number
    }
const choice = (
  prop: PropName,
  values: ReadonlyArray<string | number>,
  initial = values[0] ?? '',
): Control => ({ kind: 'choice', prop, values, initial })
const toggle = (prop: PropName, initial = false): Control => ({ kind: 'toggle', prop, initial })
const text = (prop: PropName, initial: string): Control => ({
  kind: 'text',
  prop,
  initial,
  values: initial.startsWith('#')
    ? [initial, '#A088BF', '#22C55E', '#F59E0B']
    : prop === 'placeholder'
      ? [initial, 'Your next great idea…', 'Search the collection…']
      : [initial, 'Make it yours', 'Studio notes', 'A little more detail'],
})
const number = (prop: PropName, initial: number, min: number, max: number, step = 1): Control => ({
  kind: 'number',
  prop,
  initial,
  min,
  max,
  step,
})
const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive']
const size = choice('size', ['default', 'compact'])
const disabled = toggle('disabled')
const input = [
  text('placeholder', 'Your next idea'),
  text('value', ''),
  disabled,
  toggle('readOnly'),
]
const controls: Readonly<Record<string, ReadonlyArray<Control>>> = {
  button: [
    choice('variant', variants),
    choice('buttonSize', ['default', 'compact']),
    {
      kind: 'text',
      prop: 'label',
      initial: 'Get started',
      values: ['Get started', 'Learn more', 'Deploy', 'Continue', 'Ship it'],
    },
    toggle('iconOnly'),
    toggle('leadingIcon'),
    toggle('trailingIcon'),
    toggle('loading'),
    toggle('active'),
    disabled,
  ],
  badge: [
    choice('variant', ['solid', 'dot']),
    choice('color', [
      'gray',
      'red',
      'orange',
      'amber',
      'yellow',
      'lime',
      'green',
      'emerald',
      'teal',
      'cyan',
      'blue',
      'indigo',
      'violet',
      'purple',
      'fuchsia',
      'pink',
      'rose',
    ]),
    text('label', 'Published'),
  ],
  card: [
    choice('cardOrientation', ['inline', 'card']),
    choice('surface', [1, 2, 3, 4, 5, 6, 7, 8]),
    toggle('separated'),
    toggle('selected'),
    disabled,
    text('label', 'Fluid motion'),
  ],
  accordion: [
    choice('expand', ['one', 'oneOrNone', 'any'], 'oneOrNone'),
    toggle('highlightExpanded', true),
  ],
  input: [choice('type', ['text', 'email', 'password', 'number', 'search', 'url']), ...input],
  textarea: input,
  field: [text('label', 'Your name'), ...input],
  'input-group': input,
  'input-copy': [
    text('value', 'bunx shadcn@4.23.0 add @fluid-foldkit/button'),
    text('label', 'Copy install command'),
    choice('variant', ['icon', 'button']),
    choice('align', ['left', 'right'], 'right'),
    disabled,
  ],
  switch: [text('label', 'Notifications'), toggle('checked', true), disabled],
  checkbox: [text('label', 'Notifications'), toggle('checked', true), disabled],
  select: [
    text('placeholder', 'Choose a role'),
    choice('variant', ['bordered', 'borderless']),
    disabled,
  ],
  combobox: [
    text('placeholder', 'Choose components'),
    toggle('multiple', true),
    choice('variant', ['bordered', 'borderless']),
    disabled,
    toggle('clearable', true),
  ],
  'command-menu': [text('placeholder', 'Type a command or search…')],
  tabs: [disabled],
  slider: [
    number('value', 35, 0, 100),
    number('min', 0, -100, 0),
    number('max', 100, 100, 200),
    number('step', 1, 1, 20),
    choice('variant', ['pips', 'scrubber']),
    toggle('showValue', true),
    disabled,
  ],
  'checkbox-group': [],
  'radio-group': [],
  tooltip: [text('label', 'A little detail'), choice('side', ['top', 'right', 'bottom', 'left'])],
  dropdown: [text('label', 'Actions'), choice('menuPresentation', ['inline', 'popup']), disabled],
  banner: [
    choice('variant', ['default', 'info', 'success', 'warning', 'error']),
    text('label', 'A little room for something important'),
  ],
  breadcrumb: [text('label', 'Recent')],
  'chat-message': [text('label', 'A comfortable space for conversation')],
  'thinking-indicator': [size],
  'thinking-steps': [text('label', 'Thinking through the details')],
  'input-message': [text('placeholder', 'Ask a question…'), disabled],
  'ask-user-questions': [text('label', 'Make it yours')],
  sidebar: [
    choice('variant', ['inset', 'floating', 'sidebar']),
    choice('side', ['left', 'right']),
    number('width', 224, 180, 320, 8),
  ],
  dialog: [
    text('label', 'A little focus'),
    choice('modalSize', ['sm', 'lg', 'xl']),
    choice('position', ['center', 'top']),
    toggle('showCloseButton', true),
  ],
  table: [size],
  'carousel-dots': [number('count', 4, 1, 8), toggle('autoplay', true), toggle('loop', true)],
  calendar: [
    choice('type', ['single', 'range'], 'range'),
    choice('numberOfMonths', [1, 2], 2),
    choice('orientation', ['horizontal', 'vertical']),
    toggle('showWeekNumber'),
  ],
  'date-picker': [
    choice('type', ['single', 'range']),
    choice('variant', ['outline', 'ghost']),
    choice('calendarOrientation', ['auto', 'horizontal', 'vertical']),
    choice('numberOfMonths', [1, 2]),
    text('placeholder', 'Choose a date'),
    disabled,
    toggle('clearable', true),
  ],
  'color-picker': [text('value', '#6B97FF'), toggle('hideEyedropper')],
}
const chartControls: Readonly<Record<string, ReadonlyArray<Control>>> = {
  gauge: [
    choice('gaugeOrientation', ['arc', 'linear']),
    choice('labelPlacement', ['bottom', 'top', 'left', 'right']),
    choice('labelAlign', ['center', 'start', 'end']),
    number('value', 72, 0, 100),
  ],
  line: [
    number('height', 210, 120, 420, 30),
    number('strokeWidth', 2, 1, 5),
    toggle('showGrid', true),
    toggle('showAxis', true),
    toggle('showTooltip', true),
  ],
  area: [
    number('height', 210, 120, 420, 30),
    toggle('showGrid', true),
    toggle('showAxis', true),
    toggle('showTooltip', true),
  ],
  bar: [
    number('height', 210, 120, 420, 30),
    toggle('showGrid', true),
    toggle('showAxis', true),
    toggle('showTooltip', true),
  ],
  composed: [
    number('height', 210, 120, 420, 30),
    toggle('showGrid', true),
    toggle('showAxis', true),
    toggle('showTooltip', true),
  ],
  scatter: [
    number('height', 210, 120, 420, 30),
    toggle('showGrid', true),
    toggle('showAxis', true),
  ],
  candlestick: [
    number('height', 210, 120, 420, 30),
    toggle('showGrid', true),
    toggle('showAxis', true),
  ],
  pie: [number('innerRadius', 68, 0, 100, 10)],
  ring: [
    number('strokeWidth', 16, 4, 28, 2),
    number('ringGap', 8, 2, 20, 2),
    number('baseInnerRadius', 30, 10, 80, 5),
  ],
  radar: [toggle('showLabels', true)],
  funnel: [
    choice('edges', ['curved', 'straight']),
    choice('labelLayout', ['spread', 'grouped']),
    choice('orientation', ['horizontal', 'vertical']),
    toggle('showLabels', true),
    toggle('showValue', true),
  ],
  heatmap: [choice('aspectRatio', ['3 / 1', '2 / 1', '1 / 1'])],
  'live-line': [number('height', 210, 120, 420, 30)],
  sunburst: [number('size', 260, 180, 420, 30)],
  sankey: [
    choice('aspectRatio', ['2 / 1', '3 / 1', '1 / 1']),
    number('nodeWidth', 12, 6, 30, 2),
    number('nodePadding', 12, 4, 30, 2),
  ],
  choropleth: [toggle('zoomEnabled', true), number('scale', 50, 25, 100, 5)],
  brush: [number('height', 80, 80, 200, 20)],
  legend: [
    toggle('showProgress'),
    toggle('showValue', true),
    toggle('showMarker', true),
    toggle('showPercentage'),
  ],
  'tooltip-box': [text('label', 'Revenue'), number('value', 72, 0, 100)],
  'series-point-marker': [number('radius', 7, 3, 14)],
  'stat-flow': [number('value', 12480, 0, 50000, 1000)],
  'bar-skeleton': [number('barCount', 14, 2, 24)],
}
export const controlsFor = (page: ComponentPage): ReadonlyArray<Control> => {
  const specific = (page.family === 'fluid' ? controls : chartControls)[page.slug]
  if (specific === undefined) throw new Error(`Missing playground: ${page.family}/${page.slug}`)
  return specific
}
export const initialProps = (page: ComponentPage): PreviewOptions =>
  Schema.decodeUnknownSync(PreviewOptions)(
    Object.fromEntries(controlsFor(page).map((control) => [control.prop, control.initial])),
  )
