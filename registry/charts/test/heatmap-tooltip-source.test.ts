// @vitest-environment happy-dom
import { DateTime } from 'effect'
import { constUndefined } from 'effect/Function'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { HeatmapChart, HeatmapCells, HeatmapTooltip } from '../src/heatmap'
import type { HeatmapChartProps, HeatmapTooltipProps } from '../src/heatmap'
import { fontTestEnvironment } from './font-test-environment'

const animationDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

beforeAll(() => {
  if (animationDescriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
    throw new Error('Heatmap tooltip tests require scoped JS-motion fallback')
  }
})

afterAll(() => {
  if (animationDescriptor !== undefined) {
    Object.defineProperty(Element.prototype, 'animate', animationDescriptor)
  }
})

const chart = HeatmapChart({ name: 'heatmap-tooltip-source' })

const data = [
  {
    bin: 0,
    bins: Array.from({ length: 7 }, (_, row) => ({
      bin: row,
      count: row + 1,
      date: DateTime.toDateUtc(
        DateTime.makeZonedUnsafe(
          { year: 2026, month: 11, day: 8 + row, hour: 12 },
          { timeZone: DateTime.zoneMakeLocal(), adjustForTimeZone: true },
        ),
      ),
    })),
  },
]

const propsFor = (tooltip: HeatmapTooltipProps = {}): HeatmapChartProps => ({
  data,
  animate: false,
  binSize: 24,
  children: [HeatmapCells({ hideGhostCells: false }), HeatmapTooltip(tooltip)],
})

const element = (container: Element, selector: string): HTMLElement => {
  const found = container.querySelector(selector)
  if (!(found instanceof HTMLElement)) throw new Error(`Missing tooltip element: ${selector}`)
  return found
}

const setup = (tooltip: HeatmapTooltipProps = {}) => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const environment = fontTestEnvironment()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, 0, 400, 240),
  )
  const props = propsFor(tooltip)
  const observe = vi.fn<(index: number | null) => void>()
  const host = chart
    .inputs('heatmap-source', props)
    .mount(
      environment.container,
      data,
      null,
      null,
      observe,
      () => 100,
      constUndefined,
      DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-15T12:00:00Z')),
      true,
      constUndefined,
      constUndefined,
    )
  environment.flush()
  environment.flush()

  return {
    ...environment,
    host,
    shell: element(environment.container, '#heatmap-source-tooltip'),
    configure: (next: HeatmapTooltipProps) => {
      chart.inputs('heatmap-source', propsFor(next)).configure(host)
    },
    key: (key: string, expected: number) => {
      const svg = environment.container.querySelector('svg.ts-chart')
      if (svg === null) throw new Error('Missing real Heatmap renderer surface')
      svg.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
      expect(observe).toHaveBeenLastCalledWith(expected)
      const observed = observe.mock.lastCall?.[0]
      if (observed === undefined) throw new Error('Renderer did not publish cell focus')
      // Supply the observed presentation input through the same public host contract as Drawing.
      host.update(data, observed, null, true)
    },
    present: (focus: number | null) => host.update(data, focus, null, true),
    dispose: () => {
      host.destroy()
      environment.destroy()
      vi.useRealTimers()
    },
  }
}

test('Heatmap native cell navigation retains its inert body and source tooltip child order', () => {
  const owner = setup()
  try {
    owner.key('Home', 0)
    const shell = owner.shell
    const body = element(shell, ':scope > .ts-chart-tooltip__body[inert]')
    const panel = element(body, ':scope > .bkm-tooltip-panel')
    const content = element(panel, ':scope > .bkm-tooltip-content')
    expect(shell.children).toHaveLength(1)
    expect(body.children).toHaveLength(1)
    expect(panel.children).toHaveLength(1)
    expect([...content.children].map((line) => line.textContent)).toEqual([
      'November 8th 2026',
      'Sunday',
      '',
      '1 contribution',
    ])
    expect(shell.getAttribute('role')).toBe('status')
    expect(shell.getAttribute('aria-live')).toBe('polite')

    owner.key('ArrowDown', 1)
    expect(element(owner.container, '#heatmap-source-tooltip')).toBe(shell)
    expect(element(shell, ':scope > .ts-chart-tooltip__body[inert]')).toBe(body)
    expect(element(body, ':scope > .bkm-tooltip-panel')).not.toBe(panel)
    expect(element(body, '.ts-bkm-heatmap-tooltip-date').textContent).toBe('November 9th 2026')
    expect(element(body, '.ts-bkm-heatmap-tooltip-value').textContent).toBe('2 contributions')
  } finally {
    owner.dispose()
  }
})

