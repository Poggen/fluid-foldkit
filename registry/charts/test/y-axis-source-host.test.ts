// oxlint-disable no-comments/no-comments -- Real renderers and NumberFlow need browser classes at module acquisition.
// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume the source comment policy.
import { expect, test } from 'vitest'
import { YAxis } from '@foldkit-visuals/charts/candlestick'
import { ReferenceArea } from '@foldkit-visuals/charts'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type { ChartValue } from '@tanstack/charts'
import type { CartesianViewInputs } from '../src/cartesian/block'
import { nativeObservations } from '../src/cartesian/native-resource'
import { initialInteraction } from '../src/cartesian/state'
import type { Configuration } from '../src/cartesian/state'
import { fontTestEnvironment } from './font-test-environment'
import {
  bar,
  barProps,
  candle,
  candleProps,
  scatter,
  scatterProps,
  rows,
  size,
  twentyTicks,
} from './y-axis-source.fixture'

function mount<Row, Datum, X extends ChartValue, Y extends ChartValue, Snapshot, Options>(
  element: HTMLElement,
  inputs: CartesianViewInputs<Row, Datum, X, Y, Snapshot, Options>,
  configuration: Configuration,
  data: ReadonlyArray<Row>,
) {
  const resource = inputs.createResource?.(element, nativeObservations(element), () => 1000)
  if (resource === undefined || inputs.resourceDefinition === undefined) {
    throw new Error('Public chart must expose its real renderer resource')
  }
  const surface = document.createElement('div')
  element.append(surface)
  const state = { ...initialInteraction(configuration), phaseClockReady: true, revealReady: true }
  const renderer = motion<Datum, X, Y>({ initial: false })
  const definition = inputs.resourceDefinition(data, state, resource.draw, () => 1000)
  const host = mountChartRenderer(surface, {
    ...size,
    definition,
    renderer,
    ariaLabel: inputs.ariaLabel,
  })
  resource.attach(host)
  resource.update(state, data, null)
  return {
    configure(next: typeof inputs) {
      if (next.configureResource?.(resource) !== true || next.resourceDefinition === undefined) {
        throw new Error('Reconfiguration must retain the public resource')
      }
      host.update({
        width: next.width ?? size.width,
        height: next.height ?? size.height,
        renderer,
        ariaLabel: next.ariaLabel,
        definition: next.resourceDefinition(data, state, resource.draw, () => 1000),
      })
      resource.update(state, data, null)
    },
    destroy() {
      resource.destroy()
      host.destroy()
    },
  }
}

const groupSelector = '[data-ts-key$=":source-y-axes"]'
const labels = (element: Element, scale = '') => [
  ...element.querySelectorAll(
    `${groupSelector} text${scale === '' ? '' : `[data-ts-key^="${scale}-tick-label:"]`}`,
  ),
]
const texts = (element: Element, scale = '') =>
  labels(element, scale).map((label) => label.textContent)

