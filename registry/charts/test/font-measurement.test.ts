// @vitest-environment happy-dom -- font metric dependency contract
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { ChartTextMeasureOptions } from '@tanstack/charts'
import { cartesianFontMeasurement } from '../src/cartesian/font-measurement'
import { pillLayout } from '../src/cartesian/date-pill'
import { pillFontMeasurement } from '../src/cartesian/pill-font-measurement'
import { fontTestEnvironment } from './font-test-environment'

let environment: ReturnType<typeof fontTestEnvironment>

beforeEach(() => {
  environment = fontTestEnvironment()
})

afterEach(() => {
  environment.destroy()
})

const options: ChartTextMeasureOptions = {
  fontSize: 12,
  fontFamily: 'Original',
  fontStyle: 'normal',
  fontStretch: 'normal',
  letterSpacing: 0,
  direction: 'ltr',
  fontScale: 1,
  anchor: 'start',
  baseline: 'auto',
}

const collector = (limit?: number) => {
  const measurement = cartesianFontMeasurement(environment.container, limit)

  if (measurement === null) {
    throw new Error('Expected canvas measurements')
  }

  return measurement
}

test('tracks current text including cache hits and discards retired scene dependencies', () => {
  const measurement = collector()
  measurement.begin()
  measurement.measure('old', options)
  measurement.measure('retained', options)
  measurement.commit()
  measurement.begin()
  measurement.measure('retained', options)
  measurement.commit()
  environment.measure.mockClear()
  measurement.invalidate()
  expect(measurement.changed()).toBe(false)
  expect(environment.measure.mock.calls.map(([text]) => text)).toEqual(['retained'])
})

test('compares painted origin and height even when advance width does not change', () => {
  const measurement = collector()
  measurement.begin()
  measurement.measure('Label', options)
  measurement.commit()
  environment.setBounds({ left: 1, right: 19 })
  expect(measurement.changed()).toBe(true)
  environment.setBounds({ left: 0, right: 20, ascent: 10 })
  expect(measurement.changed()).toBe(true)
})

test('invalidates unseen text immediately and conservatively handles dependency overflow', () => {
  const measurement = collector(1)
  measurement.begin()
  measurement.measure('A', options)
  measurement.measure('B', options)
  measurement.commit()
  expect(measurement.changed()).toBe(true)
  measurement.invalidate()
  environment.setBounds({ left: 2 })
  expect(measurement.measure('new', options).x).toBe(-2)
  measurement.begin()
  measurement.measure('B', options)
  measurement.commit()
  expect(measurement.changed()).toBe(false)
})

test('complete measurement options and inherited weight contribute to cache identity', () => {
  const measurement = collector()
  measurement.begin()
  measurement.measure('A', options)
  measurement.measure('A', { ...options, locale: 'sv' })
  measurement.measure('A', { ...options, baseline: 'middle' })
  expect(environment.measure).toHaveBeenCalledTimes(3)
  environment.container.style.fontWeight = '600'
  expect(measurement.refresh()).toBe(true)
  measurement.measure('A', options)
  expect(environment.context.font).toContain('600')
  expect(environment.measure).toHaveBeenCalledTimes(4)
})

test('pill words independently detect changed widths and current body family', () => {
  const measurement = pillFontMeasurement(environment.container)
  measurement.begin()
  measurement.measure('November')
  measurement.commit()
  expect(measurement.changed()).toBe(false)
  environment.setBounds({ width: 21 })
  expect(measurement.changed()).toBe(true)
  measurement.begin()
  measurement.measure('November')
  measurement.commit()
  document.body.style.fontFamily = 'Replacement'
  expect(measurement.changed()).toBe(true)
  document.body.style.fontFamily = ''
})

test('pill overflow and unavailable canvas are conservative', () => {
  const measurement = pillFontMeasurement(environment.container, 1)
  measurement.begin()
  measurement.measure('November')
  measurement.commit()
  measurement.measure('12')
  measurement.commit()
  expect(measurement.changed()).toBe(true)
  environment.unavailable()
  expect(cartesianFontMeasurement(environment.container)).toBeNull()
  const pill = pillFontMeasurement(environment.container)
  pill.begin()
  expect(pill.measure('A')).toBeNull()
  expect(pill.changed()).toBe(true)
})

test('incomplete layout and resource draws cannot report unchanged metrics', () => {
  const measurement = collector()
  measurement.begin()
  measurement.measure('Label', options)
  measurement.commit()
  measurement.begin()
  expect(measurement.changed()).toBe(true)
  const pill = pillFontMeasurement(environment.container)
  pill.begin()
  pill.measure('November')
  pill.commit()
  pill.begin()
  expect(pill.changed()).toBe(true)
})

test('font invalidation drops retired cached text before a new scene can reuse it', () => {
  const measurement = collector()
  measurement.begin()
  measurement.measure('retired', options)
  measurement.commit()
  measurement.begin()
  measurement.measure('current', options)
  measurement.commit()
  measurement.invalidate()
  environment.setBounds({ ascent: 15 })
  expect(measurement.measure('retired', options).y).toBe(-15)
})

test('post-layout focus measurements remain conservative after dependency overflow', () => {
  const measurement = collector(1)
  measurement.begin()
  measurement.measure('retained', options)
  measurement.commit()
  measurement.measure('late focus label', options)
  const original = environment.context.measureText('retained')
  environment.measure.mockImplementation((text) => ({
    ...original,
    actualBoundingBoxAscent: text === 'late focus label' ? 18 : original.actualBoundingBoxAscent,
  }))
  measurement.invalidate()
  expect(environment.context.measureText('retained')).toEqual(original)
  expect(environment.context.measureText('late focus label').actualBoundingBoxAscent).toBe(18)
  expect(measurement.changed()).toBe(true)
})

test('pill draw captures body family before writes and reuses it for all words', () => {
  const measurement = pillFontMeasurement(environment.container)
  const styles = vi.spyOn(window, 'getComputedStyle')
  document.body.style.fontFamily = 'Before'

  try {
    measurement.begin()
    expect(styles.mock.calls.filter(([element]) => element === document.body)).toHaveLength(1)
    document.body.style.fontFamily = 'After'
    const layout = pillLayout(['November 12', 'November 13', 'December 1'], measurement.measure)
    measurement.commit()
    expect(layout).toEqual({
      width: 96,
      month: -12,
      day: 22,
      months: ['November', 'December'],
      monthOf: [0, 0, 1],
      days: ['12', '13', '1'],
    })
    expect(environment.context.font).toBe('500 14px Before')
    expect(styles.mock.calls.filter(([element]) => element === document.body)).toHaveLength(1)
    expect(measurement.changed()).toBe(true)
    measurement.begin()
    measurement.measure('November')
    measurement.commit()
    expect(environment.context.font).toBe('500 14px After')
    expect(measurement.changed()).toBe(false)
  } finally {
    document.body.style.fontFamily = ''
  }
})

test.each([
  { name: 'empty', labels: [] },
  { name: 'over 60 labels', labels: Array.from({ length: 61 }, () => 'November 12') },
])('pill fallback skips canvas work for $name', ({ labels }) => {
  const measurement = pillFontMeasurement(environment.container)
  measurement.begin()
  expect(pillLayout(labels, measurement.measure)).toBeNull()
  measurement.commit()
  expect(environment.measure).not.toHaveBeenCalled()
  expect(measurement.changed()).toBe(false)
})
