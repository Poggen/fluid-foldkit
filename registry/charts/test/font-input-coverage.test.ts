// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- real Cartesian drawing owner with public input slots
import { afterEach, beforeEach, expect, test } from 'vitest'
import { DateTime, Schema } from 'effect'
import { LineChart, Line, XAxis } from '../src/cartesian/index'
import { BarChart } from '../src/bar/root'
import { defineDrawingElement } from '../src/cartesian/drawing-element'
import { DrawingElementBase } from '../src/cartesian/lifecycle'
import { initialInteraction } from '../src/cartesian/state'
import type { ChartContextRenderer } from '../src/cartesian/chart-context'
import { fontTestEnvironment } from './font-test-environment'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const recipe = LineChart({ name: 'font-input-coverage', Row })

const props = {
  animationDuration: 0,
  width: 400,
  height: 240,
  children: [Line({ dataKey: 'value' }), XAxis()],
}

const rows = [
  { date: DateTime.toDateUtc(DateTime.makeUnsafe(0)), value: 10 },
  { date: DateTime.toDateUtc(DateTime.makeUnsafe(86_400_000)), value: 20 },
]

const renderer: ChartContextRenderer<typeof Row.Type> = (_context, h) => h.empty

const Drawing = defineDrawingElement<typeof Row.Type>(DrawingElementBase)

if (Drawing === undefined) {
  throw new Error('Expected a browser drawing element')
}

customElements.define('font-input-coverage-drawing', Drawing)

let environment: ReturnType<typeof fontTestEnvironment>

beforeEach(() => {
  environment = fontTestEnvironment()
})

afterEach(() => {
  environment.destroy()
})

test('public render-context slots force font redraws on the current host without replacing the native owner', () => {
  const element = new Drawing()
  const inputs = recipe.inputs('font-input-coverage', props)
  const custom = inputs.withRenderContext(renderer)
  const state = initialInteraction(recipe.configuration(props))

  const presentation = {
    id: 'font-input-coverage',
    data: rows,
    focusedIndex: null,
    focusedSeriesIndex: null,
    inputs,
    state,
  }

  expect(Reflect.set(element, 'presentation', presentation)).toBe(true)
  environment.container.dataset.bkmNativeChart = 'font-input-coverage'
  const tooltip = document.createElement('div')
  tooltip.id = 'font-input-coverage-tooltip'
  environment.container.append(element, tooltip)
  const release = element.acquire(() => 0)
  const observer = new MutationObserver(() => {})
  observer.observe(element, {
    subtree: true,
    attributes: true,
    childList: true,
    characterData: true,
  })

  try {
    const svg = element.querySelector('svg')
    environment.loaded()
    environment.flush()
    expect(observer.takeRecords()).toHaveLength(0)
    expect(custom.definitionRevision).toBe(inputs.definitionRevision)
    expect(Reflect.set(element, 'presentation', { ...presentation, inputs: custom })).toBe(true)
    observer.takeRecords()
    environment.loaded()
    environment.flush()
    expect(observer.takeRecords().length).toBeGreaterThan(0)
    expect(element.querySelector('svg')).toBe(svg)
    expect(Reflect.set(element, 'presentation', presentation)).toBe(true)
    observer.takeRecords()
    environment.loaded()
    environment.flush()
    observer.takeRecords()
    environment.loaded()
    environment.flush()
    expect(observer.takeRecords()).toHaveLength(0)
    expect(element.querySelector('svg')).toBe(svg)
  } finally {
    observer.disconnect()
    release()
    element.remove()
  }
})

test('authored custom contexts and unknown input construction never claim complete measurement coverage', () => {
  expect(recipe.inputs('font-default', props).fontMetricsCoverage).toBe('complete')
  expect(
    recipe.inputs('font-authored', { ...props, renderContext: renderer }).fontMetricsCoverage,
  ).toBe('unknown')
  const bar = BarChart({ name: 'font-bar-coverage', Row })
  expect(bar.inputs('bar-default', { children: [] }).fontMetricsCoverage).toBe('complete')
  expect(
    bar.inputs('bar-authored', { children: [], renderContext: (_context, h) => h.empty })
      .fontMetricsCoverage,
  ).toBe('unknown')
})
