// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- layout owns one body-font snapshot across mark occurrences
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest'
import { createChartRuntime } from '@tanstack/charts'
import { defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSankeyMark } from '../marks'
import type { SankeyDatum, SankeyMarkConfig } from '../marks'
import type { SankeyTextWidth } from '../label-geometry'
import * as textMeasurement from '../private/text-width'

const data = {
  nodes: [{ name: 'Start' }, { name: 'End' }],
  links: [{ source: 0, target: 1, value: 12 }],
}

const config: SankeyMarkConfig = {
  now: () => 0,
  data,
  nodeWidth: 16,
  nodePadding: 24,
  sideMargin: { left: 100, right: 100 },
  nodeColor: () => '#123456',
  linkStroke: (_row, color) => color,
  useGradient: false,
  strokeOpacity: 0.5,
  lineCap: 4,
  showLabels: true,
  showValueLabels: true,
  labelOrientation: 'horizontal',
  enter: { durationMs: 0, transition: { type: 'tween', duration: 0 } },
}

const render = (
  roles: ReadonlyArray<SankeyMarkConfig>,
  measure: SankeyTextWidth = textMeasurement.textWidth,
) => {
  const runtime = createChartRuntime<SankeyDatum, number, number>()
  try {
    return runtime.render(
      defineChart({
        marks: [createSankeyMark({ ...config, roles }, measure)],
        scales: { x: null, y: null },
      }),
      { width: 630, height: 315 },
    )
  } finally {
    runtime.destroy()
  }
}

beforeEach(() => {
  const originalFamily = document.body.style.fontFamily
  onTestFinished(() => {
    document.body.style.fontFamily = originalFamily
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

test('link-only occurrences preserve flow geometry and callbacks without formatting or measuring labels', () => {
  const callbacks = {
    formatValue: (value: number) => `${value} vehicles`,
    onLayout: () => undefined,
    nodeColor: () => '#123456',
  } satisfies Pick<SankeyMarkConfig, 'formatValue' | 'onLayout' | 'nodeColor'>
  const format = vi.spyOn(callbacks, 'formatValue')
  const onLayout = vi.spyOn(callbacks, 'onLayout')
  const nodeColor = vi.spyOn(callbacks, 'nodeColor')
  const measure = vi.spyOn(textMeasurement, 'textWidth')
  const style = vi.spyOn(globalThis, 'getComputedStyle')
  const link = { ...config, ...callbacks, role: 'link' as const }
  const scene = render([link], measure)
  expect(onLayout).toHaveBeenCalledTimes(1)
  expect(nodeColor).toHaveBeenCalledTimes(3)
  expect(scene.points.map((point) => point.markId)).toEqual(['sankey:flow'])
  expect(renderChartSvg(scene, { ariaLabel: 'Flow' })).toEqual(
    renderChartSvg(render([{ ...link, showLabels: false }]), { ariaLabel: 'Flow' }),
  )
  expect(format).not.toHaveBeenCalled()
  expect(measure).not.toHaveBeenCalled()
  expect(style.mock.calls.filter(([element]) => element === document.body)).toHaveLength(0)
})

test.each(['horizontal', 'vertical'] as const)(
  'node occurrences retain formatter order and hitboxes with one fresh body font per layout (%s)',
  (labelOrientation) => {
    const order: string[] = []
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Finite glyph width isolates horizontal/vertical hitbox dimensions; native Sankey and font keepers exercise real measurement.
    const measure = vi.fn<SankeyTextWidth>(() => 40)
    const style = vi.spyOn(globalThis, 'getComputedStyle')
    const roles = [
      { ...config, role: 'link' as const, occurrence: 0, formatValue: () => 'unused' },
      ...['first', 'second'].map((name, index) => ({
        ...config,
        role: 'node' as const,
        occurrence: index + 1,
        labelOrientation,
        onLayout: () => order.push(name),
        formatValue: (value: number) => {
          order.push(`${name}:${value}`)
          return `${value} ${name}`
        },
      })),
    ]
    for (const family of ['serif', 'monospace']) {
      document.body.style.fontFamily = family
      style.mockClear()
      measure.mockClear()
      order.length = 0
      const scene = render(roles, measure)
      expect(order).toEqual(['first', 'first:12', 'first:12', 'second', 'second:12', 'second:12'])
      expect(style.mock.calls.filter(([element]) => element === document.body)).toHaveLength(1)
      expect(measure).toHaveBeenCalledTimes(8)
      expect(measure.mock.calls.every((call) => call[3] === family)).toBe(true)
      const nodes = scene.points.filter((point) => point.markId.startsWith('sankey:sankey-node'))
      expect(nodes).toHaveLength(4)
      for (const point of nodes) {
        if (!('labelBoxes' in point.datum)) throw new Error('Expected node label hitboxes')
        expect(point.datum.labelBoxes).toHaveLength(2)
        for (const box of point.datum.labelBoxes)
          expect(labelOrientation === 'horizontal' ? box.x1 - box.x0 : box.y1 - box.y0).toBe(40)
      }
      const svg = renderChartSvg(scene, { ariaLabel: 'Flow' })
      expect(svg).toContain('12 first')
      expect(svg).toContain('12 second')
      expect(svg).not.toContain('unused')
    }
  },
)

test('hidden node labels do not read body typography or retain label hitboxes', () => {
  const style = vi.spyOn(globalThis, 'getComputedStyle')
  const measure = vi.spyOn(textMeasurement, 'textWidth')
  const scene = render([{ ...config, role: 'node', showLabels: false }], measure)
  expect(scene.points).toHaveLength(2)
  for (const point of scene.points) {
    if (!('labelBoxes' in point.datum)) throw new Error('Expected node')
    expect(point.datum.labelBoxes).toEqual([])
  }
  expect(measure).not.toHaveBeenCalled()
  expect(style.mock.calls.filter(([element]) => element === document.body)).toHaveLength(0)
})
