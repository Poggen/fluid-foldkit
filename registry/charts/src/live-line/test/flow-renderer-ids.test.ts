// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest'
import { constUndefined } from 'effect/Function'
import { LiveLineChart, LiveLine, LiveXAxis, LiveYAxis } from '..'
import { LiveState, advanceLive } from '../state'
import type { LiveLineChartProps } from '../options'
import { fontTestEnvironment } from '../../../test/font-test-environment'

const chart = LiveLineChart({ name: 'flow-renderer-ids' })

const props: LiveLineChartProps = {
  data: [
    { time: 100, value: 20 },
    { time: 101, value: 40 },
    { time: 102, value: 30 },
  ],
  value: 30,
  window: 10,
  style: { height: 240 },
  children: [LiveLine({ dataKey: 'value', pulse: false }), LiveXAxis(), LiveYAxis()],
}

const clock = {
  timeOrigin: 1_000_000,
  now: 100,
  wallNow: 102_100,
  timelineNow: 100,
  displayFrameMs: 1000 / 60,
}

test('mounted chart instances resolve SVG clips and gradients inside their own renderer', () => {
  const environment = fontTestEnvironment()
  const hosts: Array<ReturnType<ReturnType<typeof chart.inputs>['mount']>> = []

  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Happy DOM lacks layout; host width is a finite input to the real renderer ID ownership contract.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const width = Number.parseFloat(this.closest('section')?.style.width ?? '400')

    return new DOMRect(0, 0, width, 240)
  })

  try {
    const instances = [400, 640].map((width, index) => {
      const container = document.createElement('section')
      container.style.width = `${width}px`
      environment.container.append(container)
      const state = advanceLive(new LiveState(), props, 0, width, clock)
      const host = chart.inputs(`flow-ids-${index}`, props).mount(
        container,
        props.data,
        null,
        constUndefined,
        () => clock.now,
        constUndefined,
        state,
        constUndefined,
        () => clock.wallNow,
        constUndefined,
        null,
        false,
      )
      hosts.push(host)

      return container
    })

    environment.flush()
    environment.flush()

    const resources = instances.flatMap((container) => [
      ...container.querySelectorAll<SVGElement>('svg.ts-chart [id]'),
    ])
    const ids = resources.map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)

    const clipWidths = instances.map((container) => {
      expect(container.querySelectorAll('svg.ts-chart')).toHaveLength(2)
      expect(container.querySelectorAll('svg.ts-chart linearGradient').length).toBeGreaterThan(0)
      const clip = container.querySelector('svg.ts-chart clipPath rect')
      expect(clip).not.toBeNull()
      const width = Number(clip?.getAttribute('width'))
      expect(width).toBeGreaterThan(0)

      const references = [...container.querySelectorAll('svg.ts-chart [data-ts-key]')].flatMap(
        (element) =>
          [...element.attributes].flatMap((attribute) =>
            [...attribute.value.matchAll(/url\(#([^)]+)\)/gu)].flatMap((match) =>
              match[1] === undefined ? [] : [{ element, id: match[1] }],
            ),
          ),
      )
      expect(references.length).toBeGreaterThan(0)

      for (const { element, id } of references) {
        const target = document.getElementById(id)
        expect(target, `Missing SVG resource ${id}`).not.toBeNull()
        expect(element.closest('svg')?.contains(target)).toBe(true)
      }

      return width
    })

    expect(new Set(clipWidths).size).toBe(2)
  } finally {
    for (const host of hosts) host.destroy()
    environment.destroy()
  }
})
