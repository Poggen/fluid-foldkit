// @vitest-environment happy-dom -- public Sankey scene and renderer font lifecycle
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { motion } from '@tanstack/charts/motion'
import type { ChartRendererHostOptions, ChartScene } from '@tanstack/charts'
import { mountCartesianRenderer } from '../src/cartesian/font-renderer'
import { SankeyNode } from '../src/sankey/carriers'
import { sankeyDefinition } from '../src/sankey/build'
import { sankeyFontMeasurement } from '../src/sankey/font-measurement'
import type { SankeyChartProps } from '../src/sankey/props'
import type { SankeyDatum } from '../src/sankey/marks'
import { fontTestEnvironment } from './font-test-environment'

let environment: ReturnType<typeof fontTestEnvironment>

let originalFamily = ''
let tooltipHost: HTMLElement | undefined

beforeEach(() => {
  environment = fontTestEnvironment()
  originalFamily = document.body.style.fontFamily
  document.body.style.fontFamily = 'Original'
})

afterEach(() => {
  document.body.style.fontFamily = originalFamily
  environment.destroy()
  tooltipHost?.remove()
  tooltipHost = undefined
})

const props: SankeyChartProps = {
  data: {
    nodes: [{ name: 'Start', category: 'source' }, { name: 'End' }],
    links: [{ source: 0, target: 1, value: 12 }],
  },
  animationDuration: 0,
  children: [SankeyNode()],
}

const clock = () => 0

const ignoreReverse = () => {}

const setup = () => {
  // This renderer-only fixture supplies the now-default view-owned tooltip host.
  tooltipHost = document.createElement('div')
  tooltipHost.id = 'font-host-tooltip'
  tooltipHost.hidden = true
  const body = document.createElement('div')
  body.className = 'ts-chart-tooltip__body'
  tooltipHost.append(body)
  document.body.append(tooltipHost)
  const fonts = sankeyFontMeasurement(environment.container)
  const render = vi.fn<() => void>()
  const onFocus = vi.fn<() => void>()

  const options: ChartRendererHostOptions<SankeyDatum, number, number> = {
    renderer: motion({ initial: false }),
    definition: sankeyDefinition(
      props,
      'font-host',
      ignoreReverse,
      clock,
      undefined,
      undefined,
      undefined,
      fonts.measure,
    ),
    width: 630,
    height: 315,
    ariaLabel: 'Font host',
    onRender: render,
    onFocusChange: onFocus,
  }

  const host = mountCartesianRenderer(environment.container, options, () => fonts)

  return { host, fonts, options, render, onFocus }
}

const nodeBox = (scene: ChartScene<SankeyDatum, number, number>, value = false) => {
  const point = scene.points.find((candidate) =>
    candidate.markId.startsWith('sankey:sankey-node-0'),
  )

  const box =
    point !== undefined && 'labelBoxes' in point.datum
      ? point.datum.labelBoxes.at(value ? 1 : 0)
      : undefined

  if (box === undefined) {
    throw new Error('Expected compiled node label hitbox')
  }

  return box
}

test('unchanged fonts skip Sankey compilation and retain the SVG and focused point', () => {
  const { host, render, onFocus } = setup()

  try {
    const svg = environment.container.querySelector('svg')
    const scene = host.getScene()

    const point = scene.points.find((candidate) =>
      candidate.markId.startsWith('sankey:sankey-node-0'),
    )

    host.interaction.setControlledFocus(point ?? null)
    const count = render.mock.calls.length
    const focuses = onFocus.mock.calls.length
    environment.loaded()
    environment.flush()
    expect(render).toHaveBeenCalledTimes(count)
    expect(host.getScene()).toBe(scene)
    expect(environment.container.querySelector('svg')).toBe(svg)
    expect(onFocus).toHaveBeenCalledTimes(focuses)
  } finally {
    host.destroy()
  }
})

