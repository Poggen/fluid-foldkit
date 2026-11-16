// @vitest-environment happy-dom
import { Schema } from 'effect'
import { expect, test } from 'vitest'
import { Line, LineChart } from '../src/index'
import { nativeObservations } from '../src/cartesian/native-resource'
import { fontTestEnvironment } from './font-test-environment'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const recipe = LineChart({ name: 'decorated-resource-host', Row })

test('direct family resource keeps the supplied HTMLElement identity despite application-owned drawingHost property', () => {
  const environment = fontTestEnvironment()
  const decoy = document.createElement('div')
  decoy.style.color = 'red'
  decoy.textContent = 'application-owned decoy'
  const element = Object.assign(environment.container, { drawingHost: decoy })
  const original = element.getAttribute('style')
  const decoyBefore = decoy.outerHTML
  const props = {
    width: 400,
    height: 240,
    animationDuration: 0,
    children: [Line({ dataKey: 'value' })],
  }
  const inputs = recipe.inputs('decorated-host', props)
  const resource = inputs.createResource?.(element, nativeObservations(element), () => 0)
  if (resource === undefined) throw new Error('Expected actual Line resource')
  try {
    expect(element.dataset.bkmKit).toBe('decorated-host')
    expect(element.style.getPropertyValue('--bkm-native-width')).toBe('400px')
    expect(element.children.length).toBeGreaterThan(0)
    expect(decoy.outerHTML).toBe(decoyBefore)
    const next = recipe.inputs('decorated-host', { ...props, width: 480 })
    expect(next.configureResource?.(resource)).toBe(true)
    expect(element.style.getPropertyValue('--bkm-native-width')).toBe('480px')
    expect(element.drawingHost).toBe(decoy)
    expect(decoy.outerHTML).toBe(decoyBefore)
  } finally {
    resource.destroy()
    environment.destroy()
  }
  expect(element.getAttribute('style')).toBe(original)
  expect(element.children).toHaveLength(0)
  expect(element.drawingHost).toBe(decoy)
  expect(decoy.outerHTML).toBe(decoyBefore)
})
