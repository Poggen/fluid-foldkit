// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest'
import { DateTime, Schema } from 'effect'
import { LineChart, Line, ChartTooltip } from '../src/cartesian/index'
import { defineDrawingElement } from '../src/cartesian/drawing-element'
import { DrawingElementBase } from '../src/cartesian/lifecycle'
import { initialInteraction } from '../src/cartesian/state'
import { fontTestEnvironment } from './font-test-environment'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const chart = LineChart({ name: 'acquisition-rollback', Row })
const Drawing = defineDrawingElement<typeof Row.Type>(DrawingElementBase)
if (Drawing === undefined) throw new Error('Drawing requires browser classes')
customElements.define('acquisition-rollback-drawing', Drawing)

for (const { failureAt, cleanupAt } of [
  { failureAt: 'observeContainer', cleanupAt: 'none' },
  { failureAt: 'update', cleanupAt: 'none' },
  { failureAt: 'update', cleanupAt: 'resource' },
  { failureAt: 'update', cleanupAt: 'host' },
]) {
  test(`failed initial ${failureAt} with ${cleanupAt} cleanup failure restores the declarative tooltip and disposes all acquired work`, () => {
    const environment = fontTestEnvironment()
    const failure = new Error(`initial ${failureAt} failed`)
    const cleanupFailure = new Error(`${cleanupAt} cleanup failed`)
    const hostDestroyed = vi.fn()
    const props = {
      width: 400,
      height: 240,
      animationDuration: 0,
      children: [Line({ dataKey: 'value' }), ChartTooltip()],
    }
    const inputs = chart.inputs('rollback', props)
    const createResource = inputs.createResource
    if (createResource === undefined) throw new Error('Line requires its actual resource')
    const element = new Drawing()
    const origin = document.createElement('div')
    const shell = document.createElement('div')
    shell.id = 'rollback-tooltip'
    const body = document.createElement('div')
    body.className = 'ts-chart-tooltip__body'
    body.textContent = 'retained declarative content'
    shell.append(body)
    origin.append(shell)
    environment.container.dataset.bkmNativeChart = 'rollback'
    environment.container.append(element, origin)
    const destroyed = vi.fn()
    const observed = vi.fn()
    element.addEventListener('key-observed', observed)
    const captured: { surface: Element | null } = { surface: null }
    const presentation = {
      id: 'rollback',
      data: [Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(0)), value: 1 })],
      focusedIndex: null,
      focusedSeriesIndex: null,
      state: initialInteraction(chart.configuration(props)),
      inputs: {
        ...inputs,
        observeContainer: (container: HTMLDivElement | null) => {
          if (failureAt === 'observeContainer' && container !== null) throw failure
          return undefined
        },
        createResource: (...args: Parameters<typeof createResource>) => {
          const resource = createResource(...args)
          return {
            ...resource,
            attach: (
              renderer: Parameters<typeof resource.attach>[0],
              redraw: Parameters<typeof resource.attach>[1],
            ) => {
              resource.attach(renderer, redraw)
              if (cleanupAt === 'host') {
                const destroy = renderer.destroy.bind(renderer)
                vi.spyOn(renderer, 'destroy').mockImplementation(() => {
                  destroy()
                  hostDestroyed()
                  throw cleanupFailure
                })
              }
            },
            update: () => {
              captured.surface = element.querySelector('.ts-chart-surface')
              throw failure
            },
            destroy: () => {
              destroyed()
              resource.destroy()
              if (cleanupAt === 'resource') throw cleanupFailure
            },
          }
        },
      },
    }
    expect(Reflect.set(element, 'presentation', presentation)).toBe(true)
    try {
      expect(() => element.acquire(() => 0)).toThrow(failure)
      expect(shell.parentElement).toBe(origin)
      expect(shell.firstElementChild).toBe(body)
      expect(body.textContent).toBe('retained declarative content')
      expect([...origin.childNodes]).toEqual([shell])
      expect(element.children).toHaveLength(0)
      expect(environment.container.querySelectorAll('#rollback-tooltip')).toHaveLength(1)
      expect(destroyed).toHaveBeenCalledTimes(failureAt === 'update' ? 1 : 0)
      expect(hostDestroyed).toHaveBeenCalledTimes(cleanupAt === 'host' ? 1 : 0)
      captured.surface?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
      expect(observed).not.toHaveBeenCalled()
      environment.flush()
      expect(shell.parentElement).toBe(origin)
      expect(element.children).toHaveLength(0)
    } finally {
      element.removeEventListener('key-observed', observed)
      environment.destroy()
    }
  })
}

test('reused chart ids acquire and release only their occurrence tooltip across remounts', () => {
  const environment = fontTestEnvironment()
  const props = {
    width: 400,
    height: 240,
    animationDuration: 0,
    children: [Line({ dataKey: 'value' })],
  }
  const inputs = chart.inputs('shared-chart', props)
  const makeOwner = (label: string) => {
    const container = document.createElement('div')
    container.dataset.bkmNativeChart = 'shared-chart'
    const element = new Drawing()
    const origin = document.createElement('div')
    const shell = document.createElement('div')
    shell.id = 'shared-chart-tooltip'
    shell.textContent = label
    origin.append(shell)
    container.append(element, origin)
    environment.container.append(container)
    expect(
      Reflect.set(element, 'presentation', {
        id: 'shared-chart',
        data: [Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(0)), value: 1 })],
        focusedIndex: null,
        focusedSeriesIndex: null,
        state: initialInteraction(chart.configuration(props)),
        inputs,
      }),
    ).toBe(true)
    return { container, element, origin, shell }
  }
  const first = makeOwner('first owner')
  const second = makeOwner('second owner')
  let releaseFirst: (() => void) | undefined
  let releaseSecond: (() => void) | undefined
  let releaseReplacement: (() => void) | undefined
  try {
    releaseFirst = first.element.acquire(() => 0)
    releaseSecond = second.element.acquire(() => 0)
    expect(first.shell.parentElement).toBe(first.element.querySelector('.ts-chart-surface'))
    expect(second.shell.parentElement).toBe(second.element.querySelector('.ts-chart-surface'))
    releaseFirst()
    first.container.remove()
    const replacement = makeOwner('replacement owner')
    releaseReplacement = replacement.element.acquire(() => 0)
    expect(replacement.shell.parentElement).toBe(
      replacement.element.querySelector('.ts-chart-surface'),
    )
    expect(second.shell.parentElement).toBe(second.element.querySelector('.ts-chart-surface'))
    expect(second.shell.textContent).toBe('second owner')
    releaseReplacement()
    expect(replacement.shell.parentElement).toBe(replacement.origin)
    expect(second.shell.parentElement).toBe(second.element.querySelector('.ts-chart-surface'))
    releaseSecond()
    expect(second.shell.parentElement).toBe(second.origin)
  } finally {
    releaseReplacement?.()
    releaseSecond?.()
    releaseFirst?.()
    environment.destroy()
  }
})