test('Heatmap panel styles override background and clear removed keys without styling the shell', () => {
  const owner = setup({
    instant: true,
    className: 'authored-tooltip',
    backgroundColor: 'red',
    panelStyle: {
      backgroundColor: 'green',
      padding: 9,
      width: 180,
      marginTop: 0,
      opacity: 0.35,
      transform: 'rotate(7deg)',
      '--tooltip-accent': 6,
    },
  })
  try {
    owner.key('Home', 0)
    const shell = owner.shell
    const panel = element(shell, '.bkm-tooltip-panel')
    expect(panel.style.backgroundColor).toBe('green')
    expect(panel.classList.contains('authored-tooltip')).toBe(true)
    expect(panel.style.padding).toBe('9px')
    expect(panel.style.width).toBe('180px')
    expect(Number.parseFloat(panel.style.marginTop)).toBe(0)
    expect(panel.style.opacity).toBe('0.35')
    expect(panel.style.transform).toBe('rotate(7deg)')
    expect(panel.style.getPropertyValue('--tooltip-accent')).toBe('6')
    expect(shell.style.backgroundColor).not.toBe('red')
    expect(shell.style.backgroundColor).not.toBe('green')
    expect(shell.style.padding).not.toBe('9px')
    expect(shell.style.opacity).not.toBe('0.35')
    expect(shell.style.transform).not.toBe('rotate(7deg)')
    expect(shell.style.getPropertyValue('--tooltip-accent')).toBe('')
    const body = element(shell, ':scope > .ts-chart-tooltip__body[inert]')

    owner.configure({
      instant: true,
      backgroundColor: 'purple',
      panelStyle: { backgroundColor: undefined },
      formatLabel: (count) => `Count ${count}`,
    })
    owner.key('ArrowDown', 1)
    const replacement = element(body, ':scope > .bkm-tooltip-panel')
    expect(element(owner.container, '#heatmap-source-tooltip')).toBe(shell)
    expect(element(shell, ':scope > .ts-chart-tooltip__body[inert]')).toBe(body)
    expect(replacement).not.toBe(panel)
    expect(replacement.classList.contains('authored-tooltip')).toBe(false)
    expect(replacement.getAttribute('style') ?? '').toBe('')
    expect(element(replacement, '.ts-bkm-heatmap-tooltip-value').textContent).toBe('Count 2')
    expect(shell.style.getPropertyValue('--tooltip-accent')).toBe('')

    owner.configure({ instant: true, backgroundColor: 'blue' })
    expect(element(body, ':scope > .bkm-tooltip-panel').style.backgroundColor).toBe('blue')
  } finally {
    owner.dispose()
  }
})

test('Heatmap host presentation retains delayed show, leave cancellation and hide reentry', () => {
  const owner = setup({ showDelay: 40, hideDelay: 80 })
  try {
    const shell = owner.shell
    owner.present(0)
    vi.advanceTimersByTime(39)
    expect(shell.hidden).toBe(true)
    expect(shell.querySelector('.bkm-tooltip-panel')).toBeNull()
    owner.present(null)
    vi.advanceTimersByTime(81)
    expect(shell.hidden).toBe(true)
    expect(shell.querySelector('.bkm-tooltip-panel')).toBeNull()

    owner.present(0)
    vi.advanceTimersByTime(40)
    expect(shell.hidden).toBe(false)
    const body = element(shell, ':scope > .ts-chart-tooltip__body[inert]')
    owner.present(null)
    vi.advanceTimersByTime(79)
    expect(shell.hidden).toBe(false)
    owner.present(1)
    vi.advanceTimersByTime(1)
    expect(shell.hidden).toBe(false)
    expect(element(shell, ':scope > .ts-chart-tooltip__body[inert]')).toBe(body)
    expect(element(body, '.ts-bkm-heatmap-tooltip-value').textContent).toBe('2 contributions')
    owner.present(null)
    vi.advanceTimersByTime(80)
    expect(shell.hidden).toBe(true)
  } finally {
    owner.dispose()
  }
})

for (const pending of ['show', 'hide']) {
  test(`Heatmap host destruction cancels pending tooltip ${pending}`, () => {
    const owner = setup({ showDelay: 40, hideDelay: 80 })
    try {
      owner.present(0)
      if (pending === 'hide') {
        vi.advanceTimersByTime(40)
        owner.present(null)
      }
      owner.host.destroy()
      const detachedContent = owner.shell.outerHTML
      expect(vi.getTimerCount()).toBe(0)
      vi.advanceTimersByTime(100)
      owner.flush()
      expect(owner.shell.isConnected).toBe(false)
      expect(owner.shell.outerHTML).toBe(detachedContent)
      expect(vi.getTimerCount()).toBe(0)
      expect(owner.container.querySelector('[data-bkm-chart="heatmap"]')).toBeNull()
    } finally {
      owner.dispose()
    }
  })
}