test.each([false, true])(
  'actual label advance changes rebuild compiled hitboxes (value=%s)',
  (value) => {
    const { host, render } = setup()

    try {
      const before = nodeBox(host.getScene(), value)
      const svg = environment.container.querySelector('svg')
      const count = render.mock.calls.length
      environment.measure.mockImplementation((text) => ({
        width: (value ? text.endsWith('sessions') : text === 'Start') ? 50 : 20,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 20,
        actualBoundingBoxAscent: 9,
        actualBoundingBoxDescent: 3,
      }))
      environment.loaded()
      environment.flush()
      const after = nodeBox(host.getScene(), value)
      expect(before.x1 - before.x0).toBe(20)
      expect(after.x1 - after.x0).toBe(50)
      expect(render).toHaveBeenCalledTimes(count + 1)
      expect(environment.container.querySelector('svg')).toBe(svg)
      expect(
        host.interaction.resolvePointer((after.x0 + after.x1) / 2, (after.y0 + after.y1) / 2)?.point
          .markId,
      ).toContain('sankey-node-0')
    } finally {
      host.destroy()
    }
  },
)

test('engine glyph-bound changes trigger layout even with unchanged Sankey advance widths', () => {
  const { host, render } = setup()

  try {
    const width = nodeBox(host.getScene()).x1 - nodeBox(host.getScene()).x0
    const count = render.mock.calls.length
    environment.setBounds({ ascent: 17 })
    environment.loaded()
    environment.flush()
    expect(render).toHaveBeenCalledTimes(count + 1)
    expect(nodeBox(host.getScene()).x1 - nodeBox(host.getScene()).x0).toBe(width)
  } finally {
    host.destroy()
  }
})

test('failed compilation never commits external measurements and disposal retires pending font work', () => {
  const { host, fonts, options, render } = setup()

  expect(() => {
    host.update({
      ...options,
      definition: sankeyDefinition(
        props,
        'font-host',
        ignoreReverse,
        clock,
        undefined,
        undefined,
        undefined,
        () => {
          throw new Error('measurement failure')
        },
      ),
    })
  }).toThrow('measurement failure')
  expect(fonts.fontMetricsChanged()).toBe(true)
  host.update(options)
  environment.loaded()
  host.destroy()
  const count = render.mock.calls.length
  environment.loaded()
  environment.flush()
  expect(render).toHaveBeenCalledTimes(count)
  expect(environment.container.querySelector('svg')).toBeNull()
})

type FontCapture = Pick<
  ReturnType<typeof sankeyFontMeasurement>,
  'beginFontMetrics' | 'commitFontMetrics' | 'fontMetricsChanged'
>

test('external font capture commits the same resource that began the successful render', () => {
  const fonts = sankeyFontMeasurement(environment.container)

  const second = {
    fontMetricsChanged: () => false,
    beginFontMetrics: vi.fn<() => void>(),
    commitFontMetrics: vi.fn<() => void>(),
  }

  let current: FontCapture = second

  const first = {
    fontMetricsChanged: fonts.fontMetricsChanged,
    beginFontMetrics: () => {
      fonts.beginFontMetrics()
      current = second
    },
    commitFontMetrics: vi.fn(() => {
      fonts.commitFontMetrics()
    }),
  }

  current = first

  const options: ChartRendererHostOptions<SankeyDatum, number, number> = {
    renderer: motion({ initial: false }),
    definition: sankeyDefinition(
      props,
      'capture-owner',
      ignoreReverse,
      clock,
      undefined,
      undefined,
      undefined,
      fonts.measure,
    ),
    width: 630,
    height: 315,
    ariaLabel: 'Capture owner',
  }

  const host = mountCartesianRenderer(environment.container, options, () => current)

  try {
    expect(first.commitFontMetrics).toHaveBeenCalledTimes(1)
    expect(second.beginFontMetrics).not.toHaveBeenCalled()
    expect(second.commitFontMetrics).not.toHaveBeenCalled()
    environment.loaded()
    environment.flush()
    expect(second.beginFontMetrics).toHaveBeenCalledTimes(1)
    expect(second.commitFontMetrics).toHaveBeenCalledTimes(1)
  } finally {
    host.destroy()
  }
})
