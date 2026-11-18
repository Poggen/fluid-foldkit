// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- Sankey label width dependencies
import { describe, afterEach, beforeEach, expect, test } from 'vitest'
import { createChartRuntime } from '@tanstack/charts'
import { SankeyNode } from '../carriers'
import { sankeyDefinition } from '../build'
import { sankeyFontMeasurement } from '../font-measurement'
import type { SankeyChartProps } from '../props'
import type { SankeyDatum } from '../marks'
import { fontTestEnvironment } from '../../../test/font-test-environment'

describe('Sankey font measurements', () => {
  let environment: ReturnType<typeof fontTestEnvironment>

  let originalFamily = ''

  beforeEach(() => {
    environment = fontTestEnvironment()
    originalFamily = document.body.style.fontFamily
    document.body.style.fontFamily = 'Original'
  })

  afterEach(() => {
    document.body.style.fontFamily = originalFamily
    environment.destroy()
  })

  const data: SankeyChartProps['data'] = {
    nodes: [{ name: 'Start', category: 'source' }, { name: 'End' }],
    links: [{ source: 0, target: 1, value: 12 }],
  }

  const ignoreReverse = () => {}

  const clock = () => 0

  const draw = (collector: ReturnType<typeof sankeyFontMeasurement>, props: SankeyChartProps) => {
    const runtime = createChartRuntime<SankeyDatum, number, number>()
    collector.beginFontMetrics()

    try {
      const scene = runtime.render(
        sankeyDefinition(
          props,
          'font-widths',
          ignoreReverse,
          clock,
          undefined,
          undefined,
          undefined,
          collector.measure,
        ),
        { width: 630, height: 315 },
      )

      collector.commitFontMetrics()

      return scene
    } finally {
      runtime.destroy()
    }
  }

  test('authored label occurrences and default formatted strings participate in width capture', () => {
    const collector = sankeyFontMeasurement(environment.container)

    const props = {
      data,
      children: [SankeyNode(), SankeyNode({ labelOrientation: 'vertical' })],
    }

    draw(collector, props)
    expect(environment.measure.mock.calls.map(([text]) => text)).toEqual(
      expect.arrayContaining(['Start', 'End', '12 sessions']),
    )
    expect(collector.fontMetricsChanged()).toBe(false)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Finite per-label glyph bounds exercise metric invalidation independently of native font availability.
    environment.measure.mockImplementation((text) => ({
      width: text.endsWith('sessions') ? 40 : 20,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 20,
      actualBoundingBoxAscent: 9,
      actualBoundingBoxDescent: 3,
    }))
    expect(collector.fontMetricsChanged()).toBe(true)
  })

  test('size and weight distinguish identical strings, and late overflow remains conservative', () => {
    const collector = sankeyFontMeasurement(environment.container, 1)
    collector.beginFontMetrics()
    collector.measure('same', 13, 500, 'Original', 0.55)
    collector.commitFontMetrics()
    expect(environment.context.font).toBe('500 13px Original')
    expect(collector.fontMetricsChanged()).toBe(false)
    collector.measure('same', 11, 400, 'Original', 0.55)
    expect(environment.context.font).toBe('400 11px Original')
    expect(collector.fontMetricsChanged()).toBe(true)
  })

  test('hidden, removed and empty roles retire previous dependencies after successful layout', () => {
    const collector = sankeyFontMeasurement(environment.container)
    draw(collector, { data, children: [SankeyNode()] })
    draw(collector, { data, children: [SankeyNode({ showValueLabels: false })] })
    environment.measure.mockClear()
    expect(collector.fontMetricsChanged()).toBe(false)
    expect(environment.measure.mock.calls.map(([text]) => text)).toEqual(['Start', 'End'])
    draw(collector, { data, children: [SankeyNode({ showLabels: false })] })
    environment.measure.mockClear()
    environment.setBounds({ width: 40 })
    expect(collector.fontMetricsChanged()).toBe(false)
    expect(environment.measure).not.toHaveBeenCalled()
    draw(collector, { data, children: [] })
    expect(collector.fontMetricsChanged()).toBe(false)
    draw(collector, { data: { nodes: [], links: [] }, children: [SankeyNode()] })
    expect(collector.fontMetricsChanged()).toBe(false)
  })

  test('changed body typography and failed layout stay conservative', () => {
    const collector = sankeyFontMeasurement(environment.container)
    draw(collector, { data, children: [SankeyNode()] })
    document.body.style.fontFamily = 'Replacement'
    expect(collector.fontMetricsChanged()).toBe(true)
    document.body.style.fontFamily = 'Original'
    collector.beginFontMetrics()
    expect(collector.fontMetricsChanged()).toBe(true)
  })

  test('unavailable canvas keeps the original width estimate and conservative invalidation', () => {
    environment.unavailable()
    const collector = sankeyFontMeasurement(environment.container)
    collector.beginFontMetrics()
    expect(collector.measure('four', 13, 500, 'Original', 0.55)).toBe(4 * 13 * 0.55)
    collector.commitFontMetrics()
    expect(collector.fontMetricsChanged()).toBe(true)
  })
})
