// @vitest-environment happy-dom

import { afterAll, beforeAll, expect, test } from 'vitest'
import { Schema } from 'effect'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type { BarDatum } from '../src/bar/model'
import { createChartFrame } from '../src/kit/chart-frame'
import { acquireTooltipAttachment } from '../src/cartesian/tooltip-attachment'
import { fontTestEnvironment } from './font-test-environment'
import { nativeTooltip } from '../src/cartesian/native-tooltip'
import { Bar, BarChart, ChartTooltip } from '../src/index'

const animationDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

beforeAll(() => {
  if (animationDescriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
    throw new Error('Native tooltip test requires scoped WAAPI capability removal')
  }
})

afterAll(() => {
  if (animationDescriptor !== undefined) {
    Object.defineProperty(Element.prototype, 'animate', animationDescriptor)
  }
})

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })

const root = BarChart({ name: 'native-tooltip-lifecycle', Row })

const data = [Row.make({ name: 'Week 1', value: 32 }), Row.make({ name: 'Week 2', value: 48 })]

test('native focus positions a hidden entrance before returning and preserves pin, leave and reentry', () => {
  const container = document.createElement('div')
  container.style.visibility = 'visible'
  const drawing = document.createElement('div')
  const surface = document.createElement('div')
  surface.style.display = 'contents'
  const tooltip = document.createElement('div')
  tooltip.id = 'native-tooltip-lifecycle-tooltip'
  tooltip.style.visibility = 'hidden'
  const body = document.createElement('div')
  body.className = 'ts-chart-tooltip__body'
  body.textContent = 'Week 1: 32 active users'
  tooltip.append(body)
  surface.append(tooltip)
  container.append(drawing, surface)
  document.body.append(container)
  Object.defineProperties(tooltip, {
    offsetWidth: { get: () => 180 },
    offsetHeight: { get: () => 80 },
  })

  const inputs = root.inputs('native-tooltip-lifecycle', {
    children: [Bar({ dataKey: 'value' }), ChartTooltip()],
  })

  const host = mountChartRenderer(drawing, {
    definition: {
      ...inputs.definition(data),
      tooltip: {
        use: nativeTooltip(tooltip),
        sticky: true,
        anchor: { x: 'value', y: 'plot-top' },
      },
    },
    renderer: motion<BarDatum<typeof Row.Type>, string | number, string | number>({
      initial: false,
    }),
    ariaLabel: 'Native tooltip lifecycle',
    idPrefix: 'native-tooltip-lifecycle',
    width: 640,
    height: 320,
  })

  try {
    const scene = host.getScene()
    const [point] = scene.points

    if (point === undefined) {
      throw new Error('Native bar scene requires its first focus point')
    }

    host.interaction.setControlledFocus(point)
    expect(tooltip.hidden).toBe(false)
    expect(getComputedStyle(tooltip).visibility).toBe('hidden')
    tooltip.style.removeProperty('visibility')
    expect(getComputedStyle(tooltip).visibility).toBe('visible')
    expect(Number(tooltip.style.opacity)).toBe(0)
    expect(Number(tooltip.style.left.replace('px', ''))).toBeCloseTo(
      point.x + 196 > 640 ? point.x - 196 : point.x + 16,
      5,
    )
    expect(Number(tooltip.style.top.replace('px', ''))).toBe(40)
    expect(body.textContent).toBe('Week 1: 32 active users')
    expect(tooltip.dataset.sticky).toBe('false')

    host.interaction.setControlledFocus(point, { pinned: true })
    expect(tooltip.dataset.sticky).toBe('true')

    host.interaction.setControlledFocus(null)
    expect(tooltip.hidden).toBe(true)
    host.interaction.setControlledFocus(point)
    expect(tooltip.hidden).toBe(false)
    expect(Number(tooltip.style.opacity)).toBe(0)
    expect(tooltip.dataset.sticky).toBe('false')
    expect(body.textContent).toBe('Week 1: 32 active users')
  } finally {
    host.destroy()
    container.remove()
  }
})

test('renderer replacement retains a declarative tooltip body and returns it to its origin on release', () => {
  const environment = fontTestEnvironment()
  const origin = document.createElement('div')
  const tooltip = document.createElement('div')
  tooltip.id = 'native-tooltip-lifecycle-tooltip'
  tooltip.className = 'ts-chart-tooltip'
  const body = document.createElement('div')
  body.className = 'ts-chart-tooltip__body'
  body.textContent = 'retained first row'
  tooltip.append(body)
  origin.append(tooltip)
  const frame = createChartFrame(document)
  environment.container.append(frame.host, origin)
  const attachment = acquireTooltipAttachment(frame.surface, tooltip)
  const extension = nativeTooltip(tooltip, () => false, attachment.park)
  const inputs = root.inputs('native-tooltip-lifecycle', {
    children: [Bar({ dataKey: 'value' }), ChartTooltip()],
  })
  const options = {
    definition: {
      ...inputs.definition(data, extension),
      tooltip: { use: extension, sticky: true },
    },
    renderer: motion<BarDatum<typeof Row.Type>, string | number, string | number>({
      initial: false,
    }),
    ariaLabel: 'Retained tooltip renderer replacement',
    width: 640,
    height: 320,
    onRender: attachment.attach,
  }
  const host = mountChartRenderer(frame.surface, options)
  try {
    const point = host.getScene().points[0]
    if (point === undefined) throw new Error('Missing bar focus point')
    host.interaction.setControlledFocus(point, { pinned: true })
    expect(tooltip.parentElement).toBe(frame.surface)
    expect(frame.surface.querySelector(':scope > svg.ts-chart')).not.toBeNull()
    body.textContent = 'retained updated row'
    host.update({
      ...options,
      renderer: motion<BarDatum<typeof Row.Type>, string | number, string | number>({
        initial: false,
      }),
    })
    environment.flush()
    expect(tooltip.parentElement).toBe(frame.surface)
    expect(tooltip.firstElementChild).toBe(body)
    expect(body.textContent).toBe('retained updated row')
    expect(
      environment.container.querySelectorAll('#native-tooltip-lifecycle-tooltip'),
    ).toHaveLength(1)
    host.interaction.setControlledFocus(null)
    expect(tooltip.hidden).toBe(true)
    attachment.release()
    attachment.release()
    host.destroy()
    expect(tooltip.parentElement).toBe(origin)
    expect(tooltip.firstElementChild).toBe(body)
    expect(frame.surface.children).toHaveLength(0)
  } finally {
    attachment.release()
    host.destroy()
    environment.destroy()
  }
})
