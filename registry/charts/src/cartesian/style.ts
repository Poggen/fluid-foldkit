import type { ChartStyle } from './content-types'

const chartStyleEntries: (
  style: ChartStyle | undefined,
) => ReadonlyArray<readonly [string, string]> = function chartStyleEntries(
  style: ChartStyle | undefined,
) {
  const entries: Array<readonly [string, string]> = []

  for (const [name, value] of Object.entries(style ?? {})) {
    if (value === undefined) continue
    const custom = name.startsWith('--')

    const property = custom
      ? name
      : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^ms-/, '-ms-')

    const base = name.replace(
      /^(Webkit|Moz|ms|O)([A-Z])/,
      (_match: string, _prefix: string, letter: string) => letter.toLowerCase(),
    )

    entries.push([
      property,
      typeof value === 'number' && value !== 0 && !custom && !unitless.has(base)
        ? `${value}px`
        : String(value),
    ])
  }

  return entries
}

export const applyChartStyle: (element: HTMLElement, style: ChartStyle | undefined) => void =
  function applyChartStyle(element: HTMLElement, style: ChartStyle | undefined) {
    for (const [property, value] of chartStyleEntries(style))
      element.style.setProperty(property, value)
  }

export const replaceChartStyle: (
  element: HTMLElement,
  previous: ChartStyle | undefined,
  next: ChartStyle | undefined,
) => void = function replaceChartStyle(
  element: HTMLElement,
  previous: ChartStyle | undefined,
  next: ChartStyle | undefined,
) {
  const retained = new Set(chartStyleEntries(next).map(([name]) => name))

  for (const [name] of chartStyleEntries(previous))
    if (!retained.has(name)) element.style.removeProperty(name)
  applyChartStyle(element, next)
}

export const parseAspectRatio: (value: string | undefined) => number = function parseAspectRatio(
  value: string | undefined,
) {
  if (value === undefined) return 2
  const [width, height] = value.split('/').map((part) => Number.parseFloat(part.trim()))

  if (
    width !== undefined &&
    height !== undefined &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width !== 0 &&
    height > 0
  )
    return width / height
  const single = Number.parseFloat(value)

  return Number.isFinite(single) && single > 0 ? single : 2
}

const unitless = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'fillOpacity',
  'floodOpacity',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'fontWeight',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
])

export const chartStyleText: (style: ChartStyle) => string = (style: ChartStyle) =>
  chartStyleEntries(style)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')

export const bklitSurfaceStyle: ChartStyle = {
  '--ts-chart-tooltip-background': 'var(--chart-tooltip-background)',
  '--ts-chart-tooltip-color': 'var(--chart-tooltip-foreground)',
  '--ts-chart-tooltip-border': '0',
  '--ts-chart-tooltip-border-radius': 'var(--radius-lg, 0.5rem)',
  '--ts-chart-tooltip-padding': '0',
  '--ts-chart-tooltip-max-width': 'none',
  '--ts-chart-tooltip-shadow': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '--ts-chart-tooltip-font':
    '400 0.875rem/1.25rem var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
  '--ts-chart-focus-fill': 'var(--chart-background)',
  '--ts-chart-crosshair-label-halo': 'transparent',
}

/** Property-level patches preserve animation-owned inline styles on the same element. */
export const chartStyleProperties: (style: ChartStyle) => Record<string, string> = (
  style: ChartStyle,
) => Object.fromEntries(chartStyleEntries(style))