for (const family of ['bar', 'candle', 'scatter']) {
  test(`${family} mounts numeric labels once in the engine SVG with source geometry`, () => {
    const environment = fontTestEnvironment()
    const element = environment.container
    const mounted =
      family === 'bar'
        ? mount(element, bar.inputs('axes', barProps()), bar.configuration(barProps()), rows)
        : family === 'candle'
          ? mount(
              element,
              candle.inputs('axes', candleProps()),
              candle.configuration(candleProps()),
              rows,
            )
          : mount(
              element,
              scatter.inputs('axes', scatterProps()),
              scatter.configuration(scatterProps()),
              rows,
            )
    try {
      environment.flush()
      const group = element.querySelector(groupSelector)
      expect(element.querySelectorAll(groupSelector)).toHaveLength(1)
      expect(group?.namespaceURI).toBe('http://www.w3.org/2000/svg')
      expect(group?.parentElement?.tagName.toLowerCase()).toBe('svg')
      expect(group?.closest('[clip-path]')).toBeNull()
      for (let ancestor = group?.parentElement; ancestor; ancestor = ancestor.parentElement) {
        expect(getComputedStyle(ancestor).overflow).not.toBe('hidden')
      }
      expect(element.querySelector('.bkm-y-axes')).toBeNull()
      expect(texts(element, 'y')).toEqual(twentyTicks)
      if (family === 'scatter') expect(texts(element, 'y:7')).toEqual(twentyTicks)
      const keys = labels(element).map((label) => label.getAttribute('data-ts-key'))
      expect(new Set(keys).size).toBe(keys.length)
      for (const [index, label] of labels(element).entries()) {
        const right = family === 'scatter' && index < twentyTicks.length
        expect(label.namespaceURI).toBe('http://www.w3.org/2000/svg')
        expect(label.getAttribute('x')).toBe(right ? '374' : '46')
        expect(label.getAttribute('y')).toBe(String(200 - (index % twentyTicks.length) * 9))
        expect(label.getAttribute('text-anchor')).toBe(right ? 'start' : 'end')
        expect(label.getAttribute('dominant-baseline')).toBe('middle')
        expect(label.getAttribute('font-size')).toBe('12')
        expect(label.getAttribute('font-family')).toBe('inherit')
        expect(label.getAttribute('fill')).toBe('var(--chart-label)')
      }
    } finally {
      mounted.destroy()
      environment.destroy()
    }
  })
}

for (const [hint, expected] of [
  [0, []],
  [-1, []],
  [3.2, ['0', '20', '40', '60', '80', '100']],
  [2.4, ['0', '50', '100']],
  [Number.NaN, ['0', '20', '40', '60', '80', '100']],
  [Number.POSITIVE_INFINITY, ['0', '20', '40', '60', '80', '100']],
  [20, twentyTicks],
] satisfies ReadonlyArray<readonly [number, ReadonlyArray<string>]>) {
  test(`all numeric families preserve raw D3 count ${String(hint)} independently of grid count`, () => {
    const environment = fontTestEnvironment()
    const containers = [0, 1, 2].map(() => {
      const element = document.createElement('div')
      environment.container.append(element)
      return element
    })
    const a = containers[0],
      b = containers[1],
      c = containers[2]
    if (a === undefined || b === undefined || c === undefined)
      throw new Error('Missing fixture hosts')
    const mounted = [
      mount(
        a,
        bar.inputs('bar', barProps({ numTicks: hint })),
        bar.configuration(barProps()),
        rows,
      ),
      mount(
        b,
        candle.inputs('candle', candleProps({ numTicks: hint })),
        candle.configuration(candleProps()),
        rows,
      ),
      mount(
        c,
        scatter.inputs('scatter', scatterProps({ yAxisId: 7, numTicks: hint })),
        scatter.configuration(scatterProps()),
        rows,
      ),
    ]
    try {
      expect(texts(a)).toEqual(expected)
      expect(texts(b)).toEqual(expected)
      expect(texts(c, 'y:7')).toEqual(expected)
      expect(texts(c, 'y')).toEqual(twentyTicks)
    } finally {
      for (const chart of mounted) chart.destroy()
      environment.destroy()
    }
  })
}

test('Scatter keeps distinct-axis identities through reorder, explicit side, resize and literal formatter updates', () => {
  const environment = fontTestEnvironment()
  const element = environment.container
  const mounted = mount(
    element,
    scatter.inputs('axes', scatterProps()),
    scatter.configuration(scatterProps()),
    rows,
  )
  try {
    const secondaryZero = labels(element, 'y:7')[0]
    const primaryZero = labels(element, 'y')[0]
    const props = scatterProps()
    mounted.configure(
      scatter.inputs('axes', {
        ...props,
        width: 480,
        height: 300,
        margin: { top: 30, bottom: 50, left: 60, right: 70 },
        children: [
          ...props.children.filter((child) => child.kind !== 'yAxis'),
          YAxis({ orientation: 'right', numTicks: 20 }),
          YAxis({
            yAxisId: 7,
            orientation: 'left',
            numTicks: 3.2,
            formatValue: (value) => `<b>&"${value}</b>`,
          }),
        ],
      }),
    )
    expect(labels(element, 'y:7')[0]).toBe(secondaryZero)
    expect(labels(element, 'y')[0]).toBe(primaryZero)
    expect(secondaryZero?.getAttribute('x')).toBe('56')
    expect(secondaryZero?.getAttribute('y')).toBe('250')
    expect(secondaryZero?.getAttribute('text-anchor')).toBe('end')
    expect(primaryZero?.getAttribute('x')).toBe('414')
    expect(primaryZero?.getAttribute('text-anchor')).toBe('start')
    expect(texts(element, 'y:7')).toEqual(
      ['0', '20', '40', '60', '80', '100'].map((value) => `<b>&"${value}</b>`),
    )
    expect(element.querySelector(`${groupSelector} b`)).toBeNull()
    mounted.configure(
      scatter.inputs('axes', {
        ...props,
        children: props.children.filter((child) => child.kind !== 'yAxis'),
      }),
    )
    expect(element.querySelector(groupSelector)).toBeNull()
    expect(element.querySelector('.bkm-y-axes')).toBeNull()
  } finally {
    mounted.destroy()
    environment.destroy()
  }
})

test('Candle retains negative abbreviations, literal opt-out and inclusive first reference fill', () => {
  const environment = fontTestEnvironment()
  const data = rows.map((row) => ({ ...row, low: -2000, high: 2000 }))
  const props = candleProps({})
  const mounted = mount(
    environment.container,
    candle.inputs('negative', {
      ...props,
      children: [
        ...props.children,
        ReferenceArea({ y1: -2000, y2: 0, axisLabelColor: 'pink' }),
        ReferenceArea({ y1: 0, y2: 2000, axisLabelColor: 'blue' }),
      ],
    }),
    candle.configuration(props),
    data,
  )
  try {
    expect(texts(environment.container)).toEqual(['-2k', '-1k', '0', '1k', '2k'])
    expect(labels(environment.container).map((label) => label.getAttribute('fill'))).toEqual([
      'pink',
      'pink',
      'pink',
      'blue',
      'blue',
    ])
    mounted.configure(candle.inputs('negative', candleProps({ formatLargeNumbers: false })))
    expect(texts(environment.container)).toEqual(['-2000', '-1000', '0', '1000', '2000'])
    expect(
      labels(environment.container).every(
        (label) => label.getAttribute('fill') === 'var(--chart-label)',
      ),
    ).toBe(true)
  } finally {
    mounted.destroy()
    environment.destroy()
  }
})

test('horizontal Bar retains its existing primary-x-as-top numeric extension', () => {
  const environment = fontTestEnvironment()
  const props = { ...barProps({ numTicks: 2 }), orientation: 'horizontal' } satisfies Parameters<
    typeof bar.inputs
  >[1]
  const mounted = mount(
    environment.container,
    bar.inputs('horizontal', props),
    bar.configuration(props),
    rows,
  )
  try {
    expect(texts(environment.container)).toEqual(['0', '50', '100'])
    expect(labels(environment.container).map((label) => label.getAttribute('y'))).toEqual([
      '20',
      '180',
      '340',
    ])
  } finally {
    mounted.destroy()
    environment.destroy()
  }
})

test('repeated same-side carriers keep distinct keys at the existing shared edge', () => {
  const environment = fontTestEnvironment()
  const props = scatterProps({ yAxisId: 7, orientation: 'left', numTicks: 2 })
  const mounted = mount(
    environment.container,
    scatter.inputs('repeated', {
      ...props,
      children: [...props.children, YAxis({ yAxisId: 7, orientation: 'left', numTicks: 2 })],
    }),
    scatter.configuration(props),
    rows,
  )
  try {
    const secondary = labels(environment.container, 'y:7')
    expect(secondary.map((label) => label.textContent)).toEqual([
      '0',
      '50',
      '100',
      '0',
      '50',
      '100',
    ])
    expect(secondary.every((label) => label.getAttribute('x') === '46')).toBe(true)
    expect(new Set(secondary.map((label) => label.getAttribute('data-ts-key'))).size).toBe(6)
  } finally {
    mounted.destroy()
    environment.destroy()
  }
})
